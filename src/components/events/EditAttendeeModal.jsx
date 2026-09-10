import { useState } from "react";
import { PhoneInput } from "@/components/ui/phone-input";

const GREEN = "#5E6A43";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Edits an attendee's basic contact fields only: first/last name, email,
 * phone and company. No invitation is re-sent on save — that's a separate,
 * explicit action from the row menu.
 */
export const EditAttendeeModal = ({ attendee, onClose, onSave }) => {
    const [form, setForm] = useState({
        first_name: attendee.first_name || "",
        last_name: attendee.last_name || "",
        email: attendee.email || "",
        phone: attendee.phone || "",
        company: attendee.company || "",
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

    const validate = () => {
        const errs = {};
        if (!form.first_name.trim()) errs.first_name = "First name is required.";
        if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) errs.email = "Enter a valid email address.";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const submit = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            await onSave({
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                email: form.email.trim(),
                phone: form.phone || "",
                company: form.company.trim(),
            });
        } catch (e) {
            setErrors({ _global: e.message || "Could not update attendee." });
        } finally {
            setSaving(false);
        }
    };

    const inputCls = "w-full h-10 px-3 rounded-lg text-sm";
    const inputStyle = { border: "1px solid #D8D2C4", backgroundColor: "#FFFFFF", color: "#2E2A26" };
    const labelStyle = { color: "#2E2A26", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
            <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ backgroundColor: "#FBF7EF", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                <h2 className="text-lg font-semibold" style={{ color: "#2E2A26" }}>Edit attendee</h2>

                {errors._global && (
                    <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "#FBEEE9", border: "1px solid #E4B9A8", color: "#8a3f1e" }}>
                        {errors._global}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label style={labelStyle}>First name *</label>
                        <input className={inputCls} style={{ ...inputStyle, borderColor: errors.first_name ? "#c0392b" : "#D8D2C4" }} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
                        {errors.first_name && <p className="text-xs mt-1" style={{ color: "#c0392b" }}>{errors.first_name}</p>}
                    </div>
                    <div>
                        <label style={labelStyle}>Last name</label>
                        <input className={inputCls} style={inputStyle} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                        <label style={labelStyle}>Email</label>
                        <input type="email" className={inputCls} style={{ ...inputStyle, borderColor: errors.email ? "#c0392b" : "#D8D2C4" }} value={form.email} onChange={(e) => set("email", e.target.value)} />
                        {errors.email && <p className="text-xs mt-1" style={{ color: "#c0392b" }}>{errors.email}</p>}
                    </div>
                    <div className="sm:col-span-2">
                        <label style={labelStyle}>Company</label>
                        <input className={inputCls} style={inputStyle} value={form.company} onChange={(e) => set("company", e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                        <label style={labelStyle}>Phone</label>
                        <PhoneInput value={form.phone} onChange={(v) => set("phone", v)} defaultCountry="US" placeholder="Phone number" />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg text-sm font-semibold cursor-pointer" style={{ border: "1px solid #D8D2C4", color: "#6b6560", backgroundColor: "#FFFFFF" }}>Cancel</button>
                    <button type="button" onClick={submit} disabled={saving} className="h-10 px-5 rounded-lg text-sm font-semibold cursor-pointer" style={{ backgroundColor: GREEN, color: "#FBF7EF", opacity: saving ? 0.7 : 1 }}>
                        {saving ? "Saving…" : "Save changes"}
                    </button>
                </div>
            </div>
        </div>
    );
};
