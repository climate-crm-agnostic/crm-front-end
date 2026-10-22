import { useMemo } from "react";
import { itemKind } from "./catalogueKinds";

const WORD = { product: "products", service: "services" };

/**
 * A quotation or invoice sells one kind of thing, like the lead it comes from. The kind is the
 * lead's when it has one, otherwise whatever the document's catalogue lines already are.
 * `lockedKind` is null while the document is still free to be either.
 */
export function useDocumentKind({ lineItems, catalogueItems, leadSells }) {
    return useMemo(() => {
        if (leadSells === "product" || leadSells === "service") {
            return { lockedKind: leadSells, lockNote: `Inherited from the lead: it sells ${WORD[leadSells]}.` };
        }
        const kinds = new Set(
            (lineItems || [])
                .map((line) => (catalogueItems || []).find((c) => String(c.id) === String(line.catalogue_item)))
                .filter(Boolean)
                .map(itemKind),
        );
        if (kinds.size === 1) {
            const [kind] = kinds;
            return { lockedKind: kind, lockNote: `This document sells ${WORD[kind]}; make another one for the rest.` };
        }
        return { lockedKind: null, lockNote: "" };
    }, [lineItems, catalogueItems, leadSells]);
}
