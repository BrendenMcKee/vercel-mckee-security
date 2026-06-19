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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
