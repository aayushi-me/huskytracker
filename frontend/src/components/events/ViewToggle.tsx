import { LayoutGrid, List } from "lucide-react";

type ViewMode = "grid" | "list";

export default function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition
          ${mode === "grid"
            ? "bg-primary text-white"
            : "text-gray-600 hover:bg-gray-100"
          }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Grid
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition
          ${mode === "list"
            ? "bg-primary text-white"
            : "text-gray-600 hover:bg-gray-100"
          }`}
      >
        <List className="h-3.5 w-3.5" />
        List
      </button>
    </div>
  );
}
