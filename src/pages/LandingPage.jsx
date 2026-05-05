import React, { useState, useEffect } from "react";
import { getPublicPipelines, getPublicPipelineAttributes, createPublicLead } from "../services/publicService";
import { 
    Send, CheckCircle2, ChevronRight, Sparkles, 
    MessageSquare, User, Mail, Building2, Smartphone 
} from "lucide-react";
import Swal from "sweetalert2";

const FONT = '"Source Sans 3", Arial, sans-serif';
const OLIVE = "#5E6A43";
const LINEN = "#FBF7EF";
const PEBBLE = "#D8D2C4";
const INK = "#2E2A26";
const CITRON = "#B8C76A";
const APRICOT = "#F29B6B";
const CODEX_PRIMARY = "#4F8071";

export const LandingPage = () => {
    const [pipelines, setPipelines] = useState([]);
    const [selectedPipelineId, setSelectedPipelineId] = useState("");
    const [attributes, setAttributes] = useState([]);
    const [formData, setFormData] = useState({});
    const [clientData, setClientData] = useState({ name: "", email: "", phone: "" });
    const [loading, setLoading] = useState(false);
    const [fetchingAttrs, setFetchingAttrs] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const fetchPipes = async () => {
            try {
                const data = await getPublicPipelines();
                // Filter to show only specific Pipeline IDs (Chett AI and Climate CRM)
                const allowedIds = [
                    "fb4afe4c-6d48-4f15-9f71-6a25f3292bf8", 
                    "865191bf-2e53-464d-af34-ad2e2dd42377"
                ];
                const filtered = data.filter(p => allowedIds.includes(p.id));
                setPipelines(filtered);
            } catch (err) {
                console.error("Error fetching pipelines", err);
            }
        };
        fetchPipes();
    }, []);

    useEffect(() => {
        if (!selectedPipelineId) {
            setAttributes([]);
            return;
        }
        const fetchAttrs = async () => {
            setFetchingAttrs(true);
            try {
                const data = await getPublicPipelineAttributes(selectedPipelineId);
                setAttributes(data);
                // Initialize form data with empty values for new attributes
                const initialData = {};
                data.forEach(attr => {
                    initialData[attr.name] = attr.type === "boolean" ? false : "";
                });
                setFormData(initialData);
            } catch (err) {
                console.error("Error fetching attributes", err);
            } finally {
                setFetchingAttrs(false);
            }
        };
        fetchAttrs();
    }, [selectedPipelineId]);

    const handleInputChange = (e, isClient = false) => {
        const { name, value, type, checked } = e.target;
        const val = type === "checkbox" ? checked : value;
        
        if (isClient) {
            setClientData(prev => ({ ...prev, [name]: val }));
        } else {
            setFormData(prev => ({ ...prev, [name]: val }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Try to find a logical name for the lead from the dynamic fields
            // We look for fields like 'first_name', 'name', 'full_name', etc.
            const nameFields = ["name", "full_name", "first_name", "nombre"];
            const foundNameKey = attributes.find(a => nameFields.includes(a.name.toLowerCase()))?.name;
            const lastNameKey = attributes.find(a => ["last_name", "apellido"].includes(a.name.toLowerCase()))?.name;
            
            let leadName = "";
            if (foundNameKey && formData[foundNameKey]) {
                leadName = formData[foundNameKey];
                if (lastNameKey && formData[lastNameKey]) {
                    leadName += ` ${formData[lastNameKey]}`;
                }
            } else {
                leadName = `Web Inquiry - ${new Date().toLocaleDateString()}`;
            }

            const payload = {
                name: leadName,
                pipeline: selectedPipelineId,
                client_attributes: {
                    ...formData
                },
                attributes: {
                    ...formData
                }
            };

            await createPublicLead(payload);
            setSubmitted(true);
            Swal.fire({
                icon: "success",
                title: "Thank You!",
                text: "Your inquiry has been received. Our team will contact you soon.",
                confirmButtonColor: CODEX_PRIMARY
            });
        } catch (err) {
            console.error("Submit error", err);
            let msg = "Failed to send inquiry. Please try again.";
            try {
                const parsed = JSON.parse(err.message);
                msg = Object.values(parsed).flat().join(", ");
            } catch { /* use default */ }
            
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: msg
            });
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: LINEN, fontFamily: FONT }}>
                <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="flex justify-center">
                        <div className="h-24 w-24 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(79,128,113,0.1)" }}>
                            <CheckCircle2 className="h-12 w-12" style={{ color: CODEX_PRIMARY }} />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight" style={{ color: INK }}>Success!</h1>
                    <p className="text-muted-foreground" style={{ color: "#6b6560" }}>
                        We've received your information. A representative will reach out to you shortly.
                    </p>
                    
                    <div className="pt-4 flex flex-col gap-3">
                        <a 
                            href="https://calendly.com/climate-codex/30min"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            style={{ backgroundColor: APRICOT, color: LINEN }}
                        >
                            Schedule a Meeting
                        </a>
                        <button 
                            onClick={() => window.location.reload()}
                            className="w-full py-3 rounded-xl font-bold transition-all opacity-60 hover:opacity-100"
                            style={{ border: `1px solid ${PEBBLE}`, color: INK }}
                        >
                            Send Another Inquiry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: LINEN, fontFamily: FONT }}>
            {/* Left Side: Hero Section - Hidden on mobile */}
            <div className="hidden md:flex md:w-1/2 p-12 md:p-24 flex-col justify-center border-r" 
                 style={{ 
                    borderColor: PEBBLE,
                    background: `linear-gradient(135deg, #FFFFFF 0%, ${LINEN} 100%)`
                 }}>
                <div className="space-y-8 max-w-lg">
                    <h1 className="text-5xl md:text-6xl font-black leading-[1.1] tracking-tight" style={{ color: INK }}>
                        Empower Your <span style={{ color: CODEX_PRIMARY }}>Sales</span> Workflow.
                    </h1>
                    <p className="text-lg leading-relaxed opacity-70" style={{ color: "#2E2A26" }}>
                        Experience the next generation of CRM. Personalizable pipelines, 
                        dynamic attributes, and seamless automation tailored for your specific needs.
                    </p>
                    
                    <div className="space-y-4 pt-4">
                        {[
                            "Intelligent Pipeline Management",
                            "Dynamic Attribute Configuration",
                            "Secure Data Governance",
                            "Real-time Lead Tracking"
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(184,199,106,0.2)" }}>
                                    <ChevronRight size={12} style={{ color: CITRON }} />
                                </div>
                                <span className="text-sm font-bold" style={{ color: "#2E2A26" }}>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side: Form Section */}
            <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col items-center justify-center overflow-y-auto">
                {/* Mobile Title - only visible on small screens */}
                <div className="md:hidden w-full max-w-md mb-8 text-center">
                    <h1 className="text-3xl font-black tracking-tight" style={{ color: CODEX_PRIMARY }}>CodeX <span style={{ color: INK }}>Technologies</span></h1>
                    <div className="h-1 w-12 mx-auto mt-2 rounded-full" style={{ backgroundColor: CITRON }}></div>
                </div>

                <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl border" style={{ borderColor: PEBBLE }}>
                    <div className="mb-8">
                        <h2 className="text-2xl font-black tracking-tight mb-2" style={{ color: INK }}>Get Started Today</h2>
                        <p className="text-sm opacity-60">Fill out the form below and we'll handle the rest.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Pipeline Selector */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6b6560" }}>
                                What are you interested in? *
                            </label>
                            <div className="relative">
                                <select 
                                    required
                                    value={selectedPipelineId}
                                    onChange={(e) => setSelectedPipelineId(e.target.value)}
                                    className="w-full h-12 pl-10 pr-4 rounded-xl border appearance-none focus:outline-none transition-all shadow-sm"
                                    style={{ borderColor: PEBBLE, backgroundColor: "#F9F8F6", color: INK }}
                                    onFocus={e => e.target.style.borderColor = CODEX_PRIMARY}
                                    onBlur={e => e.target.style.borderColor = PEBBLE}
                                >
                                    <option value="">Select an option</option>
                                    {pipelines.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                            </div>
                        </div>

                        {/* Dynamic Attributes */}
                        {fetchingAttrs ? (
                            <div className="py-4 flex items-center justify-center gap-2 text-xs font-bold" style={{ color: CODEX_PRIMARY }}>
                                <div className="h-4 w-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${CODEX_PRIMARY} transparent ${CODEX_PRIMARY} ${CODEX_PRIMARY}` }} />
                                Loading form fields...
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                {attributes.length === 0 && selectedPipelineId ? (
                                     <div className="p-6 text-center border-2 border-dashed rounded-2xl" style={{ borderColor: PEBBLE }}>
                                        <p className="text-xs font-bold opacity-40">No additional fields required for this selection.</p>
                                     </div>
                                ) : (
                                    attributes.map(attr => (
                                        <div key={attr.id} className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6b6560" }}>
                                                {attr.label} {attr.is_required ? "*" : ""}
                                            </label>
                                            
                                            {attr.type === "list" ? (
                                                <select 
                                                    required={attr.is_required}
                                                    name={attr.name}
                                                    value={formData[attr.name] || ""}
                                                    onChange={handleInputChange}
                                                    className="w-full h-12 px-4 rounded-xl border focus:outline-none transition-all"
                                                    style={{ borderColor: PEBBLE, backgroundColor: "#F9F8F6", color: INK }}
                                                    onFocus={e => e.target.style.borderColor = CODEX_PRIMARY}
                                                    onBlur={e => e.target.style.borderColor = PEBBLE}
                                                >
                                                    <option value="">Select {attr.label}</option>
                                                    {attr.list_values.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : attr.type === "textarea" ? (
                                                <textarea 
                                                    required={attr.is_required}
                                                    name={attr.name}
                                                    value={formData[attr.name] || ""}
                                                    onChange={handleInputChange}
                                                    placeholder={`Enter ${attr.label}`}
                                                    className="w-full p-4 rounded-xl border focus:outline-none transition-all min-h-[100px]"
                                                    style={{ borderColor: PEBBLE, backgroundColor: "#F9F8F6", color: INK }}
                                                    onFocus={e => e.target.style.borderColor = CODEX_PRIMARY}
                                                    onBlur={e => e.target.style.borderColor = PEBBLE}
                                                />
                                            ) : attr.type === "boolean" ? (
                                                <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: PEBBLE, backgroundColor: "#F9F8F6" }}>
                                                    <input 
                                                        type="checkbox"
                                                        name={attr.name}
                                                        checked={formData[attr.name] || false}
                                                        onChange={handleInputChange}
                                                        className="w-5 h-5 accent-citron cursor-pointer"
                                                    />
                                                    <span className="text-sm font-medium">{attr.label}</span>
                                                </div>
                                            ) : (
                                                <input 
                                                    type={attr.type === "number" ? "number" : attr.type === "date" ? "date" : "text"}
                                                    required={attr.is_required}
                                                    name={attr.name}
                                                    value={formData[attr.name] || ""}
                                                    onChange={handleInputChange}
                                                    placeholder={`Enter ${attr.label}`}
                                                    className="w-full h-12 px-4 rounded-xl border focus:outline-none transition-all"
                                                    style={{ borderColor: PEBBLE, backgroundColor: "#F9F8F6", color: INK }}
                                                    onFocus={e => e.target.style.borderColor = CODEX_PRIMARY}
                                                    onBlur={e => e.target.style.borderColor = PEBBLE}
                                                />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={loading || !selectedPipelineId}
                            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] mt-4"
                            style={{ 
                                backgroundColor: loading || !selectedPipelineId ? PEBBLE : CODEX_PRIMARY, 
                                color: LINEN,
                                cursor: loading || !selectedPipelineId ? "not-allowed" : "pointer"
                            }}
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${LINEN} transparent ${LINEN} ${LINEN}` }} />
                            ) : (
                                <>
                                    <Send size={18} /> Send Inquiry
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
