import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

vi.mock("@/services/aiService", () => ({ getAICredits: vi.fn() }));
import { getAICredits } from "@/services/aiService";
import { CreditsMeter } from "../CreditsMeter.jsx";
import { refreshAICredits, resetAICredits, publishAICredits, ensureAICredits } from "@/hooks/useAICredits";
import chettSource from "../../pages/ChettAI.jsx?raw";
const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status });
const deferred = () => { let resolveFn, rejectFn; const promise = new Promise((res, rej) => { resolveFn = res; rejectFn = rej; }); return { promise, resolve: resolveFn, reject: rejectFn }; };

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

    it("hides the meter after a 403 instead of keeping the last value", async () => {
        getAICredits.mockResolvedValueOnce(credits({ used: 10 }));
        render(<CreditsMeter />);
        await screen.findByText("10.00 / 25,000");
        getAICredits.mockRejectedValue(httpError(403));
        await act(async () => { await refreshAICredits(); });
        expect(screen.queryByTestId("credits-meter")).toBeNull();
    });

    it("hides the meter when the plan loses AI (enabled=false in the answer)", async () => {
        getAICredits.mockResolvedValueOnce(credits({ used: 10 }));
        render(<CreditsMeter />);
        await screen.findByText("10.00 / 25,000");
        getAICredits.mockResolvedValue(credits({ enabled: false, pool: 0 }));
        await act(async () => { await refreshAICredits(); });
        expect(screen.queryByTestId("credits-meter")).toBeNull();
    });

    it("recovers when the credits come back after being unavailable", async () => {
        getAICredits.mockRejectedValueOnce(httpError(403));
        render(<CreditsMeter />);
        await waitFor(() => expect(getAICredits).toHaveBeenCalledTimes(1));
        expect(screen.queryByTestId("credits-meter")).toBeNull();
        getAICredits.mockResolvedValue(credits({ used: 5 }));
        await act(async () => { await refreshAICredits(); });
        expect(screen.getByTestId("credits-meter").textContent).toBe("5.00 / 25,000");
    });

    it("keeps the last value on a transient failure (5xx / offline), only 401/403 hide it", async () => {
        getAICredits.mockResolvedValueOnce(credits({ used: 10 }));
        render(<CreditsMeter />);
        await screen.findByText("10.00 / 25,000");
        getAICredits.mockRejectedValue(httpError(500));
        await act(async () => { await refreshAICredits(); });
        expect(screen.getByTestId("credits-meter").textContent).toBe("10.00 / 25,000");
    });

    it("mounting several meters at once sends ONE request", async () => {
        getAICredits.mockResolvedValue(credits({ used: 3 }));
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

    it("overlapping refreshes share the pending promise", async () => {
        const d = deferred();
        getAICredits.mockReturnValue(d.promise);
        const a = refreshAICredits();
        const b = refreshAICredits();
        expect(a).toBe(b);
        expect(getAICredits).toHaveBeenCalledTimes(1);
        d.resolve(credits());
        await a;
        getAICredits.mockResolvedValue(credits({ used: 1 }));
        await refreshAICredits();                      // a new request once the first has finished
        expect(getAICredits).toHaveBeenCalledTimes(2);
    });

    it("a failed request does not leave the store stuck in-flight", async () => {
        getAICredits.mockRejectedValueOnce(httpError(500));
        await refreshAICredits();
        getAICredits.mockResolvedValue(credits({ used: 2 }));
        await refreshAICredits();
        expect(getAICredits).toHaveBeenCalledTimes(2);
    });

    it("an older in-flight answer never overwrites fresher published credits", async () => {
        const d = deferred();
        getAICredits.mockReturnValue(d.promise);
        render(<CreditsMeter />);
        await act(async () => { publishAICredits(credits({ used: 99 })); });        // e.g. the chat answer arrives first
        await act(async () => { d.resolve(credits({ used: 1 })); await Promise.resolve(); });
        await waitFor(() => expect(screen.getByTestId("credits-meter").textContent).toBe("99.00 / 25,000"));
    });

    it("a meter mounting right after fresh data does not fetch again, an old one does", async () => {
        getAICredits.mockResolvedValue(credits({ used: 7 }));
        await refreshAICredits();
        getAICredits.mockClear();
        await ensureAICredits();
        expect(getAICredits).not.toHaveBeenCalled();
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(Date.now() + 11_000);
        await ensureAICredits();
        vi.useRealTimers();
        expect(getAICredits).toHaveBeenCalledTimes(1);
    });

    it("keeps the exact format: used with 2 decimals / pool with thousands separator", async () => {
        getAICredits.mockResolvedValue(credits({ used: 115.18, pool: 25000 }));
        render(<CreditsMeter />);
        expect((await screen.findByTestId("credits-meter")).textContent).toBe("115.18 / 25,000");
    });

    it("ChettAI no longer polls every 3 s: it refreshes when the response completes", () => {
        const source = chettSource;
        expect(source).not.toMatch(/setInterval\(\s*refreshAICredits/);
        expect(source).toMatch(/publishAICredits\(res\.credits\)/);
        expect(source).toMatch(/finally\s*{[^}]*refreshAICredits\(\)/);
    });
});
