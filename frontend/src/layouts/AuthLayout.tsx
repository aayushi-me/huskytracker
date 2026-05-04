import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e0440] to-[#070223] flex items-center justify-center px-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-[1.1fr,1fr]">
        
        {/* Left side → FORM pages will load here */}
        <div className="px-8 py-10 md:px-12 md:py-12">
          <Outlet />
        </div>

        {/* Right purple aesthetic panel */}
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#312E81] text-white px-10 py-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-80">
              HuskyTrack
            </p>
            <h2 className="mt-3 text-2xl font-semibold leading-snug">
              One stop hub for{" "}
              <span className="text-accent font-bold">Campus Events</span>
            </h2>
          </div>
          <p className="text-xs leading-relaxed opacity-90">
            Discover upcoming events, register instantly, and organize your Husky
            life with reminders and smart notifications.
          </p>
        </div>

      </div>
    </div>
  );
}
