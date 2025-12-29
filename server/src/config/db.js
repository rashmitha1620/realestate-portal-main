const mongoose = require('mongoose');

async function connectDB(uri) {
  mongoose.set('strictQuery', false);
 await mongoose.connect(uri);

  console.log('✅ MongoDB connected');
}

module.exports = connectDB;
