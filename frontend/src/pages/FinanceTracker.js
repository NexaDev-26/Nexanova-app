import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLocale } from '../context/LocaleContext';
import api from '../utils/api';
import Navigation from '../components/Navigation';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonCard } from '../components/SkeletonLoader';
import { getRegions, getCitiesForRegion } from '../data/tanzaniaLocations';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import BudgetVisualization from '../components/BudgetVisualization';
import { soundEffects } from '../utils/soundEffects';
import '../styles/FinanceTracker.css';

const FinanceTracker = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { formatCurrency } = useLocale();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [budget, setBudget] = useState(0);
  const [savingsGoal, setSavingsGoal] = useState({ target: 0, current: 0 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [viewPeriod, setViewPeriod] = useState('month'); // week, month, year
  const [filterCategory, setFilterCategory] = useState('all');
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    recurring: false
  });
  const [newBudget, setNewBudget] = useState({ amount: '', period: 'month' });
  const [newGoal, setNewGoal] = useState({ title: '', description: '', target: '', deadline: '' });
  const [activeTab, setActiveTab] = useState('overview');
  const [sideHustleCapital, setSideHustleCapital] = useState('');
  const [sideHustleLocation, setSideHustleLocation] = useState('');
  const [sideHustleRegion, setSideHustleRegion] = useState('');
  const [sideHustleCity, setSideHustleCity] = useState('');
  const [sideHustleSuggestions, setSideHustleSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [regions] = useState(getRegions());

  useEffect(() => {
    loadAllData();
  }, [viewPeriod]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTransactions(),
        loadSummary(),
        loadBudget(),
        loadSavingsGoal()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await api.get('/finance');
      if (response.data.success) {
        setTransactions(response.data.finance || []);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const today = new Date();
      let startDate, endDate;
      
      if (viewPeriod === 'week') {
        const dayOfWeek = today.getDay();
        startDate = new Date(today);
        startDate.setDate(today.getDate() - dayOfWeek);
        endDate = new Date(today);
      } else if (viewPeriod === 'month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      } else {
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
      }

      const response = await api.get('/finance/summary', {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });
      if (response.data.success) {
        setSummary(response.data.summary || { income: 0, expense: 0, balance: 0 });
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const loadBudget = async () => {
    // Load budget from API (to be implemented)
    // For now, use localStorage
    const savedBudget = localStorage.getItem('budget');
    if (savedBudget) {
      setBudget(parseFloat(savedBudget));
    }
  };

  const loadSavingsGoal = async () => {
    // Load savings goal from API (to be implemented)
    const savedGoal = localStorage.getItem('savingsGoal');
    if (savedGoal) {
      setSavingsGoal(JSON.parse(savedGoal));
    }
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.amount || !newTransaction.category) return;

    try {
      const response = await api.post('/finance', {
        ...newTransaction,
        amount: parseFloat(newTransaction.amount)
      });

      if (response.data.success) {
        await loadTransactions();
        await loadSummary();
        setNewTransaction({
          type: 'expense',
          category: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
          recurring: false
        });
        setShowAddForm(false);
        showToast('Transaction added successfully!', 'success');
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      showToast('Failed to add transaction. Please try again.', 'error');
    }
  };

  const handleSetBudget = () => {
    if (!newBudget.amount) return;
    setBudget(parseFloat(newBudget.amount));
    localStorage.setItem('budget', newBudget.amount);
    setShowBudgetForm(false);
    setNewBudget({ amount: '', period: 'month' });
    showToast('Budget set successfully!', 'success');
  };

  const handleSetGoal = () => {
    if (!newGoal.target || !newGoal.title) return;
    const goal = {
      title: newGoal.title,
      description: newGoal.description || '',
      target: parseFloat(newGoal.target),
      current: savingsGoal.current || 0,
      deadline: newGoal.deadline || null
    };
    setSavingsGoal(goal);
    localStorage.setItem('savingsGoal', JSON.stringify(goal));
    setShowGoalForm(false);
    setNewGoal({ title: '', description: '', target: '', deadline: '' });
    showToast('Savings goal set successfully!', 'success');
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;

    try {
      await api.delete(`/finance/${id}`);
      await loadTransactions();
      await loadSummary();
      showToast('Transaction deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showToast('Failed to delete transaction. Please try again.', 'error');
    }
  };

  const handleGetSideHustles = async () => {
    if (!sideHustleCapital) {
      showToast('Please enter your available capital', 'error');
      return;
    }
    
    if (!sideHustleLocation && !sideHustleCity) {
      showToast('Please select a location', 'error');
      return;
    }

    // Validate capital is a valid number
    const capitalValue = parseFloat(sideHustleCapital);
    if (isNaN(capitalValue) || capitalValue < 0) {
      showToast('Please enter a valid capital amount', 'error');
      return;
    }

    try {
      const locationValue = sideHustleCity || sideHustleLocation;
      const response = await api.post('/finance/side-hustle', {
        capital: capitalValue,
        location: locationValue,
        city: sideHustleCity || null,
        region: sideHustleRegion || null
      });

      if (response.data.success) {
        const suggestions = response.data.suggestions || [];
        setSideHustleSuggestions(suggestions);
        if (suggestions.length > 0) {
          showToast(`Found ${suggestions.length} side hustle suggestions! 💡`, 'success');
        } else {
          showToast('No suggestions found. Try adjusting your capital amount.', 'info');
        }
      } else {
        showToast(response.data.message || 'Failed to get suggestions', 'error');
      }
    } catch (error) {
      console.error('Error getting side hustles:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get suggestions. Please try again.';
      showToast(errorMessage, 'error');
    }
  };

  const getExpenseCategoryData = () => {
    const categoryMap = {};
    transactions
      .filter(t => t.type === 'expense' && (!filterCategory || filterCategory === 'all' || t.category === filterCategory))
      .forEach(t => {
        if (!categoryMap[t.category]) {
          categoryMap[t.category] = 0;
        }
        categoryMap[t.category] += parseFloat(t.amount);
      });

    return Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
      percentage: summary.expense > 0 ? ((value / summary.expense) * 100).toFixed(1) : '0'
    })).sort((a, b) => b.value - a.value);
  };

  const getIncomeCategoryData = () => {
    const categoryMap = {};
    transactions
      .filter(t => t.type === 'income' && (!filterCategory || filterCategory === 'all' || t.category === filterCategory))
      .forEach(t => {
        if (!categoryMap[t.category]) {
          categoryMap[t.category] = 0;
        }
        categoryMap[t.category] += parseFloat(t.amount);
      });

    return Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
      percentage: summary.income > 0 ? ((value / summary.income) * 100).toFixed(1) : '0'
    })).sort((a, b) => b.value - a.value);
  };

  const getChartData = () => {
    const today = new Date();
    const data = [];
    let days = 7;
    
    if (viewPeriod === 'month') days = 30;
    else if (viewPeriod === 'year') days = 12;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      if (viewPeriod === 'year') {
        date.setMonth(today.getMonth() - i);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthTransactions = transactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate.getFullYear() === date.getFullYear() && tDate.getMonth() === date.getMonth();
        });
        const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        data.push({
          date: date.toLocaleDateString('en-US', { month: 'short' }),
          income,
          expense,
          balance: income - expense
        });
      } else {
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayTransactions = transactions.filter(t => t.date === dateStr);
        const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        data.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
          income,
          expense,
          balance: income - expense
        });
      }
    }
    return data;
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const COLORS = ['#14b8a6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  
  // Income Categories
  const INCOME_CATEGORIES = {
    Salary: '💼',
    Business: '🏢',
    Freelance: '💻',
    Investment: '📈',
    Gift: '🎁',
    Charity: '❤️',
    SideHustle: '💡',
    Other: '📦'
  };

  // Expense Categories
  const EXPENSE_CATEGORIES = {
    Food: '🍔',
    Transport: '🚗',
    Shopping: '🛍️',
    Bills: '📄',
    Entertainment: '🎬',
    Health: '🏥',
    Education: '📚',
    Savings: '💰',
    Other: '📦'
  };

  // Combined category icons for display
  const CATEGORY_ICONS = { ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES };

  // Get categories based on transaction type
  const getCategoriesForType = (type) => {
    return type === 'income' 
      ? Object.keys(INCOME_CATEGORIES)
      : Object.keys(EXPENSE_CATEGORIES);
  };

  // All categories for filter dropdown
  const allCategories = [...Object.keys(INCOME_CATEGORIES), ...Object.keys(EXPENSE_CATEGORIES)];

  if (loading) {
    return (
      <div className="finance-tracker">
        <div className="container">
          <SkeletonCard lines={2} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
          <SkeletonCard lines={3} />
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="finance-tracker">
      <div className="container">
        {/* Header with Period Selector */}
        <div className="finance-header">
          <div>
            <h2>Finance Tracker</h2>
            <p>Track your money, build your future</p>
          </div>
          <div className="period-selector">
            <button
              className={`period-btn ${viewPeriod === 'week' ? 'active' : ''}`}
              onClick={() => setViewPeriod('week')}
            >
              Week
            </button>
            <button
              className={`period-btn ${viewPeriod === 'month' ? 'active' : ''}`}
              onClick={() => setViewPeriod('month')}
            >
              Month
            </button>
            <button
              className={`period-btn ${viewPeriod === 'year' ? 'active' : ''}`}
              onClick={() => setViewPeriod('year')}
            >
              Year
            </button>
          </div>
        </div>

        {/* Enhanced Summary Cards */}
        <div className="summary-cards-enhanced">
          <div className="summary-card-large balance-card">
            <div className="card-header">
              <span className="card-label">Total Balance</span>
              <span className="card-icon">💵</span>
            </div>
            <div className={`card-amount ${summary.balance >= 0 ? 'positive' : 'negative'}`}>
              {summary.balance >= 0 ? '+' : ''}
              {summary.balance.toLocaleString()} TZS
            </div>
            <div className="card-subtitle">
              {summary.income.toLocaleString()} income • {summary.expense.toLocaleString()} expenses
            </div>
          </div>

          <div className="summary-cards-grid">
            <div className="summary-card income-card">
              <div className="card-icon-small">💰</div>
              <div className="card-content">
                <div className="card-label-small">Income</div>
                <div className="card-value">{summary.income.toLocaleString()} TZS</div>
              </div>
            </div>
            <div className="summary-card expense-card">
              <div className="card-icon-small">💸</div>
              <div className="card-content">
                <div className="card-label-small">Expenses</div>
                <div className="card-value">{summary.expense.toLocaleString()} TZS</div>
              </div>
            </div>
            {budget > 0 && (
              <div className="summary-card budget-card">
                <div className="card-icon-small">📊</div>
                <div className="card-content">
                  <div className="card-label-small">Budget</div>
                  <div className="card-value">{budget.toLocaleString()} TZS</div>
                  <div className="card-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${Math.min((summary.expense / budget) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {((summary.expense / budget) * 100).toFixed(0)}% used
                    </span>
                  </div>
                </div>
              </div>
            )}
            {savingsGoal.target > 0 && (
              <div className="summary-card goal-card">
                <div className="card-icon-small">🎯</div>
                <div className="card-content">
                  <div className="card-label-small">Savings Goal</div>
                  <div className="card-value">
                    {savingsGoal.current.toLocaleString()} / {savingsGoal.target.toLocaleString()} TZS
                  </div>
                  <div className="card-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill goal" 
                        style={{ width: `${Math.min((savingsGoal.current / savingsGoal.target) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {((savingsGoal.current / savingsGoal.target) * 100).toFixed(0)}% saved
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="tabs-enhanced">
          <button
            className={`tab-enhanced ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span>📊</span>
            <span>Overview</span>
          </button>
          <button
            className={`tab-enhanced ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <span>💳</span>
            <span>Transactions</span>
          </button>
          <button
            className={`tab-enhanced ${activeTab === 'budget' ? 'active' : ''}`}
            onClick={() => setActiveTab('budget')}
          >
            <span>📈</span>
            <span>Budget</span>
          </button>
          <button
            className={`tab-enhanced ${activeTab === 'goals' ? 'active' : ''}`}
            onClick={() => setActiveTab('goals')}
          >
            <span>🎯</span>
            <span>Goals</span>
          </button>
          <button
            className={`tab-enhanced ${activeTab === 'side-hustle' ? 'active' : ''}`}
            onClick={() => setActiveTab('side-hustle')}
          >
            <span>💡</span>
            <span>Side Hustle</span>
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-section">
            {/* Charts */}
            <div className="charts-grid">
              <div className="chart-card">
                <h3>Income vs Expenses</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="income" fill="#10b981" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="expense" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {getIncomeCategoryData().length > 0 && (
                <div className="chart-card">
                  <h3>Income by Category</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={getIncomeCategoryData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getIncomeCategoryData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {getExpenseCategoryData().length > 0 && (
                <div className="chart-card">
                  <h3>Expenses by Category</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={getExpenseCategoryData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getExpenseCategoryData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            {(getIncomeCategoryData().length > 0 || getExpenseCategoryData().length > 0) && (
              <div className="category-breakdown">
                {getIncomeCategoryData().length > 0 && (
                  <>
                    <h3>Income by Category</h3>
                    <div className="category-list">
                      {getIncomeCategoryData().map((cat, idx) => (
                        <div key={`income-${idx}`} className="category-item income-item">
                          <div className="category-icon">{INCOME_CATEGORIES[cat.name] || '📦'}</div>
                          <div className="category-info">
                            <div className="category-name">{cat.name}</div>
                            <div className="category-amount">{cat.value.toLocaleString()} TZS</div>
                          </div>
                          <div className="category-percentage">{cat.percentage}%</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {getExpenseCategoryData().length > 0 && (
                  <>
                    <h3 style={{ marginTop: getIncomeCategoryData().length > 0 ? '2rem' : '0' }}>
                      Expenses by Category
                    </h3>
                    <div className="category-list">
                      {getExpenseCategoryData().map((cat, idx) => (
                        <div key={`expense-${idx}`} className="category-item expense-item">
                          <div className="category-icon">{EXPENSE_CATEGORIES[cat.name] || '📦'}</div>
                          <div className="category-info">
                            <div className="category-name">{cat.name}</div>
                            <div className="category-amount">{cat.value.toLocaleString()} TZS</div>
                          </div>
                          <div className="category-percentage">{cat.percentage}%</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="transactions-section">
            <div className="section-header">
              <h3>Transactions</h3>
              <div className="header-actions">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Categories</option>
                  <optgroup label="Income">
                    {Object.keys(INCOME_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Expenses">
                    {Object.keys(EXPENSE_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                </select>
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => setShowAddForm(true)}
                >
                  + Add
                </button>
              </div>
            </div>

            {showAddForm && (
              <div className="card add-transaction-form">
                <div className="form-header">
                  <h3>Add Transaction</h3>
                  <button className="close-btn" onClick={() => setShowAddForm(false)}>✕</button>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Type</label>
                    <div className="toggle-group">
                      <button
                        className={`toggle-btn ${newTransaction.type === 'income' ? 'active income' : ''}`}
                        onClick={() => setNewTransaction({ ...newTransaction, type: 'income', category: '' })}
                      >
                        💰 Income
                      </button>
                      <button
                        className={`toggle-btn ${newTransaction.type === 'expense' ? 'active expense' : ''}`}
                        onClick={() => setNewTransaction({ ...newTransaction, type: 'expense', category: '' })}
                      >
                        💸 Expense
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <div className="category-selector">
                      {getCategoriesForType(newTransaction.type).map(cat => {
                        const icons = newTransaction.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                        return (
                          <button
                            key={cat}
                            className={`category-btn ${newTransaction.category === cat ? 'selected' : ''}`}
                            onClick={() => setNewTransaction({ ...newTransaction, category: cat })}
                          >
                            <span>{icons[cat]}</span>
                            <span>{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Amount (TZS)</label>
                    <input
                      type="number"
                      value={newTransaction.amount}
                      onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                      className="input-field"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Description (optional)</label>
                    <input
                      type="text"
                      value={newTransaction.description}
                      onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                      className="input-field"
                      placeholder="Add a note..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={newTransaction.date}
                      onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewTransaction({
                        type: 'expense',
                        category: '',
                        amount: '',
                        date: new Date().toISOString().split('T')[0],
                        description: '',
                        recurring: false
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleAddTransaction}
                    disabled={!newTransaction.amount || !newTransaction.category}
                  >
                    Add Transaction
                  </button>
                </div>
              </div>
            )}

            {/* Transactions List */}
            <div className="transactions-list-enhanced">
              {filteredTransactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">💰</div>
                  <h3>No transactions yet</h3>
                  <p>Start tracking your finances by adding your first transaction</p>
                  <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                    Add Transaction
                  </button>
                </div>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    onDelete={handleDeleteTransaction}
                    categoryIcon={
                      transaction.type === 'income' 
                        ? INCOME_CATEGORIES[transaction.category] 
                        : EXPENSE_CATEGORIES[transaction.category]
                    }
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Budget Tab */}
        {activeTab === 'budget' && (
          <div className="budget-section">
            {!budget ? (
              <div className="card empty-budget">
                <div className="empty-icon">📊</div>
                <h3>Set Your Budget</h3>
                <p>Track your spending against a monthly budget</p>
                <button className="btn btn-primary" onClick={() => setShowBudgetForm(true)}>
                  Set Budget
                </button>
              </div>
            ) : (
              <div className="budget-dashboard">
                <div className="card budget-card-large">
                  <div className="budget-header">
                    <div>
                      <h3>Monthly Budget</h3>
                      <p className="budget-amount">{budget.toLocaleString()} TZS</p>
                    </div>
                    <button className="btn-icon" onClick={() => setShowBudgetForm(true)}>
                      ✏️
                    </button>
                  </div>
                  <div className="budget-progress">
                    <div className="progress-info">
                      <span>Spent: {summary.expense.toLocaleString()} TZS</span>
                      <span>Remaining: {(budget - summary.expense).toLocaleString()} TZS</span>
                    </div>
                    <div className="progress-bar-large">
                      <div 
                        className={`progress-fill-large ${summary.expense > budget ? 'over-budget' : ''}`}
                        style={{ width: `${Math.min((summary.expense / budget) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="progress-percentage">
                      {((summary.expense / budget) * 100).toFixed(1)}% of budget used
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Budget Visualization */}
                <BudgetVisualization 
                  budget={budget}
                  spent={summary.expense}
                  savingsGoal={savingsGoal.target > 0 ? savingsGoal : null}
                />
              </div>
            )}

            {showBudgetForm && (
              <div className="card budget-form">
                <h3>{budget ? 'Update Budget' : 'Set Budget'}</h3>
                <div className="form-group">
                  <label>Monthly Budget (TZS)</label>
                  <input
                    type="number"
                    value={newBudget.amount}
                    onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                    className="input-field"
                    placeholder="Enter budget amount"
                  />
                </div>
                <div className="form-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowBudgetForm(false);
                      setNewBudget({ amount: '', period: 'month' });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSetBudget}
                    disabled={!newBudget.amount}
                  >
                    {budget ? 'Update' : 'Set'} Budget
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="goals-section">
            {!savingsGoal.target ? (
              <div className="card empty-goal">
                <div className="empty-icon">🎯</div>
                <h3>Set a Savings Goal</h3>
                <p>Track your progress towards a financial goal</p>
                <button className="btn btn-primary" onClick={() => setShowGoalForm(true)}>
                  Create Goal
                </button>
              </div>
            ) : (
              <div className="goal-dashboard">
                {/* Enhanced Savings Goal Visualization */}
                <BudgetVisualization 
                  budget={budget}
                  spent={summary.expense}
                  savingsGoal={savingsGoal}
                />
                
                <div className="card goal-card-large">
                  <div className="goal-header">
                    <div>
                      <h3>{savingsGoal.title || 'Savings Goal'}</h3>
                      {savingsGoal.description && (
                        <p className="goal-description">{savingsGoal.description}</p>
                      )}
                      <p className="goal-target">Target: {savingsGoal.target.toLocaleString()} TZS</p>
                    </div>
                    <button className="btn-icon" onClick={() => setShowGoalForm(true)}>
                      ✏️
                    </button>
                  </div>
                  <div className="goal-progress">
                    <div className="goal-amount">
                      <span className="current">{savingsGoal.current.toLocaleString()} TZS</span>
                      <span className="target">/ {savingsGoal.target.toLocaleString()} TZS</span>
                    </div>
                    <div className="progress-bar-large">
                      <div 
                        className="progress-fill-large goal"
                        style={{ width: `${Math.min((savingsGoal.current / savingsGoal.target) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="progress-percentage">
                      {((savingsGoal.current / savingsGoal.target) * 100).toFixed(1)}% completed
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showGoalForm && (
              <div className="card goal-form">
                <h3>{savingsGoal.target ? 'Update Goal' : 'Create Goal'}</h3>
                <div className="form-group">
                  <label>Goal Title *</label>
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Emergency Fund, New Phone, School Fees"
                  />
                </div>
                <div className="form-group">
                  <label>Description (optional)</label>
                  <textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    className="input-field"
                    placeholder="Describe what this goal is for..."
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Target Amount (TZS) *</label>
                  <input
                    type="number"
                    value={newGoal.target}
                    onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                    className="input-field"
                    placeholder="Enter target amount"
                  />
                </div>
                <div className="form-group">
                  <label>Deadline (optional)</label>
                  <input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="form-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowGoalForm(false);
                      setNewGoal({ title: '', description: '', target: '', deadline: '' });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSetGoal}
                    disabled={!newGoal.target || !newGoal.title}
                  >
                    {savingsGoal.target ? 'Update' : 'Create'} Goal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Side Hustle Tab */}
        {activeTab === 'side-hustle' && (
          <div className="side-hustle-section">
            <div className="card">
              <h3>💡 AI Side Hustle Generator</h3>
              <p>Tell us your capital and location, and we'll suggest detailed micro-business ideas tailored to you</p>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Available Capital (TZS) *</label>
                  <input
                    type="number"
                    value={sideHustleCapital}
                    onChange={(e) => setSideHustleCapital(e.target.value)}
                    className="input-field"
                    placeholder="e.g., 5000, 20000, 50000"
                    min="0"
                  />
                  <small className="form-hint">Enter how much money you have to start</small>
                </div>
                
                <div className="form-group">
                  <label>Region *</label>
                  <select
                    value={sideHustleRegion}
                    onChange={(e) => {
                      setSideHustleRegion(e.target.value);
                      setSideHustleCity(''); // Reset city when region changes
                    }}
                    className="input-field"
                  >
                    <option value="">Select Region</option>
                    {regions.map(region => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                  <small className="form-hint">Select your region in Tanzania</small>
                </div>
                
                {sideHustleRegion && (
                  <div className="form-group">
                    <label>City/Town *</label>
                    <select
                      value={sideHustleCity}
                      onChange={(e) => {
                        setSideHustleCity(e.target.value);
                        setSideHustleLocation(e.target.value);
                      }}
                      className="input-field"
                    >
                      <option value="">Select City/Town</option>
                      {getCitiesForRegion(sideHustleRegion).map(city => (
                        <option key={city.value} value={city.value}>
                          {city.label}
                        </option>
                      ))}
                    </select>
                    <small className="form-hint">Select your specific city or town</small>
                  </div>
                )}
                
                {!sideHustleRegion && (
                  <div className="form-group">
                    <label>Or Select General Location Type</label>
                    <select
                      value={sideHustleLocation}
                      onChange={(e) => setSideHustleLocation(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select Location Type</option>
                      <option value="urban">🏙️ Urban (City/Town)</option>
                      <option value="peri-urban">🏘️ Peri-Urban (Suburban/Outskirts)</option>
                      <option value="rural">🌾 Rural (Village/Countryside)</option>
                    </select>
                    <small className="form-hint">Or choose a general location type if you prefer</small>
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary btn-block"
                onClick={handleGetSideHustles}
                disabled={!sideHustleCapital || (!sideHustleLocation && !sideHustleCity)}
              >
                💡 Get Side Hustle Suggestions
              </button>
            </div>

            {sideHustleSuggestions.length > 0 && (
              <div className="suggestions-list">
                <div className="suggestions-header">
                  <h3>✨ Suggested Side Hustles</h3>
                  <p>Found {sideHustleSuggestions.length} ideas matching your capital and location</p>
                </div>
                
                {sideHustleSuggestions.map((suggestion, idx) => (
                  <div key={idx} className="card suggestion-card-enhanced">
                    <div className="suggestion-header">
                      <h4>{suggestion.title}</h4>
                      <span className={`difficulty-badge difficulty-${suggestion.difficulty || 'medium'}`}>
                        {suggestion.difficulty === 'very easy' ? '⭐ Very Easy' :
                         suggestion.difficulty === 'easy' ? '✨ Easy' :
                         suggestion.difficulty === 'medium' ? '💪 Medium' :
                         suggestion.difficulty === 'hard' ? '🔥 Hard' : '💪 Medium'}
                      </span>
                    </div>
                    
                    <p className="suggestion-description">{suggestion.description}</p>
                    
                    <div className="suggestion-details-grid">
                      <div className="detail-card">
                        <span className="detail-icon">💰</span>
                        <div>
                          <span className="detail-label">Capital Needed</span>
                          <span className="detail-value">{suggestion.capital}</span>
                        </div>
                      </div>
                      
                      <div className="detail-card">
                        <span className="detail-icon">📈</span>
                        <div>
                          <span className="detail-label">Potential Income</span>
                          <span className="detail-value">{suggestion.potential}</span>
                        </div>
                      </div>
                      
                      <div className="detail-card">
                        <span className="detail-icon">⏰</span>
                        <div>
                          <span className="detail-label">Time Required</span>
                          <span className="detail-value">{suggestion.timeRequired || 'Flexible'}</span>
                        </div>
                      </div>
                      
                      <div className="detail-card">
                        <span className="detail-icon">🎯</span>
                        <div>
                          <span className="detail-label">Skills Needed</span>
                          <span className="detail-value">{suggestion.skills || 'Basic'}</span>
                        </div>
                      </div>
                      
                      <div className="detail-card">
                        <span className="detail-icon">📍</span>
                        <div>
                          <span className="detail-label">Location</span>
                          <span className="detail-value">
                            {suggestion.location === 'urban' ? '🏙️ Urban' :
                             suggestion.location === 'peri-urban' ? '🏘️ Peri-Urban' :
                             suggestion.location === 'rural' ? '🌾 Rural' : suggestion.location || 'Any'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="detail-card">
                        <span className="detail-icon">📊</span>
                        <div>
                          <span className="detail-label">Competition</span>
                          <span className="detail-value">{suggestion.competition || 'Medium'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="suggestion-expandable">
                      <button
                        className="btn-expand"
                        onClick={() => setSelectedSuggestion(selectedSuggestion === idx ? null : idx)}
                      >
                        {selectedSuggestion === idx ? '▼ Hide Details' : '▶ Show Full Details'}
                      </button>
                      
                      {selectedSuggestion === idx && suggestion.stepsToStart && (
                        <div className="suggestion-full-details">
                          <div className="details-section">
                            <h5>📝 Steps to Start:</h5>
                            <ol className="steps-list">
                              {suggestion.stepsToStart.map((step, stepIdx) => (
                                <li key={stepIdx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                          
                          {suggestion.tips && (
                            <div className="details-section">
                              <h5>💡 Tips for Success:</h5>
                              <ul className="tips-list">
                                {suggestion.tips.map((tip, tipIdx) => (
                                  <li key={tipIdx}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {suggestion.resources && (
                            <div className="details-section">
                              <h5>🛠️ Resources Needed:</h5>
                              <p>{suggestion.resources}</p>
                            </div>
                          )}
                          
                          <div className="details-section">
                            <h5>📊 Market Info:</h5>
                            <div className="market-info">
                              <span><strong>Demand:</strong> {suggestion.demand || 'High'}</span>
                              <span><strong>Competition:</strong> {suggestion.competition || 'Medium'}</span>
                              {suggestion.location && (
                                <span><strong>Best For:</strong> {
                                  suggestion.location === 'urban' ? 'Urban Areas' :
                                  suggestion.location === 'peri-urban' ? 'Peri-Urban Areas' :
                                  suggestion.location === 'rural' ? 'Rural Areas' : suggestion.location
                                }</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Navigation />
    </div>
  );
};

const TransactionCard = ({ transaction, onDelete, categoryIcon }) => {
  const isIncome = transaction.type === 'income';
  
  return (
    <div className={`transaction-card ${isIncome ? 'income' : 'expense'}`}>
      <div className="transaction-icon">{categoryIcon || '📦'}</div>
      <div className="transaction-details">
        <div className="transaction-category">{transaction.category}</div>
        <div className="transaction-meta">
          <span className="transaction-date">
            {new Date(transaction.date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
          {transaction.description && (
            <span className="transaction-description">• {transaction.description}</span>
          )}
        </div>
      </div>
      <div className={`transaction-amount ${isIncome ? 'income' : 'expense'}`}>
        {isIncome ? '+' : '-'}
        {parseFloat(transaction.amount).toLocaleString()} TZS
      </div>
      <button
        className="delete-btn"
        onClick={() => onDelete(transaction.id)}
        title="Delete transaction"
      >
        🗑️
      </button>
    </div>
  );
};

export default FinanceTracker;
