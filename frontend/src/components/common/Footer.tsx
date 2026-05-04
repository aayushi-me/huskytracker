export default function Footer() {
  return (
    <footer className="border-t bg-white mt-12">
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">

        {/* Column 1 — Brand */}
        <div>
          <h3 className="text-lg font-semibold text-primary">HuskyTrack</h3>
          <p className="text-gray-600 mt-2">
            Your one-stop platform for campus events, reminders, and engagement.
          </p>
        </div>

        {/* Column 2 — Quick Links */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">Quick Links</h4>
          <ul className="space-y-2 text-gray-600">
            <li><a href="/app" className="hover:text-primary">Dashboard</a></li>
            <li><a href="/app/events" className="hover:text-primary">Events</a></li>
            <li><a href="/app/profile" className="hover:text-primary">Profile</a></li>
          </ul>
        </div>

        {/* Column 3 — Contact */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">Contact</h4>
          <p className="text-gray-600">huskytrack@northeastern.edu</p>
          <p className="text-gray-600 mt-2">© {new Date().getFullYear()} HuskyTrack</p>
        </div>

      </div>
    </footer>
  );
}
