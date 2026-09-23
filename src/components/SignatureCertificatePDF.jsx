import React from "react";
import {
    Document,
    Page,
    Text,
    View,
    Image,
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
    header: { marginBottom: 28 },
    brandName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BRAND_GREEN },
    brandSub: { fontSize: 7, color: GREY, marginTop: 2, letterSpacing: 1.5, textTransform: "uppercase" },
    title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 20, marginBottom: 4 },
    subtitle: { fontSize: 9, color: GREY, marginBottom: 20 },
    divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 16 },

    detailsBox: { backgroundColor: LIGHT_GREY, borderRadius: 4, padding: 14, marginBottom: 20 },
    detailRow: { flexDirection: "row", paddingVertical: 3 },
    detailLabel: { width: 130, fontSize: 8, color: GREY, textTransform: "uppercase", letterSpacing: 0.6 },
    detailValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },

    sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: GREY, letterSpacing: 1, marginBottom: 8 },
    signatureBox: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 12, alignItems: "flex-start" },
    signatureImage: { width: 220, height: 80, objectFit: "contain" },

    disclaimer: { fontSize: 7.5, color: GREY, lineHeight: 1.5, marginTop: 24 },

    footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 7, color: GREY },
});

const fmtDateTime = (isoStr) => {
    if (!isoStr) return "—";
    try {
        return new Date(isoStr).toLocaleString("en-US", {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    } catch {
        return isoStr;
    }
};

/**
 * A small standalone certificate proving a specific signer signed a
 * document — used only for the "Upload PDF" flow, where the original PDF is
 * never modified (see CONTRACT_AI_MODULE_PLAN.md decision #8). Generated
 * entirely client-side, same pattern as InvoicePDF.jsx.
 */
export const SignatureCertificatePDF = ({ leadName, signer, signatureDataUrl }) => (
    <Document>
        <Page size="LETTER" style={styles.page}>
            <View style={styles.header}>
                <Text style={styles.brandName}>Climate by Code<Text style={{ color: "#F29B6B" }}>X</Text></Text>
                <Text style={styles.brandSub}>CRM Platform</Text>
            </View>

            <Text style={styles.title}>Signature Certificate</Text>
            <Text style={styles.subtitle}>{leadName}</Text>
            <View style={styles.divider} />

            <View style={styles.detailsBox}>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Signer</Text>
                    <Text style={styles.detailValue}>{signer.signer_name}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Role</Text>
                    <Text style={styles.detailValue}>{signer.role_label}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Signed At</Text>
                    <Text style={styles.detailValue}>{fmtDateTime(signer.signed_at)}</Text>
                </View>
                {signer.signer_ip && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>IP Address</Text>
                        <Text style={styles.detailValue}>{signer.signer_ip}</Text>
                    </View>
                )}
            </View>

            <Text style={styles.sectionTitle}>Signature</Text>
            <View style={styles.signatureBox}>
                {signatureDataUrl && <Image src={signatureDataUrl} style={styles.signatureImage} />}
            </View>

            <Text style={styles.disclaimer}>
                This certificate confirms that the signature above was captured electronically for the
                document identified as "{leadName}". It does not modify or replace the original uploaded
                document — both should be retained together as a matched pair.
            </Text>

            <View style={styles.footer} fixed>
                <Text style={styles.footerText}>Climate by CodeX — climatebycodex.com</Text>
                <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
            </View>
        </Page>
    </Document>
);
