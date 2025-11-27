const express = require('express');
const auth = require('../middleware/auth');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const router = express.Router();

// get budgets for a month (YYYY-MM)
router.get('/', auth, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0,7);
  const budgets = await Budget.find({ user: req.user._id, month }).populate('category');
  res.json(budgets);
});

// set / create or update budget
router.post('/', auth, async (req, res) => {
  const { categoryId, month, amount } = req.body;
  if (!categoryId || !month || amount == null) return res.status(400).json({ error: 'Missing fields' });
  const cat = await Category.findOne({ _id: categoryId, user: req.user._id });
  if (!cat) return res.status(400).json({ error: 'Category not found' });

  const upsert = await Budget.findOneAndUpdate(
    { user: req.user._id, category: cat._id, month },
    { amount },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json(upsert);
});

// delete budget
router.delete('/:id', auth, async (req, res) => {
  await Budget.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ ok: true });
});

module.exports = router;
