require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { generateText } = require('ai');
const Movie = require('./models/Movie');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

let cachedConnection = null;

async function connectToDatabase() {
    if (cachedConnection) {
        return cachedConnection;
    }

    const DB_URL = process.env.DB_URL;
    if (!DB_URL) {
        throw new Error('Missing DB_URL in environment variables');
    }

    const connection = await mongoose.connect(DB_URL, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    });

    cachedConnection = connection;
    return connection;
}

function normalizeMoviePayload(body = {}) {
    return {
        title: body.title,
        genre: body.genre,
        description: body.description,
    };
}

app.get('/', (req, res) => {
    res.json({ message: 'Hello From Backend' });
});

app.get('/movies', async (req, res) => {
    try {
        await connectToDatabase();
        const movies = await Movie.find().sort({ createdAt: -1 });
        res.json(movies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/movies', async (req, res) => {
    try {
        await connectToDatabase();
        const movie = new Movie(normalizeMoviePayload(req.body));
        await movie.save();
        res.status(201).json(movie);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.get('/movies/search', async (req, res) => {
    try {
        await connectToDatabase();
        const name = String(req.query.name || '').trim();
        const filter = name
            ? { title: { $regex: name, $options: 'i' } }
            : {};
        const movies = await Movie.find(filter).sort({ createdAt: -1 });
        res.json(movies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.delete('/movies/:id', async (req, res) => {
    try {
        await connectToDatabase();
        const deletedMovie = await Movie.findByIdAndDelete(req.params.id);
        if (!deletedMovie) {
            return res.status(404).json({ message: 'Movie not found' });
        }
        res.json({ message: 'Movie deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.patch('/movies/:id', async (req, res) => {
    try {
        await connectToDatabase();
        const updates = normalizeMoviePayload(req.body);

        const fieldsToUpdate = Object.fromEntries(
            Object.entries(updates).filter(([, value]) => value !== undefined)
        );

        if (Object.keys(fieldsToUpdate).length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        const updatedMovie = await Movie.findByIdAndUpdate(
            req.params.id,
            fieldsToUpdate,
            { new: true, runValidators: true }
        );

        if (!updatedMovie) {
            return res.status(404).json({ message: 'Movie not found' });
        }

        res.json(updatedMovie);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});