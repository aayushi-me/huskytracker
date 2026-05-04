export type ToastType = "success" | "error" | "info" | "warning";

export type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};
