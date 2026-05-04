import { useCallback, useEffect, useState } from "react";
import { getDashboardFeed, DashboardFeedResponse } from "../services/dashboardApi";

export interface UseDashboardState extends DashboardFeedResponse {}

export function useDashboard() {
  const [data, setData] = useState<UseDashboardState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getDashboardFeed();
      setData(res);
    } catch (err: any) {
      console.error("Dashboard load error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await getDashboardFeed();
      setData(res);
    } catch (err: any) {
      console.error("Dashboard refresh error:", err);
      setError(err.message || "Failed to refresh dashboard");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}


