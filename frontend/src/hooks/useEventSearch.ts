/**
 * useEventSearch Hook
 * Centralized state management for event search and filtering
 * Handles search query, filters, pagination, URL synchronization, and API calls
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EventDto } from '../components/ui/EventCard';
import { searchEvents, getEvents, EventSearchParams } from '../services/eventApi';
import useDebouncedValue from './useDebouncedValue';

export interface EventFilters {
  categories: string[];
  dateFrom?: string;
  dateTo?: string;
  tags: string[];
  location?: string;
}

export type SortOption = 'relevance' | 'date' | 'popularity' | 'capacity' | 'startDate' | '-startDate' | '-popularity';

export interface UseEventSearchOptions {
  pageSize?: number;
  debounceDelay?: number;
  autoSearch?: boolean; // If false, requires manual trigger
}

export interface UseEventSearchReturn {
  // State
  events: EventDto[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filters: EventFilters;
  sortBy: SortOption;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;

  // Actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: EventFilters | ((prev: EventFilters) => EventFilters)) => void;
  setSortBy: (sort: SortOption) => void;
  setPage: (page: number) => void;
  executeSearch: () => Promise<void>;
  clearAllFilters: () => void;
  retry: () => Promise<void>;

  // Computed
  hasActiveFilters: boolean;
  resultCount: number;
}

const DEFAULT_PAGE_SIZE = 9;
const DEFAULT_DEBOUNCE_DELAY = 300;

// Map frontend sort options to backend sort parameters
// Note: 'relevance' is only valid for search queries, use 'date' as fallback
const mapSortToBackend = (sort: SortOption, hasSearchQuery: boolean = false): string => {
  switch (sort) {
    case 'date':
    case 'startDate':
      return 'date';
    case 'popularity':
      return 'popularity';
    case 'capacity':
      return 'capacity';
    case 'relevance':
      // Only use 'relevance' if there's a search query, otherwise use 'date'
      return hasSearchQuery ? 'relevance' : 'date';
    default:
      return hasSearchQuery ? 'relevance' : 'date';
  }
};

// Parse URL search params into state
const parseUrlParams = (searchParams: URLSearchParams): Partial<{
  q: string;
  page: number;
  categories: string[];
  dateFrom: string;
  dateTo: string;
  tags: string[];
  location: string;
  sort: SortOption;
}> => {
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const categories = searchParams.get('categories')
    ? searchParams.get('categories')!.split(',').filter(Boolean)
    : [];
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;
  const tags = searchParams.get('tags')
    ? searchParams.get('tags')!.split(',').filter(Boolean)
    : [];
  const location = searchParams.get('location') || undefined;
  const sort = (searchParams.get('sort') as SortOption) || 'relevance';

  return {
    q,
    page: isNaN(page) ? 1 : page,
    categories,
    dateFrom,
    dateTo,
    tags,
    location,
    sort,
  };
};

// Build URL search params from state
const buildUrlParams = (
  searchQuery: string,
  filters: EventFilters,
  sortBy: SortOption,
  page: number
): URLSearchParams => {
  const params = new URLSearchParams();

  if (searchQuery.trim()) {
    params.set('q', searchQuery.trim());
  }

  if (page > 1) {
    params.set('page', page.toString());
  }

  if (filters.categories.length > 0) {
    params.set('categories', filters.categories.join(','));
  }

  if (filters.dateFrom) {
    params.set('dateFrom', filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set('dateTo', filters.dateTo);
  }

  if (filters.tags.length > 0) {
    params.set('tags', filters.tags.join(','));
  }

  if (filters.location) {
    params.set('location', filters.location);
  }

  if (sortBy !== 'relevance') {
    params.set('sort', sortBy);
  }

  return params;
};

export const useEventSearch = (
  options: UseEventSearchOptions = {}
): UseEventSearchReturn => {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    debounceDelay = DEFAULT_DEBOUNCE_DELAY,
    autoSearch = true,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  // Parse initial state from URL
  const urlParams = parseUrlParams(searchParams);

  // State
  const [events, setEvents] = useState<EventDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQueryState] = useState(urlParams.q || '');
  const [filters, setFiltersState] = useState<EventFilters>({
    categories: urlParams.categories || [],
    dateFrom: urlParams.dateFrom,
    dateTo: urlParams.dateTo,
    tags: urlParams.tags || [],
    location: urlParams.location,
  });
  const [sortBy, setSortByState] = useState<SortOption>(urlParams.sort || 'relevance');
  const [page, setPageState] = useState(urlParams.page || 1);
  const [pagination, setPagination] = useState<UseEventSearchReturn['pagination']>(null);

  // Debounced search query
  const debouncedSearchQuery = useDebouncedValue(searchQuery, debounceDelay);

  // Abort controller for canceling requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Track if we're updating URL to prevent sync loop
  const isUpdatingUrlRef = useRef(false);
  // Track if user is actively typing to prevent URL sync from interfering
  const isUserTypingRef = useRef(false);

  // Check if there are active filters
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined ||
    filters.tags.length > 0 ||
    filters.location !== undefined;

  // Result count
  const resultCount = pagination?.totalResults ?? events.length;

  // Sync state from URL when URL params change (browser back/forward)
  useEffect(() => {
    // Skip if we're the ones updating the URL or user is actively typing
    if (isUpdatingUrlRef.current || isUserTypingRef.current) {
      isUpdatingUrlRef.current = false;
      return;
    }

    const urlParams = parseUrlParams(searchParams);
    
    // Only update state if it differs from URL to avoid loops
    // Use strict comparison to avoid updating when both are empty strings
    if (urlParams.q !== undefined && urlParams.q !== searchQuery) {
      setSearchQueryState(urlParams.q);
    }
    
    if (urlParams.page !== undefined && urlParams.page !== page) {
      setPageState(urlParams.page);
    }
    
    if (urlParams.sort !== undefined && urlParams.sort !== sortBy) {
      setSortByState(urlParams.sort);
    }
    
    // Check if filters differ
    const urlCategories = urlParams.categories || [];
    const urlDateFrom = urlParams.dateFrom;
    const urlDateTo = urlParams.dateTo;
    const urlTags = urlParams.tags || [];
    const urlLocation = urlParams.location;
    
    if (
      JSON.stringify(urlCategories) !== JSON.stringify(filters.categories) ||
      urlDateFrom !== filters.dateFrom ||
      urlDateTo !== filters.dateTo ||
      JSON.stringify(urlTags) !== JSON.stringify(filters.tags) ||
      urlLocation !== filters.location
    ) {
      setFiltersState({
        categories: urlCategories,
        dateFrom: urlDateFrom,
        dateTo: urlDateTo,
        tags: urlTags,
        location: urlLocation,
      });
    }
  }, [searchParams]); // Only depend on searchParams to avoid loops

  // Update URL when state changes (debounced for search query to reduce URL updates)
  useEffect(() => {
    // Don't update URL if user is actively typing (let debounce finish first)
    if (isUserTypingRef.current && searchQuery !== debouncedSearchQuery) {
      return;
    }

    const newParams = buildUrlParams(searchQuery, filters, sortBy, page);
    const newParamsString = newParams.toString();
    const currentParamsString = searchParams.toString();

    // Only update if different to avoid unnecessary history entries
    if (newParamsString !== currentParamsString) {
      isUpdatingUrlRef.current = true;
      setSearchParams(newParams, { replace: false }); // Use replace: false to allow browser history
    }
  }, [searchQuery, filters, sortBy, page, searchParams, setSearchParams, debouncedSearchQuery]);

  // Execute search function
  const executeSearch = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      // Determine if we should use search endpoint (has query) or regular events endpoint
      const hasSearchQuery = debouncedSearchQuery.trim().length > 0;

      const params: EventSearchParams = {
        page,
        limit: pageSize,
        sort: mapSortToBackend(sortBy, hasSearchQuery),
      };

      if (hasSearchQuery) {
        params.q = debouncedSearchQuery.trim();
      }

      // Add filters
      if (filters.categories.length > 0) {
        params.category = filters.categories;
      }

      if (filters.dateFrom) {
        params.startDate = filters.dateFrom;
      }

      if (filters.dateTo) {
        params.endDate = filters.dateTo;
      }

      // Note: tags and location are not yet supported by backend
      // They will be added when backend supports them

      const response = hasSearchQuery
        ? await searchEvents(params)
        : await getEvents(params);

      // Check if request was aborted
      if (controller.signal.aborted) {
        return;
      }

      // Update state
      if (page === 1) {
        setEvents(response.events || []);
      } else {
        // For pagination, append results (infinite scroll style)
        setEvents((prev) => [...prev, ...(response.events || [])]);
      }

      setPagination({
        currentPage: response.pagination.currentPage,
        totalPages: response.pagination.totalPages,
        totalResults: response.pagination.totalCount,
        hasNextPage: response.pagination.hasNextPage,
        hasPrevPage: response.pagination.hasPrevPage,
      });
    } catch (err: any) {
      // Don't set error if request was aborted
      if (controller.signal.aborted) {
        return;
      }

      // Determine error message based on error type
      let errorMessage = 'An error occurred while searching events';
      
      if (err.message) {
        if (err.message.includes('Network error') || err.message.includes('connection')) {
          errorMessage = 'Unable to connect. Check your internet connection.';
        } else if (err.message.includes('500') || err.message.includes('Server error')) {
          errorMessage = 'Something went wrong. Please try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      console.error('Event search error:', err);

      // Preserve previous results on error (don't clear events)
      // Only clear if this is the first page load
      if (page === 1) {
        setEvents([]);
        setPagination(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [debouncedSearchQuery, filters, sortBy, page, pageSize]);

  // Auto-execute search when dependencies change
  useEffect(() => {
    if (autoSearch) {
      executeSearch();
    }

    return () => {
      // Cleanup: abort request on unmount or dependency change
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [executeSearch, autoSearch]);

  // Wrapper functions that reset page to 1
  const setSearchQuery = useCallback((query: string) => {
    isUserTypingRef.current = true;
    setSearchQueryState(query);
    setPageState(1);
    // Reset typing flag after a short delay to allow URL sync for navigation
    setTimeout(() => {
      isUserTypingRef.current = false;
    }, 100);
  }, []);

  const setFilters = useCallback(
    (
      newFilters: EventFilters | ((prev: EventFilters) => EventFilters)
    ) => {
      setFiltersState(newFilters);
      setPageState(1);
    },
    []
  );

  const setSortBy = useCallback((sort: SortOption) => {
    setSortByState(sort);
    setPageState(1);
  }, []);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQueryState('');
    setFiltersState({
      categories: [],
      dateFrom: undefined,
      dateTo: undefined,
      tags: [],
      location: undefined,
    });
    setSortByState('relevance');
    setPageState(1);
    setError(null);
    // Reset URL to base route (no params)
    setSearchParams(new URLSearchParams(), { replace: false });
  }, [setSearchParams]);

  const retry = useCallback(async () => {
    if (error) {
      await executeSearch();
    }
  }, [error, executeSearch]);

  return {
    // State
    events,
    isLoading,
    error,
    searchQuery,
    filters,
    sortBy,
    pagination,

    // Actions
    setSearchQuery,
    setFilters,
    setSortBy,
    setPage,
    executeSearch,
    clearAllFilters,
    retry,

    // Computed
    hasActiveFilters,
    resultCount,
  };
};

