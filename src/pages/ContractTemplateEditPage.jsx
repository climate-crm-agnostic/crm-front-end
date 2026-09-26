import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "../components/ui/button";
import { ContractTemplateEditor } from "../components/ContractTemplateEditor";

/**
 * Full-page template editor — used both right after "Upload PDF" (reviewing
 * the detected fields before approving) and for the "Edit" button on an
 * existing template. Deliberately NOT a modal: a Dialog can be dismissed by
 * Escape or a backdrop click, silently discarding whatever was typed in the
 * rich text editor. Same pattern as ContractAIChat's "edit" step.
 */
export const ContractTemplateEditPage = () => {
    const { pipelineId, templateId } = useParams();
    const navigate = useNavigate();
    const backTo = `/pipeline/${pipelineId}/contracts`;

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => navigate(backTo)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to templates
                </Button>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                    <Pencil className="h-5 w-5" /> Edit Template
                </h1>
            </div>

            <div className="bg-card border rounded-lg p-4">
                <ContractTemplateEditor
                    templateId={templateId}
                    // Saving an already-approved template forks a new version
                    // server-side (different id) — keep the URL pointing at
                    // whichever row is now the editable one, so a refresh (or
                    // sharing the link) doesn't land back on the frozen,
                    // pre-fork version.
                    onSaved={(saved) => {
                        if (saved?.id && saved.id !== templateId) {
                            navigate(`/pipeline/${pipelineId}/contracts/${saved.id}/edit`, { replace: true });
                        }
                    }}
                    onApproved={() => navigate(backTo)}
                    onVersionSelect={(id) => navigate(`/pipeline/${pipelineId}/contracts/${id}/edit`)}
                    onDeleted={() => navigate(backTo)}
                    showCancel={false}
                />
            </div>
        </div>
    );
};
