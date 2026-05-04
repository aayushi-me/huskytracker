// src/layouts/SidebarLayout.tsx
import { NavLink } from "react-router-dom";
import { Menu, Home, Calendar, User, ClipboardList, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface SidebarLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export default function SidebarLayout({ isOpen, onClose, onToggle }: SidebarLayoutProps) {
  const { hasRole } = useAuth();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50
        flex flex-col w-60 min-h-screen bg-white border-r border-gray-200 p-6
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

      {/* Top Section */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5 text-primary" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">Navigation</h2>
        </div>
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="md:hidden p-1 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex flex-col gap-3 text-gray-700 text-sm font-medium">

        {/* Dashboard */}
        <NavLink
          to="/app"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg transition ${
              isActive ? "bg-primary/10 text-primary" : "hover:bg-gray-100"
            }`
          }
        >
          <Home className="w-4 h-4" />
          Dashboard
        </NavLink>

        <NavLink
          to="/app/my-events"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg transition ${
              isActive ? "bg-primary/10 text-primary" : "hover:bg-gray-100"
            }`
          }
        >
          <Calendar className="w-4 h-4" />
          My Events
        </NavLink>

        {/* Events */}
        <NavLink
          to="/app/events"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg transition ${
              isActive ? "bg-primary/10 text-primary" : "hover:bg-gray-100"
            }`
          }
        >
          <Calendar className="w-4 h-4" />
          Events
        </NavLink>

        {/* Organizer Dashboard — Only visible for ORGANIZER and ADMIN */}
        {hasRole(['ORGANIZER', 'ADMIN']) && (
          <NavLink
            to="/app/organizer"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                isActive ? "bg-primary/10 text-primary" : "hover:bg-gray-100"
              }`
            }
          >
            <ClipboardList className="w-4 h-4" />
            Organizer
          </NavLink>
        )}

        {/* Profile */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg transition ${
              isActive ? "bg-primary/10 text-primary" : "hover:bg-gray-100"
            }`
          }
        >
          <User className="w-4 h-4" />
          Profile
        </NavLink>

        {/* UI Guide */}
        {/* <NavLink
          to="/app/ui-guide"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg transition ${
              isActive ? "bg-primary/10 text-primary" : "hover:bg-gray-100"
            }`
          }
        >
          UI Guide
        </NavLink> */}

      </nav>
    </aside>
    </>
  );
}
