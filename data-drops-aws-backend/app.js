// app.js

import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import fs from 'fs';
import networkDataRoutes from './routes/networkDataRoutes.js';
import mainSiteRoutes from './routes/mainSiteRoutes.js';

// Create MySQL connection pool
export const pool = mysql.createPool({
    host: process.env.RDS_ENDPOINT,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    database: process.env.RDS_DB_NAME,
    ssl: {
        ca: fs.readFileSync('/var/app/current/certs/ca-central-1-bundle.pem')
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Tracks whether the optional drops_data.data_device column is available, so the
// app degrades gracefully (device writes become no-ops) if the migration has not
// run yet or the DB user lacks ALTER.
export const schemaState = { deviceColumnReady: false };

/**
 * Idempotent migration: add the nullable data_device column to drops_data if it
 * is missing. Tolerates a concurrent add and never throws, so it cannot crash
 * the server.
 */
export async function ensureDeviceColumn() {
    try {
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'drops_data'
               AND COLUMN_NAME = 'data_device'`
        );
        if (rows[0].cnt === 0) {
            try {
                await pool.query('ALTER TABLE drops_data ADD COLUMN data_device VARCHAR(120) NULL');
                console.log('Migration: added drops_data.data_device');
            } catch (err) {
                if (err && err.code === 'ER_DUP_FIELDNAME') {
                    console.log('Migration: drops_data.data_device already present');
                } else {
                    throw err;
                }
            }
        }
        schemaState.deviceColumnReady = true;
    } catch (err) {
        schemaState.deviceColumnReady = false;
        console.error('Migration: could not ensure drops_data.data_device column:', err.message);
    }
}

// Setup the Express App
const app = express();

// Configure CORS for cross-origin requests
const corsOptions = {
    origin: [
        'https://mckeesecurity.ca',
        'https://www.mckeesecurity.ca',
        'https://app-mckeesecurity.ca',
        'https://www.app-mckeesecurity.ca',
        // (localhost for development)
        'http://localhost:5173'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use routes
app.use('/api', networkDataRoutes);
app.use('/api', mainSiteRoutes);

// Root endpoint
app.get('/', (req, res) => res.send('Network Data Management Server - Successfully Running'));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await ensureDeviceColumn();
});
