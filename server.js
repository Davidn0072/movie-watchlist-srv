require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Hello From Backend' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});