import React from "react";
import { X, MessageSquare, ClipboardList } from "lucide-react";

export const ModalLeads = ({
  isOpen,
  onClose,
  title,
  children,
  widthClass = "sm:w-[500px]",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`bg-codex-fondo-secondary-variante1 dark:bg-codex-fondo-secondary/40 rounded-2xl shadow-2xl w-full mx-4 max-h-[90vh] overflow-hidden animate-in fade-in-0 zoom-in-95 ${widthClass}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-codex-fondo-primary-variante3 to-codex-fondo-terciario-variante3 dark:from-codex-fondo-secondary dark:to-codex-fondo-terciario-variante6">
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-background/10 hover:bg-white/20 text-white transition"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 max-h-[calc(90vh-64px)]">
          <div className="lg:col-span-2 p-6 overflow-y-auto max-h-[80vh]">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="h-5 w-5 text-primary-text" />
              <h2 className="text-lg font-medium">Datos del Lead</h2>
            </div>
            <div className="bg-gray-50/90 dark:bg-codex-fondo-terciario-variante6/60 rounded-xl p-4">
              {children}
            </div>
          </div>


          <div className="border-l p-6 overflow-y-auto bg-gray-100 dark:bg-codex-fondo-terciario-variante6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-primary-text" />
              <h2 className="text-lg font-medium">Seguimiento</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-white dark:bg-codex-fondo-secondary/60 rounded-xl p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">Aún no hay comentarios.</p>
              </div>
            </div>


            <div className="mt-6">
              <textarea
                rows={3}
                placeholder="Agregar comentario o nota..."
                className="w-full rounded-xl border p-3 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              />
              <button
                className="mt-2 w-full py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90"
              >
                Guardar comentario
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
