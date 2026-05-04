/**
 * User Seeder
 * Seeds initial test users for development
 */

const User = require('../../models/User');

// Default users
const testUsers = [
    {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@northeastern.edu',
        password: 'Password123!',
        university: 'Northeastern University',
        role: 'STUDENT',
        isEmailVerified: true
    },
    {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@northeastern.edu',
        password: 'Password123!',
        university: 'Northeastern University',
        role: 'ORGANIZER',
        isEmailVerified: true
    },
    {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@northeastern.edu',
        password: 'Admin123!',
        university: 'Northeastern University',
        role: 'ADMIN',
        isEmailVerified: true
    },
    {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@northeastern.edu',
        password: 'Password123!',
        university: 'Northeastern University',
        role: 'STUDENT',
        isEmailVerified: true
    },
    {
        firstName: 'Bob',
        lastName: 'Wilson',
        email: 'bob.wilson@northeastern.edu',
        password: 'Password123!',
        university: 'Northeastern University',
        role: 'STUDENT',
        isEmailVerified: true
    },
    {
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie.brown@northeastern.edu',
        password: 'Password123!',
        university: 'Northeastern University',
        role: 'STUDENT',
        isEmailVerified: true
    },
    {
        firstName: 'Diana',
        lastName: 'Martinez',
        email: 'diana.martinez@northeastern.edu',
        password: 'Password123!',
        university: 'Northeastern University',
        role: 'STUDENT',
        isEmailVerified: true
    },
    {
        firstName: 'Ethan',
        lastName: 'Davis',
        email: 'ethan.davis@northeastern.edu',
        password: 'Password123!',
        university: 'Northeastern University',
        role: 'STUDENT',
        isEmailVerified: true
    },
    {
        firstName: 'Fiona',
        lastName: 'Taylor',
        email: 'fiona.taylor@northeastern.edu',
        password: 'Password123!',
        university: 'Northeastern University',
        role: 'STUDENT',
        isEmailVerified: true
    },
    {
        firstName: 'George',
        lastName: 'Anderson',
        email: 'george.anderson@northeastern.edu',
        password: 'Password123!',
        university: 'Northeastern University',
        role: 'STUDENT',
        isEmailVerified: true
    }
];

async function seedUsers() {
    try {
        // Check if users already exist
        const existingUsersCount = await User.countDocuments();
        
        if (existingUsersCount > 0) {
            console.log(`Found ${existingUsersCount} existing users. Skipping user seeding.`);
            return;
        }

        // Create users
        const createdUsers = await User.create(testUsers);
        
        console.log(`Created ${createdUsers.length} test users`);
        
        // Log created user emails (for reference)
        createdUsers.forEach(user => {
            console.log(`   - ${user.email}`);
        });

    } catch (error) {
        console.error('Error seeding users:', error.message);
        throw error;
    }
}

module.exports = seedUsers;

