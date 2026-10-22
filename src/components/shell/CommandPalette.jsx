import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { iconFor, useShellNav } from "./useShellNav";
import { useChettAccess } from "@/hooks/useMenu";

/** ⌘K / Ctrl+K: jump to any page the current user can open. */
export function CommandPalette({ open, onOpenChange }) {
    const { hubs } = useShellNav();
    const navigate = useNavigate();
    const canUseChett = useChettAccess();

    const go = (url) => {
        onOpenChange(false);
        navigate(url);
    };

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CommandInput placeholder="Go to a page…" />
            <CommandList>
                <CommandEmpty>No page found.</CommandEmpty>
                {hubs.map((hub) => {
                    const items = hub.items.length ? hub.items : [{ title: "Dashboard", url: "/", icon: hub.icon }];
                    return (
                        <CommandGroup key={hub.label} heading={hub.label}>
                            {items.map((item) => {
                                const Icon = iconFor(item.icon);
                                return (
                                    <CommandItem key={item.url} value={`${hub.label} ${item.title}`} onSelect={() => go(item.url)} className="cursor-pointer gap-2">
                                        <Icon className="size-4" />
                                        {item.title}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    );
                })}
                {canUseChett && (
                    <CommandGroup heading="Assistant">
                        <CommandItem value="Assistant Chett AI ask" onSelect={() => go("/chett-ai")} className="cursor-pointer gap-2">
                            {(() => { const Icon = iconFor("Bot"); return <Icon className="size-4" />; })()}
                            Ask Chett AI
                        </CommandItem>
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    );
}
