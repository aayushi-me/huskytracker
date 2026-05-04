/**
 * Database Seeder Module
 * Controls all database seeding operations
 */

const database = require('../database');
const mongoose = require('mongoose');
const seedUsers = require('./userSeeder');
const { seedEvents } = require('./eventSeeder');

/**
 * Master Seeder
 * Controls all database seeding operations
 */
class MasterSeeder {
    constructor() {
        this.seeders = [
            { name: 'Users', fn: seedUsers, enabled: true },
            { name: 'Events', fn: seedEvents, enabled: true },
            // Add more seeders here as they are created
        ];
    }

    // Run all enabled seeders
    async seedAll() {
        console.log('Starting database seeding...\n');

        try {
            // Connect to database
            await database.connect();

            for (const seeder of this.seeders) {
                if (seeder.enabled) {
                    console.log(`Seeding ${seeder.name}...`);
                    await seeder.fn();
                    console.log(`${seeder.name} seeded successfully\n`);
                } else {
                    console.log(`Skipping ${seeder.name} (disabled)\n`);
                }
            }

            console.log('Database seeding completed successfully!');
        } catch (error) {
            console.error('Seeding failed:', error.message);
            throw error;
        }
    }

    // Clear all collections (use with caution!)
    async clearAll() {
        console.log('Clearing all collections...\n');

        try {
            await database.connect();
            
            const collections = await mongoose.connection.db.collections();
            
            for (const collection of collections) {
                await collection.deleteMany({});
                console.log(`Cleared collection: ${collection.collectionName}`);
            }

            console.log('\nAll collections cleared successfully!');
        } catch (error) {
            console.error('Clearing failed:', error.message);
            throw error;
        }
    }

    // Reset database (clear + seed)
    async reset() {
        console.log('Resetting database...\n');
        await this.clearAll();
        console.log('\n');
        await this.seedAll();
    }
}

// Export singleton instance
const masterSeeder = new MasterSeeder();

// CLI support
// If this file is the main module (i.e. not imported), run the CLI
if (require.main === module) {
    const command = process.argv[2] || 'seed';

    (async () => {
        try {
            switch (command) {
                case 'seed':
                    await masterSeeder.seedAll();
                    break;
                case 'clear':
                    await masterSeeder.clearAll();
                    break;
                case 'reset':
                    await masterSeeder.reset();
                    break;
                default:
                    console.log('Unknown command. Use: seed, clear, or reset');
            }
            process.exit(0);
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    })();
}

module.exports = masterSeeder;

