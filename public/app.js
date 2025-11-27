const API = '/api';
let token = null;
let currentUser = null;
let chart = null;

// helpers
function authHeaders() {
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };
}

function show(el, show=true) { el.style.display = show ? '' : 'none'; }

// DOM refs
const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const userInfo = document.getElementById('userInfo');

const btnRegister = document.getElementById('btnRegister');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');

const btnAddTx = document.getElementById('btnAddTx');
const txType = document.getElementById('txType');
const txAmount = document.getElementById('txAmount');
const txCurrency = document.getElementById('txCurrency');
const txCategory = document.getElementById('txCategory');
const txDesc = document.getElementById('txDesc');
const txDate = document.getElementById('txDate');

const txList = document.getElementById('txList');
const chartEl = document.getElementById('chart').getContext('2d');

const btnSetBudget = document.getElementById('btnSetBudget');
const budgetCategory = document.getElementById('budgetCategory');
const budgetMonth = document.getElementById('budgetMonth');
const budgetAmount = document.getElementById('budgetAmount');

const reportMonth = document.getElementById('reportMonth');
const btnLoadReport = document.getElementById('btnLoadReport');

const convFrom = document.getElementById('convFrom');
const convAmount = document.getElementById('convAmount');
const btnConvert = document.getElementById('btnConvert');
const convResult = document.getElementById('convResult');

document.addEventListener('DOMContentLoaded', () => {
  // default month inputs
  const m = new Date().toISOString().slice(0,7);
  budgetMonth.value = m;
  reportMonth.value = m;
});

// AUTH
btnRegister.onclick = async () => {
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const baseCurrency = document.getElementById('regCurrency').value || 'USD';

  try {
    const resp = await fetch(API + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ name, email, password, baseCurrency })
    });
    const data = await resp.json();
    if (resp.ok) {
      token = data.token; currentUser = data.user;
      afterLogin();
    } else alert(data.error || 'Register failed');
  } catch (err) { alert('Network error'); }
};

btnLogin.onclick = async () => {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  try {
    const resp = await fetch(API + '/auth/login', {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await resp.json();
    if (resp.ok) {
      token = data.token; currentUser = data.user;
      afterLogin();
    } else alert(data.error || 'Login failed');
  } catch (err) { alert('Network error'); }
};

btnLogout.onclick = () => {
  token = null; currentUser = null;
  authSection.style.display = '';
  appSection.style.display = 'none';
  userInfo.textContent = '';
};

// after login actions
async function afterLogin() {
  authSection.style.display = 'none';
  appSection.style.display = '';
  userInfo.innerHTML = `<strong>${currentUser.name}</strong> (${currentUser.email}) • Base: ${currentUser.baseCurrency}`;
  await loadCategories();
  await loadTransactions();
  await loadChart();
}

// CATEGORIES
async function loadCategories() {
  try {
    const resp = await fetch(API + '/categories', { headers: authHeaders() });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Failed to load');
    txCategory.innerHTML = '<option value="">--Category--</option>';
    budgetCategory.innerHTML = '<option value="">--Category--</option>';
    data.forEach(c => {
      const opt = document.createElement('option'); opt.value = c._id; opt.textContent = c.name + ' ('+c.type+')';
      txCategory.appendChild(opt);
      const opt2 = opt.cloneNode(true);
      budgetCategory.appendChild(opt2);
    });
  } catch (err) {
    console.error(err);
    // if no categories exist, create defaults
    await createDefaultCategories();
    await loadCategories();
  }
}

async function createDefaultCategories() {
  const defaults = [
    { name: 'Salary', type: 'income' },
    { name: 'Interest', type: 'income' },
    { name: 'Groceries', type: 'expense' },
    { name: 'Rent', type: 'expense' },
    { name: 'Transport', type: 'expense' },
    { name: 'Utilities', type: 'expense' }
  ];
  for (const c of defaults) {
    await fetch(API + '/categories', { method: 'POST', headers: authHeaders(), body: JSON.stringify(c) });
  }
}

// TRANSACTIONS
btnAddTx.onclick = async () => {
  const payload = {
    type: txType.value,
    amount: parseFloat(txAmount.value),
    currency: txCurrency.value || currentUser.baseCurrency,
    categoryId: txCategory.value || null,
    description: txDesc.value,
    date: txDate.value || new Date().toISOString()
  };
  try {
    const resp = await fetch(API + '/transactions', { method:'POST', headers: authHeaders(), body: JSON.stringify(payload) });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Failed');
    // clear inputs
    txAmount.value=''; txDesc.value=''; txDate.value='';
    await loadTransactions();
    await loadChart();
  } catch (err) { alert(err.message || 'Error'); }
};

async function loadTransactions() {
  try {
    const resp = await fetch(API + '/transactions?limit=200', { headers: authHeaders() });
    const data = await resp.json();
    txList.innerHTML = '';
    data.forEach(t => {
      const div = document.createElement('div'); div.className = 'txItem';
      const left = document.createElement('div');
      left.innerHTML = `<div><strong>${t.type.toUpperCase()}</strong> ${t.category ? '• ' + t.category.name : ''}</div>
                        <div class="small">${new Date(t.date).toLocaleString()} • ${t.description || ''}</div>`;
      const right = document.createElement('div');
      right.innerHTML = `<div><strong>${t.amount} ${t.currency}</strong></div><div class="small">${t.amountInBase.toFixed(2)} ${currentUser.baseCurrency}</div>`;
      const del = document.createElement('button'); del.textContent='Delete';
      del.onclick = async () => {
        if (!confirm('Delete this transaction?')) return;
        await fetch(API + '/transactions/' + t._id, { method:'DELETE', headers: authHeaders() });
        await loadTransactions(); await loadChart();
      };
      right.appendChild(del);
      div.appendChild(left); div.appendChild(right);
      txList.appendChild(div);
    });
  } catch (err) { console.error(err); }
}

// CHART
async function loadChart() {
  try {
    const resp = await fetch(API + '/reports/monthly-summary?month=' + (reportMonth.value || new Date().toISOString().slice(0,7)), { headers: authHeaders() });
    const data = await resp.json();
    // prepare data for chart: byCategory (labels and amounts)
    const labels = Object.keys(data.byCategory || {});
    const values = labels.map(k => data.byCategory[k]);
    if (!chart) {
      chart = new Chart(chartEl, {
        type: 'doughnut',
        data: { labels, datasets: [{ label: 'Spending by category', data: values }] },
        options: { responsive: true }
      });
    } else {
      chart.data.labels = labels;
      chart.data.datasets[0].data = values;
      chart.update();
    }
  } catch (err) { console.error(err); }
}

// BUDGETS
btnSetBudget.onclick = async () => {
  if (!budgetCategory.value) return alert('Choose category');
  try {
    const resp = await fetch(API + '/budgets', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ categoryId: budgetCategory.value, month: budgetMonth.value, amount: parseFloat(budgetAmount.value) })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Failed');
    alert('Budget set');
  } catch (err) { alert(err.message || 'Error'); }
};

// REPORTS
btnLoadReport.onclick = async () => {
  await loadChart();
  try {
    const resp = await fetch(API + '/reports/monthly-summary?month=' + reportMonth.value, { headers: authHeaders() });
    const data = await resp.json();
    let html = `<h4>Summary for ${data.month}</h4>`;
    html += `<div class="small">Income: ${data.totals.income.toFixed(2)} ${currentUser.baseCurrency} • Expense: ${data.totals.expense.toFixed(2)} ${currentUser.baseCurrency}</div>`;
    html += `<h5>By Category</h5><ul>`;
    for (const k of Object.keys(data.byCategory)) {
      html += `<li>${k}: ${data.byCategory[k].toFixed(2)} ${currentUser.baseCurrency}</li>`;
    }
    html += '</ul>';
    if (data.budgets && data.budgets.length) {
      html += '<h5>Budgets</h5><ul>';
      data.budgets.forEach(b => {
        html += `<li>${b.category.name}: ${b.amount.toFixed(2)} ${currentUser.baseCurrency}</li>`;
      });
      html += '</ul>';
    }
    // show in txList area (reuse)
    txList.innerHTML = html;
  } catch (err) { console.error(err); }
};

// Currency conversion
btnConvert.onclick = async () => {
  const from = convFrom.value;
  const amt = parseFloat(convAmount.value) || 1;
  if (!from) return alert('Enter currency to convert from');
  try {
    const resp = await fetch(API + '/reports/convert?from=' + encodeURIComponent(from) + '&amount=' + amt, { headers: authHeaders() });
    const data = await resp.json();
    if (data.result != null) {
      convResult.innerHTML = `${amt} ${from} = ${data.result.toFixed(2)} ${currentUser.baseCurrency} (rate ${data.info?.rate || ''})`;
    } else {
      convResult.textContent = 'Conversion failed';
    }
  } catch (err) { console.error(err); convResult.textContent = 'Conversion error'; }
};
