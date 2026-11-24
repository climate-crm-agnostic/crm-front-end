import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { TopUpDialog } from "@/components/topups/TopUpDialog";

// A fake Stripe whose Elements refuse to be used once destroyed, like the real one
// ("We could not retrieve data from the specified Element…").
const makeElement = () => {
    const el = { destroyed: false, mount: vi.fn(), destroy: () => { el.destroyed = true; } };
    return el;
};
const fakeStripe = {
    elements: () => ({ create: () => makeElement() }),
    createToken: vi.fn(async (_type, el) => (el.destroyed ? { error: { message: "element destroyed" } } : { token: { id: "cvctok_1" } })),
    confirmCardSetup: vi.fn(async (_secret, { payment_method: { card } }) => (card.destroyed
        ? { error: { message: "element destroyed" } } : { setupIntent: { id: "seti_1" } })),
};
vi.mock("@/lib/stripeJs", () => ({ getStripe: vi.fn(async () => fakeStripe) }));
const options = vi.fn();
const service = {
    startTopUp: vi.fn(async () => ({ payment_intent_id: "pi_1", amount_cents: 2500 })),
    confirmTopUp: vi.fn(async () => ({ status: "succeeded" })),
    getTopUp: vi.fn(async () => ({ credited: true })),
    startCardChange: vi.fn(async () => ({ client_secret: "seti_1_secret_x" })),
    setTopUpCard: vi.fn(async () => ({ card: { brand: "visa", last4: "4242" } })),
};
vi.mock("@/services/topUpService", () => ({
    getTopUpOptions: (...a) => options(...a),
    startTopUp: (...a) => service.startTopUp(...a), confirmTopUp: (...a) => service.confirmTopUp(...a),
    getTopUp: (...a) => service.getTopUp(...a), startCardChange: (...a) => service.startCardChange(...a),
    setTopUpCard: (...a) => service.setTopUpCard(...a),
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

    it("keeps the card field mounted while the new card is saved", async () => {
        options.mockResolvedValue({ publishable_key: "pk_test", card: null, packs: PACKS, can_change_card: true });
        render(<TopUpDialog open onOpenChange={() => {}} kind="voice_minutes" />);
        fireEvent.click(await screen.findByRole("button", { name: "Add a card" }));
        await waitFor(() => expect(screen.getByText("New card")).toBeTruthy());
        await new Promise((r) => setTimeout(r, 0));   // the element mounts after Stripe.js loads
        fireEvent.click(screen.getByRole("button", { name: "Save card" }));
        expect(await screen.findByText(/Visa •••• 4242/)).toBeTruthy();
        expect(screen.queryByText(/element destroyed/)).toBeNull();
    });

    it("keeps the security code field mounted while it pays", async () => {
        options.mockResolvedValue({ publishable_key: "pk_test", card: { brand: "visa", last4: "4242" }, packs: PACKS, can_change_card: true });
        render(<TopUpDialog open onOpenChange={() => {}} kind="voice_minutes" />);
        await screen.findByText("140 voice minutes");
        await new Promise((r) => setTimeout(r, 0));
        fireEvent.click(screen.getByRole("button", { name: "Pay $25.00" }));
        expect(await screen.findByText("Payment received", {}, { timeout: 3000 })).toBeTruthy();
        expect(screen.queryByText(/element destroyed/)).toBeNull();
    });
});
