// src/layouts/MainLayout.tsx

import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import SidebarLayout from "./SidebarLayout";
import Footer from "../components/common/Footer";
import Button from "../components/ui/Button";
import NotificationBell from "../components/notifications/NotificationBell";
import NotificationCenter from "../components/notifications/NotificationCenter";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationProvider } from "../contexts/NotificationContext";
import { useRef, useState, useEffect } from "react";
import { Menu } from "lucide-react";
import HuskyLogo from "../assets/NewLogoHuskyTrack.svg";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const bellRef = useRef<HTMLDivElement>(null);
  
  // Initialize sidebar state based on screen size
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Open by default on desktop (768px is md breakpoint in Tailwind)
    return window.innerWidth >= 768;
  });

  // Handle window resize to auto-close sidebar on mobile, auto-open on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true); // Auto-open on desktop
      } else {
        setIsSidebarOpen(false); // Auto-close on mobile
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize notifications hook
  const {
    notifications,
    unreadCount,
    isLoading,
    isFetching,
    isLoadingMore,
    error,
    isOpen,
    pagination,
    markAsRead,
    markAllAsRead,
    loadMoreNotifications,
    toggleNotificationCenter,
    closeNotificationCenter,
    refreshNotifications,
  } = useNotifications({
    autoFetch: !!user, // Only fetch if user is authenticated
    pollingEnabled: !!user, // Only poll if user is authenticated
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/auth/login");
    }
  };

  return (
    <NotificationProvider refreshNotifications={refreshNotifications}>
      <div className="min-h-screen flex bg-background">

        {/* Sidebar */}
        <SidebarLayout 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Right Section */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? 'md:ml-60' : 'ml-0'
        }`}>

        {/* Top Navbar */}
        <header className="bg-white/90 backdrop-blur shadow-sm sticky top-0 z-50">
          <div className={`mx-auto flex items-center justify-between px-6 py-3 transition-all duration-300 ${
            isSidebarOpen ? 'max-w-6xl' : 'max-w-full'
          }`}>

            {/* Brand */}
            <div className="flex items-center gap-2">
              {/* Hamburger button - visible on mobile or when sidebar is closed on desktop */}
              {!isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Open navigation"
                >
                  <Menu className="h-6 w-6 text-gray-700" />
                </button>
              )}
              <img
              src={HuskyLogo}
              alt="Husky logo"
              className="h-10 w-auto"
            />
              <span className="text-xl font-semibold text-primary tracking-tight">
                HuskyTrack
              </span>
            </div>

            {/* User Section */}
            {user && (
              <div className="flex items-center gap-4">
                {/* Optional: Organizer Shortcut */}
                {/* <NavLink
                  to="/app/organizer"
                  className={({ isActive }) =>
                    `text-sm px-3 py-2 rounded-lg transition ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                >
                  Organizer
                </NavLink> */}

                {/* Notification Bell with Center */}
                <div ref={bellRef} className="relative inline-block z-50">
                  <NotificationBell
                    unreadCount={unreadCount}
                    onClick={toggleNotificationCenter}
                  />
                  {isOpen && (
                    <NotificationCenter
                      isOpen={isOpen}
                      onClose={closeNotificationCenter}
                      notifications={notifications}
                      unreadCount={unreadCount}
                      isLoading={isLoading}
                      isFetching={isFetching}
                      isLoadingMore={isLoadingMore}
                      error={error}
                      pagination={pagination}
                      onMarkAsRead={markAsRead}
                      onMarkAllAsRead={markAllAsRead}
                      onLoadMore={loadMoreNotifications}
                      onRefresh={refreshNotifications}
                    />
                  )}
                </div>

                {/* User Info */}
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>

                {/* Logout */}
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="text-sm"
                >
                  Logout
                </Button>
              </div>
            )}

          </div>
        </header>

        {/* Main Content */}
        <main className={`mx-auto px-6 py-8 transition-all duration-300 ${
          isSidebarOpen ? 'max-w-6xl' : 'max-w-full'
        }`}>
          <Outlet />
        </main>

        <Footer />
        </div>
      </div>
    </NotificationProvider>
  );
}
