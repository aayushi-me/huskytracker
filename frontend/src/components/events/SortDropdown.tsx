export type SortOption = "date" | "popularity" | "capacity";

export default function SortDropdown({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (value: SortOption) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 text-xs text-gray-600">
      <span className="hidden sm:inline">Sort by</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <option value="date">Date (soonest first)</option>
        <option value="popularity">Popularity</option>
        <option value="capacity">Spots remaining</option>
      </select>
    </div>
  );
}
