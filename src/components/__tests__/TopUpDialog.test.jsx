import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TopUpDialog } from "@/components/topups/TopUpDialog";

vi.mock("@/lib/stripeJs", () => ({
    getStripe: vi.fn(async () => ({ elements: () => ({ create: () => ({ mount: vi.fn(), destroy: vi.fn() }) }) })),
}));
const options = vi.fn();
vi.mock("@/services/topUpService", () => ({
    getTopUpOptions: (...a) => options(...a),
    startTopUp: vi.fn(), confirmTopUp: vi.fn(), getTopUp: vi.fn(), startCardChange: vi.fn(), setTopUpCard: vi.fn(),
}));

const PACKS = [
    { price: "voice_minutes_25", kind: "voice_minutes", quantity: 140, amount_cents: 2500, label: "140 voice minutes" },
    { price: "voice_minutes_50", kind: "voice_minutes", quantity: 280, amount_cents: 5000, label: "280 voice minutes" },
    { price: "credits_5k", kind: "ai_credits", quantity: 5000, amount_cents: 5000, label: "5,000 AI credits" },
];

describe("TopUpDialog", () => {
    beforeEach(() => options.mockReset());

    it("offers only the packs of its kind and the saved card with its security code", async () => {
        options.mockResolvedValue({ publishable_key: "pk_test", card: { brand: "visa", last4: "4242" }, packs: PACKS, can_change_card: true });
        render(<TopUpDialog open onOpenChange={() => {}} kind="voice_minutes" />);
        expect(await screen.findByText("140 voice minutes")).toBeTruthy();
        expect(screen.queryByText("5,000 AI credits")).toBeNull();
        expect(screen.getByText(/Visa •••• 4242/)).toBeTruthy();
        expect(screen.getByText("Security code (CVC)")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Pay $25.00" }).disabled).toBe(false);
        expect(screen.getByText(/6 months/)).toBeTruthy();
    });

    it("without a saved card, a non-administrator is told to ask one", async () => {
        options.mockResolvedValue({ publishable_key: "pk_test", card: null, packs: PACKS, can_change_card: false });
        render(<TopUpDialog open onOpenChange={() => {}} kind="ai_credits" />);
        expect(await screen.findByText(/no card saved/)).toBeTruthy();
        expect(screen.getByText(/Ask an administrator/)).toBeTruthy();
        await waitFor(() => expect(screen.getByRole("button", { name: /Pay/ }).disabled).toBe(true));
    });

    it("says when there is nothing this user can buy", async () => {
        options.mockResolvedValue({ publishable_key: "pk_test", card: null, packs: PACKS.filter((p) => p.kind === "ai_credits"), can_change_card: false });
        render(<TopUpDialog open onOpenChange={() => {}} kind="voice_minutes" />);
        expect(await screen.findByText(/no packs you can buy here/)).toBeTruthy();
    });
});
