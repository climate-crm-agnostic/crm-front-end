import { SellsBadge } from "./SellsBadge";
import { formatMoney } from "@/lib/utils";

const Row = ({ label, children }) => (
    <div className="flex items-start justify-between gap-3 py-2.5">
        <dt className="text-[13px] text-muted-foreground">{label}</dt>
        <dd className="min-w-0 text-right text-sm font-medium">{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
);

/** The deal at a glance, next to every tab: what it is worth, what it sells, and who it is with. */
export const LeadSummaryCard = ({ value, stage, sells, client, responsible, pipeline, createdAt }) => (
    <section className="rounded-xl border bg-card p-5 shadow-sm" aria-label="Deal summary">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Deal value</p>
        <p className="mt-1 font-heading text-3xl font-bold tabular-nums">{formatMoney(value)}</p>
        <dl className="mt-3 divide-y border-t">
            <Row label="Stage">{stage}</Row>
            <Row label="Sells">{sells ? <SellsBadge sells={sells} /> : null}</Row>
            <Row label="Client">{client}</Row>
            <Row label="Responsible">{responsible}</Row>
            <Row label="Pipeline">{pipeline}</Row>
            <Row label="Created">{createdAt}</Row>
        </dl>
    </section>
);
