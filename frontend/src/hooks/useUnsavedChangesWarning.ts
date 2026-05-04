import { useEffect } from "react";

export const useUnsavedChangesWarning = (shouldWarn: boolean) => {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!shouldWarn) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);

    return () => window.removeEventListener("beforeunload", handler);
  }, [shouldWarn]);
};
