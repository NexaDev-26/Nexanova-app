const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Dynamic import for Supabase (ES module)
let createClient;
let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client
(async () => {
  try {
    if (!supabaseKey) {
      console.warn('⚠️  WARNING: SUPABASE_KEY not set in .env file');
      console.warn('   Supabase client will not be initialized');
      console.warn('   Add your Supabase anon key to .env file');
      console.warn('   Server will use SQLite database as fallback');
      return;
    }

    // Import Supabase client (handles both CommonJS and ES modules)
    const supabaseModule = await import('@supabase/supabase-js');
    createClient = supabaseModule.createClient;
    
    supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Supabase client initialized successfully');
    console.log('   URL:', supabaseUrl);
    
    // Test connection (optional - can be removed in production)
    if (process.env.NODE_ENV === 'development') {
      try {
        // Simple connection test
        const { error } = await supabase.from('users').select('count').limit(1);
        if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist (expected)
          console.warn('⚠️  Supabase connection test warning:', error.message);
        } else {
          console.log('✅ Supabase connection test successful');
        }
      } catch (testError) {
        console.warn('⚠️  Supabase connection test skipped (tables may not exist)');
      }
    }
  } catch (error) {
    console.warn('⚠️  Warning initializing Supabase:', error.message);
    console.warn('   Server will use SQLite database as fallback');
  }
})();

module.exports = {
  get supabase() {
    return supabase;
  },
  supabaseUrl,
  // Helper function to wait for Supabase to be ready
  async waitForSupabase() {
    let attempts = 0;
    while (!supabase && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    return supabase;
  }
};

