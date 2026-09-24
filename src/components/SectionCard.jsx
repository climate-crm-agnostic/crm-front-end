export function Card({ children, style }) {
    return (
        <div
            style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                ...style,
            }}
        >
            {children}
        </div>
    );
}

// iconColor must contrast with accentColor: the white default suits the dark
// greens; pass "var(--primary-foreground)" when accentColor is --primary/--accent.
export function CardHeader(props) {
    const { icon: Icon, title, accentColor = "var(--secondary)", iconColor = "#fff", right = null } = props;
    return (
        <div
            className="flex items-center justify-between gap-3 px-6 py-4 border-b"
            style={{ borderColor: "var(--border)" }}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: accentColor }}
                >
                    <Icon className="h-4 w-4" style={{ color: iconColor }} />
                </div>
                <p
                    className="text-base font-semibold truncate"
                    style={{ color: "var(--secondary-text)", fontFamily: '"Source Sans 3", Arial, sans-serif' }}
                >
                    {title}
                </p>
            </div>
            {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
        </div>
    );
}
