import { Check } from "lucide-react";

/**
 * The pipeline's stages as steps: done ones ticked, the current one filled, the rest outlined.
 * Click a step to move the lead there (the page runs the same checks as before: stage rules, lost reason…).
 */
export const StageStepper = ({ stages, current, onSelect, disabled = false }) => {
    const index = stages.findIndex((s) => s.name === current);
    // A stage outside the list (e.g. a lead already Lost) is still shown, first, as the current one.
    const outside = current && index === -1;

    return (
        <nav aria-label="Stage" className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ol className="flex min-w-max items-center gap-1.5">
                {outside && (
                    <li className="flex items-center gap-1.5">
                        <span className="rounded-full bg-red-50 px-3.5 py-1.5 text-sm font-semibold text-red-600 dark:bg-red-500/15">{current}</span>
                        <span className="h-px w-4 bg-border" aria-hidden="true" />
                    </li>
                )}
                {stages.map((stage, i) => {
                    const done = index > -1 && i < index;
                    const active = i === index;
                    return (
                        <li key={stage.id || stage.name} className="flex items-center gap-1.5">
                            <button
                                type="button"
                                disabled={disabled || active}
                                onClick={() => onSelect(stage.name)}
                                aria-current={active ? "step" : undefined}
                                title={active ? "Current stage" : `Move to ${stage.name}`}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                    active
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : done
                                            ? "cursor-pointer bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-[var(--secondary-text)] hover:bg-[color-mix(in_srgb,var(--primary)_28%,transparent)]"
                                            : "cursor-pointer border text-muted-foreground hover:bg-muted"
                                } disabled:cursor-default`}
                            >
                                {done && <Check className="size-3.5" aria-hidden="true" />}
                                {stage.name}
                            </button>
                            {i < stages.length - 1 && <span className="h-px w-4 bg-border" aria-hidden="true" />}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};
