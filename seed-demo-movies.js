require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('./models/Movie');

const demoMovies = [
  {
    title: 'Inception',
    genre: 'Sci-Fi',
    description: 'A skilled thief enters dreams to steal secrets and plant an idea.',
  },
  {
    title: 'Interstellar',
    genre: 'Sci-Fi',
    description: 'A pilot travels through a wormhole to save humanity from extinction.',
  },
  {
    title: 'Whiplash',
    genre: 'Drama',
    description: 'A young drummer faces a brutal mentor while chasing greatness.',
  },
  {
    title: 'Parasite',
    genre: 'Thriller',
    description: 'Two families from opposite classes become dangerously intertwined.',
  },
  {
    title: 'Coco',
    genre: 'Animation',
    description: 'A boy journeys through the Land of the Dead to find his roots.',
  },
  {
    title: 'Gladiator',
    genre: 'Action',
    description: 'A betrayed Roman general fights as a gladiator for justice.',
  },
  {
    title: 'The Matrix',
    genre: 'Sci-Fi',
    description: 'A hacker discovers reality is a simulation controlled by machines.',
  },
  {
    title: 'La La Land',
    genre: 'Romance',
    description: 'Two artists fall in love while pursuing their creative dreams.',
  },
  {
    title: 'Joker',
    genre: 'Crime',
    description: 'A lonely comedian descends into madness in a broken city.',
  },
  {
    title: 'Up',
    genre: 'Adventure',
    description: 'An old man and a boy scout fly to South America by balloons.',
  },
];

async function seedDemoMovies() {
  const dbUrl = process.env.DB_URL;
  if (!dbUrl) {
    throw new Error('DB_URL is missing in .env');
  }

  await mongoose.connect(dbUrl, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  try {
    const titles = demoMovies.map((movie) => movie.title);
    await Movie.deleteMany({ title: { $in: titles } });
    await Movie.insertMany(demoMovies);
    console.log(`Seed completed: inserted ${demoMovies.length} demo movies.`);
  } finally {
    await mongoose.connection.close();
  }
}

seedDemoMovies()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
