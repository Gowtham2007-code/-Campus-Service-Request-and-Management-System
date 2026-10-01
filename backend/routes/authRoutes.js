const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// POST /api/auth/register — Create a new student account
router.post('/register', register);

// POST /api/auth/login — Login and receive a JWT token
router.post('/login', login);

module.exports = router;

