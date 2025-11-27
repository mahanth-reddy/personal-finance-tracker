const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['income','expense'], required: true },
  color: { type: String, default: '#888' }
});

module.exports = mongoose.model('Category', CategorySchema);
