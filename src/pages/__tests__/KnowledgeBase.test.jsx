import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

vi.mock("@/services/knowledgeService", () => ({
    getKnowledgeGroups: vi.fn(), getKnowledgeDocuments: vi.fn(), uploadKnowledgeDocument: vi.fn(),
    updateKnowledgeDocument: vi.fn(), deleteKnowledgeDocument: vi.fn(),
    createKnowledgeGroup: vi.fn(), updateKnowledgeGroup: vi.fn(), deleteKnowledgeGroup: vi.fn(),
}));
vi.mock("@/services/userService", () => ({ getUsers: vi.fn() }));
vi.mock("@/services/creditsAdminService", () => ({ getIngestionBudget: vi.fn() }));
vi.mock("sweetalert2", () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) } }));

import {
    getKnowledgeDocuments, getKnowledgeGroups, uploadKnowledgeDocument, deleteKnowledgeDocument,
} from "@/services/knowledgeService";
import { getUsers } from "@/services/userService";
import { getIngestionBudget } from "@/services/creditsAdminService";
import { KnowledgeBase } from "../KnowledgeBase.jsx";

beforeAll(() => {
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
});

const everyone = { id: "g-all", name: "Everyone", is_everyone: true, members: [], member_count: 0, document_count: 1 };
const finance = { id: "g-fin", name: "Finance", is_everyone: false, members: [{ id: 1, username: "ana", full_name: "Ana Perez" }], member_count: 1, document_count: 1 };
const docs = [
    { id: "d1", title: "Budget 2027", original_filename: "budget.pdf", kind: "document", group: "g-fin", group_name: "Finance", size_bytes: 2_621_440, status: "pending_sync" },
    { id: "d2", title: "Office hours", original_filename: "hours.txt", kind: "document", group: "g-all", group_name: "Everyone", size_bytes: 512, status: "synced" },
];

beforeEach(() => {
    vi.clearAllMocks();
    getKnowledgeGroups.mockResolvedValue([everyone, finance]);
    getKnowledgeDocuments.mockResolvedValue(docs);
    getUsers.mockResolvedValue([{ id: 1, username: "ana", full_name: "Ana Perez", is_active: true }]);
    getIngestionBudget.mockResolvedValue({ enabled: true, pool: 4000, used: 400, percent: 10, status: "ok" });
});

describe("KnowledgeBase documents", () => {
    it("lists each document with who can consult it, its size and status", async () => {
        render(<KnowledgeBase />);
        const row = (await screen.findByText("Budget 2027")).closest("tr");
        expect(within(row).getByText("Finance")).toBeTruthy();
        expect(within(row).getByText("2.5 MB")).toBeTruthy();
        expect(within(row).getByText("Waiting to sync")).toBeTruthy();
        const other = screen.getByText("Office hours").closest("tr");
        expect(within(other).getByText("Everyone")).toBeTruthy();
        expect(within(other).getByText("Ready")).toBeTruthy();
        expect(within(other).getByText("512 B")).toBeTruthy();
    });

    it("shows an empty state", async () => {
        getKnowledgeDocuments.mockResolvedValue([]);
        render(<KnowledgeBase />);
        expect(await screen.findByTestId("kb-empty")).toBeTruthy();
    });

    it("cannot upload until a file AND a group are chosen, then sends both", async () => {
        uploadKnowledgeDocument.mockResolvedValue({ id: "new" });
        render(<KnowledgeBase />);
        await screen.findByText("Budget 2027");
        fireEvent.click(screen.getByRole("button", { name: /upload/i }));
        const submit = await screen.findByRole("button", { name: "Upload" });
        expect(submit.disabled).toBe(true);

        const file = new File(["%PDF-1.7"], "Q4 plan.pdf", { type: "application/pdf" });
        fireEvent.change(screen.getByLabelText("File"), { target: { files: [file] } });
        expect(screen.getByLabelText("Title").value).toBe("Q4 plan");   // defaults to the file name
        expect(screen.getByRole("button", { name: "Upload" }).disabled).toBe(true);  // still no group

        fireEvent.change(screen.getByLabelText("Who can consult it?"), { target: { value: "g-fin" } });
        expect(screen.getByRole("button", { name: "Upload" }).disabled).toBe(false);
        fireEvent.click(screen.getByRole("button", { name: "Upload" }));

        await waitFor(() => expect(uploadKnowledgeDocument).toHaveBeenCalledTimes(1));
        expect(uploadKnowledgeDocument).toHaveBeenCalledWith({ file, group: "g-fin", title: "Q4 plan" });
        await waitFor(() => expect(getKnowledgeDocuments).toHaveBeenCalledTimes(2));  // list reloads
    });

    it("keeps the dialog open and the data when the upload is rejected", async () => {
        uploadKnowledgeDocument.mockRejectedValue(new Error("This file has already been uploaded."));
        render(<KnowledgeBase />);
        await screen.findByText("Budget 2027");
        fireEvent.click(screen.getByRole("button", { name: /upload/i }));
        await screen.findByRole("button", { name: "Upload" });
        fireEvent.change(screen.getByLabelText("File"), { target: { files: [new File(["x"], "a.txt")] } });
        fireEvent.change(screen.getByLabelText("Who can consult it?"), { target: { value: "g-all" } });
        fireEvent.click(screen.getByRole("button", { name: "Upload" }));
        await waitFor(() => expect(uploadKnowledgeDocument).toHaveBeenCalled());
        expect(screen.getByLabelText("Title").value).toBe("a");
    });

    it("deletes a document after confirmation and reloads", async () => {
        deleteKnowledgeDocument.mockResolvedValue(null);
        render(<KnowledgeBase />);
        await screen.findByText("Budget 2027");
        fireEvent.click(screen.getByRole("button", { name: "Delete Budget 2027" }));
        await waitFor(() => expect(deleteKnowledgeDocument).toHaveBeenCalledWith("d1"));
        await waitFor(() => expect(getKnowledgeDocuments).toHaveBeenCalledTimes(2));
    });
});

describe("KnowledgeBase ingestion budget", () => {
    it("shows the account's ingestion budget above the documents", async () => {
        render(<KnowledgeBase />);
        const box = await screen.findByTestId("ingestion-budget");
        expect(box.textContent).toContain("400.00 of 4,000 credits");
        expect(box.textContent).toContain("10.0%");
        expect(within(box).queryByRole("alert")).toBeNull();
    });

    it("warns near the limit and says uploads are paused when it is used up", async () => {
        getIngestionBudget.mockResolvedValue({ enabled: true, pool: 4000, used: 3300, percent: 82.5, status: "warning" });
        const { unmount } = render(<KnowledgeBase />);
        expect((await screen.findByRole("status")).textContent).toMatch(/Most of this month/);
        unmount();
        getIngestionBudget.mockResolvedValue({ enabled: true, pool: 4000, used: 4000, percent: 100, status: "exhausted" });
        render(<KnowledgeBase />);
        expect((await screen.findByRole("alert")).textContent).toMatch(/Ingestion budget used up\. New uploads are paused/);
    });

    it("hides the budget when the plan has none or it cannot be loaded", async () => {
        getIngestionBudget.mockRejectedValue(new Error("403"));
        render(<KnowledgeBase />);
        await screen.findByText("Budget 2027");
        expect(screen.queryByTestId("ingestion-budget")).toBeNull();
    });

    it("refreshes the budget after an upload", async () => {
        uploadKnowledgeDocument.mockResolvedValue({ id: "new" });
        render(<KnowledgeBase />);
        await screen.findByText("Budget 2027");
        fireEvent.click(screen.getByRole("button", { name: /upload/i }));
        await screen.findByRole("button", { name: "Upload" });
        fireEvent.change(screen.getByLabelText("File"), { target: { files: [new File(["x"], "a.txt")] } });
        fireEvent.change(screen.getByLabelText("Who can consult it?"), { target: { value: "g-all" } });
        fireEvent.click(screen.getByRole("button", { name: "Upload" }));
        await waitFor(() => expect(getIngestionBudget).toHaveBeenCalledTimes(2));
    });
});

describe("KnowledgeBase access groups", () => {
    const openGroups = async () => {
        render(<KnowledgeBase />);
        await screen.findByText("Budget 2027");
        fireEvent.click(screen.getByText("Access groups", { selector: "button" }));
        await screen.findAllByTestId("kb-group");
    };

    it("shows Everyone as built-in (no edit or delete) and custom groups as editable", async () => {
        await openGroups();
        const [all, fin] = screen.getAllByTestId("kb-group");
        expect(within(all).getByText("All users")).toBeTruthy();
        expect(within(all).queryByRole("button")).toBeNull();
        expect(within(fin).getByText("1 person · 1 document")).toBeTruthy();
        expect(within(fin).getByText("Ana Perez")).toBeTruthy();
        expect(within(fin).getByRole("button", { name: "Edit Finance" })).toBeTruthy();
        expect(within(fin).getByRole("button", { name: "Delete Finance" })).toBeTruthy();
    });
});
