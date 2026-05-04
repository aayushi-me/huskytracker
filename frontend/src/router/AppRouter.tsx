import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import PrivateRoute from "../components/PrivateRoute";

// Layouts
import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";

// Pages
import LandingPage from "../pages/LandingPage";
import Dashboard from "../pages/Dashboard";
import Events from "../pages/Events";
import EventDetails from "../pages/EventDetails";
import MyBookmarks from "../pages/MyBookmarks";
import Profile from "../pages/Profile";
import UiGuide from "../pages/UiGuide";
import MyEvents from "../pages/MyEvents"; // <-- Added import

// Auth Pages
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import ResetSuccess from "../pages/ResetSuccess";

// Event Create / Edit
import CreateEvent from "../pages/CreateEvent";
import EditEvent from "../pages/EditEvent";

import OrganizerDashboard from "../pages/OrganizerDashboard";

// Component to handle profile redirect based on auth status
function ProfileRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return null; // or a loading spinner if desired
  }
  
  if (isAuthenticated) {
    return <Navigate to="/app/profile" replace />;
  }
  
  return <Navigate to="/auth/login" state={{ from: '/profile' }} replace />;
}

const router = createBrowserRouter([
  // ---------------------------------------
  // Public Landing Page
  // ---------------------------------------
  {
    path: "/",
    element: <LandingPage />,
  },

  // ---------------------------------------
  // Auth Routes
  // ---------------------------------------
  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="login" /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "reset-password", element: <ResetPassword /> },
      { path: "reset-success", element: <ResetSuccess /> },
    ],
  },

  // ---------------------------------------
  // App Routes (Protected)
  // ---------------------------------------
  {
    path: "/app",
    element: (
      <PrivateRoute>
        <MainLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },

      // EVENTS
      { path: "events", element: <Events /> },
      { path: "events/new", element: <CreateEvent /> },
      { path: "events/create", element: <CreateEvent /> }, // Alias for backward compatibility
      { path: "events/:id", element: <EventDetails /> },
      { path: "events/:id/edit", element: <EditEvent /> },
      { path: "bookmarks", element: <MyBookmarks /> },

      // PROFILE
      { path: "profile", element: <Profile /> },

      // UI Guide
      { path: "ui-guide", element: <UiGuide /> },

      { path: "organizer", element: <OrganizerDashboard /> },
      // MY EVENTS (Protected, inside /app)
      { path: "my-events", element: <MyEvents /> },
    ],
  },

  // ---------------------------------------
  // Shortcut redirect
  // ---------------------------------------
  {
    path: "/profile",
    element: <ProfileRedirect />,
  },

  // ---------------------------------------
  // Catch-all
  // ---------------------------------------
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export default function AppRouter() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
