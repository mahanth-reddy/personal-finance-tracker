const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const Category = require('../models/Category');

// register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, baseCurrency } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    user = new User({ name, email, passwordHash, baseCurrency: baseCurrency || process.env.BASE_CURRENCY || 'USD' });
    await user.save();
  // after user.save()

const defaultCats = [
  { name: "Groceries", type: "expense" },
  { name: "Rent", type: "expense" },
  { name: "Salary", type: "income" },
  { name: "Transport", type: "expense" }
];

await Category.insertMany(
  defaultCats.map(c => ({ ...c, user: user._id }))
);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, baseCurrency: user.baseCurrency }});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, baseCurrency: user.baseCurrency }});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
