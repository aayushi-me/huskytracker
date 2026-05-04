import { useToastContext } from "../components/toast/ToastContext";

export function useToast() {
  const { showToast } = useToastContext();

  return {
    showToast,
    success: (msg: string) => showToast(msg, "success"),
    error: (msg: string) => showToast(msg, "error"),
    info: (msg: string) => showToast(msg, "info"),
    warning: (msg: string) => showToast(msg, "warning"),
  };
}
