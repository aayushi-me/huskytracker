export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}
