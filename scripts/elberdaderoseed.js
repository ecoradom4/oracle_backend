/**
 * Seeder de funciones y reservas realistas (2024–2025) - Oracle Compatible CORREGIDO
 * Ejecutar con: node scripts/elberdaderoseed.js
 */

require('dotenv').config();
const { faker } = require('@faker-js/faker');
const {
  sequelize,
  User,
  Movie,
  Room,
  Seat,
  Showtime,
  Booking,
  BookingSeat
} = require('../src/models');
const { Op } = require('sequelize');

(async () => {
  const transaction = await sequelize.transaction();
  try {
    console.log('🚀 Poblando usuarios, funciones y reservas para Oracle...');

    // ============================================================
    // 1️⃣ CREAR USUARIOS
    // ============================================================
    console.log('👥 Creando ~1000 usuarios (cliente) para dar realismo...');
    const userCount = 1000;

    const usersData = Array.from({ length: userCount }).map(() => ({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password({ length: 10 }),
      role: 'cliente',
      phone: `+502 ${faker.number.int({ min: 10000000, max: 99999999 })}`,
      created_at: new Date(),
      updated_at: new Date()
    }));

    const users = await User.bulkCreate(usersData, { 
      returning: true, 
      transaction,
      validate: true 
    });
    console.log(`✅ Usuarios creados: ${users.length}`);

    // ============================================================
    // 2️⃣ CARGAR DATOS EXISTENTES
    // ============================================================
    const movies = await Movie.findAll({ transaction });
    const rooms = await Room.findAll({ 
      include: [{ model: Seat, as: 'seats' }],
      transaction 
    });
    
    if (movies.length === 0 || rooms.length === 0) {
      throw new Error('No hay películas o salas registradas. Ejecuta seeders primero.');
    }

    console.log(`🎬 ${movies.length} películas encontradas.`);
    console.log(`🏢 ${rooms.length} salas encontradas.`);

    // Verificar que las salas tienen asientos
    const roomsWithSeats = rooms.filter(room => room.seats && room.seats.length > 0);
    if (roomsWithSeats.length === 0) {
      throw new Error('No hay asientos en las salas. Ejecuta el seeder de asientos primero.');
    }
    console.log(`💺 ${roomsWithSeats.length} salas con asientos disponibles.`);

    // ============================================================
    // 3️⃣ FUNCIONES AUXILIARES DE PRECIOS
    // ============================================================
    const getRoomMultiplier = (type) => {
      switch ((type || '').toLowerCase()) {
        case 'premium': return 1.10;
        case '4dx': return 1.15;
        case 'imax': return 1.20;
        case 'vip': return 1.25;
        default: return 1.0;
      }
    };

    const getSeatMultiplier = (type) => {
      switch ((type || '').toLowerCase()) {
        case 'premium': return 1.10;
        case 'vip': return 1.20;
        default: return 1.0;
      }
    };

    // ============================================================
    // 4️⃣ GENERAR FUNCIONES (3–4 por sala por día)
    // ============================================================
    console.log('🎬 Generando funciones y reservas (esto puede tardar)...');

    const startDate = new Date('2024-09-01');
    const endDate = new Date('2025-12-31');
    const showtimesToCreate = [];
    const times = ['13:00', '16:00', '19:00', '22:00'];

    let showtimeCounter = 0;
    const batchSize = 500;

    // Usar solo salas que tienen asientos
    for (const room of roomsWithSeats) {
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const numShowtimes = faker.number.int({ min: 3, max: 4 });
        const selectedTimes = faker.helpers.arrayElements(times, numShowtimes);
        const movieSubset = faker.helpers.arrayElements(movies, numShowtimes);

        for (let i = 0; i < numShowtimes; i++) {
          const movie = movieSubset[i];
          const basePrice = parseFloat(movie.price) * getRoomMultiplier(room.type);

          showtimesToCreate.push({
            id: faker.string.uuid(),
            movie_id: movie.id,
            room_id: room.id,
            date: new Date(d.toISOString().split('T')[0]),
            time: selectedTimes[i],
            price: parseFloat(basePrice.toFixed(2)),
            available_seats: parseInt(room.capacity),
            total_seats: parseInt(room.capacity),
            created_at: new Date(),
            updated_at: new Date()
          });

          showtimeCounter++;
          
          // Insertar por lotes
          if (showtimesToCreate.length >= batchSize) {
            console.log(`🕒 Insertando lote de ${showtimesToCreate.length} funciones...`);
            await Showtime.bulkCreate(showtimesToCreate, { 
              transaction,
              validate: true,
              individualHooks: false
            });
            showtimesToCreate.length = 0;
          }
        }
      }
    }

    // Insertar funciones restantes
    if (showtimesToCreate.length > 0) {
      console.log(`🕒 Insertando lote final de ${showtimesToCreate.length} funciones...`);
      await Showtime.bulkCreate(showtimesToCreate, { 
        transaction,
        validate: true,
        individualHooks: false
      });
    }

    console.log(`✅ ${showtimeCounter} funciones creadas.`);

    // ============================================================
    // 5️⃣ CARGAR FUNCIONES CREADAS PARA ASIGNAR RESERVAS
    // ============================================================
    console.log('📥 Cargando funciones para asignar reservas...');
    const showtimes = await Showtime.findAll({ 
      attributes: ['id', 'movie_id', 'room_id', 'date', 'time', 'price', 'available_seats', 'total_seats'],
      transaction 
    });

    console.log(`📊 ${showtimes.length} funciones cargadas para asignar reservas.`);

    // ============================================================
    // 6️⃣ GENERAR RESERVAS REALISTAS (POR LOTES)
    // ============================================================
    console.log('🎟️ Generando reservas realistas por lotes...');
    
    const bookingsToCreate = [];
    const bookingSeatsToCreate = [];
    let totalBookings = 0;
    let totalBookingSeats = 0;
    const bookingBatchSize = 300;

    // Procesar solo un subconjunto de funciones para evitar timeout
    const showtimesSubset = showtimes.slice(0, Math.min(showtimes.length, 2000));
    console.log(`🎯 Procesando ${showtimesSubset.length} funciones para reservas...`);

    for (const showtime of showtimesSubset) {
      const room = roomsWithSeats.find(r => r.id === showtime.room_id);
      if (!room || !room.seats || room.seats.length === 0) continue;

      const seats = room.seats;
      const occupancy = faker.number.int({ min: 30, max: 85 });
      const seatsToBook = Math.floor((room.capacity * occupancy) / 100);
      
      if (seatsToBook === 0) continue;

      const availableSeats = seats.filter(seat => seat.status === 'available');
      const bookedSeats = faker.helpers.arrayElements(
        availableSeats, 
        Math.min(seatsToBook, availableSeats.length)
      );
      
      const showtimeDateTime = new Date(`${showtime.date.toISOString().split('T')[0]}T${showtime.time}`);
      
      const maxUsersPerShowtime = Math.min(users.length, faker.number.int({ min: 5, max: 20 }));
      const randomUsers = faker.helpers.arrayElements(users, maxUsersPerShowtime);

      let seatIndex = 0;
      for (const user of randomUsers) {
        if (seatIndex >= bookedSeats.length) break;

        const seatsPerUser = faker.number.int({ min: 1, max: 4 });
        const seatsForBooking = bookedSeats.slice(seatIndex, seatIndex + seatsPerUser);
        seatIndex += seatsPerUser;
        
        if (seatsForBooking.length === 0) continue;

        let totalPrice = 0;
        const basePrice = parseFloat(showtime.price);

        for (const seat of seatsForBooking) {
          totalPrice += basePrice * getSeatMultiplier(seat.type);
        }

        const serviceFee = totalPrice * 0.05;
        totalPrice = parseFloat((totalPrice + serviceFee).toFixed(2));

        const bookingId = faker.string.uuid();
        const purchaseDate = faker.date.between({ 
          from: new Date(showtimeDateTime.getTime() - (7 * 24 * 60 * 60 * 1000)),
          to: new Date(showtimeDateTime.getTime() - (1 * 60 * 60 * 1000))
        });

        const booking = {
          id: bookingId,
          transaction_id: `TXN-${Date.now()}-${faker.string.alphanumeric(8)}-${totalBookings}`,
          user_id: user.id,
          showtime_id: showtime.id,
          total_price: totalPrice,
          payment_method: faker.helpers.arrayElement(['credit_card', 'debit_card', 'cash']),
          customer_email: user.email,
          status: 'confirmed',
          purchase_date: purchaseDate,
          created_at: new Date(),
          updated_at: new Date()
        };
        bookingsToCreate.push(booking);

        // Asientos para esta reserva
        for (const seat of seatsForBooking) {
          const seatPrice = parseFloat(showtime.price) * getSeatMultiplier(seat.type);
          bookingSeatsToCreate.push({
            id: faker.string.uuid(),
            booking_id: bookingId,
            seat_id: seat.id,
            price: parseFloat(seatPrice.toFixed(2)),
            created_at: new Date(),
            updated_at: new Date()
          });
        }

        totalBookings++;
        totalBookingSeats += seatsForBooking.length;

        // Insertar por lotes
        if (bookingsToCreate.length >= bookingBatchSize) {
          console.log(`💳 Insertando lote de ${bookingsToCreate.length} reservas...`);
          await Booking.bulkCreate(bookingsToCreate, { 
            transaction,
            validate: true,
            individualHooks: false
          });
          await BookingSeat.bulkCreate(bookingSeatsToCreate, { 
            transaction,
            validate: true,
            individualHooks: false
          });
          
          bookingsToCreate.length = 0;
          bookingSeatsToCreate.length = 0;
        }
      }
    }

    // Insertar reservas restantes
    if (bookingsToCreate.length > 0) {
      console.log(`💳 Insertando lote final de ${bookingsToCreate.length} reservas...`);
      await Booking.bulkCreate(bookingsToCreate, { 
        transaction,
        validate: true,
        individualHooks: false
      });
      await BookingSeat.bulkCreate(bookingSeatsToCreate, { 
        transaction,
        validate: true,
        individualHooks: false
      });
    }

    console.log(`✅ ${totalBookings} reservas creadas.`);
    console.log(`✅ ${totalBookingSeats} asientos asociados a reservas.`);

    // ============================================================
    // 7️⃣ ACTUALIZAR ASIENTOS DISPONIBLES EN FUNCIONES - CORREGIDO
    // ============================================================
    console.log('🔄 Actualizando asientos disponibles en funciones...');
    
    // Método CORREGIDO: Contar asientos reservados por función usando consulta directa
    for (const showtime of showtimesSubset) {
      // Consulta directa para contar asientos reservados para esta función
      const result = await BookingSeat.count({
        where: {
          '$booking.showtime_id$': showtime.id
        },
        include: [{
          model: Booking,
          as: 'booking',
          attributes: [],
          required: true
        }],
        transaction
      });

      if (result > 0) {
        await Showtime.update(
          { 
            available_seats: showtime.total_seats - result,
            updated_at: new Date()
          },
          { 
            where: { id: showtime.id },
            transaction 
          }
        );
      }
    }

    // Método alternativo más simple si el anterior falla
    console.log('🔍 Verificando actualización de asientos disponibles...');
    
    // Actualizar todas las funciones basado en las reservas existentes
    const updatedShowtimes = await Showtime.findAll({
      attributes: ['id', 'total_seats'],
      include: [{
        model: Booking,
        as: 'bookings',
        attributes: [],
        required: false
      }],
      transaction
    });

    for (const showtime of updatedShowtimes) {
      const bookedCount = showtime.bookings ? showtime.bookings.length : 0;
      await Showtime.update(
        {
          available_seats: showtime.total_seats - bookedCount,
          updated_at: new Date()
        },
        {
          where: { id: showtime.id },
          transaction
        }
      );
    }

    await transaction.commit();
    console.log('🎉 Poblamiento completado exitosamente para Oracle!');
    console.log('\n📊 RESUMEN FINAL:');
    console.log(`👥 Usuarios: ${users.length}`);
    console.log(`🎬 Funciones: ${showtimeCounter}`);
    console.log(`🎟️ Reservas: ${totalBookings}`);
    console.log(`💺 Asientos reservados: ${totalBookingSeats}`);
    console.log(`📈 Ocupación promedio: ${((totalBookingSeats / (showtimesSubset.length * roomsWithSeats[0].capacity)) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error durante la población:', error);
    await transaction.rollback();
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔒 Conexión cerrada.');
  }
})();