import { useMemo, useState, useEffect } from "react";
import { Filter, X } from "lucide-react";

import SearchBar from "../components/ui/SearchBar";
import EventCard, { EventDto } from "../components/ui/EventCard";
import CategoryFilter from "../components/ui/CategoryFilter";
import Skeleton from "../components/ui/Skeleton";

import ViewToggle from "../components/events/ViewToggle";
import SortDropdown, { SortOption as UISortOption } from "../components/events/SortDropdown";
import EventFiltersSidebar, {
  FiltersState,
} from "../components/events/EventFiltersSidebar";

import { useEventSearch, SortOption } from "../hooks/useEventSearch";
import useInfiniteScroll from "../hooks/useInfiniteScroll";

import Button from "../components/ui/Button";
import { useNavigate } from "react-router-dom";

type ViewMode = "grid" | "list";

const PAGE_SIZE = 9;

// Map UI sort options to hook sort options
const mapUISortToHookSort = (uiSort: UISortOption): SortOption => {
  switch (uiSort) {
    case "date":
      return "date";
    case "popularity":
      return "popularity";
    case "capacity":
      return "capacity";
    default:
      return "date";
  }
};

export default function Events() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false); // Mobile drawer

  // Use the event search hook
  const {
    events,
    isLoading,
    error,
    searchQuery,
    filters,
    sortBy: hookSortBy,
    pagination,
    setSearchQuery,
    setFilters,
    setSortBy: setHookSortBy,
    setPage,
    clearAllFilters,
    retry,
    resultCount,
    hasActiveFilters,
  } = useEventSearch({
    pageSize: PAGE_SIZE,
    debounceDelay: 300,
    autoSearch: true,
  });

  // Map hook sort to UI sort for SortDropdown
  const uiSortBy: UISortOption = useMemo(() => {
    if (hookSortBy === "date" || hookSortBy === "startDate") return "date";
    if (hookSortBy === "popularity") return "popularity";
    if (hookSortBy === "capacity") return "capacity";
    return "date";
  }, [hookSortBy]);

  // Update filters when CategoryFilter changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (category === "All") {
      setFilters((prev) => ({ ...prev, categories: [] }));
    } else {
      setFilters((prev) => ({
        ...prev,
        categories: [category],
      }));
    }
  };

  // Sync selectedCategory with filters.categories
  useEffect(() => {
    if (filters.categories.length === 0 && selectedCategory !== "All") {
      setSelectedCategory("All");
    } else if (
      filters.categories.length === 1 &&
      selectedCategory !== filters.categories[0]
    ) {
      setSelectedCategory(filters.categories[0]);
    }
  }, [filters.categories, selectedCategory]);

  // Handle sort change from UI
  const handleSortChange = (sort: UISortOption) => {
    setHookSortBy(mapUISortToHookSort(sort));
  };

  // Convert FiltersState to EventFilters format
  const sidebarFilters: FiltersState = useMemo(
    () => ({
      categories: filters.categories,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      tags: filters.tags,
    }),
    [filters]
  );

  // Handle sidebar filter changes
  const handleSidebarFiltersChange = (newFilters: FiltersState) => {
    setFilters({
      categories: newFilters.categories,
      dateFrom: newFilters.dateFrom,
      dateTo: newFilters.dateTo,
      tags: newFilters.tags,
      location: filters.location, // Preserve location if it exists
    });
  };

  // Enhanced clear filters that also clears category
  const handleClearFilters = () => {
    clearAllFilters();
    setSelectedCategory("All");
  };

  /** INFINITE SCROLL */
  useInfiniteScroll(() => {
    if (!isLoading && pagination?.hasNextPage) {
      setPage(pagination.currentPage + 1);
    }
  });

  /** TAGS extracted from events */
  const allTags = useMemo(
    () =>
      Array.from(
        new Set(
          events
            .flatMap((e) => e.tags || [])
            .map((t) => t.trim())
            .filter(Boolean)
        )
      ),
    [events]
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className="transition-all duration-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Explore Events</h1>
            <p className="text-sm text-gray-500 mt-1">
              Find workshops, cultural events, seminars and more.
            </p>
          </div>

          {/* CREATE EVENT BUTTON */}
          <Button
            variant="primary"
            onClick={() => navigate("/app/events/new")}
          >
            + Create Event
          </Button>
        </div>
      </div>

      {/* SEARCH + SORT + VIEW + MOBILE FILTER BUTTON */}
      <div className="flex flex-col gap-3 bg-white border border-gray-200 rounded-xl shadow-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            isLoading={isLoading && searchQuery.trim().length > 0}
          />
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end">
          {/* MOBILE FILTER BUTTON */}
          <button
            onClick={() => setIsFiltersOpen(true)}
            className="sm:hidden inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-xs"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>

          <SortDropdown value={uiSortBy} onChange={handleSortChange} />
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <CategoryFilter
        active={selectedCategory}
        onSelect={handleCategoryChange}
      />

      {/* LAYOUT: SIDEBAR + RESULTS */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* SIDEBAR (DESKTOP) */}
        <div className="hidden lg:block lg:w-64">
          <EventFiltersSidebar
            value={sidebarFilters}
            availableTags={allTags}
            onChange={handleSidebarFiltersChange}
            onClear={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {/* RESULTS */}
        <div className="flex-1">
          {/* SUMMARY */}
          <div className="text-xs text-gray-600 mb-3 flex justify-between">
            <span>
              {isLoading && events.length === 0 ? (
                "Loading events..."
              ) : resultCount === 0 ? (
                "No events found"
              ) : (
                <>
                  Showing{" "}
                  <span className="font-medium">
                    {pagination?.currentPage === 1
                      ? events.length
                      : resultCount}
                  </span>{" "}
                  {resultCount === 1 ? "event" : "events"}
                  {pagination && resultCount > events.length && (
                    <> (of {resultCount} total)</>
                  )}
                </>
              )}
            </span>
            {pagination && (
              <span className="hidden sm:inline">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
            )}
          </div>

          {/* ERROR */}
          {error && (
            <div className="border border-red-200 bg-red-50 px-4 py-3 rounded-lg text-red-700 text-xs mb-3 animate-slideUp flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={retry}
                className="ml-2"
              >
                Retry
              </Button>
            </div>
          )}

          {/* LOADING / EMPTY / RESULTS */}
          {isLoading && pagination?.currentPage === 1 ? (
            <div
              className={`${
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  : "space-y-3"
              }`}
            >
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl px-6 py-10 animate-scaleIn">
              <p className="font-semibold text-sm text-gray-800">
                No events match your filters
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Try changing keywords or categories.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div
                key={viewMode}
                className={`${
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    : "space-y-3"
                }`}
              >
                {events.map((event) => (
                  <EventCard
                    key={event._id}
                    event={event}
                    variant={viewMode}
                  />
                ))}
              </div>

              {/* SKELETONS FOR INFINITE SCROLL */}
              {isLoading && pagination && pagination.currentPage > 1 && (
                <div className="mt-4 animate-fadeIn">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-28 w-full rounded-xl mb-3" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MOBILE FILTER DRAWER */}
      {isFiltersOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          {/* BACKDROP */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsFiltersOpen(false)}
          />

          {/* PANEL */}
          <div className="relative ml-auto bg-white w-80 h-full shadow-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-sm text-gray-900">Filters</h2>
              <button
                onClick={() => setIsFiltersOpen(false)}
                className="p-1 rounded-md text-gray-600 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto h-full">
              <EventFiltersSidebar
                value={sidebarFilters}
                availableTags={allTags}
                onChange={handleSidebarFiltersChange}
                onClear={handleClearFilters}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
