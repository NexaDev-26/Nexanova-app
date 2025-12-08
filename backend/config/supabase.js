// backend/config/supabase.js
const path = require('path');
// Try to load .env from root first, then fallback to backend/.env
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ SUPABASE_URL or SUPABASE_ANON_KEY missing — Supabase will not be initialized");
}

// Use service role key for backend operations to bypass RLS
// Service role key has full access and bypasses Row Level Security
const supabase = (supabaseUrl && (supabaseServiceKey || supabaseAnonKey))
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

module.exports = {
  supabase,
  supabaseUrl,

  async waitForSupabase() {
    if (supabase) return supabase;

    let tries = 0;
    while (!supabase && tries < 10) {
      await new Promise(res => setTimeout(res, 100));
      tries++;
    }
    return supabase;
  }
};
