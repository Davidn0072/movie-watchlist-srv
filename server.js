require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { generateText } = require('ai');
const Movie = require('./models/Movie');

const PORT = process.env.PORT || 3000;
const MAX_AI_DESCRIPTION_LENGTH = 180;

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

function parseGeneratedDescription(rawText) {
    try {
        const parsed = JSON.parse(rawText);
        if (parsed && typeof parsed.description === 'string') {
            return parsed.description.trim();
        }
    } catch (err) {
        // Fallback for models that wrap JSON in extra text.
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed && typeof parsed.description === 'string') {
                return parsed.description.trim();
            }
        } catch (err) {
            // Ignore parse failure and fall through.
        }
    }

    return '';
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

app.post('/movies/generate', async (req, res) => {
    try {
        await connectToDatabase();
        const { title, genre } = req.body || {};

        if (!title || !genre) {
            return res.status(400).json({
                message: 'title and genre are required',
            });
        }

        const { text } = await generateText({
            model: 'anthropic/claude-sonnet-4.5',
            prompt: [
                'Return JSON only. No markdown. No explanation.',
                `Create a short movie description up to ${MAX_AI_DESCRIPTION_LENGTH} characters.`,
                `Movie title: ${title}`,
                `Genre: ${genre}`,
                'Expected JSON format: {"description":"..."}',
            ].join('\n'),
        });

        const description = parseGeneratedDescription(text);
        if (!description) {
            return res.status(502).json({
                message: 'AI response did not include a valid description JSON',
            });
        }
        if (description.length > MAX_AI_DESCRIPTION_LENGTH) {
            return res.status(422).json({
                message: `AI description is too long. Maximum allowed is ${MAX_AI_DESCRIPTION_LENGTH} characters.`,
            });
        }

        res.json({ description });
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