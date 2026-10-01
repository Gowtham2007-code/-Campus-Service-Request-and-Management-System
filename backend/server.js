const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// ─── Middleware ────────────────────────────────────────────────────────────────

// Allow cross-origin requests (for React frontend later)
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check route — confirms the server is running
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Campus Service Request API is running',
  });
});

// Authentication routes (register, login)
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Service request routes (CRUD + status/assign)
const requestRoutes = require('./routes/requestRoutes');
app.use('/api/requests', requestRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

// Catches any errors thrown inside route handlers
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
