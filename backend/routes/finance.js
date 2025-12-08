const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { verifyToken } = require('./auth');
const { cacheMiddleware, invalidateUserCache } = require('../utils/cache');
const { awardPoints } = require('./user');

// Get all finance entries (optimized - limit to last 100 entries for performance)
router.get('/', verifyToken, (req, res) => {
  db.all(
    'SELECT id, user_id, type, category, amount, date, description, created_at FROM finance WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 100',
    [req.userId],
    (err, finance) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching finance data' });
      }
      res.json({ success: true, finance });
    }
  );
});

// Get finance summary (cached for 2 minutes)
router.get('/summary', verifyToken, cacheMiddleware({ ttl: 2 * 60 * 1000, prefix: 'finance' }), (req, res) => {
  const { startDate, endDate } = req.query;
  let query = 'SELECT type, SUM(amount) as total FROM finance WHERE user_id = ?';
  const params = [req.userId];

  if (startDate && endDate) {
    query += ' AND date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  query += ' GROUP BY type';

  db.all(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error fetching summary' });
    }

    const income = results.find(r => r.type === 'income')?.total || 0;
    const expense = results.find(r => r.type === 'expense')?.total || 0;
    const balance = income - expense;

    res.json({ success: true, summary: { income, expense, balance } });
  });
});

// Add finance entry
router.post('/', verifyToken, (req, res) => {
  const { type, category, amount, date, description } = req.body;

  if (!type || !category || !amount || !date) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  db.run(
    'INSERT INTO finance (user_id, type, category, amount, date, description) VALUES (?, ?, ?, ?, ?, ?)',
    [req.userId, type, category, amount, date, description || null],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error adding finance entry' });
      }
      // Award points for tracking finances
      let points = 3; // Base points for tracking
      if (type === 'income') points += 2; // Bonus for income tracking
      awardPoints(req.userId, points, 'Finance tracking').catch(err => {
        console.error('Error awarding finance points:', err);
      });
      // Invalidate user's finance cache
      invalidateUserCache(req.userId);
      res.json({ success: true, finance_id: this.lastID });
    }
  );
});

// Update finance entry
router.patch('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { amount, category, date } = req.body;

  db.run(
    'UPDATE finance SET amount = COALESCE(?, amount), category = COALESCE(?, category), date = COALESCE(?, date) WHERE id = ? AND user_id = ?',
    [amount, category, date, id, req.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error updating finance entry' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Finance entry not found' });
      }
      // Invalidate user's finance cache
      invalidateUserCache(req.userId);
      res.json({ success: true });
    }
  );
});

// Delete finance entry
router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM finance WHERE id = ? AND user_id = ?', [id, req.userId], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error deleting finance entry' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Finance entry not found' });
    }
    // Invalidate user's finance cache
    invalidateUserCache(req.userId);
    res.json({ success: true });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SAVINGS GOALS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// Get all savings goals
router.get('/goals', verifyToken, (req, res) => {
  db.all(
    'SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC',
    [req.userId],
    (err, goals) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching goals' });
      }
      res.json({ success: true, goals: goals || [] });
    }
  );
});

// Create savings goal
router.post('/goals', verifyToken, (req, res) => {
  const { title, description, target_amount, deadline } = req.body;

  if (!title || !target_amount) {
    return res.status(400).json({ success: false, message: 'Title and target amount required' });
  }

  db.run(
    'INSERT INTO savings_goals (user_id, title, description, target_amount, deadline) VALUES (?, ?, ?, ?, ?)',
    [req.userId, title, description || null, target_amount, deadline || null],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error creating goal' });
      }
      res.json({ success: true, goal_id: this.lastID });
    }
  );
});

// Update savings goal
router.patch('/goals/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { title, description, target_amount, current_amount, deadline, is_completed } = req.body;

  // First get the current goal to check if it's being completed
  db.get('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?', [id, req.userId], (err, goal) => {
    if (err || !goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

  const updates = [];
  const params = [];

  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (target_amount !== undefined) { updates.push('target_amount = ?'); params.push(target_amount); }
  if (current_amount !== undefined) { updates.push('current_amount = ?'); params.push(current_amount); }
  if (deadline !== undefined) { updates.push('deadline = ?'); params.push(deadline); }
  if (is_completed !== undefined) { updates.push('is_completed = ?'); params.push(is_completed ? 1 : 0); }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id, req.userId);

  db.run(
    `UPDATE savings_goals SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    params,
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error updating goal' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Goal not found' });
      }

        // Check if goal was just completed
        const newCurrentAmount = current_amount !== undefined ? current_amount : goal.current_amount;
        const newTargetAmount = target_amount !== undefined ? target_amount : goal.target_amount;
        const newIsCompleted = is_completed !== undefined ? is_completed : goal.is_completed;

        // Award badge if goal is completed
        if ((newIsCompleted || newCurrentAmount >= newTargetAmount) && !goal.is_completed) {
          checkFinancialBadges(req.userId, newTargetAmount, goal.title);
          // Award bonus points
          awardPoints(req.userId, 100, `Savings goal achieved: ${goal.title}`).catch(err => {
            console.error('Error awarding goal completion points:', err);
          });
        }

      res.json({ success: true });
    }
  );
  });
});

// Delete savings goal
router.delete('/goals/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM savings_goals WHERE id = ? AND user_id = ?', [id, req.userId], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error deleting goal' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    res.json({ success: true });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BUDGET ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// Get active budget
router.get('/budget', verifyToken, (req, res) => {
  db.get(
    'SELECT * FROM budgets WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
    [req.userId],
    (err, budget) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching budget' });
      }
      res.json({ success: true, budget: budget || null });
    }
  );
});

// Set/Update budget
router.post('/budget', verifyToken, (req, res) => {
  const { amount, period } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid budget amount required' });
  }

  const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
  const budgetPeriod = validPeriods.includes(period) ? period : 'monthly';
  const startDate = new Date().toISOString().split('T')[0];

  // Deactivate existing budgets
  db.run('UPDATE budgets SET is_active = 0 WHERE user_id = ?', [req.userId], (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error updating budgets' });
    }

    // Create new budget
    db.run(
      'INSERT INTO budgets (user_id, amount, period, start_date) VALUES (?, ?, ?, ?)',
      [req.userId, amount, budgetPeriod, startDate],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error creating budget' });
        }
        res.json({ success: true, budget_id: this.lastID });
      }
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SIDE HUSTLE SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════

// Get side hustle suggestions
router.post('/side-hustle', verifyToken, (req, res) => {
  try {
    const { capital, location, city, region } = req.body;
    const capitalAmount = parseFloat(capital) || 0;
    
    // Validate capital input
    if (isNaN(capitalAmount) || capitalAmount < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid capital amount. Please provide a valid number.' 
      });
    }
    
    // Determine location type: if city/region provided, parse it; otherwise use general location type
    let selectedLocation = 'urban'; // default
    let locationDetails = {};
    
    if (city && region) {
      // Specific location provided (e.g., "Geita, Geita")
      locationDetails = { city: String(city).trim(), region: String(region).trim(), specific: true };
      // Determine location type based on city/region characteristics
      // Major cities are urban, smaller towns are peri-urban, villages are rural
      const majorCities = ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Tanga', 'Morogoro'];
      const cityName = String(city).split(',')[0].trim();
      if (majorCities.includes(cityName)) {
        selectedLocation = 'urban';
      } else {
        selectedLocation = 'peri-urban'; // Default for specific cities
      }
    } else if (location) {
      // General location type provided (urban, peri-urban, rural)
      const validLocations = ['urban', 'peri-urban', 'rural'];
      selectedLocation = validLocations.includes(String(location).toLowerCase()) 
        ? String(location).toLowerCase() 
        : 'urban';
      locationDetails = { type: selectedLocation, specific: false };
    }

    // Generate suggestions with error handling
    let suggestions = [];
    try {
      suggestions = generateSideHustleSuggestions(capitalAmount, selectedLocation, locationDetails);
    } catch (genError) {
      console.error('Error generating side hustle suggestions:', genError);
      // Return default suggestions if generation fails
      suggestions = [{
        title: 'Freelance Skills (Online)',
        description: 'Use your skills online: writing, design, virtual assistance, social media management.',
        capital: '0 - 5,000 TZS (internet)',
        capitalMin: 0,
        capitalMax: 5000,
        potential: '5,000 - 50,000 TZS/day',
        potentialMin: 5000,
        potentialMax: 50000,
        timeRequired: 'Flexible (2-8 hours)',
        skills: 'Writing, design, social media, virtual assistance',
        difficulty: 'medium',
        location: selectedLocation,
        stepsToStart: [
          'Identify your skills',
          'Create profiles on freelancing platforms',
          'Build portfolio',
          'Start with small jobs'
        ],
        tips: ['Start with local clients', 'Build strong portfolio', 'Deliver quality work'],
        resources: 'Internet access, computer/phone, skills',
        competition: 'High',
        demand: 'High'
      }];
    }

    // Ensure we always return at least some suggestions
    if (!suggestions || suggestions.length === 0) {
      console.warn('No suggestions generated, returning default suggestions');
      suggestions = [{
        title: 'Start Small Business',
        description: 'Begin with any small business idea that matches your capital and location.',
        capital: `${capitalAmount.toLocaleString()} TZS`,
        capitalMin: capitalAmount,
        capitalMax: capitalAmount * 2,
        potential: 'Varies',
        potentialMin: 0,
        potentialMax: 0,
        timeRequired: 'Flexible',
        skills: 'Business basics',
        difficulty: 'medium',
        location: selectedLocation,
        stepsToStart: ['Identify opportunity', 'Plan your business', 'Start small'],
        tips: ['Start small', 'Learn as you go', 'Build customer base'],
        resources: 'Capital, location, basic skills',
        competition: 'Medium',
        demand: 'High'
      }];
    }

    res.json({ success: true, suggestions, location: locationDetails });
  } catch (error) {
    console.error('Error in side-hustle route:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate side hustle suggestions. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

function generateSideHustleSuggestions(capital, location = 'urban', locationDetails = {}) {
  const suggestions = [];
  
  // Location-specific adjustments
  const locationModifiers = {
    urban: { capitalMultiplier: 1, demandMultiplier: 1.2, competitionLevel: 'high' },
    'peri-urban': { capitalMultiplier: 0.8, demandMultiplier: 1, competitionLevel: 'medium' },
    rural: { capitalMultiplier: 0.6, demandMultiplier: 0.8, competitionLevel: 'low' }
  };
  
  const modifier = locationModifiers[location] || locationModifiers.urban;
  const adjustedCapital = capital / modifier.capitalMultiplier;
  
  // Add location context to suggestions
  const locationContext = locationDetails.specific 
    ? `${locationDetails.city || ''}${locationDetails.region ? `, ${locationDetails.region}` : ''}`.trim() || location
    : location;

  // Low Capital Options (0 - 10,000 TZS)
  if (adjustedCapital < 10000) {
    suggestions.push({
      title: 'Mobile Money Agent',
      description: 'Become a mobile money agent and help people send/receive money. Earn commission on each transaction.',
      capital: '5,000 - 10,000 TZS',
      capitalMin: 5000,
      capitalMax: 10000,
      potential: '2,000 - 5,000 TZS/day',
      potentialMin: 2000,
      potentialMax: 5000,
      timeRequired: '2-4 hours/day',
      skills: 'Basic math, smartphone knowledge',
      difficulty: 'easy',
      location: locationContext || location,
      stepsToStart: [
        'Contact mobile money provider (Tigo Pesa, M-Pesa, Airtel Money)',
        'Complete agent registration',
        'Get POS machine or agent app',
        'Start with small float amount (5,000-10,000 TZS)',
        'Set up in busy area (market, bus stop, shop)'
      ],
      tips: [
        'Start in high-traffic areas',
        'Build trust with customers',
        'Keep accurate records',
        'Promote your service to neighbors'
      ],
      resources: 'Mobile phone, agent registration, small float amount',
      competition: modifier.competitionLevel,
      demand: location === 'urban' ? 'High' : location === 'rural' ? 'Medium' : 'High'
    });

    suggestions.push({
      title: 'Phone Charging Service',
      description: 'Set up a charging station in a busy area. Charge phones, power banks, and other devices.',
      capital: '3,000 - 8,000 TZS',
      capitalMin: 3000,
      capitalMax: 8000,
      potential: '1,500 - 3,000 TZS/day',
      potentialMin: 1500,
      potentialMax: 3000,
      timeRequired: '3-6 hours/day',
      skills: 'Basic electrical knowledge',
      difficulty: 'easy',
      location: locationContext || location,
      stepsToStart: [
        'Buy multiple phone chargers (USB cables)',
        'Get extension cords and power strips',
        'Find location near power source (shop, kiosk)',
        'Set fixed rates (500-1,000 TZS per hour)',
        'Create simple record book'
      ],
      tips: [
        'Location is key - choose busy areas',
        'Offer multiple charging ports',
        'Label cables to avoid mix-ups',
        'Provide security for phones'
      ],
      resources: 'Multiple chargers, extension cords, power source access',
      competition: modifier.competitionLevel,
      demand: 'High in all locations'
    });

    suggestions.push({
      title: 'Water Selling',
      description: 'Buy clean drinking water in bulk and sell in small quantities. High demand in busy areas.',
      capital: '2,000 - 5,000 TZS',
      capitalMin: 2000,
      capitalMax: 5000,
      potential: '1,000 - 2,500 TZS/day',
      potentialMin: 1000,
      potentialMax: 2500,
      timeRequired: '2-3 hours/day',
      skills: 'None required',
      difficulty: 'very easy',
      location: locationContext || location,
      stepsToStart: [
        'Buy large water containers (20L jerry cans)',
        'Source clean water (tap, borehole, or filtered)',
        'Get small containers/bottles for selling',
        'Find location (market, bus stop, school)',
        'Set price (200-500 TZS per bottle)'
      ],
      tips: [
        'Ensure water is clean and safe',
        'Sell in high-traffic areas',
        'Keep containers clean',
        'Offer cold water (add ice) for premium price'
      ],
      resources: 'Water containers, clean water source, small bottles',
      competition: location === 'urban' ? 'High' : 'Medium',
      demand: 'Very High'
    });

    if (location === 'urban' || location === 'peri-urban') {
      suggestions.push({
        title: 'Boda Boda/Motorcycle Taxi',
        description: 'Use your bicycle or motorcycle to transport people short distances. High demand in peri-urban areas.',
        capital: '10,000 - 30,000 TZS',
        capitalMin: 10000,
        capitalMax: 30000,
        potential: '5,000 - 15,000 TZS/day',
        potentialMin: 5000,
        potentialMax: 15000,
        timeRequired: 'Flexible (2-8 hours)',
        skills: 'Riding skills, navigation',
        difficulty: 'medium',
        location: locationContext || location,
        stepsToStart: [
          'Have access to bicycle/motorcycle',
          'Register with local authorities (if required)',
          'Get basic safety gear',
          'Learn local routes',
          'Start with short trips'
        ],
        tips: [
          'Know your routes well',
          'Keep vehicle well-maintained',
          'Set fair prices',
          'Build regular customers'
        ],
        resources: 'Bicycle or motorcycle, safety gear, registration',
        competition: 'Medium to High',
        demand: 'High in peri-urban'
      });
    }
  }

  // Medium Capital Options (10,000 - 50,000 TZS)
  if (adjustedCapital >= 10000 && adjustedCapital < 50000) {
    suggestions.push({
      title: 'Small Snacks & Drinks Business',
      description: 'Buy and sell snacks, fruits, juices, and drinks. Perfect for markets, schools, or busy streets.',
      capital: '15,000 - 30,000 TZS',
      capitalMin: 15000,
      capitalMax: 30000,
      potential: '5,000 - 10,000 TZS/day',
      potentialMin: 5000,
      potentialMax: 10000,
      timeRequired: '4-6 hours/day',
      skills: 'Basic math, customer service',
      difficulty: 'easy',
      location: locationContext || location,
      stepsToStart: [
        'Identify target market (students, workers, passersby)',
        'Source suppliers (wholesale markets)',
        'Buy initial stock (variety of snacks)',
        'Get cooler/refrigerator for drinks (if possible)',
        'Set up display table or small stall',
        'Price items competitively'
      ],
      tips: [
        'Start with popular items',
        'Keep stock fresh',
        'Buy in bulk for better prices',
        'Know your peak hours',
        'Build relationships with customers'
      ],
      resources: 'Capital for stock, display table, cooler (optional)',
      competition: modifier.competitionLevel,
      demand: 'Very High'
    });

    suggestions.push({
      title: 'Airtime & Data Reselling',
      description: 'Buy airtime and mobile data in bulk, sell to customers at small markup. Digital business with good margins.',
      capital: '10,000 - 25,000 TZS',
      capitalMin: 10000,
      capitalMax: 25000,
      potential: '3,000 - 7,000 TZS/day',
      potentialMin: 3000,
      potentialMax: 7000,
      timeRequired: '2-3 hours/day',
      skills: 'Smartphone knowledge, basic math',
      difficulty: 'easy',
      location: locationContext || location,
      stepsToStart: [
        'Download mobile money apps (M-Pesa, Tigo Pesa)',
        'Buy airtime/data bundles in bulk',
        'Set up small markup (10-15%)',
        'Advertise in your area',
        'Use social media to reach more customers',
        'Keep records of sales'
      ],
      tips: [
        'Buy during promotions for better rates',
        'Offer bundles (more value)',
        'Respond quickly to customer requests',
        'Build customer trust',
        'Use WhatsApp groups for marketing'
      ],
      resources: 'Smartphone, mobile money account, capital',
      competition: 'Medium',
      demand: 'Very High'
    });

    suggestions.push({
      title: 'Fruit & Vegetable Vending',
      description: 'Buy fresh fruits and vegetables wholesale, sell retail. Great for markets and residential areas.',
      capital: '20,000 - 40,000 TZS',
      capitalMin: 20000,
      capitalMax: 40000,
      potential: '4,000 - 8,000 TZS/day',
      potentialMin: 4000,
      potentialMax: 8000,
      timeRequired: '5-7 hours/day',
      skills: 'Selection of fresh produce, customer service',
      difficulty: 'medium',
      location: locationContext || location,
      stepsToStart: [
        'Visit wholesale markets early morning',
        'Learn to identify fresh produce',
        'Buy variety of popular fruits/vegetables',
        'Set up stall in market or high-traffic area',
        'Price competitively (consider waste)',
        'Learn about seasonal products'
      ],
      tips: [
        'Buy fresh - customers value quality',
        'Rotate stock (sell older items first)',
        'Offer bulk discounts',
        'Know your peak times (morning, evening)',
        'Build relationships with suppliers'
      ],
      resources: 'Capital, weighing scale, display baskets, location',
      competition: modifier.competitionLevel,
      demand: 'High'
    });

    if (location === 'rural' || location === 'peri-urban') {
      suggestions.push({
        title: 'Chicken/Kuku Business',
        description: 'Buy and sell live chickens or eggs. High demand in rural and peri-urban areas.',
        capital: '25,000 - 45,000 TZS',
        capitalMin: 25000,
        capitalMax: 45000,
        potential: '6,000 - 12,000 TZS/day',
        potentialMin: 6000,
        potentialMax: 12000,
        timeRequired: '4-6 hours/day',
        skills: 'Animal handling, pricing knowledge',
        difficulty: 'medium',
        location: locationContext || location,
        stepsToStart: [
          'Identify reliable chicken/egg suppliers',
          'Learn market prices',
          'Buy initial stock (5-10 chickens or eggs)',
          'Set up in market or strategic location',
          'Know when demand is high (weekends, holidays)',
          'Keep chickens healthy (if live)'
        ],
        tips: [
          'Buy healthy chickens',
          'Know market prices well',
          'Sell during high-demand periods',
          'Build trust with customers',
          'Consider selling eggs for steady income'
        ],
        resources: 'Capital, transport, cages (for live chickens)',
        competition: 'Medium',
        demand: 'High in rural/peri-urban'
      });
    }
  }

  // Higher Capital Options (50,000+ TZS)
  if (adjustedCapital >= 50000) {
    suggestions.push({
      title: 'Small Shop/Kiosk (Duka)',
      description: 'Open a small shop selling daily essentials: cooking oil, sugar, salt, soap, matches, and other household items.',
      capital: '50,000 - 150,000 TZS',
      capitalMin: 50000,
      capitalMax: 150000,
      potential: '10,000 - 25,000 TZS/day',
      potentialMin: 10000,
      potentialMax: 25000,
      timeRequired: '6-10 hours/day',
      skills: 'Business management, inventory, customer service',
      difficulty: 'medium',
      location: locationContext || location,
      stepsToStart: [
        'Identify good location (near residential area)',
        'Register business (if required)',
        'Source suppliers (wholesalers)',
        'Buy initial inventory (essential items)',
        'Set up shelves and display',
        'Price items competitively',
        'Get basic record-keeping system'
      ],
      tips: [
        'Location is crucial - near homes is best',
        'Stock essential items first',
        'Buy in bulk for better margins',
        'Build customer loyalty',
        'Keep records of sales and inventory',
        'Offer credit to trusted customers (carefully)'
      ],
      resources: 'Capital, location (rent or own), shelves, supplier contacts',
      competition: location === 'urban' ? 'High' : 'Medium',
      demand: 'Very High'
    });

    suggestions.push({
      title: 'Tailoring & Clothing Repair',
      description: 'Offer tailoring services and clothing repairs. Great business with steady demand.',
      capital: '40,000 - 80,000 TZS',
      capitalMin: 40000,
      capitalMax: 80000,
      potential: '8,000 - 18,000 TZS/day',
      potentialMin: 8000,
      potentialMax: 18000,
      timeRequired: '5-7 hours/day',
      skills: 'Sewing, tailoring skills',
      difficulty: 'medium',
      location: locationContext || location,
      stepsToStart: [
        'Learn basic tailoring (or use existing skills)',
        'Buy sewing machine (manual or electric)',
        'Get basic supplies (thread, needles, fabric)',
        'Set up small workspace',
        'Set competitive prices',
        'Advertise in your area',
        'Offer repair services to start'
      ],
      tips: [
        'Start with repairs (lower capital)',
        'Build portfolio of your work',
        'Offer timely service',
        'Learn current fashion trends',
        'Network with fabric sellers',
        'Provide quality work for referrals'
      ],
      resources: 'Sewing machine, workspace, supplies, skills',
      competition: 'Medium',
      demand: 'High'
    });

    suggestions.push({
      title: 'Phone Repair Service',
      description: 'Offer basic phone repairs: screen replacement, battery replacement, charging port fixes. High demand business.',
      capital: '60,000 - 120,000 TZS',
      capitalMin: 60000,
      capitalMax: 120000,
      potential: '12,000 - 25,000 TZS/day',
      potentialMin: 12000,
      potentialMax: 25000,
      timeRequired: '6-8 hours/day',
      skills: 'Phone repair skills, technical knowledge',
      difficulty: 'hard',
      location: locationContext || location,
      stepsToStart: [
        'Learn phone repair (training or online tutorials)',
        'Buy repair tools (screwdrivers, heating tools)',
        'Source spare parts (screens, batteries, charging ports)',
        'Set up workspace with good lighting',
        'Start with simple repairs',
        'Build trust with customers',
        'Advertise services'
      ],
      tips: [
        'Invest in quality tools',
        'Source genuine parts when possible',
        'Practice on old phones first',
        'Offer warranty on repairs',
        'Build reputation for reliability',
        'Learn about common phone models'
      ],
      resources: 'Repair tools, spare parts inventory, workspace, skills',
      competition: location === 'urban' ? 'High' : 'Low to Medium',
      demand: 'Very High'
    });
  }

  // Location-specific suggestions
  if (location === 'rural') {
    suggestions.push({
      title: 'Agricultural Input Sales',
      description: 'Sell seeds, fertilizers, and farming tools to farmers. High demand during planting seasons.',
      capital: '30,000 - 80,000 TZS',
      capitalMin: 30000,
      capitalMax: 80000,
      potential: '7,000 - 15,000 TZS/day',
      potentialMin: 7000,
      potentialMax: 15000,
      timeRequired: '3-5 hours/day (seasonal)',
      skills: 'Agricultural knowledge, customer relations',
      difficulty: 'medium',
      location: locationContext || location,
      stepsToStart: [
        'Identify farming communities',
        'Source agricultural inputs (seeds, fertilizers)',
        'Learn about farming seasons',
        'Set up in market or mobile service',
        'Build relationships with farmers',
        'Offer advice on usage'
      ],
      tips: [
        'Stock items before planting season',
        'Know farming calendar',
        'Offer credit during planting',
        'Provide basic agricultural advice',
        'Build trust with farmers'
      ],
      resources: 'Capital, supplier contacts, agricultural knowledge',
      competition: 'Low to Medium',
      demand: 'High during planting season'
    });
  }

  // Always include skill-based/online options
  suggestions.push({
    title: 'Freelance Skills (Online)',
    description: 'Use your skills online: writing, design, virtual assistance, social media management, data entry, translation.',
    capital: '0 - 5,000 TZS (internet)',
    capitalMin: 0,
    capitalMax: 5000,
    potential: '5,000 - 50,000 TZS/day (varies)',
    potentialMin: 5000,
    potentialMax: 50000,
    timeRequired: 'Flexible (2-8 hours)',
    skills: 'Writing, design, social media, virtual assistance, etc.',
    difficulty: 'medium',
    location: location,
    stepsToStart: [
      'Identify your skills (writing, design, data entry, etc.)',
      'Create profiles on freelancing platforms (Upwork, Fiverr, local platforms)',
      'Build portfolio with samples',
      'Start with small jobs to build reviews',
      'Set competitive rates initially',
      'Use social media to find clients',
      'Join freelancing groups/communities'
    ],
    tips: [
      'Start with local clients',
      'Build strong portfolio',
      'Deliver quality work on time',
      'Communicate clearly',
      'Network with other freelancers',
      'Learn new skills continuously'
    ],
    resources: 'Internet access, computer/phone, skills, portfolio',
    competition: 'High (global)',
    demand: 'High (especially digital skills)'
  });

  suggestions.push({
    title: 'Social Media Marketing',
    description: 'Help small businesses manage social media accounts. Growing demand for digital presence.',
    capital: '0 - 10,000 TZS',
    capitalMin: 0,
    capitalMax: 10000,
    potential: '10,000 - 30,000 TZS/day',
    potentialMin: 10000,
    potentialMax: 30000,
    timeRequired: '2-4 hours/day',
    skills: 'Social media knowledge, content creation, basic design',
    difficulty: 'medium',
    location: location,
    stepsToStart: [
      'Learn social media platforms (Facebook, Instagram, WhatsApp Business)',
      'Practice creating content',
      'Approach local businesses',
      'Offer package deals (posts per week)',
      'Create content calendar',
      'Track engagement and results',
      'Build portfolio of work'
    ],
    tips: [
      'Start with free services to build portfolio',
      'Learn content creation tools',
      'Focus on local businesses',
      'Show results (engagement, sales)',
      'Stay updated with trends',
      'Network with business owners'
    ],
    resources: 'Smartphone, internet, social media knowledge',
    competition: 'Medium',
    demand: 'Growing rapidly'
  });

  // Add more diverse suggestions
  suggestions.push({
    title: 'Mama Lishe / Home Cooked Meals',
    description: 'Cook and sell home-cooked meals. High demand near workplaces, schools, and markets.',
    capital: '20,000 - 50,000 TZS',
    capitalMin: 20000,
    capitalMax: 50000,
    potential: '8,000 - 20,000 TZS/day',
    potentialMin: 8000,
    potentialMax: 20000,
    timeRequired: '5-7 hours/day',
    skills: 'Cooking, food safety, customer service',
    difficulty: 'medium',
    location: location,
    stepsToStart: [
      'Identify your signature dishes',
      'Calculate food costs',
      'Get necessary permits (if required)',
      'Set up cooking space',
      'Source ingredients from markets',
      'Price meals competitively',
      'Find location near customers (workplaces, schools)'
    ],
    tips: [
      'Start with popular local dishes',
      'Ensure food hygiene',
      'Consistent quality is key',
      'Know your peak hours',
      'Build regular customers',
      'Offer variety',
      'Keep costs low'
    ],
    resources: 'Cooking equipment, ingredients, workspace, permits',
    competition: 'Medium to High',
    demand: 'Very High'
  });

  if (location === 'urban' || location === 'peri-urban') {
    suggestions.push({
      title: 'Laundry Service',
      description: 'Offer washing and ironing services. Growing demand in busy urban areas.',
      capital: '15,000 - 40,000 TZS',
      capitalMin: 15000,
      capitalMax: 40000,
      potential: '6,000 - 15,000 TZS/day',
      potentialMin: 6000,
      potentialMax: 15000,
      timeRequired: '4-6 hours/day',
      skills: 'Washing, ironing, customer service',
      difficulty: 'easy to medium',
      location: locationContext || location,
      stepsToStart: [
        'Get washing equipment (basins, soap, brushes)',
        'Get iron and ironing board',
        'Set up washing area',
        'Set prices (per piece or per load)',
        'Advertise in residential areas',
        'Build customer base'
      ],
      tips: [
        'Handle clothes carefully',
        'Return clothes on time',
        'Keep records of items',
        'Offer pickup/delivery (premium service)',
        'Build trust with customers'
      ],
      resources: 'Washing equipment, water, soap, iron, workspace',
      competition: 'Medium',
      demand: 'High in urban areas'
    });
  }

  // Limit to 8-10 best suggestions based on capital
  return suggestions.slice(0, 10);
}

// Check and award financial badges
function checkFinancialBadges(userId, targetAmount, goalTitle) {
  // Award badge for completing savings goal
  const badgeTitle = `Savings Goal Achieved: ${goalTitle} 💰`;
  
  db.run(
    'INSERT INTO rewards (user_id, type, title, description) VALUES (?, ?, ?, ?)',
    [userId, 'financial', badgeTitle, `Successfully saved ${targetAmount.toLocaleString()} TZS`],
    (err) => {
      if (err) {
        console.error('Error awarding financial badge:', err);
      } else {
        console.log(`✅ Financial badge awarded: ${badgeTitle} to user ${userId}`);
      }
    }
  );

  // Check for milestone badges based on amount
  const milestones = [
    { amount: 10000, title: 'First 10K Saved 🎯' },
    { amount: 50000, title: '50K Milestone Achieved 💵' },
    { amount: 100000, title: '100K Savings Champion 🏆' },
    { amount: 500000, title: 'Half Million Saver ⭐' }
  ];

  milestones.forEach(milestone => {
    if (targetAmount >= milestone.amount) {
      db.run(
        'INSERT INTO rewards (user_id, type, title, description) VALUES (?, ?, ?, ?)',
        [userId, 'financial', milestone.title, `Reached ${milestone.amount.toLocaleString()} TZS savings milestone`],
        (err) => {
          if (!err) {
            console.log(`✅ Milestone badge awarded: ${milestone.title}`);
          }
        }
      );
    }
  });
}

module.exports = router;

