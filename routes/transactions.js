const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const router = express.Router();

/**
 * convertToBase: uses exchangerate.host to convert given amount/currency to user's base currency
 * returns { amountInBase, rate }
 */
async function convertToBase(amount, currency, base) {
  if (!currency || currency === base) return { amountInBase: amount, rate: 1 };
  // exchangerate.host free endpoint
  const resp = await axios.get(`https://api.exchangerate.host/convert`, {
    params: { from: currency, to: base, amount }
  });
  if (resp.data && resp.data.result != null) {
    return { amountInBase: resp.data.result, rate: resp.data.info?.rate || (resp.data.result / amount) };
  }
  throw new Error('Conversion failed');
}

// list transactions (with optional query params)
router.get('/', auth, async (req, res) => {
  const { startDate, endDate, type, limit = 100 } = req.query;
  const q = { user: req.user._id };
  if (type) q.type = type;
  if (startDate || endDate) q.date = {};
  if (startDate) q.date.$gte = new Date(startDate);
  if (endDate) q.date.$lte = new Date(endDate);

  const txs = await Transaction.find(q).sort({ date: -1 }).limit(parseInt(limit)).populate('category');
  res.json(txs);
});

// create transaction
router.post('/', auth, async (req, res) => {
  try {
    const { type, amount, currency, categoryId, description, date } = req.body;
    if (!type || !amount || !currency) return res.status(400).json({ error: 'Missing fields' });

    const category = categoryId ? await Category.findOne({ _id: categoryId, user: req.user._id }) : null;

    const { amountInBase } = await convertToBase(parseFloat(amount), currency, req.user.baseCurrency);

    const tx = new Transaction({
      user: req.user._id,
      type,
      amount: parseFloat(amount),
      currency,
      amountInBase,
      category: category ? category._id : null,
      description: description || '',
      date: date ? new Date(date) : new Date()
    });

    await tx.save();
    res.json(tx);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create transaction' });
  }
});

// delete transaction
router.delete('/:id', auth, async (req, res) => {
  await Transaction.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ ok: true });
});

module.exports = router;
