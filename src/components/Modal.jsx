import React from "react";
import { X } from "lucide-react";

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  widthClass = "sm:w-[500px]",
  showFooter = false,
  onConfirm,
  confirmText = "Save",
  cancelText = "Cancel",
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`bg-card text-foreground
          rounded-lg shadow-xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 ${widthClass}
          `}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h1 id="modal-title" className="text-lg font-semibold" style={{ color: "var(--secondary)" }}>
            {title}
          </h1>
          <button
            onClick={onClose}
            variant="terciary"
            className="p-1 rounded-md text-codex-iconos-primary dark:text-codex-iconos-terciario-variante2 hover:text-codex-iconos-primary-variante3 hover:dark:text-codex-iconos-terciario-variante3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6">{children}</div>

        {/* Footer opcional */}
        {showFooter && (
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-border bg-card hover:bg-muted/60"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
