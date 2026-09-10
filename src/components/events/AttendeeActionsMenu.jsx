import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Send, Pencil, Trash2 } from "lucide-react";

const MENU_WIDTH = 180;
const MENU_HEIGHT = 132;  // approx: 3 items — used only to decide flip direction

/**
 * Kebab actions menu for an attendee row. The dropdown is rendered in a portal
 * with fixed positioning derived from the trigger button, so it never gets
 * clipped by the table's overflow (which was pushing an inner scrollbar and
 * cutting off the last row's menu). It also flips upward when there isn't
 * enough room below, and closes on outside click, scroll or resize.
 */
export const AttendeeActionsMenu = ({ attendee, canResend, resendReason, onResend, onEdit, onDelete }) => {
    const btnRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const place = () => {
        const el = btnRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const spaceBelow = window.innerHeight - r.bottom;
        const openUp = spaceBelow < MENU_HEIGHT + 12;
        const top = openUp ? r.top - MENU_HEIGHT - 6 : r.bottom + 6;
        // Right-align the menu to the button, clamped to the viewport.
        let left = r.right - MENU_WIDTH;
        left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8));
        setPos({ top: Math.max(8, top), left });
    };

    useLayoutEffect(() => {
        if (open) place();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        // Reposition/close on scroll & resize so it stays anchored.
        window.addEventListener("resize", close);
        window.addEventListener("scroll", close, true);
        return () => {
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", close, true);
        };
    }, [open]);

    const itemBase = "w-full flex items-center gap-2 px-3 py-2 text-sm text-left";

    return (
        <>
            <button
                ref={btnRef}
                onClick={() => setOpen((o) => !o)}
                title="Actions"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md cursor-pointer"
                style={{ color: "#6b6560", backgroundColor: open ? "rgba(94,106,67,0.1)" : "transparent" }}
            >
                <MoreVertical className="h-4 w-4" />
            </button>

            {open && createPortal(
                <>
                    {/* click-away layer */}
                    <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
                    <div
                        className="fixed z-[101] rounded-lg py-1"
                        style={{
                            top: pos.top, left: pos.left, width: MENU_WIDTH,
                            backgroundColor: "#FFFFFF", border: "1px solid #D8D2C4",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
                        }}
                    >
                        <button
                            onClick={() => { if (canResend) { setOpen(false); onResend(attendee); } }}
                            disabled={!canResend}
                            title={resendReason}
                            className={itemBase}
                            style={{ color: canResend ? "#2E2A26" : "#c9c3b6", cursor: canResend ? "pointer" : "not-allowed" }}
                            onMouseEnter={(e) => { if (canResend) e.currentTarget.style.backgroundColor = "#F5F0E8"; }}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                            <Send className="h-4 w-4" /> Resend invitation
                        </button>
                        <button
                            onClick={() => { setOpen(false); onEdit(attendee); }}
                            className={`${itemBase} cursor-pointer`}
                            style={{ color: "#2E2A26" }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F0E8")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                            <Pencil className="h-4 w-4" /> Edit
                        </button>
                        <button
                            onClick={() => { setOpen(false); onDelete(attendee); }}
                            className={`${itemBase} cursor-pointer`}
                            style={{ color: "#B0592E" }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#FBEEE9")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                            <Trash2 className="h-4 w-4" /> Delete
                        </button>
                    </div>
                </>,
                document.body
            )}
        </>
    );
};
