// scripts/seedDatabase.js
require('dotenv').config();
const { sequelize, User, Movie, Room, Showtime, Seat, Booking, BookingSeat } = require('../src/models');
const bcrypt = require('bcryptjs');

class DatabaseSeeder {
  constructor() {
    this.users = [];
    this.movies = [];
    this.rooms = [];
    this.showtimes = [];
    this.seats = [];
    this.usedTimeSlots = new Map(); // Para trackear horarios usados por sala y fecha
  }

  async run() {
    try {
      console.log('🚀 Iniciando seeding de base de datos para Guatemala...');
      
      await sequelize.authenticate();
      console.log('✅ Conectado a la base de datos');

      // Sincronizar modelos
      await sequelize.sync({ force: true });
      console.log('✅ Tablas creadas');

      // Ejecutar seeders en orden
      await this.seedUsers();
      await this.seedMovies();
      await this.seedRooms();
      await this.seedSeats();
      await this.seedShowtimes();
      await this.seedBookings();

      console.log('🎉 Base de datos poblada exitosamente!');
      console.log('📊 Resumen:');
      console.log(`   👥 Usuarios: ${this.users.length}`);
      console.log(`   🎬 Películas: ${this.movies.length}`);
      console.log(`   🎪 Salas: ${this.rooms.length}`);
      console.log(`   💺 Asientos: ${this.seats.length}`);
      console.log(`   🕒 Funciones: ${this.showtimes.length}`);
      console.log(`   🎟️  Reservas: ${await Booking.count()}`);

    } catch (error) {
      console.error('❌ Error en seeding:', error);
      process.exit(1);
    }
  }

  async seedUsers() {
    console.log('👥 Creando usuarios...');
    
    const usersData = [
      {
        name: 'Administrador CineConnect',
        email: 'admin@cineconnect.com',
        password: await bcrypt.hash('password123', 12),
        role: 'admin',
        phone: '+502 1234-5678'
      },
      {
        name: 'Juan Pérez',
        email: 'juan@example.com',
        password: await bcrypt.hash('password123', 12),
        role: 'cliente',
        phone: '+502 2345-6789'
      },
      {
        name: 'María García',
        email: 'maria@example.com',
        password: await bcrypt.hash('password123', 12),
        role: 'cliente',
        phone: '+502 3456-7890'
      },
      {
        name: 'Carlos López',
        email: 'carlos@example.com',
        password: await bcrypt.hash('password123', 12),
        role: 'cliente',
        phone: '+502 4567-8901'
      },
      {
        name: 'Ana Martínez',
        email: 'ana@example.com',
        password: await bcrypt.hash('password123', 12),
        role: 'cliente',
        phone: '+502 5678-9012'
      }
    ];

    this.users = await User.bulkCreate(usersData);
    console.log(`✅ ${this.users.length} usuarios creados`);
  }

  async seedMovies() {
    console.log('🎬 Creando películas con precios en GTQ...');
    
    const moviesData = [
      {
        title: 'Guardianes de la Galaxia Vol. 3',
        genre: 'Ciencia Ficción',
        duration: 150,
        rating: 8.2,
        poster: 'https://m.media-amazon.com/images/M/MV5BMDgxOTdjMzYtZGQxMS00ZTAzLWI4Y2UtMTQzN2VlYjYyZWRiXkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_SX300.jpg',
        description: 'Peter Quill debe reunir a su equipo para defender el universo y proteger a uno de los suyos. Si la misión no es completamente exitosa, podría ser el fin de los Guardianes tal como los conocemos.',
        price: 45.00,
        release_date: '2023-05-05',
        status: 'active'
      },
      {
        title: 'Spider-Man: A Través del Spider-Verso',
        genre: 'Animación',
        duration: 140,
        rating: 9.1,
        poster: 'https://m.media-amazon.com/images/M/MV5BMzI0NmVkMjEtYmY4MS00ZDMxLTlkZmEtMzU4MDQxYTMzMjU2XkEyXkFqcGdeQXVyMzQ0MzA0NTM@._V1_SX300.jpg',
        description: 'Miles Morales regresa para la próxima aventura del Spider-Verse, una epopeya que transportará al amigable vecino de Brooklyn Spider-Man a través del Multiverso.',
        price: 40.00,
        release_date: '2023-06-02',
        status: 'active'
      },
      {
        title: 'John Wick: Capítulo 4',
        genre: 'Acción',
        duration: 169,
        rating: 7.8,
        poster: 'https://m.media-amazon.com/images/M/MV5BMDExZGMyOTMtMDgyYi00NGIwLWJhMTEtOTdkZGFjNmZiMTEwXkEyXkFqcGdeQXVyMjMwODc5Mw@@._V1_SX300.jpg',
        description: 'John Wick descubre un camino para derrotar a la Mesa Directiva. Pero antes de que pueda ganar su libertad, Wick debe enfrentarse a un nuevo enemigo con poderosas alianzas en todo el mundo.',
        price: 42.00,
        release_date: '2023-03-24',
        status: 'active'
      },
      {
        title: 'The Batman',
        genre: 'Acción',
        duration: 176,
        rating: 7.8,
        poster: 'https://m.media-amazon.com/images/M/MV5BMDdmMTBiNTYtMDIzNi00NGVlLWIzMDYtZTk3MTQ3NGQxZGEwXkEyXkFqcGdeQXVyMzMwOTU5MDk@._V1_SX300.jpg',
        description: 'Batman se sumerge en las profundidades de la corrupción de Gotham City cuando un asesino apunta a la élite de la ciudad con una serie de maquinaciones sádicas.',
        price: 38.00,
        release_date: '2022-03-04',
        status: 'active'
      },
      {
        title: 'Avatar: El Sentido del Agua',
        genre: 'Ciencia Ficción',
        duration: 192,
        rating: 7.6,
        poster: 'https://m.media-amazon.com/images/M/MV5BYjhiNjBlODctY2ZiOC00YjVlLWFlNzAtNTVhNzM1YjI1NzMxXkEyXkFqcGdeQXVyMjQxNTE1MDA@._V1_SX300.jpg',
        description: 'Jake Sully y Neytiri han formado una familia y hacen todo lo posible por permanecer juntos. Sin embargo, deben abandonar su hogar y explorar las regiones de Pandora.',
        price: 50.00,
        release_date: '2022-12-16',
        status: 'active'
      },
      {
        title: 'Top Gun: Maverick',
        genre: 'Acción',
        duration: 130,
        rating: 8.2,
        poster: 'https://m.media-amazon.com/images/M/MV5BZWYzOGEwNTgtNWU3NS00ZTQ0LWJkODUtMmVhMjIwMjA1ZmQwXkEyXkFqcGdeQXVyMjkwOTAyMDU@._V1_SX300.jpg',
        description: 'Después de más de treinta años de servicio como uno de los mejores aviadores de la Marina, Pete "Maverick" Mitchell está de vuelta donde pertenece.',
        price: 35.00,
        release_date: '2022-05-27',
        status: 'active'
      },
      {
        title: 'Black Panther: Wakanda Forever',
        genre: 'Acción',
        duration: 161,
        rating: 6.7,
        poster: 'https://m.media-amazon.com/images/M/MV5BNTM4NjIxNmEtYWE5NS00NDczLTkyNWQtYThhNmQyZGQzMjM0XkEyXkFqcGdeQXVyODk4OTc3MTY@._V1_SX300.jpg',
        description: 'El pueblo de Wakanda lucha para embarcarse en un nuevo capítulo mientras los héroes restantes deben intervenir y forjar un nuevo camino para el reino de Wakanda.',
        price: 42.00,
        release_date: '2022-11-11',
        status: 'active'
      },
      {
        title: 'Doctor Strange en el Multiverso de la Locura',
        genre: 'Fantasía',
        duration: 126,
        rating: 6.9,
        poster: 'https://m.media-amazon.com/images/M/MV5BNWM0ZGJlMzMtZmYwMi00NzI3LTgzMzMtNjMzNjliNDRmZmFlXkEyXkFqcGdeQXVyMTM1MTE1NDMx._V1_SX300.jpg',
        description: 'El Dr. Stephen Strange abre un portal al multiverso al usar un hechizo prohibido. Ahora su equipo debe enfrentarse a una amenaza que podría destruirlo todo.',
        price: 38.00,
        release_date: '2022-05-06',
        status: 'active'
      }
    ];

    this.movies = await Movie.bulkCreate(moviesData);
    console.log(`✅ ${this.movies.length} películas creadas con precios en GTQ`);
  }

  async seedRooms() {
    console.log('🎪 Creando salas de cine...');
    
    const roomsData = [
      {
        name: 'Sala 1 - Premium',
        capacity: 120,
        type: 'Premium',
        status: 'active',
        location: 'Planta Baja'
      },
      {
        name: 'Sala 2 - IMAX',
        capacity: 180,
        type: 'IMAX',
        status: 'active',
        location: 'Planta Baja'
      },
      {
        name: 'Sala 3 - Estándar',
        capacity: 150,
        type: 'Estándar',
        status: 'active',
        location: 'Primer Piso'
      },
      {
        name: 'Sala 4 - VIP',
        capacity: 80,
        type: 'VIP',
        status: 'active',
        location: 'Primer Piso'
      },
      {
        name: 'Sala 5 - 4DX',
        capacity: 100,
        type: '4DX',
        status: 'active',
        location: 'Segundo Piso'
      },
      {
        name: 'Sala 6 - Estándar',
        capacity: 140,
        type: 'Estándar',
        status: 'maintenance',
        location: 'Segundo Piso'
      }
    ];

    this.rooms = await Room.bulkCreate(roomsData);
    console.log(`✅ ${this.rooms.length} salas creadas`);
  }

  async seedSeats() {
    console.log('💺 Creando asientos para cada sala...');
    
    const seatTypes = {
      'Estándar': { vip: 2, premium: 4, standard: 'resto' },
      'Premium': { vip: 3, premium: 5, standard: 'resto' },
      'VIP': { vip: 4, premium: 4, standard: 'resto' },
      'IMAX': { vip: 3, premium: 6, standard: 'resto' },
      '4DX': { vip: 3, premium: 5, standard: 'resto' }
    };

    for (const room of this.rooms) {
      if (room.status === 'maintenance') continue;

      const seats = [];
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      const config = seatTypes[room.type];
      
      let seatCount = 0;
      const seatsPerRow = Math.ceil(room.capacity / rows.length);

      for (const row of rows) {
        for (let number = 1; number <= seatsPerRow; number++) {
          if (seatCount >= room.capacity) break;

          let type = 'standard';
          const rowIndex = rows.indexOf(row);
          
          if (rowIndex < config.vip) type = 'vip';
          else if (rowIndex < config.vip + config.premium) type = 'premium';

          seats.push({
            room_id: room.id,
            row,
            number,
            type,
            status: Math.random() < 0.05 ? 'maintenance' : 'available'
          });

          seatCount++;
        }
        if (seatCount >= room.capacity) break;
      }

      const roomSeats = await Seat.bulkCreate(seats);
      this.seats.push(...roomSeats);
    }

    console.log(`✅ ${this.seats.length} asientos creados`);
  }

  async seedShowtimes() {
    console.log('🕒 Creando funciones sin conflictos...');
    
    const showtimes = [];
    const today = new Date();
    
    // Horarios disponibles
    const allTimeSlots = ['14:00', '16:30', '19:00', '21:30'];
    
    // Crear funciones para los próximos 7 días
    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      const dateString = date.toISOString().split('T')[0];

      // Reiniciar el tracker para cada día
      this.usedTimeSlots.set(dateString, new Set());

      for (const movie of this.movies) {
        // Cada película tiene 1-2 funciones por día
        const availableSlots = this.getAvailableTimeSlots(dateString, allTimeSlots);
        if (availableSlots.length === 0) continue;

        const movieShowtimes = this.getRandomElements(availableSlots, Math.min(2, availableSlots.length));
        
        for (const time of movieShowtimes) {
          const room = this.getAvailableRoom(dateString, time);
          if (!room) continue;

          const basePrice = movie.price;
          const roomPremium = this.getRoomPremium(room.type);
          const finalPrice = basePrice + roomPremium;

          showtimes.push({
            movie_id: movie.id,
            room_id: room.id,
            date: dateString,
            time: time,
            price: finalPrice,
            available_seats: room.capacity - Math.floor(Math.random() * 20),
            total_seats: room.capacity
          });

          // Marcar este horario como usado para esta sala y fecha
          this.markTimeSlotUsed(dateString, time, room.id);
        }
      }
    }

    // Crear funciones en lotes más pequeños para evitar timeout
    const batchSize = 20;
    for (let i = 0; i < showtimes.length; i += batchSize) {
      const batch = showtimes.slice(i, i + batchSize);
      const createdShowtimes = await Showtime.bulkCreate(batch);
      this.showtimes.push(...createdShowtimes);
    }

    console.log(`✅ ${this.showtimes.length} funciones creadas sin conflictos`);
  }

  // En el método seedBookings del script seedDatabase.js - CORREGIR:

async seedBookings() {
  console.log('🎟️ Creando reservas de ejemplo...');
  
  const bookings = [];
  const clients = this.users.filter(user => user.role === 'cliente');

  // Crear algunas reservas para funciones futuras
  for (let i = 0; i < 15; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    const showtime = this.showtimes[Math.floor(Math.random() * this.showtimes.length)];
    
    // Verificar que la función sea futura
    const showtimeDate = new Date(`${showtime.date}T${showtime.time}`);
    if (showtimeDate <= new Date()) continue;

    const seatCount = Math.floor(Math.random() * 4) + 1;
    const roomSeats = this.seats.filter(seat => seat.room_id === showtime.room_id && seat.status === 'available');
    
    if (roomSeats.length < seatCount) continue;

    const selectedSeats = this.getRandomElements(roomSeats, seatCount);
    
    // CORRECCIÓN: Calcular correctamente el total_price como número
    let totalPrice = 0;
    selectedSeats.forEach(seat => {
      const seatPremium = this.getSeatPremium(seat.type);
      totalPrice += parseFloat(showtime.price) + seatPremium; // Asegurar que es número
    });

    // CORRECCIÓN: Redondear a 2 decimales
    totalPrice = parseFloat(totalPrice.toFixed(2));

    const booking = await Booking.create({
      transaction_id: `TXN-${Date.now()}-${i}`,
      user_id: client.id,
      showtime_id: showtime.id,
      total_price: totalPrice, // Ahora es un número válido
      status: 'confirmed',
      payment_method: ['Tarjeta de Crédito', 'Tarjeta de Débito', 'Efectivo'][Math.floor(Math.random() * 3)],
      customer_email: client.email,
      purchase_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    });

    // Crear booking seats
    const bookingSeatsData = selectedSeats.map(seat => {
      const seatPrice = parseFloat(showtime.price) + this.getSeatPremium(seat.type);
      return {
        booking_id: booking.id,
        seat_id: seat.id,
        price: parseFloat(seatPrice.toFixed(2)) // Asegurar que es número
      };
    });

    await BookingSeat.bulkCreate(bookingSeatsData);
    bookings.push(booking);
  }

  console.log(`✅ ${bookings.length} reservas creadas`);
}

  // MÉTODOS AUXILIARES MEJORADOS

  getAvailableTimeSlots(dateString, allSlots) {
    const usedSlots = this.usedTimeSlots.get(dateString) || new Set();
    return allSlots.filter(slot => !usedSlots.has(slot));
  }

  getAvailableRoom(dateString, time) {
    const availableRooms = this.rooms.filter(room => 
      room.status === 'active' && 
      !this.isTimeSlotUsed(dateString, time, room.id)
    );
    return availableRooms.length > 0 ? availableRooms[Math.floor(Math.random() * availableRooms.length)] : null;
  }

  isTimeSlotUsed(dateString, time, roomId) {
    const key = `${dateString}-${time}-${roomId}`;
    const usedSlots = this.usedTimeSlots.get(dateString);
    return usedSlots ? usedSlots.has(key) : false;
  }

  markTimeSlotUsed(dateString, time, roomId) {
    const key = `${dateString}-${time}-${roomId}`;
    if (!this.usedTimeSlots.has(dateString)) {
      this.usedTimeSlots.set(dateString, new Set());
    }
    this.usedTimeSlots.get(dateString).add(key);
  }

  getRandomElements(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  getRoomPremium(roomType) {
    const premiums = {
      'Estándar': 0,
      'Premium': 10,
      'VIP': 20,
      'IMAX': 15,
      '4DX': 25
    };
    return premiums[roomType] || 0;
  }

  getSeatPremium(seatType) {
    const premiums = {
      'standard': 0,
      'premium': 5,
      'vip': 10
    };
    return premiums[seatType] || 0;
  }
}

// Ejecutar el seeder
const seeder = new DatabaseSeeder();
seeder.run().then(() => {
  console.log('✨ Seeding completado exitosamente!');
  console.log('🎬 Ahora puedes probar los endpoints:');
  console.log('   📊 GET /api/dashboard/stats');
  console.log('   🎬 GET /api/movies');
  console.log('   🕒 GET /api/showtimes');
  console.log('   👥 Usa admin@cineconnect.com / password123 para login');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error en seeding:', error);
  process.exit(1);
});