import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreditsBar } from "../CreditsBar.jsx";
import { CreditsCard } from "../dashboard/CreditsCard.jsx";

const base = { enabled: true, pool: 2000, used: 500.4, remaining: 1499.6, percent: 25.0, period: { label: "November 2026" } };

describe("CreditsBar", () => {
    it("shows used / pool and the percentage", () => {
        render(<CreditsBar credits={base} />);
        expect(screen.getByText("Credits: 500.40 / 2,000")).toBeTruthy();
        expect(screen.getByText("25.0%")).toBeTruthy();
    });
    it("shows the real percentage above 100 and fills the bar at 100", () => {
        render(<CreditsBar credits={{ ...base, used: 2500, percent: 125 }} />);
        expect(screen.getByText("125.0%")).toBeTruthy();
        const indicator = document.querySelector("[data-slot=progress-indicator]");
        expect(indicator.style.transform).toBe("translateX(-0%)");
    });
    it("is calm below 80%, warns from 80% and alerts at 100%", () => {
        const { rerender } = render(<CreditsBar credits={{ ...base, used: 1500, percent: 75 }} />);
        expect(screen.queryByTestId("credits-alert")).toBeNull();
        rerender(<CreditsBar credits={{ ...base, used: 1600, percent: 80 }} />);
        expect(screen.getByTestId("credits-alert").textContent).toBe("You have used 80% of this month's AI credits.");
        expect(screen.getByTestId("credits-alert").getAttribute("role")).toBe("status");
        rerender(<CreditsBar credits={{ ...base, used: 2000, percent: 100 }} />);
        const alert = screen.getByTestId("credits-alert");
        expect(alert.textContent).toMatch(/exhausted/i);
        expect(alert.getAttribute("role")).toBe("alert");
    });
    it("trusts the server status over the percent", () => {
        render(<CreditsBar credits={{ ...base, percent: 10, status: "exhausted" }} />);
        expect(screen.getByTestId("credits-alert").textContent).toMatch(/exhausted/i);
    });
    it("renders nothing when disabled, empty or missing", () => {
        expect(render(<CreditsBar credits={{ ...base, enabled: false, pool: 0, percent: null }} />).container.innerHTML).toBe("");
        expect(render(<CreditsBar credits={null} />).container.innerHTML).toBe("");
    });
});

describe("CreditsCard", () => {
    it("shows pool, consumed and percentage", () => {
        render(<CreditsCard credits={base} />);
        expect(screen.getByText("Credits")).toBeTruthy();
        expect(screen.getByTestId("credits-pool").textContent).toBe("2,000");
        expect(screen.getByTestId("credits-credits-consumed").textContent).toBe("500.40");
        expect(screen.getByTestId("credits-consumed").textContent).toBe("25.0%");
    });
    it("is hidden when the tier has no AI", () => {
        const { container } = render(<CreditsCard credits={{ enabled: false, pool: 0, percent: null }} />);
        expect(container.innerHTML).toBe("");
    });
});
