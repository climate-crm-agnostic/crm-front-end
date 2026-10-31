import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Presentation, Plus, Download, MessageSquare } from "lucide-react";
import { Button } from "./ui/button";
import { listMeetingDocumentsForLead, listMeetingDocumentConversations } from "../services/meetingDocumentService";

const FORMAT_ICON = { docx: FileText, pptx: Presentation };
const FORMAT_LABEL = { docx: "Word", pptx: "PowerPoint" };

/**
 * Embedded in the Lead's "Meeting Documents" tab — lists the AI-generated
 * meeting agendas for this Lead and lets the user download them, resume a
 * past chat, or start a new one. Much simpler than LeadContractPanel: no
 * stage-gating, no templates, no signers — every document here is already
 * final.
 */
export const LeadMeetingDocumentPanel = ({ leadId }) => {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadDocuments = async () => {
        try {
            const [docsData, convsData] = await Promise.all([
                listMeetingDocumentsForLead(leadId),
                listMeetingDocumentConversations(leadId),
            ]);
            // The documents endpoint is paginated like the rest of the CRM
            // (DRF PageNumberPagination, PAGE_SIZE=250) — the response is
            // {count, next, previous, results}, not a bare array. Same
            // fallback as LeadContractPanel.jsx::loadContracts. The
            // conversations endpoint is a plain APIView, already a bare array.
            setDocuments(Array.isArray(docsData) ? docsData : (docsData.results || []));
            setConversations(Array.isArray(convsData) ? convsData : []);
        } catch {
            // non-fatal — the panel just stays empty
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDocuments();
    }, [leadId]);

    return (
        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-medium text-lg">Meeting Documents</h3>
                <Button size="sm" onClick={() => navigate(`/lead/${leadId}/meeting-documents/ai`)}>
                    <Plus className="h-4 w-4 mr-1" /> New Meeting Document
                </Button>
            </div>

            {loading ? (
                <p className="text-sm text-muted-foreground italic">Loading…</p>
            ) : documents.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No meeting documents yet.</p>
            ) : (
                <div className="space-y-2">
                    {documents.map((doc) => {
                        const Icon = FORMAT_ICON[doc.format] || FileText;
                        return (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-3 bg-muted/20 border rounded-md"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{doc.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {FORMAT_LABEL[doc.format] || doc.format} · {new Date(doc.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                {doc.generated_file_url && (
                                    <Button size="sm" variant="outline" asChild>
                                        <a href={doc.generated_file_url} target="_blank" rel="noreferrer">
                                            <Download className="h-4 w-4 mr-1" /> Download
                                        </a>
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex items-center justify-between border-b pb-2 pt-2">
                <h4 className="font-medium text-sm flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" /> Conversations
                </h4>
            </div>

            {!loading && (
                conversations.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No conversations yet.</p>
                ) : (
                    <div className="space-y-2">
                        {conversations.map((conv) => (
                            <button
                                key={conv.id}
                                type="button"
                                onClick={() => navigate(
                                    conv.meeting_document_id
                                        ? `/lead/${leadId}/meeting-documents/ai?conversation=${conv.id}&document=${conv.meeting_document_id}`
                                        : `/lead/${leadId}/meeting-documents/ai?conversation=${conv.id}`
                                )}
                                className="w-full flex items-center justify-between p-3 bg-muted/20 border rounded-md text-left hover:border-primary transition-colors"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{conv.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {FORMAT_LABEL[conv.output_format] || conv.output_format}
                                        {" · "}
                                        {conv.meeting_document_title
                                            ? `→ ${conv.meeting_document_title}`
                                            : "Draft — no document yet"}
                                        {" · "}
                                        {new Date(conv.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )
            )}
        </div>
    );
};
