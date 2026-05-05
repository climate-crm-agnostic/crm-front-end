import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { submitSurvey } from "../services/surveyService";

const FONT = '"Source Sans 3", Arial, sans-serif';
const INK = "#2E2A26";
const MUTED = "#6b6560";
const HINT = "#9b948e";
const LINEN = "#FBF7EF";
const OAT = "#F2EBDD";
const PEBBLE = "#D8D2C4";
const OLIVE = "#5E6A43";
const APRICOT = "#F29B6B";

const inputStyle = {
    width: "100%", padding: "10px 14px", border: `1px solid ${PEBBLE}`,
    borderRadius: "6px", backgroundColor: "#fff", color: INK,
    fontFamily: FONT, fontSize: "16px", outline: "none", boxSizing: "border-box",
};

const labelStyle = { display: "block", marginBottom: "6px", fontSize: "16px", fontWeight: 600, color: INK, fontFamily: FONT };
const hintStyle = { fontSize: "14px", color: HINT, fontFamily: FONT, marginTop: "2px" };

function Field({ label, hint, children }) {
    return (
        <div style={{ marginBottom: "18px" }}>
            {label && <p style={labelStyle}>{label}</p>}
            {hint && <p style={hintStyle}>{hint}</p>}
            {children}
        </div>
    );
}

function RadioGroup({ name, options, value, onChange, allowOther }) {
    const [otherText, setOtherText] = useState("");
    const handleChange = (val) => {
        onChange(val);
        if (val !== "other") setOtherText("");
    };
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {options.map(opt => (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontFamily: FONT, fontSize: "16px", color: INK }}>
                    <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={() => handleChange(opt.value)}
                        style={{ accentColor: OLIVE, width: "16px", height: "16px" }} />
                    {opt.label}
                </label>
            ))}
            {allowOther && value === "other" && (
                <input style={{ ...inputStyle, marginTop: "4px" }} placeholder="Please specify..." value={otherText}
                    onChange={e => { setOtherText(e.target.value); onChange("other"); }} />
            )}
        </div>
    );
}

function CheckGroup({ options, values, onChange, allowOther, otherValue, onOtherChange }) {
    const toggle = (val) => {
        const next = values.includes(val) ? values.filter(v => v !== val) : [...values, val];
        onChange(next);
    };
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {options.map(opt => (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontFamily: FONT, fontSize: "16px", color: INK }}>
                    <input type="checkbox" checked={values.includes(opt.value)} onChange={() => toggle(opt.value)}
                        style={{ accentColor: OLIVE, width: "16px", height: "16px" }} />
                    {opt.label}
                </label>
            ))}
            {allowOther && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input type="checkbox" checked={values.includes("other")} onChange={() => toggle("other")}
                        style={{ accentColor: OLIVE, width: "16px", height: "16px" }} />
                    <span style={{ fontFamily: FONT, fontSize: "16px", color: INK }}>Other:</span>
                    {values.includes("other") && (
                        <input style={{ ...inputStyle, width: "200px" }} placeholder="Please specify..." value={otherValue || ""}
                            onChange={e => onOtherChange(e.target.value)} />
                    )}
                </div>
            )}
        </div>
    );
}

function SectionTitle({ number, title, subtitle }) {
    return (
        <div style={{ borderBottom: `2px solid ${OLIVE}`, paddingBottom: "10px", marginBottom: "24px", marginTop: "32px" }}>
            <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: "26px", fontStyle: "italic", color: OLIVE, margin: 0 }}>
                {number}. {title}
            </p>
            {subtitle && <p style={{ fontFamily: FONT, fontSize: "14px", color: HINT, marginTop: "4px" }}>{subtitle}</p>}
        </div>
    );
}

const INDUSTRIES = [
    { value: "education", label: "Education" }, { value: "real_estate", label: "Real Estate" },
    { value: "health_care", label: "Health Care" }, { value: "construction", label: "Construction" },
    { value: "food_service", label: "Food service" }, { value: "hospitality", label: "Hospitality" },
    { value: "tourism", label: "Tourism" }, { value: "travel", label: "Travel" },
    { value: "logistics", label: "Logistics" }, { value: "manufacturing", label: "Manufacturing" },
    { value: "finance", label: "Finance" }, { value: "agriculture", label: "Agriculture" },
    { value: "administration", label: "Administration" }, { value: "retail", label: "Retail" },
    { value: "research", label: "Research" },
];

const BARRIERS = [
    { value: "childcare", label: "Childcare responsibilities" }, { value: "housing", label: "Housing instability" },
    { value: "no_internet", label: "Lack of reliable internet" }, { value: "no_computer", label: "Lack of computer/equipment" },
    { value: "work_schedule", label: "Work schedule conflicts" }, { value: "health", label: "Health-related challenges" },
    { value: "none", label: "None" },
];

const INTEREST_REASONS = [
    { value: "career_change", label: "Career change" }, { value: "skill_development", label: "Skill development" },
    { value: "job_advancement", label: "Job advancement" }, { value: "personal_interest", label: "Personal interest" },
];

export const SurveyForm = () => {
    const { serviceId } = useParams();

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        full_name: "", date_of_birth: "", email: "", phone: "", preferred_contact: "", home_address: "",
        age_range: "", gender_identity: "", gender_other: "", ethnicity: "", ethnicity_other: "",
        education_level: "", english_primary: "", employment_status: "",
        has_computer: "", has_internet: "", prior_tech_courses: "", prior_tech_courses_detail: "",
        industries_worked: [], industries_worked_other: "", years_experience: "", can_commit_schedule: "",
        barriers: [], barriers_other: "", main_barrier: "", support_services_help: "",
        support_type_needed: "", additional_challenges: "",
        has_disability: "", needs_accommodations: "", accommodation_types: "", learning_support_description: "",
        interest_reasons: [], interest_other: "", post_program_goals: "",
        info_accurate: false, agree_contact: false,
    });


    const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setSubmitting(true);
        try {
            const payload = {
                ...form,
                industries_worked: form.industries_worked.filter(v => v !== "other"),
                industries_worked_other: form.industries_worked.includes("other") ? form.industries_worked_other : "",
                barriers: form.barriers.filter(v => v !== "other"),
                barriers_other: form.barriers.includes("other") ? form.barriers_other : "",
                interest_reasons: form.interest_reasons.filter(v => v !== "other"),
                interest_other: form.interest_reasons.includes("other") ? form.interest_other : "",
            };
            await submitSurvey(serviceId, payload);
            setSubmitted(true);
        } catch (err) {
            if (err && typeof err === "object" && Object.keys(err).length > 0) {
                setErrors(err);
            } else {
                setErrors({ detail: "Failed to submit. Please check your connection and try again." });
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div style={{ minHeight: "100vh", backgroundColor: LINEN, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
                <div style={{ textAlign: "center", maxWidth: "520px", padding: "40px" }}>
                    <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "rgba(94,106,67,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                        <span style={{ fontSize: "28px" }}>✓</span>
                    </div>
                    <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: "32px", fontStyle: "italic", color: OLIVE, marginBottom: "12px" }}>
                        Registration Submitted
                    </p>
                    <p style={{ color: MUTED, fontSize: "17px", lineHeight: 1.6 }}>
                        Thank you for registering. We will be in touch soon.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", backgroundColor: LINEN, fontFamily: FONT }}>
            {/* Header */}
            <div style={{ backgroundColor: OLIVE, padding: "24px 0", textAlign: "center" }}>
                <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: "36px", fontStyle: "italic", color: "#FBF7EF", margin: 0 }}>
                    Registration Form
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 24px 64px" }}>

                {Object.keys(errors).length > 0 && (
                    <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", color: "#dc2626", fontSize: "14px" }}>
                        {errors.detail || "Please review the errors below and try again."}
                    </div>
                )}

                {/* ── 1. Basic Information ─────────────────────────────── */}
                <SectionTitle number={1} title="Basic Information" />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <Field label="Full Name *">
                        <input style={inputStyle} value={form.full_name} onChange={e => set("full_name", e.target.value)} required />
                        {errors.full_name && <p style={{ color: "#dc2626", fontSize: "14px" }}>{errors.full_name}</p>}
                    </Field>
                    <Field label="Date of Birth">
                        <input style={inputStyle} type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} />
                    </Field>
                    <Field label="Email Address *">
                        <input style={inputStyle} type="email" value={form.email} onChange={e => set("email", e.target.value)} required />
                        {errors.email && <p style={{ color: "#dc2626", fontSize: "14px" }}>{errors.email}</p>}
                    </Field>
                    <Field label="Phone Number *">
                        <input style={inputStyle} type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} required />
                        {errors.phone && <p style={{ color: "#dc2626", fontSize: "14px" }}>{errors.phone}</p>}
                    </Field>
                </div>

                <Field label="Preferred Method of Contact *">
                    <RadioGroup name="preferred_contact" value={form.preferred_contact} onChange={v => set("preferred_contact", v)}
                        options={[{ value: "email", label: "Email" }, { value: "phone", label: "Phone" }, { value: "text", label: "Text Message" }]} />
                    {errors.preferred_contact && <p style={{ color: "#dc2626", fontSize: "14px" }}>{errors.preferred_contact}</p>}
                </Field>

                <Field label="Home Address">
                    <textarea style={{ ...inputStyle, height: "72px", resize: "vertical" }} value={form.home_address} onChange={e => set("home_address", e.target.value)} />
                </Field>

                {/* ── 2. Demographic Information ───────────────────────── */}
                <SectionTitle number={2} title="Demographic Information"
                    subtitle="The following demographic questions are voluntary and will not affect your eligibility, admission, or participation in the program." />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <Field label="Age Range">
                        <RadioGroup name="age_range" value={form.age_range} onChange={v => set("age_range", v)}
                            options={[{ value: "18-24", label: "18–24" }, { value: "25-34", label: "25–34" }, { value: "35-44", label: "35–44" }, { value: "45+", label: "45+" }]} />
                    </Field>
                    <Field label="Gender Identity">
                        <RadioGroup name="gender_identity" value={form.gender_identity} onChange={v => set("gender_identity", v)}
                            options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "non_binary", label: "Non-binary" }, { value: "prefer_not_to_say", label: "Prefer not to say" }, { value: "other", label: "Other" }]} />
                        {form.gender_identity === "other" && (
                            <input style={{ ...inputStyle, marginTop: "8px" }} placeholder="Please specify..." value={form.gender_other} onChange={e => set("gender_other", e.target.value)} />
                        )}
                    </Field>
                </div>

                <Field label="Ethnicity/Race">
                    <RadioGroup name="ethnicity" value={form.ethnicity} onChange={v => set("ethnicity", v)}
                        options={[
                            { value: "hispanic_latino", label: "Hispanic/Latino" }, { value: "black_african_american", label: "Black/African American" },
                            { value: "white", label: "White" }, { value: "asian", label: "Asian" },
                            { value: "native_american", label: "Native American/Alaska Native" }, { value: "pacific_islander", label: "Pacific Islander" },
                            { value: "other", label: "Other" },
                        ]} />
                    {form.ethnicity === "other" && (
                        <input style={{ ...inputStyle, marginTop: "8px" }} placeholder="Please specify..." value={form.ethnicity_other} onChange={e => set("ethnicity_other", e.target.value)} />
                    )}
                </Field>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <Field label="Highest Level of Education Completed">
                        <RadioGroup name="education_level" value={form.education_level} onChange={v => set("education_level", v)}
                            options={[
                                { value: "high_school", label: "High School Diploma/GED" }, { value: "some_college", label: "Some College" },
                                { value: "associate", label: "Associate Degree" }, { value: "bachelor_plus", label: "Bachelor's Degree or higher" },
                            ]} />
                    </Field>
                    <div>
                        <Field label="Is English your primary language?">
                            <RadioGroup name="english_primary" value={form.english_primary} onChange={v => set("english_primary", v)}
                                options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
                        </Field>
                        <Field label="Employment Status">
                            <RadioGroup name="employment_status" value={form.employment_status} onChange={v => set("employment_status", v)}
                                options={[{ value: "unemployed", label: "Unemployed" }, { value: "part_time", label: "Part-time" }, { value: "full_time", label: "Full-time" }, { value: "self_employed", label: "Self-employed" }]} />
                        </Field>
                    </div>
                </div>

                {/* ── 3. Technology & Experience ───────────────────────── */}
                <SectionTitle number={3} title="Technology & Experience" />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
                    <Field label="Do you currently have access to a computer/laptop?">
                        <RadioGroup name="has_computer" value={form.has_computer} onChange={v => set("has_computer", v)}
                            options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
                    </Field>
                    <Field label="Do you have reliable internet access?">
                        <RadioGroup name="has_internet" value={form.has_internet} onChange={v => set("has_internet", v)}
                            options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
                    </Field>
                    <Field label="Have you taken any programming or tech-related courses before?">
                        <RadioGroup name="prior_tech_courses" value={form.prior_tech_courses} onChange={v => set("prior_tech_courses", v)}
                            options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
                        {form.prior_tech_courses === "yes" && (
                            <input style={{ ...inputStyle, marginTop: "8px" }} placeholder="If yes, please specify..." value={form.prior_tech_courses_detail} onChange={e => set("prior_tech_courses_detail", e.target.value)} />
                        )}
                    </Field>
                </div>

                <Field label="In what industries have you worked? (Select all that apply)">
                    <CheckGroup options={INDUSTRIES} values={form.industries_worked} onChange={v => set("industries_worked", v)}
                        allowOther otherValue={form.industries_worked_other} onOtherChange={v => set("industries_worked_other", v)} />
                </Field>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <Field label="How many years of experience do you have in any industry?">
                        <input style={inputStyle} value={form.years_experience} onChange={e => set("years_experience", e.target.value)} placeholder="e.g. 5 years" />
                    </Field>
                    <Field label="Are you able to commit to a structured schedule for the duration of the program?">
                        <RadioGroup name="can_commit_schedule" value={form.can_commit_schedule} onChange={v => set("can_commit_schedule", v)}
                            options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "not_sure", label: "Not sure" }]} />
                    </Field>
                </div>

                {/* ── 4. Potential Barriers ────────────────────────────── */}
                <SectionTitle number={4} title="Potential Barriers"
                    subtitle="These questions are optional and help us identify support services. Your responses will not impact eligibility." />

                <Field label="Do you currently face any of the following barriers? (Select all that apply)">
                    <CheckGroup options={BARRIERS} values={form.barriers} onChange={v => set("barriers", v)}
                        allowOther otherValue={form.barriers_other} onOtherChange={v => set("barriers_other", v)} />
                </Field>

                <Field label="Which of these barriers would most impact your ability to complete the course?">
                    <textarea style={{ ...inputStyle, height: "72px", resize: "vertical" }} value={form.main_barrier} onChange={e => set("main_barrier", e.target.value)} />
                </Field>

                <Field label="Would support services (if available) help you participate?">
                    <RadioGroup name="support_services_help" value={form.support_services_help} onChange={v => set("support_services_help", v)}
                        options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "not_sure", label: "Not sure" }]} />
                </Field>

                {form.support_services_help === "yes" && (
                    <Field label="If yes, what type of support would be most helpful?">
                        <textarea style={{ ...inputStyle, height: "72px", resize: "vertical" }} value={form.support_type_needed} onChange={e => set("support_type_needed", e.target.value)} />
                    </Field>
                )}

                <Field label="Please share any additional challenges you would like us to be aware of: (optional)">
                    <textarea style={{ ...inputStyle, height: "72px", resize: "vertical" }} value={form.additional_challenges} onChange={e => set("additional_challenges", e.target.value)} />
                </Field>

                {/* ── 5. Accessibility & Support Needs ────────────────── */}
                <SectionTitle number={5} title="Accessibility & Support Needs (Optional)"
                    subtitle="Disclosure of disability or accommodation needs is voluntary and used only to provide appropriate support." />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <Field label="Do you identify as a person with a disability?">
                        <RadioGroup name="has_disability" value={form.has_disability} onChange={v => set("has_disability", v)}
                            options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "prefer_not_to_say", label: "Prefer not to say" }]} />
                    </Field>
                    <Field label="Do you have any condition or circumstance that may require accommodations to fully participate?">
                        <RadioGroup name="needs_accommodations" value={form.needs_accommodations} onChange={v => set("needs_accommodations", v)}
                            options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "not_sure", label: "Not sure" }]} />
                    </Field>
                </div>

                <Field label="What types of support or accommodations might be helpful for you?">
                    <textarea style={{ ...inputStyle, height: "72px", resize: "vertical" }} value={form.accommodation_types} onChange={e => set("accommodation_types", e.target.value)} />
                </Field>

                <Field label="If you would like to share more about how we can support your learning experience, please describe below:">
                    <textarea style={{ ...inputStyle, height: "72px", resize: "vertical" }} value={form.learning_support_description} onChange={e => set("learning_support_description", e.target.value)} />
                </Field>

                {/* ── 6. Goals & Motivation ────────────────────────────── */}
                <SectionTitle number={6} title="Goals & Motivation" />

                <Field label="Why are you interested in this software development course? (Select all that apply)">
                    <CheckGroup options={INTEREST_REASONS} values={form.interest_reasons} onChange={v => set("interest_reasons", v)}
                        allowOther otherValue={form.interest_other} onOtherChange={v => set("interest_other", v)} />
                </Field>

                <Field label="What are your goals after completing this program?">
                    <textarea style={{ ...inputStyle, height: "88px", resize: "vertical" }} value={form.post_program_goals} onChange={e => set("post_program_goals", e.target.value)} />
                </Field>

                {/* ── 7. Agreement ─────────────────────────────────────── */}
                <SectionTitle number={7} title="Agreement" />

                <div style={{ backgroundColor: OAT, border: `1px solid ${PEBBLE}`, borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                        <input type="checkbox" checked={form.info_accurate} onChange={e => set("info_accurate", e.target.checked)}
                            style={{ accentColor: OLIVE, width: "16px", height: "16px", marginTop: "2px", flexShrink: 0 }} required />
                        <span style={{ fontFamily: FONT, fontSize: "16px", color: INK }}>
                            I confirm that the information provided is accurate to the best of my knowledge.
                        </span>
                    </label>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                        <input type="checkbox" checked={form.agree_contact} onChange={e => set("agree_contact", e.target.checked)}
                            style={{ accentColor: OLIVE, width: "16px", height: "16px", marginTop: "2px", flexShrink: 0 }} required />
                        <span style={{ fontFamily: FONT, fontSize: "16px", color: INK }}>
                            I agree to be contacted regarding this program.
                        </span>
                    </label>
                    {(errors.info_accurate || errors.agree_contact) && (
                        <p style={{ color: "#dc2626", fontSize: "14px" }}>Both agreements are required to submit.</p>
                    )}
                </div>

                <div style={{ display: "flex", justifyContent: "center", marginTop: "32px" }}>
                    <button type="submit" disabled={submitting}
                        style={{ backgroundColor: OLIVE, color: LINEN, border: "none", borderRadius: "8px", padding: "12px 48px", fontSize: "17px", fontWeight: 600, fontFamily: FONT, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, transition: "background-color 0.2s" }}
                        onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = "#4a5535"; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = OLIVE; }}>
                        {submitting ? "Submitting..." : "Submit Registration"}
                    </button>
                </div>

                <p style={{ textAlign: "center", color: HINT, fontSize: "14px", marginTop: "20px", fontFamily: FONT }}>
                    * Required fields
                </p>
            </form>
        </div>
    );
};
