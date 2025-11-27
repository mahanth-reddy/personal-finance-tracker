const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income','expense'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true }, // currency code, e.g., USD
  amountInBase: { type: Number, required: true }, // normalized to user's base currency
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  description: { type: String, default: '' },
  date: { type: Date, default: Date.now }
});

TransactionSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
