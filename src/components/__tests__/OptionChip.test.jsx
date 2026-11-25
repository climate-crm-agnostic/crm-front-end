import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttributeCell } from "../OptionChip.jsx";
import { CatalogueGallery } from "../CatalogueGallery.jsx";
import { buildAttributeColumns } from "../../utils/attributeColumns.js";

const source = { name: "listing_source", label: "Source", type: "list", show_in_table: true,
    list_values: [{ value: "HUD REO", label: "HUD REO", color: "#4A7C8C" }, { value: "RentCast", label: "RentCast", color: "#B07D4A" }] };
const status = { name: "listing_status", label: "Listing Status", type: "list", show_in_table: true,
    list_values: [{ value: "Active", label: "Active", color: "#3CC647" }] };
const key = { name: "listing_key", label: "Listing Key", type: "text", show_in_table: false };

describe("custom fields in the catalogue", () => {
    it("shows a list option as a chip with its own colour", () => {
        render(<AttributeCell attr={source} value="HUD REO" />);
        const chip = screen.getByText("HUD REO");
        expect(chip.className).toContain("rounded-full");
        expect(chip.style.backgroundColor).toContain("rgb(74, 124, 140)");        // #4A7C8C, the option's own colour
    });

    it("shows nothing for an empty value and the plain value for other types", () => {
        const { container, rerender } = render(<AttributeCell attr={source} value="" />);
        expect(container.textContent).toBe("");
        rerender(<AttributeCell attr={key} value="HUD REO:541-751599" />);
        expect(container.textContent).toBe("HUD REO:541-751599");
    });

    it("keeps a value that no longer matches an option (retired option) instead of a blank", () => {
        render(<AttributeCell attr={source} value="Old source" />);
        expect(screen.getByText("Old source")).toBeTruthy();
    });

    it("table columns follow the 'Column in tables' switch", () => {
        const columns = buildAttributeColumns([key, source, status]);
        expect(columns.map((c) => c.key)).toEqual(["listing_source", "listing_status"]);
    });

    it("shows every field when none is switched on, as before", () => {
        const columns = buildAttributeColumns([{ ...key }, { ...source, show_in_table: false }]);
        expect(columns.map((c) => c.key)).toEqual(["listing_key", "listing_source"]);
    });

    it("gallery cards of properties show where they came from and their status", () => {
        const items = [
            { id: "1", name: "1 Chattanooga Ct", type: "product", base_price: 0, currency: "USD", is_active: true, listing_source: "HUD REO", listing_status: "Active", variants: [] },
            { id: "2", name: "Onboarding Kit", type: "product", base_price: 100, currency: "USD", is_active: true, variants: [] },
        ];
        render(<CatalogueGallery items={items} attributes={[source, status]} onOpen={() => {}} />);
        expect(screen.getByText("HUD REO")).toBeTruthy();
        expect(screen.getByText("Active")).toBeTruthy();
        expect(screen.getAllByText(/HUD REO|RentCast/)).toHaveLength(1);       // the non-property card has no chips
    });
});
