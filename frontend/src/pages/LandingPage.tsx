// src/pages/LandingPage.tsx
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import { useAuth } from "../contexts/AuthContext";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* HERO SECTION */}
      <section className="relative h-[70vh] w-full">
        <img
          src="https://images.unsplash.com/photo-1531058020387-3be344556be6"
          alt="Campus Events"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2b0062cc] to-[#0c002bcc]" />

        <div className="relative z-10 h-full w-full flex flex-col items-center justify-center text-center text-white px-4">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
            One Stop For <span className="text-accent">Campus Events</span>
          </h1>

          <p className="max-w-xl text-sm md:text-base text-gray-200 mb-6">
            Making every Husky moment count. Discover upcoming events, workshops,
            and campus gatherings.
          </p>

          <div className="flex flex-row gap-4">
            <Link to="/app/events">
              <Button className="px-8 py-3 text-lg">Explore</Button>
            </Link>
            
            {isAuthenticated ? (
              <Link to="/app">
                <Button className="px-8 py-3 text-lg">Dashboard</Button>
              </Link>
            ) : (
              <Link to="/auth/login">
                <Button className="px-8 py-3 text-lg">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* UPCOMING EVENTS */}
      <section className="py-16 px-6 md:px-12 bg-white">
        <h2 className="text-3xl font-semibold text-center mb-10">
          Latest <span className="text-primary">Awesome</span> Events
        </h2>

        {/* 3 Event Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* CARD 1 */}
          <div className="rounded-xl overflow-hidden shadow-card border border-gray-100">
            <img
              src="https://images.unsplash.com/photo-1531058020387-3be344556be6"
              alt="Event"
              className="h-48 w-full object-cover"
            />
            <div className="p-5">
              <p className="text-xs text-gray-400 mb-1">Workshop</p>
              <h3 className="font-semibold mb-2">AI Coding Hackathon</h3>
              <p className="text-sm text-gray-500">
                Compete with fellow developers in a 24-hour event.
              </p>
            </div>
          </div>

          {/* CARD 2 */}
          <div className="rounded-xl overflow-hidden shadow-card border border-gray-100">
            <img
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d"
              alt="Event"
              className="h-48 w-full object-cover"
            />
            <div className="p-5">
              <p className="text-xs text-gray-400 mb-1">Conference</p>
              <h3 className="font-semibold mb-2">Cloud Conference 2025</h3>
              <p className="text-sm text-gray-500">
                Learn about latest trends in tech innovation.
              </p>
            </div>
          </div>

          {/* CARD 3 */}
          <div className="rounded-xl overflow-hidden shadow-card border border-gray-100">
            <img
              src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40"
              alt="Event"
              className="h-48 w-full object-cover"
            />
            <div className="p-5">
              <p className="text-xs text-gray-400 mb-1">Hackathon</p>
              <h3 className="font-semibold mb-2">Husky Code Hackathon</h3>
              <p className="text-sm text-gray-500">
                Join the biggest coding challenge hosted on campus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0b0130] text-gray-300 text-sm py-10 px-6 md:px-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-white font-semibold mb-3">HuskyTrack</h3>
            <p className="text-gray-400">
              One stop hub for campus events, workshops, and seminars.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Navigate</h4>
            <ul className="space-y-1">
              <li><Link to="/" className="hover:text-white">Home</Link></li>
              <li><Link to="/auth/login" className="hover:text-white">Login</Link></li>
              <li><Link to="/auth/register" className="hover:text-white">Sign Up</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Contact</h4>
            <p className="text-gray-400 text-sm">
              Northeastern University, Boston MA
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
