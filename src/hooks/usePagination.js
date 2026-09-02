import { useEffect, useMemo, useState } from "react";

// Client-side pagination over an already-loaded array. Resets to page 1
// whenever the item count changes (search/filter/tab switch), so callers
// don't need to wire that up themselves.
export function usePagination(items, { pageSizeOptions = [10, 20, 50] } = {}) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSizeState] = useState(pageSizeOptions[0] || 10);

    useEffect(() => {
        setCurrentPage(1);
    }, [items.length]);

    const totalRecords = items.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const page = Math.min(currentPage, totalPages);

    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, page, pageSize]);

    const setPageSize = (size) => {
        setPageSizeState(size);
        setCurrentPage(1);
    };

    return {
        pageItems,
        currentPage: page,
        setCurrentPage,
        pageSize,
        setPageSize,
        pageSizeOptions,
        totalPages,
        totalRecords,
        startRecord: totalRecords ? (page - 1) * pageSize + 1 : 0,
        endRecord: totalRecords ? Math.min(page * pageSize, totalRecords) : 0,
    };
}
