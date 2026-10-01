const Request = require('../models/Request');
const mongoose = require('mongoose');

// ─── Helper: Department Assignment ────────────────────────────────────────────
// Determines the responsible department based on the request category.
// This is a simple rule-based mapping — no AI or external service required.

const getDepartmentFromCategory = (category) => {
  const departmentMap = {
    'IT Support':        'IT Department',
    'Hostel Maintenance': 'Hostel Maintenance',
    'Electrical':        'Electrical Department',
    'Plumbing':          'Plumbing Department',
    'Cleaning':          'Housekeeping',
    'Classroom':         'Academic Facilities',
    'Library':           'Library Administration',
    'Administration':    'Administration Office',
    'Other':             'General Services',
  };
  return departmentMap[category] || 'General Services';
};

// ─── Helper: Validate MongoDB ObjectId ────────────────────────────────────────

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─── @route   POST /api/requests ─────────────────────────────────────────────
// ─── @desc    Student creates a new service request
// ─── @access  Protected — student only

const createRequest = async (req, res) => {
  try {
    const { title, category, location, description, priority } = req.body;

    // Validate required fields
    if (!title || !category || !location || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, category, location, and description',
      });
    }

    // Automatically determine department from category
    const department = getDepartmentFromCategory(category);

    // Create the request — createdBy and status are set by the backend only
    const request = await Request.create({
      title,
      category,
      location,
      description,
      priority: priority || 'Medium',
      status: 'Pending',          // always starts as Pending
      createdBy: req.user._id,    // taken from authenticated user, never from client
      department,                 // auto-assigned from category
    });

    res.status(201).json({
      success: true,
      message: 'Request created successfully',
      request,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Create Request Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error while creating request' });
  }
};

// ─── @route   GET /api/requests/my ───────────────────────────────────────────
// ─── @desc    Student retrieves only their own requests
// ─── @access  Protected — student only
// ─── NOTE:    This route MUST be registered before GET /api/requests/:id
//              to prevent Express from treating "my" as an :id parameter

const getMyRequests = async (req, res) => {
  try {
    const requests = await Request.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 }); // newest first

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('Get My Requests Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error while fetching requests' });
  }
};

// ─── @route   GET /api/requests ──────────────────────────────────────────────
// ─── @desc    Admin retrieves all service requests
// ─── @access  Protected — admin only

const getAllRequests = async (req, res) => {
  try {
    const requests = await Request.find()
      .populate('createdBy', 'name email role') // never expose password
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('Get All Requests Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error while fetching requests' });
  }
};

// ─── @route   GET /api/requests/:id ──────────────────────────────────────────
// ─── @desc    Get a single request by ID
// ─── @access  Protected — admin can view any; student can view only their own

const getRequestById = async (req, res) => {
  try {
    // Validate the ID format before querying
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID format' });
    }

    const request = await Request.findById(req.params.id)
      .populate('createdBy', 'name email role');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Students can only view their own requests
    if (
      req.user.role === 'student' &&
      request.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own requests.',
      });
    }

    res.status(200).json({ success: true, request });
  } catch (error) {
    console.error('Get Request By ID Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error while fetching request' });
  }
};

// ─── @route   PUT /api/requests/:id ──────────────────────────────────────────
// ─── @desc    Update a request
// ─── @access  Protected — student (own, Pending only) or admin

const updateRequest = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID format' });
    }

    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (req.user.role === 'student') {
      // Students can only update their own request
      if (request.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own requests.',
        });
      }

      // Students can only update a request that is still Pending
      if (request.status !== 'Pending') {
        return res.status(403).json({
          success: false,
          message: 'Request cannot be edited after it has been assigned or is in progress.',
        });
      }

      // Students may only change these fields
      const allowedFields = ['title', 'category', 'location', 'description', 'priority'];
      const updateData = {};

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      // If category changed, re-assign department automatically
      if (updateData.category) {
        updateData.department = getDepartmentFromCategory(updateData.category);
      }

      const updatedRequest = await Request.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Request updated successfully',
        request: updatedRequest,
      });
    }

    // Admin can update any field except createdBy
    const { createdBy, ...adminUpdateData } = req.body;

    // Validate status workflow transitions if status is being updated
    if (adminUpdateData.status !== undefined) {
      const allowedStatuses = ['Pending', 'Assigned', 'In Progress', 'Resolved'];
      if (!allowedStatuses.includes(adminUpdateData.status)) {
        return res.status(400).json({
          success: false,
          message: `${adminUpdateData.status} is not a valid status`,
        });
      }

      if (adminUpdateData.status !== request.status) {
        const allowedTransitions = {
          'Pending': ['Assigned'],
          'Assigned': ['In Progress'],
          'In Progress': ['Resolved'],
          'Resolved': [],
        };

        const validNext = allowedTransitions[request.status] || [];
        if (!validNext.includes(adminUpdateData.status)) {
          return res.status(400).json({
            success: false,
            message: `Invalid status transition from '${request.status}' to '${adminUpdateData.status}'. Workflow must follow: Pending -> Assigned -> In Progress -> Resolved`,
          });
        }
      }
    }

    // If admin changes category, re-assign department automatically
    if (adminUpdateData.category && !adminUpdateData.department) {
      adminUpdateData.department = getDepartmentFromCategory(adminUpdateData.category);
    }

    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      adminUpdateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Request updated successfully',
      request: updatedRequest,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Update Request Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error while updating request' });
  }
};

// ─── @route   DELETE /api/requests/:id ───────────────────────────────────────
// ─── @desc    Delete a request
// ─── @access  Protected — student (own only) or admin

const deleteRequest = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID format' });
    }

    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Students can only delete their own requests
    if (
      req.user.role === 'student' &&
      request.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own requests.',
      });
    }

    await Request.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Request deleted successfully',
    });
  } catch (error) {
    console.error('Delete Request Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error while deleting request' });
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getAllRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
};
