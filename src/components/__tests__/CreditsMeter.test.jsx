import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

vi.mock("@/services/aiService", () => ({ getAICredits: vi.fn() }));
import { getAICredits } from "@/services/aiService";
import { CreditsMeter } from "../CreditsMeter.jsx";
import { refreshAICredits, resetAICredits } from "@/hooks/useAICredits";

const credits = (over = {}) => ({ enabled: true, pool: 25000, used: 994.28, remaining: 24005.72, percent: 3.98, period: { label: "May 2026" }, ...over });

describe("CreditsMeter", () => {
    beforeEach(() => { resetAICredits(); getAICredits.mockReset(); });

    it("shows only used / pool, used rounded to an integer", async () => {
        getAICredits.mockResolvedValue(credits());
        render(<CreditsMeter />);
        const meter = await screen.findByTestId("credits-meter");
        expect(meter.textContent).toBe("994 / 25,000");
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
        await waitFor(() => expect(screen.getAllByTestId("credits-meter")[0].textContent).toBe("10 / 25,000"));
        getAICredits.mockResolvedValue(credits({ used: 47.6, remaining: 24952.4 }));
        await act(async () => { await refreshAICredits(); });
        screen.getAllByTestId("credits-meter").forEach((m) => expect(m.textContent).toBe("48 / 25,000"));
    });

    it("keeps the last value if a refresh fails", async () => {
        getAICredits.mockResolvedValueOnce(credits({ used: 10 }));
        render(<CreditsMeter />);
        await screen.findByText("10 / 25,000");
        getAICredits.mockRejectedValue(new Error("boom"));
        await act(async () => { await refreshAICredits(); });
        expect(screen.getByTestId("credits-meter").textContent).toBe("10 / 25,000");
    });
});
