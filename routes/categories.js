const express = require('express');
const auth = require('../middleware/auth');
const Category = require('../models/Category');
const router = express.Router();

// list categories
router.get('/', auth, async (req, res) => {
  const cats = await Category.find({ user: req.user._id }).sort('name');
  res.json(cats);
});

// create category
router.post('/', auth, async (req, res) => {
  const { name, type, color } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Missing fields' });

  const cat = new Category({ user: req.user._id, name, type, color });
  await cat.save();
  res.json(cat);
});

// delete category
router.delete('/:id', auth, async (req, res) => {
  await Category.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ ok: true });
});

module.exports = router;
