/**
 * Seeder de funciones y reservas realistas (2024–2025)
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
    console.log('🚀 Poblando usuarios, funciones y reservas...');

    // ============================================================
    // 1️⃣ CREAR USUARIOS
    // ============================================================
    console.log('👥 Creando ~3000 usuarios (cliente) para dar realismo...');
    const userCount = 3000;

    const usersData = Array.from({ length: userCount }).map(() => ({
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password({ length: 10 }),
      role: 'cliente',
      phone: `+502 ${faker.number.int({ min: 10000000, max: 99999999 })}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const users = await User.bulkCreate(usersData, { returning: true, transaction });
    console.log(`✅ Usuarios creados: ${users.length}`);

    // ============================================================
    // 2️⃣ CARGAR DATOS EXISTENTES
    // ============================================================
    const movies = await Movie.findAll();
    const rooms = await Room.findAll({ include: [{ model: Seat, as: 'seats' }] });
    if (movies.length === 0 || rooms.length === 0) throw new Error('No hay películas o salas registradas.');

    console.log(`🎬 ${movies.length} películas encontradas.`);
    console.log(`🏢 ${rooms.length} salas encontradas.`);

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

    for (const room of rooms) {
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const numShowtimes = faker.number.int({ min: 3, max: 4 });
        const selectedTimes = faker.helpers.arrayElements(times, numShowtimes);
        const movieSubset = faker.helpers.arrayElements(movies, numShowtimes);

        for (let i = 0; i < numShowtimes; i++) {
          const movie = movieSubset[i];
          const basePrice = parseFloat(movie.price) * getRoomMultiplier(room.type);

          showtimesToCreate.push({
            movie_id: movie.id,
            room_id: room.id,
            date: d.toISOString().split('T')[0],
            time: selectedTimes[i],
            price: basePrice.toFixed(2),
            available_seats: room.capacity,
            total_seats: room.capacity,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }

    console.log(`🕒 Creando ${showtimesToCreate.length.toLocaleString()} funciones...`);
    const showtimes = await Showtime.bulkCreate(showtimesToCreate, { returning: true, transaction });
    console.log(`✅ ${showtimes.length} funciones creadas.`);

    // ============================================================
    // 5️⃣ GENERAR RESERVAS REALISTAS
    // ============================================================
    console.log('🎟️ Generando reservas realistas...');
    const bookingsToCreate = [];
    const bookingSeatsToCreate = [];

    for (const showtime of showtimes) {
      const room = rooms.find(r => r.id === showtime.room_id);
      if (!room) continue;
      const seats = room.seats;
      const occupancy = faker.number.int({ min: 60, max: 100 });
      const seatsToBook = Math.floor((room.capacity * occupancy) / 100);
      const bookedSeats = faker.helpers.arrayElements(seats, seatsToBook);

      const showtimeDateTime = new Date(`${showtime.date}T${showtime.time}`);
      const randomUsers = faker.helpers.arrayElements(users, Math.min(bookedSeats.length, faker.number.int({ min: 5, max: 15 })));

      let seatIndex = 0;
      for (const user of randomUsers) {
        const seatsPerUser = faker.number.int({ min: 1, max: 5 });
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

        const booking = {
          transaction_id: `TXN-${Date.now()}-${faker.string.alphanumeric(6)}`,
          user_id: user.id,
          showtime_id: showtime.id,
          total_price: totalPrice,
          payment_method: faker.helpers.arrayElement(['Tarjeta de Crédito']),
          customer_email: user.email,
          status: 'confirmed',
          purchase_date: faker.date.between({ from: new Date('2024-09-01'), to: showtimeDateTime }),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        bookingsToCreate.push(booking);
      }
    }

    console.log(`💳 Creando ${bookingsToCreate.length.toLocaleString()} reservas...`);
    const createdBookings = await Booking.bulkCreate(bookingsToCreate, { returning: true, transaction });

    // Crear asientos asociados
    for (const booking of createdBookings) {
      const showtime = showtimes.find(s => s.id === booking.showtime_id);
      const room = rooms.find(r => r.id === showtime.room_id);
      const seats = room.seats;
      const seatsForBooking = faker.helpers.arrayElements(seats, faker.number.int({ min: 1, max: 5 }));

      for (const seat of seatsForBooking) {
        const seatPrice = parseFloat(showtime.price) * getSeatMultiplier(seat.type);
        bookingSeatsToCreate.push({
          booking_id: booking.id,
          seat_id: seat.id,
          price: seatPrice.toFixed(2),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    await BookingSeat.bulkCreate(bookingSeatsToCreate, { transaction });
    console.log(`✅ ${bookingSeatsToCreate.length} asientos asociados a reservas.`);

    await transaction.commit();
    console.log('🎉 Poblamiento completado exitosamente.');

  } catch (error) {
    console.error('❌ Error durante la población:', error);
    await transaction.rollback();
  } finally {
    await sequelize.close();
  }
})();
