import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

vi.mock("@/services/creditsAdminService", () => ({
    getCreditUsers: vi.fn(), getCreditTopUps: vi.fn(), createCreditTopUp: vi.fn(), getIngestionBudget: vi.fn(),
}));
vi.mock("sweetalert2", () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) } }));

import Swal from "sweetalert2";
import { createCreditTopUp, getCreditTopUps, getCreditUsers, getIngestionBudget } from "@/services/creditsAdminService";
import { CreditsAdmin } from "../CreditsAdmin.jsx";

beforeAll(() => {
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
});

const user = (id, username, full_name, used, extra, status) => {
    const pool = 4000 + extra;
    return { user_id: id, username, full_name, is_active: true, used, extra, pool, remaining: Math.max(pool - used, 0),
        percent: Math.round((used / pool) * 1000) / 10, status, share: 0 };
};
const report = (period = "2026-11") => ({
    period, total: 7900, unattributed: 0, per_user_pool: 4000,
    users: [
        user(1, "ana", "Ana Perez", 4000, 0, "exhausted"),
        user(2, "bob", "", 3300, 0, "warning"),
        user(3, "cat", "Cat Lopez", 100, 0, "ok"),
        user(4, "dan", "Dan Ruiz", 500, 500, "ok"),
    ],
});

beforeEach(() => {
    vi.clearAllMocks();
    getCreditUsers.mockImplementation(async (p) => report(p || "2026-11"));
    getCreditTopUps.mockResolvedValue({ period: "2026-11", topups: [] });
    getIngestionBudget.mockResolvedValue({ enabled: true, pool: 4000, used: 1200, percent: 30, status: "ok", period: { label: "November 2026" } });
});

const rowOf = async (name) => (await screen.findByText(name)).closest("tr");

describe("CreditsAdmin balances", () => {
    it("shows every person's usage, allotment (with top-ups) and status", async () => {
        render(<CreditsAdmin />);
        const ana = await rowOf("Ana Perez");
        expect(within(ana).getByText("Out of credits")).toBeTruthy();
        expect(within(ana).getByText("100.0%")).toBeTruthy();
        const bob = await rowOf("bob");
        expect(within(bob).getByText("Near limit")).toBeTruthy();
        expect(within(bob).getByText("82.5%")).toBeTruthy();
        const dan = await rowOf("Dan Ruiz");
        expect(within(dan).getByText("(+500)")).toBeTruthy();
        expect(within(dan).getByText("4,500")).toBeTruthy();
        expect(within(await rowOf("Cat Lopez")).getByText("OK")).toBeTruthy();
    });

    it("summarizes people, credits used, blocked and near-limit counts", async () => {
        render(<CreditsAdmin />);
        await rowOf("Ana Perez");
        expect(screen.getByTestId("stat-people").textContent).toBe("4");
        expect(screen.getByTestId("stat-credits-used").textContent).toBe("7,900.00");
        expect(screen.getByTestId("stat-out-of-credits").textContent).toBe("1");
        expect(screen.getByTestId("stat-near-limit").textContent).toBe("1");
    });

    it("filters by status and by name", async () => {
        render(<CreditsAdmin />);
        await rowOf("Ana Perez");
        fireEvent.change(screen.getByLabelText("Filter"), { target: { value: "exhausted" } });
        expect(screen.getAllByTestId("credit-row")).toHaveLength(1);
        fireEvent.change(screen.getByLabelText("Filter"), { target: { value: "all" } });
        fireEvent.change(screen.getByLabelText("Search people"), { target: { value: "lopez" } });
        expect(screen.getAllByTestId("credit-row")).toHaveLength(1);
        expect(screen.getByText("Cat Lopez")).toBeTruthy();
        fireEvent.change(screen.getByLabelText("Search people"), { target: { value: "zzz" } });
        expect(screen.getByTestId("credits-empty")).toBeTruthy();
    });
});

describe("CreditsAdmin top-ups", () => {
    const open = async (name) => {
        render(<CreditsAdmin />);
        await rowOf(name);
        fireEvent.click(screen.getByRole("button", { name: `Add credits for ${name}` }));
        return screen.findByLabelText("Credits to add");
    };

    it("adds credits to one person, previews the new allotment, then reloads", async () => {
        createCreditTopUp.mockResolvedValue({});
        const input = await open("Ana Perez");
        expect(screen.getByTestId("topup-current").textContent).toMatch(/Used 4,000\.00 of 4,000 this month — currently blocked/);
        const submit = screen.getByRole("button", { name: "Add credits" });
        expect(submit.disabled).toBe(true);

        fireEvent.click(screen.getByRole("button", { name: "+500" }));
        expect(input.value).toBe("500");
        expect(screen.getByTestId("topup-preview").textContent).toContain("4,500");
        fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: " Quarter-end " } });
        expect(screen.getByRole("button", { name: "Add credits" }).disabled).toBe(false);
        fireEvent.click(screen.getByRole("button", { name: "Add credits" }));

        await waitFor(() => expect(createCreditTopUp).toHaveBeenCalledTimes(1));
        expect(createCreditTopUp).toHaveBeenCalledWith({ user: 1, credits: 500, note: "Quarter-end" });
        await waitFor(() => expect(getCreditUsers).toHaveBeenCalledTimes(2));       // balances reloaded
        await waitFor(() => expect(screen.queryByLabelText("Credits to add")).toBeNull());   // dialog closed
    });

    it("only enables the button for a valid amount", async () => {
        const input = await open("bob");
        for (const bad of ["0", "-5", "abc", "1000001"]) {
            fireEvent.change(input, { target: { value: bad } });
            expect(screen.getByRole("button", { name: "Add credits" }).disabled).toBe(true);
        }
        fireEvent.change(input, { target: { value: "-5" } });
        expect(screen.getByRole("alert").textContent).toMatch(/greater than 0/);
        fireEvent.change(input, { target: { value: "1000000" } });
        expect(screen.getByRole("button", { name: "Add credits" }).disabled).toBe(false);
        fireEvent.change(input, { target: { value: "12.5" } });
        expect(screen.getByRole("button", { name: "Add credits" }).disabled).toBe(false);
    });

    it("keeps the dialog open and shows the server's message when it fails", async () => {
        createCreditTopUp.mockRejectedValue(new Error("user must be the id of an active user."));
        const input = await open("Cat Lopez");
        fireEvent.change(input, { target: { value: "100" } });
        fireEvent.click(screen.getByRole("button", { name: "Add credits" }));
        await waitFor(() => expect(Swal.fire).toHaveBeenCalledWith("Error", "user must be the id of an active user.", "error"));
        expect(screen.getByLabelText("Credits to add").value).toBe("100");
        expect(getCreditUsers).toHaveBeenCalledTimes(1);   // nothing was reloaded as if it had worked
    });

    it("lists this month's top-ups", async () => {
        getCreditTopUps.mockResolvedValue({ period: "2026-11", topups: [
            { id: "t1", user_id: 4, username: "dan", credits: 500, note: "Reports", created_by: "root", created_at: "2026-11-10T12:00:00Z" },
        ] });
        render(<CreditsAdmin />);
        const row = (await screen.findAllByTestId("topup-row"))[0];
        expect(within(row).getByText("+500 for dan")).toBeTruthy();
        expect(within(row).getByText(/Reports · by root/)).toBeTruthy();
    });

    it("says so when nothing was added this month", async () => {
        render(<CreditsAdmin />);
        expect(await screen.findByTestId("topups-empty")).toBeTruthy();
    });
});

describe("CreditsAdmin ingestion budget", () => {
    it("shows the account's budget apart from the people's balances", async () => {
        render(<CreditsAdmin />);
        const card = await screen.findByTestId("ingestion-card");
        expect(card.textContent).toContain("Used 1,200.00 of 4,000 credits");
        expect(screen.getAllByTestId("credit-row")).toHaveLength(4);      // people unaffected
    });

    it("says uploads are paused when it is exhausted", async () => {
        getIngestionBudget.mockResolvedValue({ enabled: true, pool: 4000, used: 4000, percent: 100, status: "exhausted" });
        render(<CreditsAdmin />);
        expect((await screen.findByTestId("ingestion-card")).textContent).toContain("Uploads paused");
    });

    it("tops up the ingestion budget without choosing a person", async () => {
        createCreditTopUp.mockResolvedValue({});
        render(<CreditsAdmin />);
        await screen.findByTestId("ingestion-card");
        fireEvent.click(screen.getByRole("button", { name: "Add ingestion credits" }));
        expect(await screen.findByText("Add ingestion credits", { selector: "[data-slot=dialog-title], h2" })).toBeTruthy();
        expect(screen.getByTestId("topup-current").textContent).toMatch(/Used 1,200\.00 of 4,000 this month\./);
        fireEvent.change(screen.getByLabelText("Credits to add"), { target: { value: "2000" } });
        expect(screen.getByTestId("topup-preview").textContent).toContain("New budget this month: 6,000");
        fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: "Onboarding" } });
        fireEvent.click(screen.getByRole("button", { name: "Add credits" }));
        await waitFor(() => expect(createCreditTopUp).toHaveBeenCalledWith({ pool: "ingestion", credits: 2000, note: "Onboarding" }));
        await waitFor(() => expect(getIngestionBudget).toHaveBeenCalledTimes(2));   // budget reloaded
    });

    it("is not offered when the plan has no ingestion budget or for past months", async () => {
        getIngestionBudget.mockResolvedValue({ enabled: false, pool: 0, used: 0, percent: null, status: "disabled" });
        const { unmount } = render(<CreditsAdmin />);
        await screen.findByText("Ana Perez");
        expect(screen.queryByTestId("ingestion-card")).toBeNull();
        unmount();
        getIngestionBudget.mockResolvedValue({ enabled: true, pool: 4000, used: 10, percent: 0.3, status: "ok" });
        render(<CreditsAdmin />);
        await screen.findByTestId("ingestion-card");
        fireEvent.change(screen.getByLabelText("Month"), { target: { value: "2026-10" } });
        await waitFor(() => expect(screen.queryByTestId("ingestion-card")).toBeNull());
    });

    it("lists ingestion top-ups in this month's history", async () => {
        getCreditTopUps.mockResolvedValue({ period: "2026-11", topups: [
            { id: "t9", pool: "ingestion", user_id: null, username: null, credits: 1000, note: "", created_by: "root", created_at: "2026-11-12T10:00:00Z" },
        ] });
        render(<CreditsAdmin />);
        expect((await screen.findAllByTestId("topup-row"))[0].textContent).toContain("+1,000 for the ingestion budget");
    });
});

describe("CreditsAdmin past months", () => {
    it("shows history read-only: no add buttons and no top-up list", async () => {
        render(<CreditsAdmin />);
        await rowOf("Ana Perez");
        fireEvent.change(screen.getByLabelText("Month"), { target: { value: "2026-10" } });
        await waitFor(() => expect(getCreditUsers).toHaveBeenLastCalledWith("2026-10"));
        await waitFor(() => expect(screen.queryByRole("button", { name: /Add credits for/ })).toBeNull());
        expect(screen.queryByTestId("topups-empty")).toBeNull();
    });
});
