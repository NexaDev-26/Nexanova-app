// backend/config/dbAdapter.js
// Database adapter that supports both Supabase and SQLite
const { supabase } = require('./supabase');
const { db, dbRun, dbGet, dbAll } = require('./database');

const USE_SUPABASE = process.env.USE_SUPABASE === 'true' && supabase !== null;

if (USE_SUPABASE) {
  console.log('✅ Using Supabase as database');
} else {
  console.log('✅ Using SQLite as database');
}

/**
 * Database adapter that provides a unified interface
 * Uses Supabase if configured, otherwise falls back to SQLite
 */
const dbAdapter = {
  /**
   * Insert a record
   */
  async insert(table, data) {
    if (USE_SUPABASE) {
      // Convert boolean values for Supabase (PostgreSQL uses true/false, SQLite uses 0/1)
      const supabaseData = { ...data };
      Object.keys(supabaseData).forEach(key => {
        if (typeof supabaseData[key] === 'number' && (supabaseData[key] === 0 || supabaseData[key] === 1)) {
          // Check if this field should be boolean in Supabase
          if (key.includes('mode') || key.includes('active') || key.includes('store') || key.includes('recurring') || key.includes('completed')) {
            supabaseData[key] = supabaseData[key] === 1;
          }
        }
      });

      const { data: result, error } = await supabase
        .from(table)
        .insert(supabaseData)
        .select()
        .single();
      
      if (error) throw error;
      // Supabase returns UUID, convert to lastID format for compatibility
      return { lastID: result.id, changes: 1, row: result };
    } else {
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
      
      const result = await dbRun(sql, values);
      const row = await dbGet(`SELECT * FROM ${table} WHERE id = ?`, [result.lastID]);
      return { ...result, row };
    }
  },

  /**
   * Get a single record
   */
  async get(table, conditions) {
    if (USE_SUPABASE) {
      let query = supabase.from(table).select('*');
      
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    } else {
      const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
      const values = Object.values(conditions);
      const sql = `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`;
      return await dbGet(sql, values);
    }
  },

  /**
   * Get all records matching conditions
   */
  async getAll(table, conditions = {}) {
    if (USE_SUPABASE) {
      let query = supabase.from(table).select('*');
      
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else {
      if (Object.keys(conditions).length === 0) {
        return await dbAll(`SELECT * FROM ${table}`);
      }
      const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
      const values = Object.values(conditions);
      const sql = `SELECT * FROM ${table} WHERE ${whereClause}`;
      return await dbAll(sql, values);
    }
  },

  /**
   * Update records
   */
  async update(table, conditions, updates) {
    if (USE_SUPABASE) {
      let query = supabase.from(table).update(updates);
      
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data, error } = await query.select();
      if (error) throw error;
      return { changes: data?.length || 0, data };
    } else {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
      const values = [...Object.values(updates), ...Object.values(conditions)];
      const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
      return await dbRun(sql, values);
    }
  },

  /**
   * Delete records
   */
  async delete(table, conditions) {
    if (USE_SUPABASE) {
      let query = supabase.from(table).delete();
      
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data, error } = await query;
      if (error) throw error;
      return { changes: data?.length || 0 };
    } else {
      const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
      const values = Object.values(conditions);
      const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
      return await dbRun(sql, values);
    }
  },

  /**
   * Run a custom query (SQLite only - Supabase uses query builder)
   */
  async query(sql, params = []) {
    if (USE_SUPABASE) {
      throw new Error('Custom SQL queries not supported with Supabase. Use query builder methods.');
    }
    return await dbAll(sql, params);
  }
};

module.exports = dbAdapter;

