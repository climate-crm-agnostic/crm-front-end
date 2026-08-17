import React, { useEffect, useMemo, useState } from "react";
import { LeadCardMobile } from "./LeadCardMobile";

// Mobile replacement for the desktop Kanban: a single-stage list with
// horizontally scrollable stage chips instead of side-by-side columns —
// a horizontal-scrolling multi-column board doesn't translate well to a
// narrow viewport (each column ends up clipped and unreadable).
export const LeadMobileBoard = ({ stages, leads, salesUsers, clientsById, onLeadClick, onArchive, onChangeStage }) => {
    const [activeStage, setActiveStage] = useState(stages[0]?.name);

    useEffect(() => {
        if (stages.length && !stages.some(s => s.name === activeStage)) {
            setActiveStage(stages[0].name);
        }
    }, [stages, activeStage]);

    const leadsByStage = useMemo(() => {
        const map = {};
        stages.forEach((stage, index) => {
            map[stage.name] = leads.filter(l => {
                const matchesStage = l.stage === stage.name || l.stage_id === stage.id;
                if (index === 0 && !l.stage && !l.stage_id) return true;
                return matchesStage;
            });
        });
        return map;
    }, [stages, leads]);

    const currentLeads = leadsByStage[activeStage] || [];

    if (!stages.length) return null;

    return (
        <div className="flex flex-col h-full w-full overflow-hidden" style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
            {/* Stage chips */}
            <div
                className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0"
                style={{ scrollbarWidth: "none", borderBottom: "1px solid #D8D2C4" }}
            >
                {stages.map(stage => {
                    const isActive = stage.name === activeStage;
                    const stageColor = stage.color || "#5E6A43";
                    const count = leadsByStage[stage.name]?.length || 0;
                    return (
                        <button
                            key={stage.name}
                            onClick={() => setActiveStage(stage.name)}
                            className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer"
                            style={{
                                backgroundColor: isActive ? stageColor : "#F2EBDD",
                                color: isActive ? "#FBF7EF" : "#2E2A26",
                                border: `1px solid ${isActive ? stageColor : "#D8D2C4"}`,
                            }}
                        >
                            <span
                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: isActive ? "#FBF7EF" : stageColor }}
                            />
                            {stage.name}
                            <span
                                className="text-[10px] font-bold px-1.5 rounded-full tabular-nums"
                                style={{ backgroundColor: isActive ? "rgba(251,247,239,0.25)" : "rgba(94,106,67,0.12)" }}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Cards list for the active stage */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {currentLeads.length === 0 ? (
                    <div
                        className="h-28 flex flex-col items-center justify-center rounded-xl"
                        style={{ border: "1.5px dashed #D8D2C4" }}
                    >
                        <p className="text-xs uppercase tracking-widest font-bold" style={{ color: "#9b948e" }}>
                            Empty Stage
                        </p>
                        <p className="text-[11px] mt-1 opacity-60" style={{ color: "#9b948e" }}>
                            No leads here yet
                        </p>
                    </div>
                ) : (
                    currentLeads.map(lead => (
                        <LeadCardMobile
                            key={lead.id}
                            lead={lead}
                            stages={stages}
                            salesUsers={salesUsers}
                            clientsById={clientsById}
                            onClick={() => onLeadClick?.(lead)}
                            onArchive={onArchive}
                            onChangeStage={onChangeStage}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
