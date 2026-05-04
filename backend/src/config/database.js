/**
 * Database Connection Module
 * Handles MongoDB connection with connection pooling, retry logic, and error handling
 */

const mongoose = require('mongoose');
require('dotenv').config();

class Database {
    constructor() {
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = parseInt(process.env.MONGO_MAX_RETRIES) || 5;
        this.retryDelay = parseInt(process.env.MONGO_RETRY_DELAY) || 5000;
    }

    // Get MongoDB connection options with connection pooling
    getConnectionOptions() {
        return {
            maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE) || 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000,
            family: 4, // Use IPv4, skip trying IPv6
        };
    }

    // Connect to MongoDB with retry logic
    async connect() {
        if (this.isConnected) {
            console.log('MongoDB: Already connected');
            return;
        }

        const mongoUri = process.env.MONGO_URI;
        
        if (!mongoUri) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }

        try {
            console.log('MongoDB: Attempting to connect...');
            
            await mongoose.connect(mongoUri, this.getConnectionOptions());
            
            this.isConnected = true;
            this.retryCount = 0;
            
            console.log('MongoDB: Connected successfully');
            console.log(`MongoDB: Connection pool size: ${process.env.MONGO_POOL_SIZE || 10}`);
            
            // Set up connection event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('MongoDB: Connection failed:', error.message);
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`MongoDB: Retry attempt ${this.retryCount}/${this.maxRetries} in ${this.retryDelay/1000}s...`);
                
                await this.sleep(this.retryDelay);
                return this.connect();
            } else {
                console.error(`MongoDB: Max retries (${this.maxRetries}) reached. Exiting...`);
                throw new Error(`Failed to connect to MongoDB after ${this.maxRetries} attempts`);
            }
        }
    }

    // Set up MongoDB connection event listeners
    setupEventListeners() {
        mongoose.connection.on('connected', () => {
            console.log('MongoDB: Connection established');
        });

        mongoose.connection.on('disconnected', () => {
            console.warn(' MongoDB: Connection lost');
            this.isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB: Reconnected successfully');
            this.isConnected = true;
        });

        mongoose.connection.on('error', (error) => {
            console.error('MongoDB: Connection error:', error.message);
            this.isConnected = false;
        });

        // Handle application termination
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    // Disconnect from MongoDB gracefully
    async disconnect() {
        if (!this.isConnected) {
            return;
        }

        try {
            await mongoose.connection.close();
            this.isConnected = false;
            console.log('MongoDB: Disconnected gracefully');
        } catch (error) {
            console.error('MongoDB: Error during disconnection:', error.message);
            throw error;
        }
    }

    // Get connection status
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            name: mongoose.connection.name,
            models: Object.keys(mongoose.connection.models)
        };
    }

    // Health check for database connection
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return { status: 'disconnected', message: 'Not connected to database' };
            }

            // Ping the database
            await mongoose.connection.db.admin().ping();
            
            return {
                status: 'healthy',
                message: 'Database connection is healthy',
                details: this.getConnectionStatus()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: 'Database health check failed',
                error: error.message
            };
        }
    }

    // Utility function to sleep/delay
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create singleton instance
const database = new Database();

module.exports = database;

