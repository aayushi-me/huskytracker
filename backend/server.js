// Main server file

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const emailPreviewRoute = require('./src/routes/emailPreviewRoute');

// Custom imports
const database = require('./src/config/database');
const eventScheduler = require('./src/services/eventScheduler');
const notificationScheduler = require('./src/jobs/notificationScheduler');

// Check for required environment variables
if (!process.env.MONGO_URI) {
    console.error("ERROR: Please specify MONGO_URI in env file");
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.error("ERROR: Please specify JWT_SECRET in env file");
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || console.error("ERROR: Please specify PORT in env file");

// Middleware

// Security headers
app.use(helmet());

// CORS
app.use(cors({
    // origin: process.env.NODE_ENV === "production"
    //     ? ['http://localhost:5000']
    //     : ['http://localhost:5000', 'http://localhost:3000'],
    origin: '*',
    credentials: true
}));

// Request logging
app.use(morgan('combined'));

// JSON body parsing
app.use(express.json({limit: '10mb'}));

// URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads (local storage)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'HuskyTrack API is running!',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', async (req, res) => {
    const dbHealth = await database.healthCheck();
    
    res.status(dbHealth.status === 'healthy' ? 200 : 503).json({
        status: dbHealth.status === 'healthy' ? 'ok' : 'error',
        database: dbHealth,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Email template preview route
app.use('/api/dev', emailPreviewRoute);


app.use('/api/v1', require('./src/routes'));

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
})

// Global error handler
const { errorHandler } = require('./src/utils/errors');
app.use(errorHandler);

// Start server and connect to database
const startServer = async () => {
    try {
        // Connect to database first
        await database.connect();

        // Start event scheduler
        eventScheduler.start();
        
        // Start notification scheduler
        notificationScheduler.start();

        // Then start the server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Ready to accept requests...`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

// Start the application (only if not in test environment)
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

// Export for testing
module.exports = app;