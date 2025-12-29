const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number },
  currency: { type: String, default: 'INR' },
  provider: { type: String },
  providerPaymentId: { type: String },
  status: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
  metadata: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
