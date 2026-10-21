import React, { useState } from "react";
import { ChevronDown, Info } from "lucide-react";

const storageKey = (id) => `payables-help:${id}`;

const readCollapsed = (id) => {
    try {
        return localStorage.getItem(storageKey(id)) === "collapsed";
    } catch {
        return false;
    }
};

// "How this works" box for the accounts-payable screens. Open by default;
// once someone collapses it, it stays collapsed for them on that screen.
export const HelpNote = ({ id, title = "How this works", items = [] }) => {
    const [collapsed, setCollapsed] = useState(() => readCollapsed(id));

    const toggle = () => {
        const next = !collapsed;
        setCollapsed(next);
        try {
            if (next) localStorage.setItem(storageKey(id), "collapsed");
            else localStorage.removeItem(storageKey(id));
        } catch {
            // Preference only — nothing to do if storage is unavailable.
        }
    };

    return (
        <div className="rounded-lg border border-border bg-muted/40 text-sm">
            <button
                type="button"
                onClick={toggle}
                aria-expanded={!collapsed}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left cursor-pointer"
            >
                <span className="flex items-center gap-2 font-medium text-foreground">
                    <Info className="h-4 w-4 text-secondary-text" /> {title}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-180"}`} />
            </button>
            {!collapsed && (
                <ul className="px-4 pb-3 pl-10 space-y-1.5 list-disc text-muted-foreground">
                    {items.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
            )}
        </div>
    );
};
