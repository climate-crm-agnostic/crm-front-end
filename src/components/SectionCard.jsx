export function Card({ children, className = "", style }) {
    return (
        <div className={`rounded-xl border bg-card shadow-sm ${className}`} style={style}>
            {children}
        </div>
    );
}

// A soft tinted icon chip and a heading-font title. `accentColor`/`iconColor` still
// override the chip for the rare card that needs its own colour.
export function CardHeader(props) {
    const { icon: Icon, title, subtitle = null, accentColor, iconColor, right = null } = props;
    return (
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b">
            <div className="flex items-center gap-3 min-w-0">
                <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: accentColor ?? "color-mix(in srgb, var(--primary) 18%, transparent)" }}
                >
                    <Icon className="h-[18px] w-[18px]" style={{ color: iconColor ?? "var(--secondary-text)" }} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <p className="font-heading text-base font-semibold leading-tight truncate">{title}</p>
                    {subtitle && <p className="text-[13px] text-muted-foreground truncate">{subtitle}</p>}
                </div>
            </div>
            {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
        </div>
    );
}
