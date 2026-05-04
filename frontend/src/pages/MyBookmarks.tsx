/**
 * My Bookmarks Page
 * Displays all bookmarked events with filtering and sorting
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Search, Tag, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBookmarks } from "../hooks/useBookmark";
import EventCard, { EventDto } from "../components/ui/EventCard";
import SearchBar from "../components/ui/SearchBar";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import ViewToggle from "../components/events/ViewToggle";
import useDebouncedValue from "../hooks/useDebouncedValue";

type ViewMode = "grid" | "list";

const PAGE_SIZE = 12;

export default function MyBookmarks() {
  const { isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 400);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const {
    bookmarks,
    isLoading,
    error,
    pagination,
    tags,
    fetchBookmarks
  } = useBookmarks({
    page,
    limit: PAGE_SIZE,
    tag: selectedTag || undefined,
    search: search.trim() || undefined,
    autoFetch: false
  });

  // Fetch bookmarks when filters change
  useEffect(() => {
    if (isAuthenticated) {
      fetchBookmarks({ page, limit: PAGE_SIZE, tag: selectedTag || undefined, search: search.trim() || undefined });
    }
  }, [page, selectedTag, search, isAuthenticated, fetchBookmarks]);

  // Extract events from bookmarks
  const events = bookmarks
    .map(b => b.event)
    .filter(e => e !== null) as EventDto[];
  
  const totalCount = pagination?.totalCount || 0;

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
    }
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setPage(1);
  };

  const handleLoadMore = () => {
    if (pagination?.hasNextPage) {
      setPage(prev => prev + 1);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="px-6 py-10 max-w-4xl mx-auto text-center">
        <Bookmark className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Login Required
        </h2>
        <p className="text-gray-600 mb-6">
          Please login to view your bookmarked events.
        </p>
        <Link to="/auth/login">
          <Button>Go to Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Bookmark className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">My Bookmarks</h1>
        </div>
        <p className="text-gray-600">
          {totalCount > 0
            ? `You have ${totalCount} bookmarked event${totalCount !== 1 ? "s" : ""}`
            : "No bookmarked events yet"}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search bookmarks..."
            />
          </div>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>

        {/* Tags Filter */}
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 font-medium">Filter by tag:</span>
            <button
              onClick={() => {
                setSelectedTag(null);
                setPage(1);
              }}
              className={`
                px-3 py-1 rounded-full text-sm font-medium transition-colors
                ${
                  selectedTag === null
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }
              `}
            >
              All
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`
                  px-3 py-1 rounded-full text-sm font-medium transition-colors
                  ${
                    selectedTag === tag
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                `}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Active Filter Display */}
        {selectedTag && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filtered by:</span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              {selectedTag}
              <button
                onClick={() => {
                  setSelectedTag(null);
                  setPage(1);
                }}
                className="hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && events.length === 0 && (
        <div className="text-center py-12">
          <Bookmark className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchInput || selectedTag
              ? "No bookmarks found"
              : "No bookmarks yet"}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchInput || selectedTag
              ? "Try adjusting your search or filters"
              : "Start bookmarking events you're interested in!"}
          </p>
          {!searchInput && !selectedTag && (
            <Link to="/app/events">
              <Button>Browse Events</Button>
            </Link>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && page === 1 && (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      )}

      {/* Bookmarks Grid/List */}
      {!isLoading && events.length > 0 && (
        <>
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {events.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                variant={viewMode}
                showBookmark={true}
              />
            ))}
          </div>

          {/* Load More Button */}
          {totalCount > events.length && (
            <div className="mt-8 text-center">
              <Button
                onClick={handleLoadMore}
                isLoading={isLoading && page > 1}
                variant="outline"
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

