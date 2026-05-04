/**
 * Event Seeder
 */

const { Event, EventStatus } = require('../../models/Event');
const User = require('../../models/User');

/**
 * Seed sample events
 */
async function seedEvents() {
  try {
    console.log('Seeding events...');

    // Find organizers
    const organizer = await User.findOne({ role: 'ORGANIZER' });
    if (!organizer) {
      console.error('No organizer found. Please seed users first.');
      return;
    }

    // Clear existing events
    await Event.deleteMany({});
    console.log('Cleared existing events');

    // Create sample events
    const now = new Date();
    const futureDate1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const futureDate2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
    const futureDate3 = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000); // 21 days from now
    const futureDate4 = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000); // 28 days from now
    const futureDate5 = new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000); // 35 days from now
    const futureDate6 = new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000); // 42 days from now

    const events = [
      {
        title: 'HuskyHack 2025',
        description: 'Annual hackathon for Northeastern students. Join us for 24 hours of coding, collaboration, and innovation. Great prizes and networking opportunities!',
        organizer: organizer._id,
        category: 'Academic',
        status: EventStatus.PUBLISHED,
        startDate: new Date(futureDate1.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        endDate: new Date(futureDate1.getTime() + 33 * 60 * 60 * 1000), // 9 AM next day
        location: {
          name: 'Curry Student Center',
          address: '360 Huntington Ave',
          city: 'Boston',
          state: 'MA',
          zipCode: '02115',
          isVirtual: false
        },
        maxRegistrations: 200,
        currentRegistrations: 45,
        imageUrl: 'https://huskytrack-storage.s3.amazonaws.com/events/1765595662378-3e8da60e-44f0-4fb7-98ed-a2c0014e6aa6.jpg',
        tags: ['hackathon', 'coding', 'technology', 'innovation'],
        isPublic: true
      },
      {
        title: 'Career Fair 2025',
        description: 'Connect with top employers and explore career opportunities. Bring your resume and dress professionally!',
        organizer: organizer._id,
        category: 'Career',
        status: EventStatus.PUBLISHED,
        startDate: new Date(futureDate2.getTime() + 10 * 60 * 60 * 1000), // 10 AM
        endDate: new Date(futureDate2.getTime() + 16 * 60 * 60 * 1000), // 4 PM
        location: {
          name: 'Matthews Arena',
          address: '238 St Botolph St',
          city: 'Boston',
          state: 'MA',
          zipCode: '02115',
          isVirtual: false
        },
        maxRegistrations: 500,
        currentRegistrations: 150,
        imageUrl: 'https://huskytrack-storage.s3.amazonaws.com/events/1765595704378-29ccb106-72a1-4aa5-bf68-8858a4cceff5.jpg',
        tags: ['career', 'jobs', 'networking', 'employers'],
        isPublic: true
      },
      {
        title: 'Virtual Tech Talk: AI & Machine Learning',
        description: 'Join us for an exciting discussion about the latest trends in AI and ML. Industry experts will share their insights.',
        organizer: organizer._id,
        category: 'Academic',
        status: EventStatus.PUBLISHED,
        startDate: new Date(futureDate3.getTime() + 18 * 60 * 60 * 1000), // 6 PM
        endDate: new Date(futureDate3.getTime() + 20 * 60 * 60 * 1000), // 8 PM
        location: {
          name: 'Zoom Meeting',
          isVirtual: true,
          virtualLink: 'https://zoom.us/j/123456789'
        },
        maxRegistrations: 100,
        currentRegistrations: 75,
        imageUrl: 'https://huskytrack-storage.s3.amazonaws.com/events/1765595746378-52a692b2-76db-4470-b4a5-d98b8154e65c.jpg',
        tags: ['AI', 'machine learning', 'tech talk', 'virtual'],
        isPublic: true
      },
      {
        title: 'Basketball Tournament',
        description: 'Join the intramural basketball tournament. All skill levels welcome!',
        organizer: organizer._id,
        category: 'Sports',
        status: EventStatus.DRAFT,
        startDate: new Date(futureDate2.getTime() + 14 * 60 * 60 * 1000), // 2 PM
        endDate: new Date(futureDate2.getTime() + 18 * 60 * 60 * 1000), // 6 PM
        location: {
          name: 'Cabot Center',
          address: '534 Huntington Ave',
          city: 'Boston',
          state: 'MA',
          zipCode: '02115',
          isVirtual: false
        },
        maxRegistrations: 50,
        currentRegistrations: 0,
        imageUrl: 'https://huskytrack-storage.s3.amazonaws.com/events/1765595788378-6d7f8dd3-2073-4ad5-8661-51c6ceb18ba0.jpg',
        tags: ['basketball', 'sports', 'tournament', 'intramural'],
        isPublic: true
      },
      {
        title: 'Winter Formal Dance',
        description: 'End the semester in style at our annual Winter Formal. Live music, food, and dancing! Semi-formal attire required.',
        organizer: organizer._id,
        category: 'Social',
        status: EventStatus.PUBLISHED,
        startDate: new Date(futureDate2.getTime() + 19 * 60 * 60 * 1000), // 7 PM
        endDate: new Date(futureDate2.getTime() + 24 * 60 * 60 * 1000), // 12 AM
        location: {
          name: 'Westin Copley Place',
          address: '10 Huntington Ave',
          city: 'Boston',
          state: 'MA',
          zipCode: '02116',
          isVirtual: false
        },
        maxRegistrations: 300,
        currentRegistrations: 187,
        imageUrl: 'https://huskytrack-storage.s3.amazonaws.com/events/1765595830378-a91945e7-0fd8-4fb2-95ff-9c10ded3e832.jpg',
        tags: ['dance', 'formal', 'winter', 'social'],
        isPublic: true
      },
      {
        title: 'Study Abroad Information Session',
        description: 'Learn about study abroad opportunities for Spring and Fall 2026. Q&A with students who have studied abroad.',
        organizer: organizer._id,
        category: 'Academic',
        status: EventStatus.PUBLISHED,
        startDate: new Date(futureDate1.getTime() + 17 * 60 * 60 * 1000), // 5 PM
        endDate: new Date(futureDate1.getTime() + 18.5 * 60 * 60 * 1000), // 6:30 PM
        location: {
          name: 'Churchill Hall',
          address: '40 Forsyth St',
          city: 'Boston',
          state: 'MA',
          zipCode: '02115',
          isVirtual: false
        },
        maxRegistrations: 80,
        currentRegistrations: 42,
        imageUrl: 'https://huskytrack-storage.s3.amazonaws.com/events/1765595872378-0fe09bb6-fcdf-4905-9a49-d87daefe5f23.jpg',
        tags: ['study abroad', 'international', 'academic', 'travel'],
        isPublic: true
      },
      {
        title: 'Entrepreneurship Workshop: Pitching Your Startup',
        description: 'Learn how to craft and deliver a compelling pitch for your startup idea. Workshop includes hands-on practice and feedback.',
        organizer: organizer._id,
        category: 'Career',
        status: EventStatus.PUBLISHED,
        startDate: new Date(futureDate3.getTime() + 15 * 60 * 60 * 1000), // 3 PM
        endDate: new Date(futureDate3.getTime() + 18 * 60 * 60 * 1000), // 6 PM
        location: {
          name: 'ISEC Building',
          address: '805 Columbus Ave',
          city: 'Boston',
          state: 'MA',
          zipCode: '02120',
          isVirtual: false
        },
        maxRegistrations: 40,
        currentRegistrations: 31,
        imageUrl: 'https://huskytrack-storage.s3.amazonaws.com/events/1765595914378-337b93e5-c472-4aac-8761-d3b9755621bd.jpg',
        tags: ['entrepreneurship', 'startup', 'business', 'workshop'],
        isPublic: true
      },
      {
        title: 'Virtual Gaming Tournament: League of Legends',
        description: 'Compete with fellow Huskies in an epic League of Legends tournament! Prizes for top 3 teams.',
        organizer: organizer._id,
        category: 'Social',
        status: EventStatus.PUBLISHED,
        startDate: new Date(futureDate1.getTime() + 19 * 60 * 60 * 1000), // 7 PM
        endDate: new Date(futureDate1.getTime() + 23 * 60 * 60 * 1000), // 11 PM
        location: {
          name: 'Discord Server',
          isVirtual: true,
          virtualLink: 'https://discord.gg/huskyesports'
        },
        maxRegistrations: 60,
        currentRegistrations: 55,
        imageUrl: 'https://huskytrack-storage.s3.amazonaws.com/events/1765595956378-83ee234a-4190-4564-b019-bde6bab0c0ca.jpg',
        tags: ['gaming', 'esports', 'tournament', 'virtual'],
        isPublic: true
      },
      {
        title: 'Mental Health & Wellness Fair',
        description: 'Resources and activities focused on student mental health and wellbeing. Free stress-relief kits and consultations.',
        organizer: organizer._id,
        category: 'Other',
        status: EventStatus.PUBLISHED,
        startDate: new Date(futureDate4.getTime() + 11 * 60 * 60 * 1000), // 11 AM
        endDate: new Date(futureDate4.getTime() + 15 * 60 * 60 * 1000), // 3 PM
        location: {
          name: 'Curry Student Center',
          address: '360 Huntington Ave',
          city: 'Boston',
          state: 'MA',
          zipCode: '02115',
          isVirtual: false
        },
        maxRegistrations: 150,
        currentRegistrations: 67,
        imageUrl: 'https://huskytrack-storage.s3.amazonaws.com/events/1765595998378-8b1aa4a9-0ae5-4a52-8abb-af693feea3a3.jpg',
        tags: ['wellness', 'mental health', 'health', 'fair'],
        isPublic: true
      },
      {
        title: 'Alumni Networking Mixer',
        description: 'Connect with Northeastern alumni working in various industries. Great opportunity for mentorship and job leads.',
        organizer: organizer._id,
        category: 'Career',
        status: EventStatus.PUBLISHED,
        startDate: new Date(futureDate5.getTime() + 18 * 60 * 60 * 1000), // 6 PM
        endDate: new Date(futureDate5.getTime() + 21 * 60 * 60 * 1000), // 9 PM
        location: {
          name: 'Northeastern Club',
          address: '50 St Botolph St',
          city: 'Boston',
          state: 'MA',
          zipCode: '02115',
          isVirtual: false
        },
        maxRegistrations: 100,
        currentRegistrations: 82,
        imageUrl: 'https://huskytrack-storage.s3.amazonaws.com/events/1765596040378-3c1bc442-f09f-40fd-b49e-2032270c7198.jpg',
        tags: ['networking', 'alumni', 'career', 'professional'],
        isPublic: true
      },
      {
        title: 'Research Symposium: Undergraduate Research Showcase',
        description: 'Undergraduate students present their research projects. All majors welcome. Great for learning about research opportunities.',
        organizer: organizer._id,
        category: 'Academic',
        status: EventStatus.PUBLISHED,
        startDate: new Date(futureDate4.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        endDate: new Date(futureDate4.getTime() + 17 * 60 * 60 * 1000), // 5 PM
        location: {
          name: 'Egan Research Center',
          address: '120 Forsyth St',
          city: 'Boston',
          state: 'MA',
          zipCode: '02115',
          isVirtual: false
        },
        maxRegistrations: 250,
        currentRegistrations: 134,
        imageUrl: 'https://huskytrack-storage.s3.amazonaws.com/events/1765596082378-d5787606-2e85-45ee-aba8-543729679db7.jpg',
        tags: ['research', 'academic', 'symposium', 'undergraduate'],
        isPublic: true
      },
      {
        title: 'Yoga & Meditation Class',
        description: 'Free weekly yoga and meditation session for students. All levels welcome. Mats provided.',
        organizer: organizer._id,
        category: 'Other',
        status: EventStatus.PUBLISHED,
        startDate: new Date(futureDate1.getTime() + 7 * 60 * 60 * 1000), // 7 AM
        endDate: new Date(futureDate1.getTime() + 8 * 60 * 60 * 1000), // 8 AM
        location: {
          name: 'Marino Center',
          address: '369 Huntington Ave',
          city: 'Boston',
          state: 'MA',
          zipCode: '02115',
          isVirtual: false
        },
        maxRegistrations: 1,
        currentRegistrations: 0,
        imageUrl: 'https://huskytrack-storage.s3.amazonaws.com/events/1765596124378-ed8c7998-a9a2-4bcc-95ef-adb9a3fe19c3.jpg',
        tags: ['yoga', 'meditation', 'wellness', 'fitness'],
        isPublic: true
      },
      {
        title: 'Coding Interview Prep Workshop',
        description: 'Prepare for technical interviews with practice problems, tips, and mock interviews. Focus on algorithms and data structures.',
        organizer: organizer._id,
        category: 'Career',
        status: EventStatus.PUBLISHED,
        startDate: new Date(futureDate3.getTime() + 14 * 60 * 60 * 1000), // 2 PM
        endDate: new Date(futureDate3.getTime() + 17 * 60 * 60 * 1000), // 5 PM
        location: {
          name: 'Snell Library',
          address: '360 Huntington Ave',
          city: 'Boston',
          state: 'MA',
          zipCode: '02115',
          isVirtual: false
        },
        maxRegistrations: 2,
        currentRegistrations: 0,
        imageUrl: 'https://huskytrack-storage.s3.amazonaws.com/events/1765596166378-f8f70deb-f4f7-4615-b4f4-a5027162b999.jpg',
        tags: ['coding', 'interview', 'career', 'technical'],
        isPublic: true
      },
      {
        title: 'International Food Festival',
        description: 'Celebrate diversity with food from around the world! Cultural performances and international student organizations showcase.',
        organizer: organizer._id,
        category: 'Social',
        status: EventStatus.PUBLISHED,
        startDate: new Date(futureDate6.getTime() + 12 * 60 * 60 * 1000), // 12 PM
        endDate: new Date(futureDate6.getTime() + 18 * 60 * 60 * 1000), // 6 PM
        location: {
          name: 'Centennial Common',
          address: '360 Huntington Ave',
          city: 'Boston',
          state: 'MA',
          zipCode: '02115',
          isVirtual: false
        },
        maxRegistrations: 400,
        currentRegistrations: 213,
        imageUrl: 'https://huskytrack-storage.s3.amazonaws.com/events/1765596208378-f1ae6819-e3d5-4d27-972a-e2a32fe2e9a6.jpg',
        tags: ['food', 'culture', 'international', 'festival'],
        isPublic: true
      }
    ];

    const createdEvents = await Event.insertMany(events);
    console.log(`Created ${createdEvents.length} events successfully`);

    return createdEvents;
  } catch (error) {
    console.error('Error seeding events:', error.message);
    throw error;
  }
}

/**
 * Clear all events
 */
async function clearEvents() {
  try {
    await Event.deleteMany({});
    console.log('Cleared all events');
  } catch (error) {
    console.error('Error clearing events:', error.message);
    throw error;
  }
}

module.exports = {
  seedEvents,
  clearEvents
};

