import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------- Middleware -------------------
app.use(cors({
    origin: 'https://nexanovaa.vercel.app', // Your Vercel frontend
    credentials: true,
}));
app.use(bodyParser.json());

// ------------------- Supabase Setup -------------------
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ------------------- Routes -------------------

// Test route
app.get('/', (req, res) => {
    res.send('NexaNova Backend is running!');
});

// ------------------- User Registration -------------------
app.post('/api/register', async (req, res) => {
    const { email, password, nickname } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const { data, error } = await supabase
            .from('users')
            .insert({
                email,
                password_hash: hashedPassword,
                nickname
            })
            .select()
            .single();

        if (error) throw error;

        // Generate JWT
        const token = jwt.sign({ id: data.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ user: data, token });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ------------------- User Login -------------------
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) throw new Error('User not found');

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) throw new Error('Invalid password');

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ user, token });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ------------------- Start Server -------------------
app.listen(PORT, () => {
    console.log(`NexaNova backend running on port ${PORT}`);
});
