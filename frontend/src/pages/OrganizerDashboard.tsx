// src/pages/OrganizerDashboard.tsx

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import PageWrapper from "../components/ui/PageWrapper";
import Button from "../components/ui/Button";
import SearchBar from "../components/ui/SearchBar";

import OrganizerStats from "../components/organizer/OrganizerStats";
import OrganizerEventCard from "../components/organizer/OrganizerEventCard";
import RecentRegistrations from "../components/organizer/RecentRegistrations";
import UpcomingEventsWidget from "../components/organizer/UpcomingEventsWidget";

import {
  getOrganizerDashboardData,
  getOrganizerEvents,
  cancelEvent,
  deleteEvent,
} from "../api/events";

import { OrganizerEvent, OrganizerEventStatus } from "../types/events";
import { useToast } from "../hooks/useToast";
import { useNotificationRefresh } from "../contexts/NotificationContext";
import Skeleton from "../components/ui/Skeleton";

const ORGANIZER_TABS: { key: OrganizerEventStatus; label: string }[] = [
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

const OrganizerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshNotifications } = useNotificationRefresh();

  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [dashboardData, setDashboardData] = useState<{
    stats: any;
    recentRegistrations: any[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<OrganizerEventStatus>("published");
  const [sortBy, setSortBy] = useState<"date" | "registrations" | "capacity">(
    "date"
  );
  const [search, setSearch] = useState("");

  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

  /* --------------------------------------------
     LOAD DASHBOARD DATA (stats + recent)
  --------------------------------------------- */
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoadingDashboard(true);
      const data = await getOrganizerDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      showToast("Error loading dashboard", "error");
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  /* --------------------------------------------
     LOAD EVENTS
  --------------------------------------------- */
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoadingEvents(true);
        const data = await getOrganizerEvents({});
        setEvents(data);
      } catch (error) {
        showToast("Error loading events", "error");
      } finally {
        setIsLoadingEvents(false);
      }
    };

    loadEvents();
  }, [showToast]);

  /* --------------------------------------------
     FILTER + SEARCH + SORT
  --------------------------------------------- */
  const filteredEvents = useMemo(() => {
    let result = events.filter((e) => e.status === activeTab);

    // search
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(query));
    }

    // sorting
    if (sortBy === "date") {
      result = result.sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime()
      );
    } else if (sortBy === "registrations") {
      result = result.sort(
        (a, b) => b.registrationsCount - a.registrationsCount
      );
    } else if (sortBy === "capacity") {
      result = result.sort((a, b) => b.capacity - a.capacity);
    }

    return result;
  }, [events, activeTab, search, sortBy]);

  const hasEvents = events.length > 0;
  const hasEventsInTab = filteredEvents.length > 0;

  /* --------------------------------------------
     Event actions
  --------------------------------------------- */
  const handleView = (id: string) => {
    navigate(`/app/events/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/app/events/${id}/edit`);
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelEvent(id);

      // Refresh dashboard stats and events list immediately after cancelling
      await Promise.all([
        loadDashboardData(), // Use the callback function to refresh stats
        getOrganizerEvents({}).then(eventsData => {
          setEvents(eventsData);
        }).catch(err => {
          console.error("Error reloading events:", err);
        })
      ]);

      // Refresh notifications after cancelling event (sends notifications to attendees and organizer)
      // Small delay to ensure notification is committed to database
      setTimeout(async () => {
        console.log("[OrganizerDashboard] Refreshing notifications after cancel...");
        await refreshNotifications();
      }, 500);

      showToast("Event cancelled", "success");
    } catch (err) {
      console.error("Error cancelling event:", err);
      showToast("Failed to cancel event", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEvent(id);

      // Remove from events list immediately
      setEvents((prev) => prev.filter((e) => e.id !== id));

      // Refresh dashboard stats and reload events list
      await Promise.all([
        loadDashboardData(), // Refresh stats using the callback
        getOrganizerEvents({}).then(eventsData => {
          setEvents(eventsData);
        }).catch(err => {
          console.error("Error reloading events after delete:", err);
        })
      ]);

      showToast("Event deleted", "success");
    } catch (err) {
      console.error("Error deleting event:", err);
      showToast("Failed to delete event", "error");
    }
  };

  /* --------------------------------------------
     RENDER PAGE
  --------------------------------------------- */

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Organizer Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your events, registrations, and insights in one place.
          </p>
        </div>

        <Button onClick={() => navigate("/app/events/new")}>
          + Create New Event
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <OrganizerStats
          stats={dashboardData?.stats}
          isLoading={isLoadingDashboard}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Main events section */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tabs + Search + Sort */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row md:justify-between gap-3">

              {/* Tabs */}
              <div className="flex flex-wrap gap-2">
                {ORGANIZER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      activeTab === tab.key
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search + Sort */}
              <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <SearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your events..."
                  className="w-full md:w-56"
                />

                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as "date" | "registrations" | "capacity"
                    )
                  }
                  className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 text-gray-700"
                >
                  <option value="date">Sort by date</option>
                  <option value="registrations">Sort by registrations</option>
                  <option value="capacity">Sort by capacity</option>
                </select>
              </div>

            </div>
          </div>

          {/* Events List */}
          <div className="space-y-3">
            {isLoadingEvents ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`org-events-skeleton-${i}`}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3 w-32 mb-2" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : !hasEvents ? (
              // Global empty state
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <h2 className="text-base font-semibold text-gray-900 mb-2">
                  You haven't created any events yet
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                Start your event journey by creating your first event.
                </p>
                <Button onClick={() => navigate("/app/events/new")}>
                Create Your First Event
                </Button>
                          </div>
            ) : !hasEventsInTab ? (
              // Tab-specific empty state
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
                {activeTab === "published" && "No published events yet."}
                {activeTab === "draft" && "No draft events yet."}
                {activeTab === "past" && "No past events yet."}
                {activeTab === "cancelled" && "No cancelled events yet."}
              </div>
            ) : (
              // Render events
              filteredEvents.map((event) => (
                <OrganizerEventCard
                  key={event.id}
                  event={event}
                  onView={handleView}
                  onEdit={handleEdit}
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>

        </div>

        {/* RIGHT SIDE WIDGETS */}
        <div className="space-y-4">
          <RecentRegistrations
            items={dashboardData?.recentRegistrations}
            isLoading={isLoadingDashboard}
          />

          <UpcomingEventsWidget
            events={events}
            isLoading={isLoadingEvents}
          />
        </div>
      </div>
    </PageWrapper>
  );
};

export default OrganizerDashboard;

