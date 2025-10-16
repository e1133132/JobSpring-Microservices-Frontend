import React, { useState, useEffect } from "react";
import Navigation from "../navigation.jsx";
import { getCurrentUser } from "../../services/authService.js";
import PropTypes from "prop-types";
import { getCompanyId } from "../../services/hrService.js";
import api from "../../services/api.js";

const initialState = {
    title: "",
    employmentType: "",
    salaryMin: "",
    salaryMax: "",
    location: "",
    description: "",
};

export default function PostJob({ onSubmit }) {
    const [form, setForm] = useState(initialState);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [serverMsg, setServerMsg] = useState("");
    const [role,] = useState(getCurrentUser() ? getCurrentUser().role : 'guest');
    const [name,] = useState(getCurrentUser() ? getCurrentUser().fullName : 'guest');
    const EMPLOYMENT_TYPE = {
        FULL_TIME: 1,
        PART_TIME: 2,
        REMOTE: 3,
    }
    const [companyId, setCompanyId] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const id = await getCompanyId();
                setCompanyId(id);
            } catch (e) {
                console.error("getCompanyId failed:", e);
            }
        })();
    }, []);

    function updateField(key, value) {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((e) => ({ ...e, [key]: undefined }));
    }

    function validate() {
        const next = {};
        if (!form.title.trim()) next.title = "Please enter the job name";

        if (![1, 2, 3].includes(Number(form.employmentType))) {
            next.employmentType = "Please choose a job type";
        }

        const min = Number(form.salaryMin);
        const max = Number(form.salaryMax);
        if (form.salaryMin === "") next.salaryMin = "Please enter min salary";
        else if (!Number.isFinite(min) || min < 0)
            next.salaryMin = "Min salary must be a non-negative number";

        if (form.salaryMax === "") next.salaryMax = "Please enter max salary";
        else if (!Number.isFinite(max) || max < 0)
            next.salaryMax = "Max salary must be a non-negative number";

        if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
            next.salaryMin = next.salaryMin || "Min salary should not exceed max salary";
            next.salaryMax = next.salaryMax || "Max salary should be ≥ min salary";
        }

        if (!form.description.trim()) next.description = "Please fill in the job description";
        if (!form.location.trim()) next.address = "Please fill in the address";

        setErrors(next);
        return Object.keys(next).length === 0;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setServerMsg("");
        if (!validate()) return;

        const payload = {
            title: form.title.trim(),
            location: form.location.trim(),
            employmentType: Number(form.employmentType),
            salaryMin: Number(form.salaryMin),
            salaryMax: Number(form.salaryMax),
            description: form.description.trim(),
        };
        console.log("Submitting:", payload);
        try {
            setSubmitting(true);
            if (onSubmit) {
                await onSubmit(payload);
            } else {
                await api.post(`/api/user/companies/${companyId}/jobs`, payload);
            }
            console.log("Post successfully!");
            setForm(initialState);
        } catch (err) {
            console.log(err.message || "Post failed");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="app-root">
            <Navigation role={role} username={name} />
            <p className="subheading">Post Job Positions</p>
            <form className="card" onSubmit={handleSubmit} noValidate>
                {/* Job Title */}
                <div>
                    <label id="label-job-title">Job Title *</label>
                    <input
                        type="text"
                        placeholder="e.g. Frontend Developer"
                        value={form.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        aria-labelledby="label-job-title"
                        aria-invalid={!!errors.title}
                        aria-describedby={errors.title ? "err-job-title" : ""}
                    />
                    {errors.title && <p id="err-job-title">{errors.title}</p>}
                </div>
                {/* Employment Type */}
                <div>
                    <label id="label-employment-type">Employment Type *</label>
                    <select
                        value={form.employmentType}
                        onChange={(e) => updateField("employmentType", e.target.value)}
                        aria-labelledby="label-employment-type"
                        aria-invalid={!!errors.employmentType}
                        aria-describedby={errors.employmentType ? "err-employment-type" : ""}
                    >
                        <option value="" disabled>
                            -- Select Employment Type --
                        </option>
                        <option value={EMPLOYMENT_TYPE.FULL_TIME}>Full Time</option>
                        <option value={EMPLOYMENT_TYPE.PART_TIME}>Part Time</option>
                        <option value={EMPLOYMENT_TYPE.REMOTE}>Remote</option>
                    </select>
                    {errors.employmentType && <p id="err-employment-type">{errors.employmentType}</p>}
                </div>

                {/* Min Salary */}
                <div>
                    <label id="label-min-salary">Min Salary *</label>
                    <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        placeholder="e.g. 3500"
                        value={form.salaryMin}
                        onChange={(e) => updateField("salaryMin", e.target.value)}
                        aria-labelledby="label-min-salary"
                        aria-invalid={!!errors.salaryMin}
                        aria-describedby={errors.salaryMin ? "err-min-salary" : ""}
                    />
                    {errors.salaryMin && <p id="err-min-salary">{errors.salaryMin}</p>}
                </div>

                {/* Max Salary */}
                <div>
                    <label id="label-max-salary">Max Salary *</label>
                    <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        placeholder="e.g. 6000"
                        value={form.salaryMax}
                        onChange={(e) => updateField("salaryMax", e.target.value)}
                        aria-labelledby="label-max-salary"
                        aria-invalid={!!errors.salaryMax}
                        aria-describedby={errors.salaryMax ? "err-max-salary" : ""}
                    />
                    {errors.salaryMax && <p id="err-max-salary">{errors.salaryMax}</p>}
                </div>

                {/* Address */}
                <div>
                    <label id="label-address">Address *</label>
                    <input
                        type="text"
                        placeholder="e.g. 1 Fusionopolis Way, Singapore"
                        value={form.location}
                        onChange={(e) => updateField("location", e.target.value)}
                        aria-labelledby="label-address"
                        aria-invalid={!!errors.location}
                        aria-describedby={errors.location ? "err-address" : ""}
                    />
                    {errors.location && <p id="err-address">{errors.location}</p>}
                </div>

                {/* Description */}
                <div>
                    <label id="label-desc">Job Description *</label>
                    <textarea
                        rows={6}
                        placeholder="Responsibilities, requirements, benefits…"
                        value={form.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        aria-labelledby="label-desc"
                        aria-invalid={!!errors.description}
                        aria-describedby={errors.description ? "err-desc" : ""}
                    />
                    {errors.description && <p id="err-desc">{errors.description}</p>}
                </div>

                <div>
                    <button type="submit" disabled={submitting}>
                        {submitting ? "Posting…" : "Post Job Position"}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setForm(initialState);
                            setErrors({});
                            setServerMsg("");
                        }}
                    >
                        Reset
                    </button>
                </div>
                <style>{`
                .card { 
                border-radius: 16px;
                border: 1px solid #e5e7eb;
                background: #ffffff;
                padding: 24px;
                box-shadow: 0 8px 30px rgba(0,0,0,.06);
                }
                .card > div { margin-bottom: 16px; }

             
                .card label { 
                display: block; 
                font-weight: 600; 
                font-size: 14px; 
                margin-bottom: 6px; 
                color: #0f172a;
                }
                .card p { 
                margin: 6px 0 0; 
                font-size: 13px; 
                color: #ef4444;        
                }

               
                .card input,
                .card textarea,
                .card select {
                width: 100%;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                background: #fff;
                padding: 10px 12px;
                font: inherit;
                color: #0f172a;
                outline: none;
                transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
                box-sizing: border-box;
                }

                
                .card input:hover,
                .card textarea:hover,
                .card select:hover {
                border-color: #d1d5db;
                }
                .card input:focus,
                .card textarea:focus,
                .card select:focus {
                border-color: #93c5fd;                     
                box-shadow: 0 0 0 3px rgba(147,197,253,.45); 
                }

               
                .card [aria-invalid="true"] {
                border-color: #f87171 !important;
                box-shadow: 0 0 0 3px rgba(254,202,202,.6) !important;
                }

                
                .card input::placeholder,
                .card textarea::placeholder {
                color: #94a3b8;
                }

               
                .card button[type="submit"],
                .card button[type="button"] {
                appearance: none;
                border: 0;
                border-radius: 12px;
                padding: 10px 16px;
                font-weight: 700;
                cursor: pointer;
                transition: filter .15s ease, opacity .15s ease, box-shadow .15s ease;
                }
                .card button[type="submit"] {
                background: #111827;   
                color: #fff;
                }
                .card button[type="submit"]:hover { filter: brightness(1.03); }
                .card button[type="submit"]:disabled { opacity: .6; cursor: not-allowed; }

                .card button[type="button"] {
                background: #fff;
                color: #0f172a;
                border: 1px solid #e5e7eb;
                margin-left: 8px;
                }
                .card button[type="button"]:hover { background: #f9fafb; }

                
                .card .hint, .card .small {
                font-size: 12px;
                color: #6b7280;
                margin-top: 6px;
                }
        *{box-sizing:border-box}
      `}</style>

                {serverMsg && <div className="hint">{serverMsg}</div>}
            </form>
        </div>
    );

}
PostJob.propTypes = {
    onSubmit: PropTypes.func,
};