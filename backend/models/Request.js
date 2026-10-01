const mongoose = require('mongoose');

// ─── Request Schema ───────────────────────────────────────────────────────────

const requestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },

    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
          'IT Support',
          'Hostel Maintenance',
          'Electrical',
          'Plumbing',
          'Cleaning',
          'Classroom',
          'Library',
          'Administration',
          'Other',
        ],
        message: '{VALUE} is not a valid category',
      },
    },

    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },

    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: {
        values: ['Low', 'Medium', 'High'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'Medium',
    },

    status: {
      type: String,
      enum: {
        values: ['Pending', 'Assigned', 'In Progress', 'Resolved'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Pending',
    },

    // Reference to the User who submitted this request
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Request must belong to a user'],
    },

    // Automatically determined based on category (Phase 10)
    department: {
      type: String,
      default: '',
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// ─── Export Model ─────────────────────────────────────────────────────────────

const Request = mongoose.model('Request', requestSchema);

module.exports = Request;
