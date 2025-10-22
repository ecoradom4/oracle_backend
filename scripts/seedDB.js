require('dotenv').config();
const { sequelize, Movie } = require('../src/models');

class MovieSeeder {
  constructor() {
    this.movies = [];
  }

  async run() {
    try {
      console.log('🎬 Iniciando seeding de películas...');
      await sequelize.authenticate();
      console.log('✅ Conectado a la base de datos');

      // No eliminamos otras tablas, solo aseguramos que Movie exista
      await Movie.sync({ force: true });
      console.log('✅ Tabla "Movies" sincronizada');

      await this.seedMovies();

      console.log(`🎉 ${this.movies.length} películas creadas exitosamente`);
    } catch (error) {
      console.error('❌ Error en seeding de películas:', error);
      process.exit(1);
    } finally {
      await sequelize.close();
      console.log('🔌 Conexión cerrada');
    }
  }

  async seedMovies() {
    console.log('🎥 Insertando 30 películas (precios entre 35 y 50 GTQ)...');

    const moviesData = [
      {
        title: 'Oppenheimer',
        genre: 'Drama',
        duration: 180,
        rating: 8.6,
        description: 'La historia del físico J. Robert Oppenheimer y su papel en el desarrollo de la bomba atómica.',
        price: 48.00,
        release_date: '2023-07-21',
        status: 'active'
      },
      {
        title: 'Barbie',
        genre: 'Comedia',
        duration: 114,
        rating: 7.0,
        description: 'Barbie comienza a cuestionar su mundo perfecto y se embarca en una aventura en el mundo real.',
        price: 40.00,
        release_date: '2023-07-21',
        status: 'active'
      },
      {
        title: 'Dune: Parte Dos',
        genre: 'Ciencia Ficción',
        duration: 166,
        rating: 8.8,
        description: 'Paul Atreides une fuerzas con los Fremen para liberar Arrakis del control imperial.',
        price: 50.00,
        release_date: '2024-03-01',
        status: 'active'
      },
      {
        title: 'Napoleón',
        genre: 'Histórico',
        duration: 158,
        rating: 6.8,
        description: 'El ascenso y caída de Napoleón Bonaparte, vista a través de su relación con Josefina.',
        price: 46.00,
        release_date: '2023-11-22',
        status: 'active'
      },
      {
        title: 'Wonka',
        genre: 'Fantasía',
        duration: 116,
        rating: 7.2,
        description: 'Un joven Willy Wonka se embarca en una aventura para abrir su fábrica de chocolate.',
        price: 39.00,
        release_date: '2023-12-15',
        status: 'active'
      },
      {
        title: 'The Flash',
        genre: 'Superhéroes',
        duration: 144,
        rating: 6.8,
        description: 'Barry Allen usa sus poderes para alterar el pasado y desata el caos en el futuro.',
        price: 42.00,
        release_date: '2023-06-16',
        status: 'active'
      },
      {
        title: 'Misión Imposible: Sentencia Mortal - Parte 1',
        genre: 'Acción',
        duration: 163,
        rating: 7.7,
        description: 'Ethan Hunt y su equipo enfrentan la misión más peligrosa de sus vidas.',
        price: 45.00,
        release_date: '2023-07-12',
        status: 'active'
      },
      {
        title: 'The Marvels',
        genre: 'Acción',
        duration: 105,
        rating: 6.0,
        description: 'Carol Danvers, Kamala Khan y Monica Rambeau deben unir fuerzas ante un nuevo enemigo.',
        price: 41.00,
        release_date: '2023-11-10',
        status: 'active'
      },
      {
        title: 'Godzilla x Kong: El Nuevo Imperio',
        genre: 'Acción',
        duration: 115,
        rating: 6.4,
        description: 'Godzilla y Kong deben unirse para enfrentar a una amenaza colosal en la Tierra.',
        price: 44.00,
        release_date: '2024-03-29',
        status: 'active'
      },
      {
        title: 'Inside Out 2',
        genre: 'Animación',
        duration: 96,
        rating: 8.0,
        description: 'Riley entra en la adolescencia y surgen nuevas emociones en su mente.',
        price: 38.00,
        release_date: '2024-06-14',
        status: 'active'
      },
      {
        title: 'The Batman',
        genre: 'Acción',
        duration: 176,
        rating: 7.8,
        description: 'Batman enfrenta a un asesino en serie que ataca a la élite corrupta de Gotham.',
        price: 39.00,
        release_date: '2022-03-04',
        status: 'active'
      },
      {
        title: 'John Wick: Capítulo 4',
        genre: 'Acción',
        duration: 169,
        rating: 7.8,
        description: 'John Wick busca su libertad enfrentándose a poderosos enemigos alrededor del mundo.',
        price: 42.00,
        release_date: '2023-03-24',
        status: 'active'
      },
      {
        title: 'Avatar: El Sentido del Agua',
        genre: 'Ciencia Ficción',
        duration: 192,
        rating: 7.6,
        description: 'Jake Sully y Neytiri deben dejar su hogar y explorar nuevas regiones de Pandora.',
        price: 50.00,
        release_date: '2022-12-16',
        status: 'active'
      },
      {
        title: 'Top Gun: Maverick',
        genre: 'Acción',
        duration: 130,
        rating: 8.2,
        description: 'Pete "Maverick" Mitchell entrena a una nueva generación de pilotos de combate.',
        price: 35.00,
        release_date: '2022-05-27',
        status: 'active'
      },
      {
        title: 'Doctor Strange en el Multiverso de la Locura',
        genre: 'Fantasía',
        duration: 126,
        rating: 6.9,
        description: 'El Dr. Strange enfrenta las consecuencias de abrir un portal al multiverso.',
        price: 38.00,
        release_date: '2022-05-06',
        status: 'active'
      },
      {
        title: 'Black Panther: Wakanda Forever',
        genre: 'Acción',
        duration: 161,
        rating: 6.7,
        description: 'Los héroes de Wakanda luchan por proteger su reino tras la muerte del rey T’Challa.',
        price: 42.00,
        release_date: '2022-11-11',
        status: 'active'
      },
      {
        title: 'Guardians of the Galaxy Vol. 3',
        genre: 'Ciencia Ficción',
        duration: 150,
        rating: 8.2,
        description: 'Los Guardianes deben unirse nuevamente para proteger el universo y a uno de los suyos.',
        price: 45.00,
        release_date: '2023-05-05',
        status: 'active'
      },
      {
        title: 'Joker: Folie à Deux',
        genre: 'Drama',
        duration: 139,
        rating: 7.9,
        description: 'Arthur Fleck regresa en un nuevo capítulo musical de locura y caos.',
        price: 47.00,
        release_date: '2024-10-04',
        status: 'active'
      },
      {
        title: 'Deadpool 3',
        genre: 'Comedia',
        duration: 130,
        rating: 8.1,
        description: 'Deadpool une fuerzas con Wolverine en una aventura que romperá el multiverso.',
        price: 48.00,
        release_date: '2024-07-26',
        status: 'active'
      },
      {
        title: 'Venom 3',
        genre: 'Acción',
        duration: 128,
        rating: 7.0,
        description: 'Eddie Brock y Venom enfrentan una nueva amenaza simbiótica que pone en riesgo a la humanidad.',
        price: 43.00,
        release_date: '2024-11-08',
        status: 'active'
      },
      {
        title: 'The Matrix Resurrections',
        genre: 'Ciencia Ficción',
        duration: 148,
        rating: 5.7,
        description: 'Neo debe volver a elegir entre seguir la ilusión o liberar la mente de la humanidad.',
        price: 37.00,
        release_date: '2021-12-22',
        status: 'active'
      },
      {
        title: 'Tenet',
        genre: 'Ciencia Ficción',
        duration: 150,
        rating: 7.3,
        description: 'Un agente debe manipular el flujo del tiempo para evitar la Tercera Guerra Mundial.',
        price: 40.00,
        release_date: '2020-08-26',
        status: 'active'
      },
      {
        title: 'Shang-Chi y la Leyenda de los Diez Anillos',
        genre: 'Acción',
        duration: 132,
        rating: 7.4,
        description: 'Shang-Chi debe confrontar su pasado y a su padre, el líder de una poderosa organización.',
        price: 39.00,
        release_date: '2021-09-03',
        status: 'active'
      },
      {
        title: 'Eternals',
        genre: 'Fantasía',
        duration: 157,
        rating: 6.3,
        description: 'Un grupo de seres inmortales regresa para proteger a la humanidad de los Desviantes.',
        price: 36.00,
        release_date: '2021-11-05',
        status: 'active'
      },
      {
        title: 'Encanto',
        genre: 'Animación',
        duration: 102,
        rating: 7.3,
        description: 'Una familia mágica vive en las montañas de Colombia, donde cada miembro tiene un don único.',
        price: 37.00,
        release_date: '2021-11-24',
        status: 'active'
      },
      {
        title: 'Lightyear',
        genre: 'Animación',
        duration: 105,
        rating: 6.0,
        description: 'La historia del legendario guardián espacial que inspiró el juguete de Buzz Lightyear.',
        price: 35.00,
        release_date: '2022-06-17',
        status: 'active'
      },
      {
        title: 'The Suicide Squad',
        genre: 'Acción',
        duration: 132,
        rating: 7.2,
        description: 'Un grupo de supervillanos es enviado a una misión suicida en una isla sudamericana.',
        price: 38.00,
        release_date: '2021-08-06',
        status: 'active'
      },
      {
        title: 'No Time To Die',
        genre: 'Acción',
        duration: 163,
        rating: 7.3,
        description: 'James Bond debe enfrentarse a un villano con una nueva tecnología biológica mortal.',
        price: 44.00,
        release_date: '2021-10-08',
        status: 'active'
      },
      {
        title: 'The Whale',
        genre: 'Drama',
        duration: 117,
        rating: 8.1,
        description: 'Un profesor solitario con obesidad mórbida intenta reconectarse con su hija adolescente.',
        price: 41.00,
        release_date: '2022-12-09',
        status: 'active'
      },
      {
        title: 'Killers of the Flower Moon',
        genre: 'Crimen',
        duration: 206,
        rating: 8.0,
        description: 'Una serie de asesinatos en la nación Osage revela una conspiración aterradora en los años 20.',
        price: 50.00,
        release_date: '2023-10-20',
        status: 'active'
      }
    ];

    this.movies = await Movie.bulkCreate(moviesData);
    console.log(`✅ ${this.movies.length} películas insertadas`);
  }
}

// Ejecutar seeder
const seeder = new MovieSeeder();
seeder.run();
