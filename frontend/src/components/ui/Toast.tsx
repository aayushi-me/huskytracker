import { ToastItem } from "./ToastTypes";
import { X } from "lucide-react";

const colors: Record<ToastItem["type"], string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  info: "bg-blue-500",
  warning: "bg-yellow-500 text-black",
};

export default function Toast({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 text-white px-4 py-3 rounded-lg shadow-lg animate-toastSlide ${colors[toast.type]}`}
    >
      <p>{toast.message}</p>
      <button
        aria-label="Close notification"
        onClick={onClose}
        className="hover:text-black focus-visible:ring-2 focus-visible:ring-white rounded"
      >
        <X size={16} />
      </button>
    </div>
  );
}
