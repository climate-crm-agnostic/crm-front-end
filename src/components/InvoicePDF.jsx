import React from "react";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from "@react-pdf/renderer";

const BRAND_GREEN = "#5E6A43";
const GREY = "#6B7280";
const LIGHT_GREY = "#F3F4F6";
const BORDER = "#E5E7EB";

const styles = StyleSheet.create({
    page: {
        fontFamily: "Helvetica",
        fontSize: 9,
        color: "#111827",
        paddingTop: 36,
        paddingBottom: 48,
        paddingHorizontal: 40,
    },

    // Header
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
    brand: { flexDirection: "column" },
    brandName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BRAND_GREEN },
    brandSub: { fontSize: 7, color: GREY, marginTop: 2, letterSpacing: 1.5, textTransform: "uppercase" },
    invoiceMeta: { alignItems: "flex-end" },
    invoiceTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: BRAND_GREEN },
    invoiceNumber: { fontSize: 10, color: GREY, marginTop: 3 },
    statusBadge: { marginTop: 5, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 3 },
    statusText: { fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8 },

    // Divider
    divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 16 },

    // Bill-to / dates row
    infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    infoBlock: { flex: 1 },
    infoLabel: { fontSize: 7, color: GREY, marginBottom: 3, textTransform: "uppercase", letterSpacing: 1 },
    infoValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
    infoValueNormal: { fontSize: 9 },

    // Line items table
    tableHeader: {
        flexDirection: "row",
        backgroundColor: BRAND_GREEN,
        paddingVertical: 5,
        paddingHorizontal: 6,
        borderRadius: 2,
        marginBottom: 0,
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 5,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    tableRowAlt: { backgroundColor: LIGHT_GREY },
    colDesc: { flex: 4 },
    colQty: { flex: 1, textAlign: "center" },
    colPrice: { flex: 1.5, textAlign: "right" },
    colTax: { flex: 1, textAlign: "center" },
    colAmount: { flex: 1.5, textAlign: "right" },
    thText: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 7.5, textTransform: "uppercase", letterSpacing: 0.6 },
    tdText: { fontSize: 8.5 },

    // Totals
    totalsWrapper: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12, marginBottom: 20 },
    totalsTable: { width: 200 },
    totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
    totalsLabel: { fontSize: 8.5, color: GREY },
    totalsValue: { fontSize: 8.5 },
    totalsDivider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 4 },
    totalLabelBold: { fontSize: 10, fontFamily: "Helvetica-Bold" },
    totalValueBold: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BRAND_GREEN },
    balanceLabelBold: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#DC2626" },
    balanceValueBold: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#DC2626" },

    // Payments
    sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: GREY, letterSpacing: 1, marginBottom: 6, marginTop: 16 },
    payRow: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: BORDER },
    payRowAlt: { backgroundColor: LIGHT_GREY },

    // Notes
    notesBox: { backgroundColor: LIGHT_GREY, padding: 8, borderRadius: 3, marginTop: 12 },
    notesText: { fontSize: 8, color: GREY, lineHeight: 1.5 },

    // Footer
    footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 7, color: GREY },
});

const fmt = (value, currency = "USD") =>
    `${currency} ${Number(value || 0).toFixed(2)}`;

const fmtDate = (dateStr) => {
    if (!dateStr) return "—";
    try { return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
    catch { return dateStr; }
};

const capitalize = (str = "") =>
    str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const statusColors = {
    paid: { bg: "#DCFCE7", text: "#166534" },
    sent: { bg: "#DBEAFE", text: "#1E40AF" },
    overdue: { bg: "#FEE2E2", text: "#991B1B" },
    draft: { bg: "#F3F4F6", text: "#374151" },
    void: { bg: "#FEE2E2", text: "#991B1B" },
};

export const InvoicePDF = ({ invoice, client, contact, lineItems, payments }) => {
    const {
        invoice_number, issue_date, due_date, currency = "USD",
        notes, discount = "0.00", subtotal = "0.00",
        tax_amount = "0.00", total = "0.00",
        amount_paid = "0.00", balance_due = "0.00",
        status = "draft",
    } = invoice;

    const sc = statusColors[status] || statusColors.draft;
    const clientName = client?.name || "—";
    const contactName = contact ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() : null;

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.brand}>
                        <Text style={styles.brandName}>Climate by CodeX</Text>
                        <Text style={styles.brandSub}>CRM Platform</Text>
                    </View>
                    <View style={styles.invoiceMeta}>
                        <Text style={styles.invoiceTitle}>INVOICE</Text>
                        {invoice_number ? <Text style={styles.invoiceNumber}># {invoice_number}</Text> : null}
                        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                            <Text style={[styles.statusText, { color: sc.text }]}>{capitalize(status)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Bill-to + Dates */}
                <View style={styles.infoRow}>
                    <View style={styles.infoBlock}>
                        <Text style={styles.infoLabel}>Bill To</Text>
                        <Text style={styles.infoValue}>{clientName}</Text>
                        {contactName ? <Text style={styles.infoValueNormal}>{contactName}</Text> : null}
                    </View>
                    <View style={[styles.infoBlock, { alignItems: "flex-end" }]}>
                        <Text style={styles.infoLabel}>Issue Date</Text>
                        <Text style={styles.infoValueNormal}>{fmtDate(issue_date)}</Text>
                    </View>
                    <View style={[styles.infoBlock, { alignItems: "flex-end" }]}>
                        <Text style={styles.infoLabel}>Due Date</Text>
                        <Text style={styles.infoValue}>{fmtDate(due_date)}</Text>
                    </View>
                    <View style={[styles.infoBlock, { alignItems: "flex-end" }]}>
                        <Text style={styles.infoLabel}>Currency</Text>
                        <Text style={styles.infoValueNormal}>{currency}</Text>
                    </View>
                </View>

                {/* Line Items Table */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.thText, styles.colDesc]}>Description</Text>
                    <Text style={[styles.thText, styles.colQty]}>Qty</Text>
                    <Text style={[styles.thText, styles.colPrice]}>Unit Price</Text>
                    <Text style={[styles.thText, styles.colTax]}>Tax %</Text>
                    <Text style={[styles.thText, styles.colAmount]}>Amount</Text>
                </View>
                {lineItems.length > 0 ? lineItems.map((item, i) => (
                    <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
                        <Text style={[styles.tdText, styles.colDesc]}>{item.description || "—"}</Text>
                        <Text style={[styles.tdText, styles.colQty]}>{Number(item.quantity).toFixed(2)}</Text>
                        <Text style={[styles.tdText, styles.colPrice]}>{fmt(item.unit_price, currency)}</Text>
                        <Text style={[styles.tdText, styles.colTax]}>{Number(item.tax_rate).toFixed(2)}%</Text>
                        <Text style={[styles.tdText, styles.colAmount]}>{fmt(item.subtotal, currency)}</Text>
                    </View>
                )) : (
                    <View style={styles.tableRow}>
                        <Text style={[styles.tdText, { color: GREY }]}>No line items.</Text>
                    </View>
                )}

                {/* Totals */}
                <View style={styles.totalsWrapper}>
                    <View style={styles.totalsTable}>
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>Subtotal</Text>
                            <Text style={styles.totalsValue}>{fmt(subtotal, currency)}</Text>
                        </View>
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>Tax</Text>
                            <Text style={styles.totalsValue}>{fmt(tax_amount, currency)}</Text>
                        </View>
                        {Number(discount) > 0 && (
                            <View style={styles.totalsRow}>
                                <Text style={styles.totalsLabel}>Discount</Text>
                                <Text style={styles.totalsValue}>- {fmt(discount, currency)}</Text>
                            </View>
                        )}
                        <View style={styles.totalsDivider} />
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalLabelBold}>Total</Text>
                            <Text style={styles.totalValueBold}>{fmt(total, currency)}</Text>
                        </View>
                        {Number(amount_paid) > 0 && (
                            <>
                                <View style={styles.totalsRow}>
                                    <Text style={[styles.totalsLabel, { color: "#166534" }]}>Amount Paid</Text>
                                    <Text style={[styles.totalsValue, { color: "#166534" }]}>- {fmt(amount_paid, currency)}</Text>
                                </View>
                                <View style={styles.totalsDivider} />
                                <View style={styles.totalsRow}>
                                    <Text style={styles.balanceLabelBold}>Balance Due</Text>
                                    <Text style={styles.balanceValueBold}>{fmt(balance_due, currency)}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Payments */}
                {payments.length > 0 && (
                    <View>
                        <Text style={styles.sectionTitle}>Payments Received</Text>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.thText, { flex: 2 }]}>Date</Text>
                            <Text style={[styles.thText, { flex: 2 }]}>Method</Text>
                            <Text style={[styles.thText, { flex: 3 }]}>Reference</Text>
                            <Text style={[styles.thText, { flex: 2, textAlign: "right" }]}>Amount</Text>
                        </View>
                        {payments.map((p, i) => (
                            <View key={i} style={[styles.payRow, i % 2 !== 0 ? styles.payRowAlt : {}]}>
                                <Text style={[styles.tdText, { flex: 2 }]}>{fmtDate(p.paid_at)}</Text>
                                <Text style={[styles.tdText, { flex: 2 }]}>{capitalize(p.method)}</Text>
                                <Text style={[styles.tdText, { flex: 3 }]}>{p.reference || "—"}</Text>
                                <Text style={[styles.tdText, { flex: 2, textAlign: "right" }]}>{fmt(p.amount, currency)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Notes */}
                {notes && (
                    <View style={styles.notesBox}>
                        <Text style={[styles.infoLabel, { marginBottom: 4 }]}>Notes / Terms</Text>
                        <Text style={styles.notesText}>{notes}</Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>Climate by CodeX — climatebycodex.com</Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
};
