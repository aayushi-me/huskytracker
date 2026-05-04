import { useNavigate } from "react-router-dom";
import DashboardWidget from "./DashboardWidget";
import Button from "../ui/Button";
import { useAuth } from "../../contexts/AuthContext";

interface QuickActionsWidgetProps {}

export default function QuickActionsWidget(_: QuickActionsWidgetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOrganizer = user?.role === "ORGANIZER" || user?.role === "ADMIN";

  return (
    <DashboardWidget title="Quick actions">
      <div className="flex flex-col sm:flex-row gap-2 text-xs">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => navigate("/app/events")}
        >
          Browse events
        </Button>
        {isOrganizer && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/app/events/new")}
          >
            Create event
          </Button>
        )}
      </div>
    </DashboardWidget>
  );
}


