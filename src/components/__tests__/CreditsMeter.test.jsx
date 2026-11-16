import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

vi.mock("@/services/aiService", () => ({ getAICredits: vi.fn() }));
import { getAICredits } from "@/services/aiService";
import { CreditsMeter } from "../CreditsMeter.jsx";
import { refreshAICredits, resetAICredits } from "@/hooks/useAICredits";

const credits = (over = {}) => ({ enabled: true, pool: 25000, used: 994.28, remaining: 24005.72, percent: 3.98, period: { label: "May 2026" }, ...over });

describe("CreditsMeter", () => {
    beforeEach(() => { resetAICredits(); getAICredits.mockReset(); });

    it("shows only used (2 decimals) / pool", async () => {
        getAICredits.mockResolvedValue(credits());
        render(<CreditsMeter />);
        const meter = await screen.findByTestId("credits-meter");
        expect(meter.textContent).toBe("994.28 / 25,000");
        expect(meter.getAttribute("aria-label")).toBe("AI credits used this month");
    });

    it("renders nothing when the account has no AI pool", async () => {
        getAICredits.mockResolvedValue(credits({ pool: 0, enabled: false }));
        const { container } = render(<CreditsMeter />);
        await waitFor(() => expect(getAICredits).toHaveBeenCalled());
        expect(container.innerHTML).toBe("");
    });

    it("renders nothing and does not throw when the request fails", async () => {
        getAICredits.mockRejectedValue(new Error("403"));
        const { container } = render(<CreditsMeter />);
        await waitFor(() => expect(getAICredits).toHaveBeenCalled());
        expect(container.innerHTML).toBe("");
    });

    it("updates every mounted meter after refreshAICredits()", async () => {
        getAICredits.mockResolvedValueOnce(credits({ used: 10 }));
        render(<><CreditsMeter /><CreditsMeter /></>);
        await waitFor(() => expect(screen.getAllByTestId("credits-meter")[0].textContent).toBe("10.00 / 25,000"));
        getAICredits.mockResolvedValue(credits({ used: 47.6, remaining: 24952.4 }));
        await act(async () => { await refreshAICredits(); });
        screen.getAllByTestId("credits-meter").forEach((m) => expect(m.textContent).toBe("47.60 / 25,000"));
    });

    it("keeps the last value if a refresh fails", async () => {
        getAICredits.mockResolvedValueOnce(credits({ used: 10 }));
        render(<CreditsMeter />);
        await screen.findByText("10.00 / 25,000");
        getAICredits.mockRejectedValue(new Error("boom"));
        await act(async () => { await refreshAICredits(); });
        expect(screen.getByTestId("credits-meter").textContent).toBe("10.00 / 25,000");
    });

    it("hides the meter when a refresh returns 403 (plan lost AI)", async () => {
        getAICredits.mockResolvedValueOnce(credits({ used: 10 }));
        render(<CreditsMeter />);
        await screen.findByText("10.00 / 25,000");
        getAICredits.mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));
        await act(async () => { await refreshAICredits(); });
        expect(screen.queryByTestId("credits-meter")).toBeNull();
    });

    it("mounting several meters triggers a single request", async () => {
        getAICredits.mockResolvedValue(credits());
        render(<><CreditsMeter /><CreditsMeter /><CreditsMeter /></>);
        await waitFor(() => expect(screen.getAllByTestId("credits-meter")).toHaveLength(3));
        expect(getAICredits).toHaveBeenCalledTimes(1);
    });

    it("flags the meter as warning at 80% and exhausted at 100%", async () => {
        getAICredits.mockResolvedValueOnce(credits({ used: 20000, percent: 80 }));
        render(<CreditsMeter />);
        await waitFor(() => expect(screen.getByTestId("credits-meter").getAttribute("data-status")).toBe("warning"));
        getAICredits.mockResolvedValue(credits({ used: 25000, percent: 100, status: "exhausted" }));
        await act(async () => { await refreshAICredits(); });
        expect(screen.getByTestId("credits-meter").getAttribute("data-status")).toBe("exhausted");
    });
});
