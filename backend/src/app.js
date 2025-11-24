const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { connectToDatabase } = require('./config/mongo');
const routes = require('./routes');
const Verifier = require('./models/Verifier');

const app = express();

// Configure CORS to allow credentials
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'verifier-data']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.json());

connectToDatabase();

app.use('/', routes);

module.exports = app;

// Best-effort cleanup: drop legacy unique index on Verifier.department to allow multiple verifiers per department
(async () => {
  try {
    // Wait briefly to ensure connection established
    await new Promise(r => setTimeout(r, 100));
    if (Verifier && Verifier.collection) {
      await Verifier.collection.dropIndex('department_1');
      // eslint-disable-next-line no-console
      console.log('Dropped legacy unique index department_1 on Verifier');
    }
  } catch (err) {
    // Ignore if index not found; log other errors
    if (!err || (err.codeName !== 'IndexNotFound' && err.code !== 27)) {
      // eslint-disable-next-line no-console
      console.warn('Index cleanup warning (Verifier.department):', err && err.message ? err.message : err);
    }
  }
})();

