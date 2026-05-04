# HuskyTrack

The All-in-One Campus Life Tracker for Northeastern Students.

![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) ![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat-square&logo=amazonaws&logoColor=white)

## About The Project

Northeastern students often miss events like club meetings, workshops, and career fairs because information is scattered across emails, posters, and chat groups. This leads to lost opportunities for networking, academics, and social life.

HuskyTrack centralizes all campus events in one platform. It helps students stay updated on career, academic, and social activities through a streamlined and reliable solution.

## Key Features

- **Unified Mini-Calendar**: Aggregates events from student orgs, career services, and academic departments.
- **Smart Search & Filters**: Discovery events by category (Academic, Social, Career, Fitness) and tags.
- **User Accounts**: Role-based access for Students, Organizers, and Admins.
- **Interactive Engagement**: RSVP to events, bookmark favorites, and leave comments/ratings.
- **Real-time Notifications**: Never miss an event with reminders and updates.
- **Calendar Sync**: Integration with Google and Outlook calendars.

## Technology Stack

HuskyTrack utilizes a scalable architecture centered on MongoDB and Node.js, designed for rapid prototyping and future growth.

### Frontend

- **Framework**: React.js (Vite)
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Routing**: React Router v6

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js (Middleware, Routing, Error Handling)
- **Validation**: Zod
- **Authentication**: JWT (JSON Web Tokens) with Refresh Tokens
- **Image Processing**: Multer & Sharp

### Database & Infrastructure

- **Database**: MongoDB (Atlas)
- **ORM**: Mongoose
- **Cloud/Storage**: AWS (S3 for images, EC2/Lambda for hosting)
- **CI/CD**: GitHub Actions

## Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- MongoDB (Local instance or Atlas Connection String)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/aayushi-me/huskytracker.git
cd huskytrack
```

2. **Install Dependencies**

HuskyTrack is set up as a monorepo. You need to install dependencies for both environments.

```bash
# Install Root dependencies
npm install

# Install Backend dependencies
cd backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

3. **Environment Configuration**

Create `.env` files in both `/backend` and `/frontend` directories based on the provided `.env.example` files.

**Backend `.env` example:**

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_BUCKET_NAME=your_s3_bucket
```

4. **Run the Application**

Open two terminal tabs:

**Terminal 1 (Backend):**

```bash
cd backend

# Seed the database
npm run db:seed

# Run the backend server
npm run start
```

**Terminal 2 (Frontend):**

```bash
cd frontend
npm run dev
```

## Project Structure

```
huskytrack/
├── .github/                # CI/CD workflows and templates
├── backend/                # Express.js API
│   ├── src/
│   │   ├── config/         # Database and environment configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Authentication, validation, rate limiting
│   │   ├── models/         # Database schemas
│   │   ├── repositories/   # Data access layer
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helper utilities
│   └── tests/              # Unit and integration tests
├── frontend/               # React + TypeScript SPA
│   └── src/
│       ├── assets/         # Static files and images
│       ├── components/     # Reusable UI components
│       ├── contexts/       # Global state management
│       ├── design/         # Design tokens and theme
│       ├── hooks/          # Custom React hooks
│       ├── layouts/        # Page layout components
│       ├── pages/          # Route-level views
│       ├── router/         # Application routing
│       ├── services/       # API integration
│       └── utils/          # Helper functions
└── README.md
```

## License

Distributed under the MIT License. See LICENSE for more information.