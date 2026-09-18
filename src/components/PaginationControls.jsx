import React from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

// "Rows per page" dropdown — kept separate from PaginationFooter so callers
// can place it in a toolbar (next to search) instead of the footer, matching
// where Table.jsx already puts it.
export const PageSizeSelect = ({ pageSize, setPageSize, pageSizeOptions, label = "Rows per page" }) => (
    <div className="flex items-center gap-2">
        <span
            className="text-sm text-muted-foreground"
            style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}
        >
            {label}
        </span>
        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger
                className="w-[88px] h-9 bg-card border-border text-foreground"
                style={{ fontFamily: '"Source Sans 3", Arial, sans-serif', fontSize: "14px" }}
            >
                <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent align="end" sideOffset={4}>
                {pageSizeOptions.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                        {n}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
);

// "X - Y (Page N of M)" label + Prev/numbered/Next controls, for below a
// table or card list. Pass `bordered={false}` to drop the top border when
// the container already provides its own separator.
export const PaginationFooter = ({
    currentPage,
    setCurrentPage,
    totalPages,
    startRecord,
    endRecord,
    bordered = true,
}) => (
    <div className={["px-4 py-2 text-xs", bordered ? "border-t border-border" : ""].join(" ")}>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div
                className="text-center sm:text-left text-muted-foreground"
                style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}
            >
                <span className="font-semibold text-foreground">{startRecord}</span> -{" "}
                <span className="font-semibold text-foreground">{endRecord}</span>{" "}
                (Page {currentPage} of {totalPages})
            </div>
            <div className="flex items-center justify-center gap-1">
                <Button
                    variant="terciary"
                    className="h-9 px-3"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                >
                    ← Previous
                </Button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                    const page = idx + 1;
                    const isActive = page === currentPage;
                    return (
                        <Button
                            key={page}
                            variant={isActive ? "terciary" : "paginacionNoActive"}
                            className="h-9 px-3"
                            onClick={() => setCurrentPage(page)}
                        >
                            {page}
                        </Button>
                    );
                })}
                <Button
                    variant="terciary"
                    className="h-9 px-3"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                >
                    Next →
                </Button>
            </div>
        </div>
    </div>
);

// Convenience wrapper bundling both pieces for callers that don't need to
// split page-size selection into a separate toolbar (e.g. the hand-rolled
// tables that had no pagination at all before).
export const PaginationControls = (props) => (
    <div className="mt-auto">
        <div className="flex justify-end px-4 pt-2">
            <PageSizeSelect
                pageSize={props.pageSize}
                setPageSize={props.setPageSize}
                pageSizeOptions={props.pageSizeOptions}
            />
        </div>
        <PaginationFooter {...props} />
    </div>
);
