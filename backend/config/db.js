const mongoose = require('mongoose');

// Connect to MongoDB Atlas using the URI from .env
const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${connection.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Exit the process if the database connection fails
    process.exit(1);
  }
};

module.exports = connectDB;
