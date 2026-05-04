import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import AppRouter from "./router/AppRouter";

// IMPORT TOAST SYSTEM
import { ToastProvider } from "./components/toast/ToastContext";
import ToastContainer from "./components/toast/ToastContainer";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <ToastContainer />
      <AppRouter />
    </ToastProvider>
  </React.StrictMode>
);
