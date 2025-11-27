const express = require('express');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const axios = require('axios');
const router = express.Router();

// summary for a month (YYYY-MM)
router.get('/monthly-summary', auth, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0,7);
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon - 1 + 1, 1);
    const txs = await Transaction.find({
      user: req.user._id,
      date: { $gte: start, $lt: end }
    }).populate('category');

    // totals
    const totals = { income: 0, expense: 0 };
    const byCategory = {};

    for (const t of txs) {
      if (t.type === 'income') totals.income += t.amountInBase;
      else totals.expense += t.amountInBase;

      const catName = t.category ? t.category.name : 'Uncategorized';
      byCategory[catName] = (byCategory[catName] || 0) + t.amountInBase;
    }

    const budgets = await Budget.find({ user: req.user._id, month }).populate('category');

    res.json({ month, totals, byCategory, budgets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate report' });
  }
});

// Currency conversion endpoint (backend proxy)
router.get('/convert', auth, async (req, res) => {
  try {
    const { from, to, amount } = req.query;

    // Validation
    if (!from) {
      return res.status(400).json({ error: 'Missing "from" currency' });
    }

    // Default values
    const baseCurrency = req.user?.baseCurrency || 'USD';
    const targetCurrency = to || baseCurrency;
    const amountValue = parseFloat(amount) || 1;

    // Fetch conversion data from exchangerate.host
    const response = await axios.get('https://api.exchangerate.host/convert', {
      params: { from, to: targetCurrency, amount: amountValue }
    });

    // Check if conversion succeeded
    if (response.data && response.data.result !== undefined) {
      return res.json({
        from,
        to: targetCurrency,
        amount: amountValue,
        convertedAmount: response.data.result,
        rate: response.data.info?.rate || null,
        date: response.data.date
      });
    } else {
      return res.status(500).json({ error: 'Conversion failed (invalid API response)' });
    }

  } catch (error) {
    console.error('Currency conversion error:', error.message);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

module.exports = router;
