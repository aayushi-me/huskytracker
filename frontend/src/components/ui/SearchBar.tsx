import { Search, Loader2 } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  isLoading = false,
  placeholder = "Search events...",
  className,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm ${className || ''}`}>
      {isLoading ? (
        <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
      ) : (
        <Search className="w-5 h-5 text-gray-500" />
      )}

      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm"
      />
    </div>
  );
}
