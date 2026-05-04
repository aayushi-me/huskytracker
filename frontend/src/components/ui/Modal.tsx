import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  width = "max-w-md",
}: ModalProps) {
  // ESC key closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Focus first element
  useEffect(() => {
    if (isOpen) {
      const firstInput = document.querySelector("button, input, [tabindex]");
      if (firstInput instanceof HTMLElement) firstInput.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* Prevent closing when clicking inside */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-xl p-6 w-full mx-4 ${width} animate-modalFade`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2 id="modal-title" className="text-xl font-semibold">
              {title}
            </h2>
          )}

          <button
            aria-label="Close modal"
            onClick={onClose}
            className="text-gray-500 hover:text-black focus-visible:ring-2 focus-visible:ring-primary rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
