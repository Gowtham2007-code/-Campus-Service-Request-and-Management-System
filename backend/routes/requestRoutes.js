const express = require('express');
const router = express.Router();
const {
  createRequest,
  getMyRequests,
  getAllRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
} = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── IMPORTANT: /my must be defined BEFORE /:id ───────────────────────────────
// If /:id is first, Express will treat the string "my" as a MongoDB ID
// and the route will fail with a 400 Invalid ID error.

// GET /api/requests/my — Student gets their own requests
router.get('/my', protect, authorize('student'), getMyRequests);

// GET /api/requests — Admin gets all requests
router.get('/', protect, authorize('admin'), getAllRequests);

// POST /api/requests — Student creates a new request
router.post('/', protect, authorize('student'), createRequest);

// GET /api/requests/:id — Admin or owning student views a single request
router.get('/:id', protect, getRequestById);

// PUT /api/requests/:id — Student updates own Pending request; Admin updates any
router.put('/:id', protect, updateRequest);

// DELETE /api/requests/:id — Student deletes own request; Admin deletes any
router.delete('/:id', protect, deleteRequest);

module.exports = router;
