// backend/src/app.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { connectToDatabase } = require('./config/mongo');
const routes = require('./routes');
const sessionRoutes = require('./routes/sessionRoutes');
const Verifier = require('./models/Verifier');
const { initializeSocket } = require('./utils/socketActivityEmitter');

const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize Socket.io for activity emissions
initializeSocket(io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Connect to database
connectToDatabase();

// Register routes
app.use('/', routes);
app.use('/api/sessions', sessionRoutes);

// Export both app and server
module.exports = { app, server };

// Best-effort cleanup: drop legacy unique index on Verifier.department
(async () => {
  try {
    await new Promise(r => setTimeout(r, 100));
    if (Verifier && Verifier.collection) {
      await Verifier.collection.dropIndex('department_1');
      console.log('✅ Dropped legacy unique index department_1 on Verifier');
    }
  } catch (err) {
    if (!err || (err.codeName !== 'IndexNotFound' && err.code !== 27)) {
      console.warn('⚠️  Index cleanup warning (Verifier.department):', err && err.message ? err.message : err);
    }
  }
})();