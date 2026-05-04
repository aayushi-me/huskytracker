import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import PageWrapper from "../components/ui/PageWrapper";
import EventForm from "../components/events/EventForm";
import Skeleton from "../components/ui/Skeleton";

import { getEventById, updateEvent } from "../api/events";
import { EventFormValues, EventStatus } from "../types/events";
import { useToast } from "../hooks/useToast";
import { useNotificationRefresh } from "../contexts/NotificationContext";

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshNotifications } = useNotificationRefresh();

  const [initialValues, setInitialValues] = useState<EventFormValues | null>(null);
  const [originalStatus, setOriginalStatus] = useState<EventStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Load event data first
  useEffect(() => {
    async function load() {
      try {
        const event = await getEventById(id!);

        // Save backend status so we can respect allowed transitions
        setOriginalStatus(
          (event.status?.toLowerCase() as EventStatus) || "draft"
        );

        // Convert UTC dates from backend to local time for form inputs
        const formatDateForInput = (isoString: string): string => {
          if (!isoString) return "";
          const date = new Date(isoString);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        };

        const formatTimeForInput = (isoString: string): string => {
          if (!isoString) return "";
          const date = new Date(isoString);
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          return `${hours}:${minutes}`;
        };

        setInitialValues({
          title: event.title,
          description: event.description,
          category: event.category?.toLowerCase() || "",
          tags: event.tags || [],

          startDate: formatDateForInput(event.startDate),
          startTime: formatTimeForInput(event.startDate),

          endDate: formatDateForInput(event.endDate),
          endTime: formatTimeForInput(event.endDate),

          location: {
            venue: event.location?.name || event.location?.venue || "",
            address: event.location?.address || "",
            room: event.location?.room || "",
            latitude: event.location?.latitude ?? null,
            longitude: event.location?.longitude ?? null,
          },

          capacity: event.maxRegistrations ?? null,
          requiresApproval: false,

          imageFile: null,
          imageUrl: event.imageUrl ?? event.bannerImageUrl ?? undefined
        });

        setLoading(false);
      } catch (err) {
        console.error(err);
        showToast("Failed to load event", "error");
        navigate("/app/events");
      }
    }

    load();
  }, [id]);

  // SUBMIT HANDLER — FIXED TYPE
  async function handleSubmit(
    values: EventFormValues,
    action: "draft" | "publish"
  ) {
    try {
      // Backend does not allow PUBLISHED -> DRAFT transition.
      // If the event is already published, always keep it published on update
      // Map "publish" action to "published" status
      const statusForUpdate: EventStatus =
        originalStatus === "published" 
          ? "published" 
          : action === "publish" 
            ? "published" 
            : "draft";

      await updateEvent(id!, values, statusForUpdate);

      // Refresh notifications after updating event (sends notifications to attendees and organizer)
      // Small delay to ensure notification is committed to database
      setTimeout(async () => {
        console.log("[EditEvent] Refreshing notifications after update...");
        await refreshNotifications();
      }, 500);

      showToast("Event updated successfully!", "success");

      navigate(`/app/events/${id}`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Update failed", "error");
    }
  }

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-6">Edit Event</h1>

      {loading || !initialValues ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-1/3" />
        </div>
      ) : (
        <EventForm
          mode="edit"
          initialValues={initialValues}
          onSubmit={handleSubmit}
        />
      )}
    </PageWrapper>
  );
}
