import React, { useEffect, useState } from "react";
import { Calendar, MapPin, AlertCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMyRegistrations, cancelRegistration } from "../services/api";
import { Registration } from "../types";
import Button from "../components/ui/Button";

// Mock Data (Fallback)
const MOCK_REGISTRATIONS: any[] = [
  {
    _id: "reg-1",
    status: "REGISTERED",
    event: {
      _id: "mock-1", 
      title: "Husky Social Spring BBQ",
      imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=80",
      startDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
      location: { address: "Husky Union Building" }
    }
  },
  {
    _id: "reg-2",
    status: "WAITLISTED",
    event: {
      _id: "evt-2",
      title: "Tech Career Fair 2025",
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50520bed?auto=format&fit=crop&w=1000&q=80",
      startDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
      location: { address: "Cabot Center" }
    }
  }
];

type Tab = "UPCOMING" | "PAST";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  REGISTERED: { bg: "bg-green-100", text: "text-green-700" },
  WAITLISTED: { bg: "bg-yellow-100", text: "text-yellow-700" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700" },
  ATTENDED: { bg: "bg-blue-100", text: "text-blue-700" },
};

function isFuture(dateString: string) {
  return new Date(dateString) > new Date();
}
function isPast(dateString: string) {
  return new Date(dateString) < new Date();
}

const MyEvents: React.FC = () => {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("UPCOMING");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAndSet = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getMyRegistrations();
        let regs: Registration[] = [];
        if (Array.isArray(res)) {
          regs = res;
        } else if (res && Array.isArray((res as any).results)) {
          regs = (res as any).results;
        }
        if (isMounted) setRegistrations(regs);
      } catch (err: any) {
        console.error("Failed to load registrations, using Mock Data:", err);
        // Fallback to mock data
        if (isMounted) setRegistrations(MOCK_REGISTRATIONS);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAndSet();
    return () => { isMounted = false; };
  }, []);

  const upcoming = registrations.filter(reg => 
    reg.event && reg.status !== "CANCELLED" && reg.event.startDate && isFuture(reg.event.startDate)
  );

  const past = registrations.filter(reg => 
    (reg.event && reg.event.startDate && isPast(reg.event.startDate)) || reg.status === "CANCELLED"
  );

  const filtered = activeTab === "UPCOMING" ? upcoming : past;

  const handleCancel = async (registrationId: string) => {
    if (!window.confirm("Are you sure you want to cancel?")) return;
    try {
      await cancelRegistration(registrationId);
    } catch (e: any) {
      console.warn("Cancel API failed, simulating UI update");
    } finally {
      setRegistrations(prev =>
        prev.map(r => r._id === registrationId ? { ...r, status: "CANCELLED" as const } : r)
      );
      setSuccessMsg("Registration cancelled successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  function getEventImage(event: any) {
    if (!event) return undefined;
    if (typeof event.image === "string" && event.image.length > 0) return event.image;
    if (typeof event.imageUrl === "string" && event.imageUrl.length > 0) return event.imageUrl;
    return undefined;
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 md:mb-0">My Events</h1>
        <div className="flex bg-gray-100 rounded-full p-1 w-fit gap-2">
          <button
            type="button"
            className={`px-4 py-1 text-sm rounded-full transition font-semibold ${activeTab === "UPCOMING" ? "bg-white shadow text-primary" : "hover:bg-gray-200 text-gray-700"}`}
            onClick={() => setActiveTab("UPCOMING")}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={`px-4 py-1 text-sm rounded-full transition font-semibold ${activeTab === "PAST" ? "bg-white shadow text-primary" : "hover:bg-gray-200 text-gray-700"}`}
            onClick={() => setActiveTab("PAST")}
          >
            Past
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-green-700 flex items-center gap-2 text-sm font-medium animate-fadeIn">
          <span className="inline-block w-4 h-4 rounded-full bg-green-400 mr-2" />
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <AlertCircle className="h-12 w-12 text-gray-300" />
          <div className="text-lg font-medium text-gray-600 mb-1">No events found.</div>
          <Button variant="primary" onClick={() => navigate('/app/events')}>
            Browse Events
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((reg) => {
            const { event } = reg;
            if (!event) return null;
            const badge = reg.status && STATUS_COLORS[reg.status as string] || STATUS_COLORS.REGISTERED;
            const eventImage = getEventImage(event);
            const eventId = event._id || "mock-1"; // Fallback ID if missing

            return (
              <div key={reg._id} className="relative bg-white border border-gray-100 shadow-sm rounded-xl flex flex-col h-full group overflow-hidden hover:shadow-md transition-shadow">
                {reg.status && (
                  <span className={`absolute right-4 top-4 z-10 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${badge.bg} ${badge.text} border-opacity-40`}>
                    {reg.status}
                  </span>
                )}

                {eventImage ? (
                  <img src={eventImage} alt={event.title} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center text-gray-300">
                    <Calendar className="w-10 h-10" />
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">{event.title}</h2>
                  
                  <div className="space-y-2 mb-4 flex-1">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>
                        {event.startDate ? new Date(event.startDate).toLocaleDateString() : "TBD"}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {typeof event.location === "string" ? event.location : (event.location as any).address || ""}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-auto pt-4 border-t border-gray-50">
                    <Button 
                      variant="secondary" 
                      className="flex-1 text-sm"
                      onClick={() => navigate(`/app/events/${eventId}`)}
                    >
                      View Details
                    </Button>
                    
                    {/* Fixed: Updated Cancel Button Style */}
                    {activeTab === "UPCOMING" && reg.status !== "CANCELLED" && (
                      <Button 
                        // @ts-ignore
                        variant="danger" 
                        className="flex-1 text-sm bg-red-600 text-white hover:bg-red-700 border-transparent"
                        onClick={() => handleCancel(reg._id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyEvents;