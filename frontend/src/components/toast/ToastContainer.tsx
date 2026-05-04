import Toast from "./Toast";
import { useToastContext } from "./ToastContext";

export default function ToastContainer() {
  const { toasts, removeToast } = useToastContext();

  return (
    <div className="fixed top-20 right-4 space-y-3 z-40">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
