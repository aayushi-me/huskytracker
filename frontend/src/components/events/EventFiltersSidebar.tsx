import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

export type FiltersState = {
  categories: string[];
  dateFrom?: string;
  dateTo?: string;
  tags: string[];
};

const CATEGORY_OPTIONS = [
  "Workshop",
  "Seminar",
  "Cultural",
  "Sports",
  "Networking",
];

interface SidebarProps {
  value: FiltersState;
  availableTags: string[];
  onChange: (next: FiltersState) => void;
  onClear?: () => void; // optional for safety
  hasActiveFilters?: boolean; // optional to conditionally show clear button
}

export default function EventFiltersSidebar({
  value,
  availableTags,
  onChange,
  onClear = () => {}, // default to prevent "undefined"
  hasActiveFilters,
}: SidebarProps) {
  // ------------------------------------------------------------
  // local UI state
  // ------------------------------------------------------------
  const [openSections, setOpenSections] = useState({
    category: true,
    date: true,
    tags: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ------------------------------------------------------------
  // handlers — categories, dates, tags
  // ------------------------------------------------------------
  const toggleCategory = (cat: string) => {
    const exists = value.categories.includes(cat);
    const next = exists
      ? value.categories.filter((c) => c !== cat)
      : [...value.categories, cat];
    onChange({ ...value, categories: next });
  };

  const updateDate = (partial: { dateFrom?: string; dateTo?: string }) => {
    onChange({ ...value, ...partial });
  };

  const toggleTag = (tag: string) => {
    const exists = value.tags.includes(tag);
    const next = exists
      ? value.tags.filter((t) => t !== tag)
      : [...value.tags, tag];
    onChange({ ...value, tags: next });
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------
  return (
    <aside className="w-full max-w-xs rounded-xl border border-gray-200 bg-white p-4 shadow-sm animate-slideRight">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Filters</h2>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-3 text-xs text-gray-700">
        {/* ------------------------------------------------------------
            CATEGORY SECTION
        ------------------------------------------------------------ */}
        <section>
          <button
            type="button"
            onClick={() => toggleSection("category")}
            className="flex w-full items-center justify-between py-1"
          >
            <span className="font-medium text-gray-800">Category</span>
            {openSections.category ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {openSections.category && (
            <div className="mt-1 space-y-1.5">
              {CATEGORY_OPTIONS.map((cat) => (
                <label
                  key={cat}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={value.categories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------
            DATE RANGE SECTION
        ------------------------------------------------------------ */}
        <section>
          <button
            type="button"
            onClick={() => toggleSection("date")}
            className="flex w-full items-center justify-between py-1"
          >
            <span className="font-medium text-gray-800">Date range</span>
            {openSections.date ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {openSections.date && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {/* FROM */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-500">From</span>
                <input
                  type="date"
                  value={value.dateFrom ?? ""}
                  onChange={(e) =>
                    updateDate({ dateFrom: e.target.value })
                  }
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* TO */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-500">To</span>
                <input
                  type="date"
                  value={value.dateTo ?? ""}
                  onChange={(e) =>
                    updateDate({ dateTo: e.target.value })
                  }
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------
            TAGS SECTION
        ------------------------------------------------------------ */}
        <section>
          <button
            type="button"
            onClick={() => toggleSection("tags")}
            className="flex w-full items-center justify-between py-1"
          >
            <span className="font-medium text-gray-800">Tags</span>
            {openSections.tags ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {openSections.tags && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const active = value.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition
                      ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
