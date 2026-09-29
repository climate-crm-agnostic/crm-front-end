import BaseSwal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";

// Dialogs in this module use the palette instead of SweetAlert's default blue/purple.
// Confirm matches the app's primary button (bg-primary / text-primary-foreground).
export const Swal = BaseSwal.mixin({
    confirmButtonColor: "var(--primary)",
    cancelButtonColor: "var(--muted-foreground)",
    didOpen: (popup) => {
        const confirm = popup.querySelector(".swal2-confirm");
        if (confirm) confirm.style.color = "var(--primary-foreground)";
    },
});

// Shared labels, colors and formatting for the accounts-payable screens.
// Colors are theme tokens only, so both light and dark mode follow the palette.

export const BILL_STATUS = {
    draft: { label: "Draft", variant: "outline", color: "var(--muted-foreground)" },
    open: { label: "Open", variant: "secondary", color: "var(--secondary-text)" },
    partially_paid: { label: "Partially paid", variant: "secondary", color: "var(--primary)" },
    paid: { label: "Paid", variant: "default", color: "var(--secondary)" },
    void: { label: "Void", variant: "outline", color: "var(--border)" },
};

export const PAYABLE_STATUSES = ["open", "partially_paid"];

export const PAYMENT_METHODS = [
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "cash", label: "Cash" },
    { value: "check", label: "Check" },
    { value: "card", label: "Card" },
    { value: "other", label: "Other" },
];

export const methodLabel = (value) => PAYMENT_METHODS.find((m) => m.value === value)?.label || value || "—";

export const money = (currency, value) =>
    `${currency || "USD"} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Round to cents the way the backend does, so client-side sums of
// allocations match what the API will accept.
export const cents = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const today = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const addDays = (iso, days) => {
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, m - 1, d + days);
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Sum a field per currency — adding USD to EUR would be a meaningless number.
// Two currencies are shown side by side; beyond that the tile says "Mixed".
export const sumByCurrency = (rows, field) => {
    const totals = new Map();
    rows.forEach((r) => {
        const currency = r.currency || "USD";
        totals.set(currency, (totals.get(currency) || 0) + (Number(r[field]) || 0));
    });
    if (totals.size === 0) return money("USD", 0);
    if (totals.size > 2) return "Mixed";
    return [...totals.entries()]
        .sort(([, a], [, b]) => b - a)
        .map(([currency, total]) => money(currency, total))
        .join(" · ");
};

export const useCan = () => {
    const { user } = useAuth();
    const permissions = new Set(user?.permissions || []);
    return (perm) => user?.is_superuser === true || permissions.has(perm);
};

// Ask for the mandatory void reason. Resolves to the reason, or null if cancelled.
export const askVoidReason = async (what) => {
    const { value, isConfirmed } = await Swal.fire({
        title: `Void this ${what}?`,
        text: "Voided records stay in the history but no longer count. A reason is required.",
        input: "textarea",
        inputPlaceholder: "Reason...",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: `Void ${what}`,
        // Destructive action: red confirm with the default white label.
        confirmButtonColor: "var(--destructive)",
        didOpen: () => {},
        inputValidator: (v) => (!v || !v.trim() ? "A reason is required." : undefined),
    });
    return isConfirmed ? value.trim() : null;
};
