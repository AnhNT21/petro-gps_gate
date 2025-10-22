import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Serve static HTML if needed
app.get('/', (req, res) => {
    res.send('Socket.IO Proxy Server is running...');
});

app.get('/entries', async (req, res) => {
    console.log('Fetching entries from Supabase...');
    try {
        const { data, error } = await supabase.from('entries').select('*').order('id', { ascending: false });
        console.log('Entries fetched:', data);
        if (error) {
            console.error('Error fetching entries:', error);
            return res.status(500).json({ error: 'Failed to fetch entries' });
        }
        res.json(data);
    } catch (error) {
        console.error('Error fetching entries:', error);
        return res.status(500).json({ error: 'Failed to fetch entries' });
    }
});

// Serve static files under /portal
app.use('/portal', express.static(path.join(__dirname, './portal')));

// Catch-all route for React Router under /portal
app.get('/portal/*', (req, res) => {
    res.sendFile(path.join(__dirname, './portal', 'index.html'));
});

export default app;
