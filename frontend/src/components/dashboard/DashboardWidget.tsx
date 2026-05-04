import Button from "../ui/Button";
import Skeleton from "../ui/Skeleton";

interface DashboardWidgetProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export default function DashboardWidget({
  title,
  children,
  loading,
  error,
  onRefresh,
}: DashboardWidgetProps) {
  return (
    <section className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 flex flex-col gap-3">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-[11px] text-gray-500 hover:text-primary"
          >
            Refresh
          </button>
        )}
      </header>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : error ? (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          <span>{error}</span>
          {onRefresh && (
            <Button
              size="sm"
              variant="outline"
              className="text-[11px] px-2 py-1"
              onClick={onRefresh}
            >
              Retry
            </Button>
          )}
        </div>
      ) : (
        <div>{children}</div>
      )}
    </section>
  );
}


