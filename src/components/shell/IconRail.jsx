import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { iconFor, useShellNav } from "./useShellNav";

const Mark = () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
    </svg>
);

const hubButton = (active, size) =>
    `grid ${size} place-items-center rounded-[calc(var(--app-radius)*0.7)] transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

/**
 * Desktop: a floating vertical rail of icons, one per hub.
 * Phone: the same icons as a bottom bar (44px+ touch targets).
 */
export function IconRail() {
    const { hubs, activeHub, hubUrl } = useShellNav();

    return (
        <>
            <nav
                aria-label="Main navigation"
                className="hidden md:flex sticky top-4 z-30 h-[calc(100vh-2rem)] w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-xl border bg-card py-3.5 shadow-sm"
            >
                <Link to="/" aria-label="Climate by CodeX — home" className="mb-1.5 grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: "#255b01" }}>
                    <Mark />
                </Link>
                {hubs.map((hub, index) => {
                    const Icon = iconFor(hub.icon);
                    const active = activeHub?.label === hub.label;
                    return (
                        <div key={hub.label} className="flex flex-col items-center gap-1.5">
                            {index === 1 && <div className="my-1 h-px w-7 bg-border" />}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link to={hubUrl(hub)} aria-label={hub.label} aria-current={active ? "page" : undefined} className={hubButton(active, "h-[46px] w-[46px]")}>
                                        <Icon className="size-5" strokeWidth={1.8} />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">{hub.label}</TooltipContent>
                            </Tooltip>
                        </div>
                    );
                })}
            </nav>

            <nav
                aria-label="Main navigation"
                className="md:hidden fixed inset-x-0 bottom-0 z-40 flex justify-between border-t bg-card px-2 pb-3 pt-2 shadow-[0_-6px_24px_rgb(20_40_30/0.08)]"
            >
                {hubs.map((hub) => {
                    const Icon = iconFor(hub.icon);
                    const active = activeHub?.label === hub.label;
                    return (
                        <Link key={hub.label} to={hubUrl(hub)} aria-label={hub.label} aria-current={active ? "page" : undefined} className={hubButton(active, "h-12 w-12")}>
                            <Icon className="size-[22px]" strokeWidth={1.8} />
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
