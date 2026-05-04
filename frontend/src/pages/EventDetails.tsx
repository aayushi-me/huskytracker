import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import api from "../services/api";
import Button from "../components/ui/Button";
import { registerForEvent, cancelRegistration, getMyRegistrations } from "../services/api";

import { Calendar, MapPin } from "lucide-react";

import type { Event, Registration } from "../types";

// Import useAuth hook (from context or hooks folder)
import { useAuth } from "../contexts/AuthContext";

type EventDetailsView = Event & {
  bannerImageUrl?: string;
  maxRegistrations?: number;
  currentRegistrations?: number;
  location?: Event["location"] & {
    name?: string;
    city?: string;
    isVirtual?: boolean;
  };
  organizer?: Event["organizer"] & {
    university?: string;
  };
};


//  
const MOCK_EVENT: Event = {
  _id: "mock-1",
  title: "Husky Social Spring BBQ",
  description: "Come and join us for the best BBQ of the season! Meet new people, enjoy awesome grilling, and participate in lawn games.",
  category: "social" as any, // 
  tags: ["Networking", "BBQ", "Social"],
  imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=80",
  
  startDate: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(),
  endDate: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(),
  
  location: {
    venue: "Husky Union Building",
    address: "800 Husky Blvd, Seattle, WA",
    room: "Main Lawn",
    coordinates: { lat: 47.6534, lng: -122.3050 }
  },
  organizer: {
    _id: "org-1",
    firstName: "Husky",
    lastName: "Events Team",
    email: "team@huskyu.edu"
  },
  
  status: "PUBLISHED",
  capacity: 150,
  registeredUsers: new Array(107).fill("user_id"), 
  waitlist: [],
  price: 0,
  // mock event.likes
  // @ts-ignore
  likes: 37
};

// Static mock comments data
const MOCK_COMMENTS = [
  {
    id: 1,
    name: "Jane Doe",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    time: "2 hours ago",
    text: "Had an amazing time last year! Can't wait for this one 🎉",
  },
  {
    id: 2,
    name: "Michael Smith",
    avatar: "https://randomuser.me/api/portraits/men/45.jpg",
    time: "1 hour ago",
    text: "Is there a vegetarian option for the BBQ?",
  },
];

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth(); // get the current user, null/undefined if not logged in
  const [event, setEvent] = useState<Event | null>(null);


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  // Mock like count state (let's make this also optimistic for clarity in UI)
  const [likeCount, setLikeCount] = useState<number>(() => {
    return typeof MOCK_EVENT.likes === "number" ? MOCK_EVENT.likes : 37;
  });

  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [newCommentText, setNewCommentText] = useState("");

  const [registering, setRegistering] = useState(false);
  const [userRegistration, setUserRegistration] = useState<Registration | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Event ID is required");
      setLoading(false);
      return;
    }

    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get<{ success: boolean; data: { event: Event } }>(
          `/events/${id}`
        );

        setEvent(response.data.data.event);
      } catch (err: any) {
        const errorMessage = err?.response?.data?.message || "Failed to load event";
        setError(errorMessage);
        console.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  // Fetch user's registration status for this event
  useEffect(() => {
    if (!id || !user) {
      setUserRegistration(null);
      return;
    }

    const fetchUserRegistration = async () => {
      try {
        const registrations = await getMyRegistrations();
        console.log('Fetched registrations:', registrations);
        console.log('Current event ID:', id);
        
        // Find registration for this specific event
        const registration = registrations.find(
          (reg: Registration) => {
            const eventId = typeof reg.event === 'object' ? reg.event._id : reg.event;
            console.log('Comparing:', eventId, 'with', id, 'Match:', eventId === id);
            return eventId === id && 
              (reg.status === 'REGISTERED' || reg.status === 'WAITLISTED');
          }
        );
        
        console.log('Found registration:', registration);
        setUserRegistration(registration || null);
      } catch (err: any) {
        console.error("Failed to fetch user registration:", err);
        // Don't show error to user, just assume not registered
        setUserRegistration(null);
      }
    };

    fetchUserRegistration();
  }, [id, user]);

  const formatDateRange = (start?: string, end?: string) => {
    if (!start) return "";
    const startDate = new Date(start);
    const datePart = startDate.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    if (!end) {
      const time = startDate.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      return `${datePart} at ${time}`;
    }

    const endDate = new Date(end);
    const startTime = startDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    const endTime = endDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

    return `${datePart} from ${startTime} to ${endTime}`;
  };

  // ==== Register Button Handler ====
  const handleRegister = async () => {
    setRegistering(true);

    try {
      if (!event) return;

      const response = await registerForEvent(event._id);
      console.log('Registration response:', response);
      
      // Update local state with the new registration
      // Backend returns: { success, message, data: { registration, status, waitlistPosition } }
      if (response.success && response.data?.registration) {
        console.log('Setting user registration:', response.data.registration);
        setUserRegistration(response.data.registration);
      }

      const status = response.data?.status || response.status;
      alert(`Successfully registered! 🎉${status === 'WAITLISTED' ? ' You have been added to the waitlist.' : ''}`);
      // Don't navigate away - stay on the event details page
      // navigate("/app/my-events");

    } catch (err: any) {
      // Extract error message from backend response
      const errorMessage = err?.response?.data?.message || 
                          err?.response?.data?.error || 
                          err?.message || 
                          "Failed to register for event. Please try again.";
      
      console.error("Registration error:", errorMessage);
      alert(errorMessage);

    } finally {
      setRegistering(false);
    }
  };

  // ==== Cancel Registration Handler ====
  const handleCancelRegistration = async () => {
    if (!userRegistration) return;

    const confirmCancel = window.confirm(
      "Are you sure you want to cancel your registration for this event?"
    );

    if (!confirmCancel) return;

    setRegistering(true);

    try {
      await cancelRegistration(userRegistration._id);
      
      // Clear the registration from local state
      setUserRegistration(null);
      
      alert("Registration cancelled successfully.");

    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 
                          err?.response?.data?.error || 
                          err?.message || 
                          "Failed to cancel registration. Please try again.";
      
      console.error("Cancellation error:", errorMessage);
      alert(errorMessage);

    } finally {
      setRegistering(false);
    }
  };

  // ==== Post New Comment Handler ====
  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!newCommentText.trim()) return; 
    const newCommentObj = {
      id: Date.now(), 
      name: "You", 
      avatar: "https://ui-avatars.com/api/?name=You&background=random", 
      time: "Just now",
      text: newCommentText
    };
    setComments([newCommentObj, ...comments]);
    setNewCommentText("");
  };

  if (loading) {
    return (
      <div className="px-6 py-10 max-w-4xl mx-auto mt-6 space-y-6">
        <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
        <div className="h-72 w-full bg-gray-200 animate-pulse rounded" />
        <div className="h-12 w-3/4 bg-gray-200 animate-pulse rounded" />
        <div className="h-32 w-full bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="px-6 py-10 max-w-4xl mx-auto mt-6 text-center">
        <p className="text-red-600 mb-4">{error || "Event not found"}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }


  const viewEvent = event as EventDetailsView;

const image =
  viewEvent.bannerImageUrl ||
  viewEvent.imageUrl ||
  "/placeholder-event.png";

const max = viewEvent.capacity || viewEvent.maxRegistrations || 0;
const current =
  viewEvent.registeredUsers?.length ||
  viewEvent.currentRegistrations ||
  0;

  const hasCapacity = max > 0;
  const spotsRemaining = hasCapacity ? Math.max(max - current, 0) : null;
  const isFull = hasCapacity && spotsRemaining === 0;
  
  // Check if event is completed (past end date or status is COMPLETED)
  const now = new Date();
  const endDate = event.endDate ? new Date(event.endDate) : null;
  const isCompleted = endDate ? endDate <= now : false;
  const isPast = endDate ? endDate < now : false;
  const isCancelled = event.status === "CANCELLED";

  // Check if user is registered for this event
  const isUserRegistered = userRegistration && 
    (userRegistration.status === 'REGISTERED' || userRegistration.status === 'WAITLISTED');
  const isUserWaitlisted = userRegistration?.status === 'WAITLISTED';

  return (
    <div className="px-6 py-10 max-w-4xl mx-auto mt-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Banner Image */}
      <div className="relative">
        <img
          src={image}
          alt={event.title}
          className="w-full h-72 object-cover rounded-xl shadow-md"
        />
      </div>

      {/* Event Info */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-primary uppercase tracking-wide">
            {event.category || "Event"}
          </p>
          <div className="flex items-start justify-between gap-4 mt-2">
            <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          {event.startDate && (
            <div className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDateRange(event.startDate, event.endDate)}</span>
            </div>
          )}
          {event.location && (() => {
            const locationText =
              typeof viewEvent.location === "string"
                ? viewEvent.location
                : viewEvent.location?.name ||
                  viewEvent.location?.address ||
                  viewEvent.location?.city ||
                  (viewEvent.location?.isVirtual ? "Online event" : "");

            if (!locationText) return null;
            return (
              <div className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{locationText}</span>
              </div>
            );
          })()}
        </div>

            {/* Register/Cancel Button */}
            {isUserRegistered ? (
              <Button 
                className="w-full h-12 text-lg shadow-md hover:shadow-lg transition-all"
                variant="outline"
                isLoading={registering} 
                disabled={registering}
                onClick={handleCancelRegistration}
              >
                {registering 
                  ? "Cancelling..." 
                  : isUserWaitlisted 
                    ? "Leave Waitlist"
                    : "Cancel Registration"
                }
              </Button>
            ) : (
              <Button 
                className="w-full h-12 text-lg shadow-md hover:shadow-lg transition-all"
                isLoading={registering} 
                disabled={isCancelled || isPast || registering}
                onClick={handleRegister}
              >
                {isCancelled 
                  ? "Event Cancelled" 
                  : isPast 
                    ? "Event Ended" 
                    : isFull 
                      ? "Join Waitlist" 
                      : registering 
                        ? "Registering..." 
                        : "Register Now"
                }
              </Button>
            )}

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {event.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Event Description */}
      {event.description && (
        <div className="prose max-w-none">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">About this event</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {event.description}
          </p>
        </div>
      )}

      {/* Organizer */}
      {event.organizer && (
        <div className="border-t pt-4">
          <p className="text-sm text-gray-600">
            <strong className="text-gray-900">Organizer:</strong>{" "}
            {event.organizer.firstName} {event.organizer.lastName}
            {viewEvent.organizer?.university && ` • ${viewEvent.organizer.university}`}
          </p>
        </div>
      )}

    </div>
  );
}