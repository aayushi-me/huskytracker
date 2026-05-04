const categories = ["All", "Workshop", "Seminar", "Cultural", "Sports"];

export default function CategoryFilter({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (cat: string) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto py-2">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-4 py-2 rounded-full text-sm border 
            ${
              active === cat
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            }
          `}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
