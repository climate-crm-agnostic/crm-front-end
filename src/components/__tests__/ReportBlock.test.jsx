import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { Bubble, ReportBlock } from "../../pages/ChettAI.jsx";

// recharts' ResponsiveContainer measures its parent (0x0 in jsdom); stub the
// observer + a size so it mounts without throwing.
beforeAll(() => {
    global.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
        configurable: true,
        value: () => ({ width: 480, height: 240, top: 0, left: 0, right: 480, bottom: 240 }),
    });
});

const sampleReport = {
    title: "Leads by Stage",
    columns: ["stage", "lead_count"],
    rows: [
        { stage: "Negotiation", lead_count: 2 },
        { stage: "Identify Opportunity", lead_count: 1 },
        { stage: "Legal Review", lead_count: 1 },
        { stage: "Business Case", lead_count: 1 },
        { stage: "Proposal", lead_count: 1 },
    ],
    row_count: 5,
    truncated: false,
    row_cap: 5000,
    chart_spec: { type: "bar", x: "stage", y: "lead_count", title: "" },
};

describe("ChettAI ReportBlock", () => {
    it("renders title, headers, a data cell, and export button", () => {
        render(<ReportBlock report={sampleReport} />);
        expect(screen.getByText("Leads by Stage")).toBeTruthy();
        expect(screen.getByText("Export to Excel")).toBeTruthy();
        expect(screen.getByText("stage")).toBeTruthy();
        expect(screen.getByText("lead_count")).toBeTruthy();
        expect(screen.getByText("Negotiation")).toBeTruthy();
    });

    it("shows the row-cap note when truncated", () => {
        render(<ReportBlock report={{ ...sampleReport, truncated: true }} />);
        expect(screen.getByText(/Showing the first/i)).toBeTruthy();
    });

    it("renders nothing when there are no columns", () => {
        const { container } = render(<ReportBlock report={{ columns: [], rows: [] }} />);
        expect(container.firstChild).toBeNull();
    });

    it("display='table' hides the chart but keeps the table + export", () => {
        const { container } = render(<ReportBlock report={{ ...sampleReport, display: "table" }} />);
        // A data cell is present
        expect(screen.getByText("Negotiation")).toBeTruthy();
        expect(screen.getByText("Export to Excel")).toBeTruthy();
        // No SVG chart rendered
        expect(container.querySelector("svg.recharts-surface")).toBeNull();
    });

    it("display='chart' hides the table (no data cells), keeps export", () => {
        render(<ReportBlock report={{ ...sampleReport, display: "chart" }} />);
        expect(screen.getByText("Export to Excel")).toBeTruthy();
        // Table cell text should NOT be present when chart-only
        expect(screen.queryByText("Negotiation")).toBeNull();
    });

    it("display='chart' with no chart_spec falls back to showing the table", () => {
        const noChart = { ...sampleReport, display: "chart", chart_spec: undefined };
        render(<ReportBlock report={noChart} />);
        // Falls back to both → table visible
        expect(screen.getByText("Negotiation")).toBeTruthy();
    });
});

describe("ChettAI Bubble (assistant + report)", () => {
    it("renders markdown text and the attached report", () => {
        render(
            <Bubble
                role="assistant"
                content={"Here's your **leads** breakdown by stage."}
                reports={[sampleReport]}
            />
        );
        expect(screen.getByText("leads").tagName.toLowerCase()).toBe("strong");
        expect(screen.getByText("Leads by Stage")).toBeTruthy();
        expect(screen.getByText("Export to Excel")).toBeTruthy();
    });

    it("user message renders plain text and no report", () => {
        render(<Bubble role="user" content="give me a report of leads by stage" />);
        expect(screen.getByText("give me a report of leads by stage")).toBeTruthy();
    });
});
