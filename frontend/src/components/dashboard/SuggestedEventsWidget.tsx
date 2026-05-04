import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardWidget from "./DashboardWidget";
import { EventDto } from "../ui/EventCard";
import { dismissRecommendation, markRecommendationInterested } from "../../services/dashboardApi";
import { useToast } from "../../hooks/useToast";

interface SuggestedEventsWidgetProps {
  events: EventDto[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export default function SuggestedEventsWidget({
  events,
  loading,
  error,
  onRefresh,
}: SuggestedEventsWidgetProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const visible = (events || []).filter((e) => e._id && !dismissedIds.has(e._id));

  const handleDismiss = async (id?: string) => {
    if (!id || processingIds.has(id)) return;
    
    try {
      setProcessingIds((prev) => new Set(prev).add(id));
      await dismissRecommendation(id);
      setDismissedIds((prev) => new Set(prev).add(id));
      showToast("Recommendation dismissed", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to dismiss recommendation", "error");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleInterested = async (id?: string) => {
    if (!id || processingIds.has(id)) return;
    
    try {
      setProcessingIds((prev) => new Set(prev).add(id));
      await markRecommendationInterested(id);
      showToast("Event bookmarked! We'll show you similar events.", "success");
      // Optionally refresh to get updated recommendations
      if (onRefresh) {
        setTimeout(() => onRefresh(), 500);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to mark as interested", "error");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const hasEvents = visible.length > 0;

  return (
    <DashboardWidget
      title="Suggested for you"
      loading={loading}
      error={error}
      onRefresh={onRefresh}
    >
      {!hasEvents ? (
        <p className="text-xs text-gray-500">
          No suggestions right now. Join some events to improve recommendations.
        </p>
      ) : (
        <ul className="space-y-2 text-xs">
          {visible.slice(0, 10).map((event) => (
            <li
              key={event._id}
              className="border border-gray-100 rounded-lg p-2 hover:border-primary/50 transition"
            >
              <button
                type="button"
                className="text-left w-full"
                onClick={() => navigate(`/app/events/${event._id}`)}
              >
                <p className="font-semibold text-gray-900 truncate">{event.title}</p>
                <p className="text-[11px] text-gray-500">
                  Based on your interests
                </p>
              </button>
              <div className="flex items-center justify-end gap-2 mt-1.5">
                <button
                  type="button"
                  className="text-[11px] text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleDismiss(event._id)}
                  disabled={processingIds.has(event._id || '')}
                >
                  {processingIds.has(event._id || '') ? 'Dismissing...' : 'Dismiss'}
                </button>
                <button
                  type="button"
                  className="text-[11px] text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleInterested(event._id)}
                  disabled={processingIds.has(event._id || '')}
                >
                  {processingIds.has(event._id || '') ? 'Processing...' : 'Interested'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardWidget>
  );
}


