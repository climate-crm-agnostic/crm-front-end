import React from "react";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
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
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
    brand: { flexDirection: "column" },
    brandName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BRAND_GREEN },
    brandSub: { fontSize: 7, color: GREY, marginTop: 2, letterSpacing: 1.5, textTransform: "uppercase" },
    quoteMeta: { alignItems: "flex-end" },
    quoteTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: BRAND_GREEN },
    quoteNumber: { fontSize: 10, color: GREY, marginTop: 3 },
    statusBadge: { marginTop: 5, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 3 },
    statusText: { fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8 },

    divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 16 },

    infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    infoBlock: { flex: 1 },
    infoLabel: { fontSize: 7, color: GREY, marginBottom: 3, textTransform: "uppercase", letterSpacing: 1 },
    infoValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
    infoValueNormal: { fontSize: 9 },

    tableHeader: {
        flexDirection: "row", backgroundColor: BRAND_GREEN,
        paddingVertical: 5, paddingHorizontal: 6, borderRadius: 2,
    },
    tableRow: {
        flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6,
        borderBottomWidth: 1, borderBottomColor: BORDER,
    },
    tableRowAlt: { backgroundColor: LIGHT_GREY },
    colDesc: { flex: 4 },
    colQty: { flex: 1, textAlign: "center" },
    colPrice: { flex: 1.5, textAlign: "right" },
    colTax: { flex: 1, textAlign: "center" },
    colAmount: { flex: 1.5, textAlign: "right" },
    thText: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 7.5, textTransform: "uppercase", letterSpacing: 0.6 },
    tdText: { fontSize: 8.5 },

    totalsWrapper: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12, marginBottom: 20 },
    totalsTable: { width: 200 },
    totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
    totalsLabel: { fontSize: 8.5, color: GREY },
    totalsValue: { fontSize: 8.5 },
    totalsDivider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 4 },
    totalLabelBold: { fontSize: 10, fontFamily: "Helvetica-Bold" },
    totalValueBold: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BRAND_GREEN },

    notesBox: { backgroundColor: LIGHT_GREY, padding: 8, borderRadius: 3, marginTop: 12 },
    notesText: { fontSize: 8, color: GREY, lineHeight: 1.5 },

    footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 7, color: GREY },
});

const fmt = (value, currency = "USD") => `${currency} ${Number(value || 0).toFixed(2)}`;

const fmtDate = (dateStr) => {
    if (!dateStr) return "—";
    try { return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
    catch { return dateStr; }
};

const capitalize = (str = "") => str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const statusColors = {
    draft: { bg: "#F3F4F6", text: "#374151" },
    sent: { bg: "#DBEAFE", text: "#1E40AF" },
    accepted: { bg: "#DCFCE7", text: "#166534" },
    rejected: { bg: "#FEE2E2", text: "#991B1B" },
    expired: { bg: "#FEE2E2", text: "#991B1B" },
};

export const QuotationPDF = ({ quotation, leadName, lineItems }) => {
    const {
        quotation_number, issue_date, valid_until, currency = "USD",
        notes, discount = "0.00", subtotal = "0.00", tax_amount = "0.00", total = "0.00",
        status = "draft", recipient_name, recipient_email,
    } = quotation;

    const sc = statusColors[status] || statusColors.draft;

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                <View style={styles.header}>
                    <View style={styles.brand}>
                        <Text style={styles.brandName}>Climate by CodeX</Text>
                        <Text style={styles.brandSub}>CRM Platform</Text>
                    </View>
                    <View style={styles.quoteMeta}>
                        <Text style={styles.quoteTitle}>QUOTATION</Text>
                        {quotation_number ? <Text style={styles.quoteNumber}># {quotation_number}</Text> : null}
                        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                            <Text style={[styles.statusText, { color: sc.text }]}>{capitalize(status)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <View style={styles.infoBlock}>
                        <Text style={styles.infoLabel}>Prepared For</Text>
                        <Text style={styles.infoValue}>{recipient_name || "—"}</Text>
                        {recipient_email ? <Text style={styles.infoValueNormal}>{recipient_email}</Text> : null}
                    </View>
                    <View style={[styles.infoBlock, { alignItems: "flex-end" }]}>
                        <Text style={styles.infoLabel}>Opportunity</Text>
                        <Text style={styles.infoValueNormal}>{leadName || "—"}</Text>
                    </View>
                    <View style={[styles.infoBlock, { alignItems: "flex-end" }]}>
                        <Text style={styles.infoLabel}>Issue Date</Text>
                        <Text style={styles.infoValueNormal}>{fmtDate(issue_date)}</Text>
                    </View>
                    <View style={[styles.infoBlock, { alignItems: "flex-end" }]}>
                        <Text style={styles.infoLabel}>Valid Until</Text>
                        <Text style={styles.infoValue}>{fmtDate(valid_until)}</Text>
                    </View>
                </View>

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
                    </View>
                </View>

                {notes && (
                    <View style={styles.notesBox}>
                        <Text style={[styles.infoLabel, { marginBottom: 4 }]}>Notes / Terms</Text>
                        <Text style={styles.notesText}>{notes}</Text>
                    </View>
                )}

                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>Climate by CodeX — climatebycodex.com</Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
};
