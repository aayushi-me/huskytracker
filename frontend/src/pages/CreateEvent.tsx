import React from "react";
import { useNavigate } from "react-router-dom";

import PageWrapper from "../components/ui/PageWrapper";
import EventForm from "../components/events/EventForm";

import { createEvent } from "../api/events";
import { EventFormValues } from "../types/events";
import { useToast } from "../hooks/useToast";
import { useNotificationRefresh } from "../contexts/NotificationContext";

const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshNotifications } = useNotificationRefresh();

  const handleSubmit = async (
    values: EventFormValues,
    action: "draft" | "publish"
  ) => {
    try {
      const status = action === "draft" ? "draft" : "published";

      await createEvent(values, status);

      // Refresh notifications if event was published (creates notification)
      if (action === "publish") {
        // Small delay to ensure notification is committed to database
        setTimeout(async () => {
          console.log("[CreateEvent] Refreshing notifications after publish...");
          await refreshNotifications();
        }, 500);
      }

      showToast("Event created successfully!", "success");

      navigate("/app/events");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to create event", "error");
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-col gap-2 mb-5">
        <h1 className="text-2xl font-semibold text-gray-900">Create New Event</h1>
        <p className="text-sm text-gray-600">
          Fill out the details below to create a new event.
        </p>
      </div>

      <EventForm mode="create" onSubmit={handleSubmit} />
    </PageWrapper>
  );
};

export default CreateEvent;
