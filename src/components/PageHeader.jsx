import React from "react";

/**
 * The one title block every list page uses: icon tile, brand-green title, a
 * one-line description, and the page's actions (buttons, toggles) on the right.
 * Change the look here, not per page.
 */
export const PageHeader = ({ icon: Icon, title, description, children, className = "" }) => (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-3 min-w-0">
            {Icon && (
                <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{
                        backgroundColor: "color-mix(in srgb, var(--secondary-text) 12%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--secondary-text) 30%, transparent)",
                    }}
                >
                    <Icon className="h-5 w-5" style={{ color: "var(--secondary-text)" }} />
                </div>
            )}
            <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-codex-texto-primary truncate">{title}</h1>
                {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
            </div>
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
);
