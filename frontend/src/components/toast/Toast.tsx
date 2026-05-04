import { ToastItem } from "./ToastTypes";
import { X } from "lucide-react";

export default function Toast({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) {
  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500 text-black",
  };

  return (
    <div
      className={`flex items-center gap-3 text-white px-4 py-3 rounded-lg shadow-lg animate-toastSlide 
        ${colors[toast.type]}`}
    >
      <p>{toast.message}</p>
      <button onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
