// backend/config/supabase.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ SUPABASE_URL or SUPABASE_ANON_KEY missing — Supabase will not be initialized");
}

const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
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
