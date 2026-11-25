import { Bot } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useChettAccess } from "@/hooks/useMenu";
import { AI_NAME, AI_SHORT, AI_PATH } from "@/lib/brand";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { iconFor, useShellNav } from "./useShellNav";


// Hub icons are brand green; the selected hub is a dark green tile with a white icon.
const hubButton = (active, size) =>
    `grid ${size} place-items-center rounded-[calc(var(--app-radius)*0.7)] transition-colors ${
        active ? "bg-[#255b01] text-white" : "text-[var(--primary-text)] hover:bg-[color-mix(in_srgb,#60d805_15%,transparent)]"
    }`;

/**
 * Desktop: a floating vertical rail of icons, one per hub.
 * Phone: the same icons as a bottom bar (44px+ touch targets).
 */
export function IconRail() {
    const { hubs, activeHub, hubUrl } = useShellNav();
    const chettAllowed = useChettAccess();
    const { pathname } = useLocation();

    return (
        <>
            <nav
                aria-label="Main navigation"
                className="hidden md:flex sticky top-4 z-30 h-[calc(100vh-2rem)] w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-xl border bg-card py-3.5 shadow-sm"
            >
                {/* Full logo with its byline, no box; the dark file swaps in for dark mode. */}
                <Link to="/" aria-label="Climate by CodeX Academy Technologies — home" className="mb-1.5 block px-1">
                    <img src="/climate.svg" alt="" className="w-16 h-auto dark:hidden" />
                    <img src="/climate-dark.svg" alt="" className="w-16 h-auto hidden dark:block" />
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
                                        <Icon className="size-[22px]" strokeWidth={2.2} />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">{hub.label}</TooltipContent>
                            </Tooltip>
                        </div>
                    );
                })}

                {/* The assistant lives at the foot of the rail on desktop, so it never covers page content. */}
                {chettAllowed && (
                    <>
                        <div className="flex-1" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link
                                    to={AI_PATH}
                                    aria-label={`Ask ${AI_NAME}`}
                                    aria-current={pathname.startsWith(AI_PATH) ? "page" : undefined}
                                    className="grid h-[46px] w-[46px] place-items-center rounded-[calc(var(--app-radius)*0.7)] bg-primary text-primary-foreground shadow-sm transition-[filter] hover:brightness-95"
                                >
                                    <Bot className="size-5" strokeWidth={1.8} />
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">Ask {AI_SHORT}</TooltipContent>
                        </Tooltip>
                    </>
                )}
            </nav>

            <nav
                aria-label="Main navigation"
                className="md:hidden fixed inset-x-0 bottom-0 z-40 flex justify-between border-t bg-card px-2 pb-3 pt-2 shadow-[0_-6px_24px_rgb(20_40_30/0.08)]"
            >
                {hubs.map((hub) => {
                    const Icon = iconFor(hub.icon);
                    const active = activeHub?.label === hub.label;
                    return (
                        <Link key={hub.label} to={hubUrl(hub)} aria-label={hub.label} aria-current={active ? "page" : undefined} className={hubButton(active, "h-12 min-w-0 flex-1 max-w-12")}>
                            <Icon className="size-[22px]" strokeWidth={2.2} />
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
