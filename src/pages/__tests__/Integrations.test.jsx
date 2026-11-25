import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/services/integrationService", () => ({
    getIntegrations: vi.fn(), saveIntegrationCredentials: vi.fn(), deleteIntegrationCredentials: vi.fn(),
    saveIntegrationSettings: vi.fn(), runIntegration: vi.fn(),
}));
vi.mock("sweetalert2", () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) } }));

import Swal from "sweetalert2";
import {
    deleteIntegrationCredentials, getIntegrations, runIntegration, saveIntegrationCredentials, saveIntegrationSettings,
} from "@/services/integrationService";
import { Integrations } from "../Integrations.jsx";

const hud = {
    key: "hud_reo", name: "HUD Homes (REO)", category: "real_estate", category_label: "Real estate",
    description: "HUD's public list of homes for sale.", creates: "One catalogue product per property.", docs_url: "",
    credentials: [], ready: true, running: false, usage: null, last_run: null,
    settings: [{ name: "max_new_leads", label: "New leads per run", help: "", kind: "int", min: 0, max: 500, value: 25 }],
};
const rentcast = {
    key: "rentcast", name: "RentCast", category: "real_estate", category_label: "Real estate",
    description: "Active for-sale listings.", creates: "One catalogue product per property.", docs_url: "https://developers.rentcast.io",
    credentials: [{ name: "api_key", label: "API key", help: "From RentCast.", configured: false }], ready: false, running: false,
    usage: { used: 3, cap: 40 }, last_run: null, settings: [],
};

beforeEach(() => {
    vi.clearAllMocks();
    Swal.fire.mockResolvedValue({ isConfirmed: true });
    getIntegrations.mockResolvedValue([hud, rentcast]);
});


describe("Integrations", () => {
    it("lists each integration under its category with what it does", async () => {
        render(<Integrations />);
        expect(await screen.findByText("HUD Homes (REO)")).toBeTruthy();
        expect(screen.getByRole("heading", { name: "Real estate" })).toBeTruthy();
        expect(screen.getAllByText(/What it does in your CRM/)).toHaveLength(2);
        expect(screen.getByText("No account or key needed.")).toBeTruthy();
    });

    it("blocks running an integration that still needs its key", async () => {
        render(<Integrations />);
        await screen.findByText("RentCast");
        const buttons = screen.getAllByRole("button", { name: /Run now/ });
        expect(buttons[0].disabled).toBe(false);          // HUD needs nothing
        expect(buttons[1].disabled).toBe(true);         // RentCast has no key yet
        expect(screen.getByText("Needs credentials")).toBeTruthy();
    });

    it("saves a key as a password field and never shows it back", async () => {
        saveIntegrationCredentials.mockResolvedValue({ ...rentcast, ready: true, credentials: [{ ...rentcast.credentials[0], configured: true }] });
        render(<Integrations />);
        const input = await screen.findByLabelText("API key");
        expect(input.getAttribute("type")).toBe("password");
        fireEvent.change(input, { target: { value: "SECRET-KEY" } });
        fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
        await waitFor(() => expect(saveIntegrationCredentials).toHaveBeenCalledWith("rentcast", { api_key: "SECRET-KEY" }));
        await waitFor(() => expect(screen.getAllByText("Saved").length).toBeGreaterThan(0));
        expect(screen.queryByDisplayValue("SECRET-KEY")).toBeNull();
        expect(screen.getByRole("button", { name: /Remove/ })).toBeTruthy();
    });

    it("asks before using a billable request and then starts the run", async () => {
        const ready = { ...rentcast, ready: true, credentials: [{ ...rentcast.credentials[0], configured: true }] };
        getIntegrations.mockResolvedValue([hud, ready]);
        runIntegration.mockResolvedValue({ id: "r1", status: "running" });
        render(<Integrations />);
        await screen.findByText("RentCast");
        expect(screen.getByText(/3 of 40 requests used this month/)).toBeTruthy();
        fireEvent.click(screen.getAllByRole("button", { name: /Run now/ })[1]);
        await waitFor(() => expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("1 of the 37 requests left") })));
        await waitFor(() => expect(runIntegration).toHaveBeenCalledWith("rentcast"));
    });

    it("does not run when the admin cancels the confirmation", async () => {
        const ready = { ...rentcast, ready: true, credentials: [{ ...rentcast.credentials[0], configured: true }] };
        getIntegrations.mockResolvedValue([ready]);
        Swal.fire.mockResolvedValue({ isConfirmed: false });
        render(<Integrations />);
        await screen.findByText("RentCast");
        fireEvent.click(screen.getByRole("button", { name: /Run now/ }));
        await waitFor(() => expect(Swal.fire).toHaveBeenCalled());
        expect(runIntegration).not.toHaveBeenCalled();
    });

    it("disables the button at the monthly limit", async () => {
        const capped = { ...rentcast, ready: true, usage: { used: 40, cap: 40 }, credentials: [{ ...rentcast.credentials[0], configured: true }] };
        getIntegrations.mockResolvedValue([capped]);
        render(<Integrations />);
        await screen.findByText("RentCast");
        expect(screen.getByRole("button", { name: /Run now/ }).disabled).toBe(true);
    });

    it("shows the result of the last run in plain words, and a failure's message", async () => {
        const done = { ...hud, last_run: { status: "success", result: { created: 622, leads_created: 25, deactivated: 0 }, finished_at: "2026-11-25T17:00:00Z", triggered_by: "boss" } };
        const failed = { ...rentcast, ready: true, credentials: [{ ...rentcast.credentials[0], configured: true }], last_run: { status: "failed", error: "RentCast rejected the API key.", finished_at: "2026-11-25T17:00:00Z" } };
        getIntegrations.mockResolvedValue([done, failed]);
        render(<Integrations />);
        expect(await screen.findByText("622 new · 25 leads opened")).toBeTruthy();
        expect(screen.getByText("RentCast rejected the API key.")).toBeTruthy();
    });

    it("shows progress while a run is going and keeps the button off", async () => {
        const running = { ...hud, running: true, last_run: { status: "running", progress: "Saving properties 400 of 622" } };
        getIntegrations.mockResolvedValue([running]);
        render(<Integrations />);
        expect(await screen.findByText("Saving properties 400 of 622")).toBeTruthy();
        expect(screen.getByRole("button", { name: /Run now/ }).disabled).toBe(true);
    });

    it("saves settings and shows a server error as it is", async () => {
        saveIntegrationSettings.mockRejectedValue(new Error("New leads per run must be between 0 and 500."));
        render(<Integrations />);
        const input = await screen.findByLabelText("New leads per run");
        fireEvent.change(input, { target: { value: "900" } });
        fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
        await waitFor(() => expect(saveIntegrationSettings).toHaveBeenCalledWith("hud_reo", { max_new_leads: "900" }));
        await waitFor(() => expect(Swal.fire).toHaveBeenCalledWith("Error", "New leads per run must be between 0 and 500.", "error"));
    });

    it("confirms before removing credentials", async () => {
        const ready = { ...rentcast, ready: true, credentials: [{ ...rentcast.credentials[0], configured: true }] };
        getIntegrations.mockResolvedValue([ready]);
        deleteIntegrationCredentials.mockResolvedValue(rentcast);
        render(<Integrations />);
        await screen.findByText("RentCast");
        fireEvent.click(screen.getByRole("button", { name: /Remove/ }));
        await waitFor(() => expect(deleteIntegrationCredentials).toHaveBeenCalledWith("rentcast"));
        expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ showCancelButton: true }));
    });
});
