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
    header: { marginBottom: 24 },
    brandName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BRAND_GREEN },
    brandSub: { fontSize: 7, color: GREY, marginTop: 2, letterSpacing: 1.5, textTransform: "uppercase" },
    title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 20, marginBottom: 20 },
    divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 16 },

    sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 4, color: BRAND_GREEN },
    sectionBody: { fontSize: 9, lineHeight: 1.5, marginBottom: 14 },

    signaturesTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: GREY, letterSpacing: 1, marginTop: 16, marginBottom: 10 },
    signerBox: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 10, marginBottom: 10, backgroundColor: LIGHT_GREY },
    signerName: { fontSize: 9, fontFamily: "Helvetica-Bold" },
    signerRole: { fontSize: 8, color: GREY, marginBottom: 6 },
    signatureImage: { width: 160, height: 60, objectFit: "contain" },
    signedAt: { fontSize: 7, color: GREY, marginTop: 4 },
    pendingText: { fontSize: 8, color: GREY, fontStyle: "italic" },

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
 * Client-side PDF for a Contract built from an approved ContractTemplate
 * (source='template_ai') — same @react-pdf/renderer pattern as InvoicePDF.jsx.
 * Uploaded-PDF contracts (source='uploaded') keep using the original file +
 * SignatureCertificatePDF.jsx instead of this component.
 */
export const ContractPDF = ({ leadName, sections = [], signers = [] }) => (
    <Document>
        <Page size="LETTER" style={styles.page}>
            <View style={styles.header}>
                <Text style={styles.brandName}>Climate by Code<Text style={{ color: "#F29B6B" }}>X</Text></Text>
                <Text style={styles.brandSub}>CRM Platform</Text>
            </View>

            <Text style={styles.title}>{leadName}</Text>
            <View style={styles.divider} />

            {sections.map((section, i) => (
                <View key={i} wrap={false}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <Text style={styles.sectionBody}>{section.body}</Text>
                </View>
            ))}

            {signers.length > 0 && (
                <View>
                    <Text style={styles.signaturesTitle}>Signatures</Text>
                    {signers.map((signer) => (
                        <View key={signer.id} style={styles.signerBox} wrap={false}>
                            <Text style={styles.signerName}>{signer.signer_name}</Text>
                            <Text style={styles.signerRole}>{signer.role_label}</Text>
                            {signer.signature_image_url ? (
                                <>
                                    <Image src={signer.signature_image_url} style={styles.signatureImage} />
                                    <Text style={styles.signedAt}>Signed {fmtDateTime(signer.signed_at)}</Text>
                                </>
                            ) : (
                                <Text style={styles.pendingText}>Pending signature</Text>
                            )}
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.footer} fixed>
                <Text style={styles.footerText}>Climate by CodeX — climatebycodex.com</Text>
                <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
            </View>
        </Page>
    </Document>
);
