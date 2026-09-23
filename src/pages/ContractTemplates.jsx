import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FileSignature, Trash2, Edit, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ContractTemplateEditor } from "../components/ContractTemplateEditor";
import {
    getContractTemplates, deleteContractTemplate, approveContractTemplate,
} from "../services/contractTemplateService";
import Swal from 'sweetalert2';

export const ContractTemplates = () => {
    const location = useLocation();

    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [approvingId, setApprovingId] = useState(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    // Deep-link from ContractAIChat.jsx: after the AI finishes a draft, the
    // "Review Draft" button lands here with the new template's id so the
    // user falls straight into editing it instead of hunting for it below.
    useEffect(() => {
        const editId = location.state?.editId;
        if (!editId) return;
        setEditingId(editId);
    }, [location.state]);

    const loadTemplates = async () => {
        try {
            const data = await getContractTemplates();
            setTemplates(Array.isArray(data) ? data : []);
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load contract templates', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (t) => setEditingId(t.id);
    const handleCancel = () => setEditingId(null);

    const handleSaved = () => {
        if (!editingId) handleCancel(); // creating from scratch collapses back to a blank form, same as before
        loadTemplates();
    };

    const handleApprovedInEditor = () => loadTemplates();

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?', icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#5E6A43', cancelButtonColor: '#9b948e', confirmButtonText: 'Yes, delete it!'
        });
        if (!result.isConfirmed) return;
        try {
            await deleteContractTemplate(id);
            loadTemplates();
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete template — it may still be used by a contract.', toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        }
    };

    const handleApprove = async (id) => {
        setApprovingId(id);
        try {
            await approveContractTemplate(id);
            loadTemplates();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setApprovingId(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading contract templates...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border">
                    <FileSignature className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="text-base font-semibold">Contract Templates</p>
                    <p className="text-sm text-muted-foreground">
                        Reusable contract sections with merge fields. New templates start as a draft — approve them before they're selectable on a Lead.
                    </p>
                </div>
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">{editingId ? "Edit Template" : "New Template"}</h3>
                <ContractTemplateEditor
                    key={editingId || 'new'}
                    templateId={editingId}
                    onSaved={handleSaved}
                    onApproved={handleApprovedInEditor}
                    onCancel={editingId ? handleCancel : undefined}
                />
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-2">
                <h3 className="font-medium text-lg border-b pb-2">All Templates</h3>
                {templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No contract templates yet.</p>
                ) : (
                    templates.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-md">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium truncate">{t.name}</span>
                                <Badge variant={t.is_active ? "success" : "secondary"}>
                                    {t.is_active ? "Approved" : "Draft"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{(t.content || []).length} section(s)</span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                {!t.is_active && (
                                    <Button
                                        variant="ghost" size="sm"
                                        onClick={() => handleApprove(t.id)}
                                        disabled={approvingId === t.id}
                                        className="text-green-700 hover:text-green-800"
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                        {approvingId === t.id ? "Approving..." : "Approve"}
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(t)} className="h-8 w-8 p-0">
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
