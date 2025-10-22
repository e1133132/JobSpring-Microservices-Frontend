import React, { useState, useEffect } from "react";
import Navigation from "../navigation.jsx";
import { getCurrentUser } from "../../services/authService.js";
import { getCompanyId } from "../../services/hrService.js";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api.js";

const initialState = {
    title: "",
    employmentType: "",
    salaryMin: "",
    salaryMax: "",
    location: "",
    description: "",
};

export default function UpdateJob() {
    const [form, setForm] = useState(initialState);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [serverMsg, setServerMsg] = useState("");
    const [companyId, setCompanyId] = useState("");
    const { jobId } = useParams();
    const navigate = useNavigate();

    const currentUser = getCurrentUser();
    const role = currentUser ? currentUser.role : "guest";
    const name = currentUser ? currentUser.fullName : "guest";

    const EMPLOYMENT_TYPE = {
        1: "Full Time",
        2: "Part Time",
        3: "Remote",
    };

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

    useEffect(() => {
        if (!jobId) return;
        (async () => {
            try {
                const res = await api.get(`/api/user/hr/jobs-detail/${jobId}?t=${Date.now()}`);
                const job = res.data;
                setForm({
                    title: job.title || "",
                    employmentType: job.employmentType || "",
                    salaryMin: job.salaryMin || "",
                    salaryMax: job.salaryMax || "",
                    location: job.location || "",
                    description: job.description || "",
                });
            } catch (error) {
                console.error("Failed to fetch job info:", error);
                setServerMsg("Failed to load job details");
            }
        })();
    }, [jobId]);

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
        if (!form.location.trim()) next.location = "Please fill in the address";

        setErrors(next);
        return Object.keys(next).length === 0;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setServerMsg("");
        if (!validate()) return;

        const payload = {
            title: form.title.trim(),
            employmentType: Number(form.employmentType),
            location: form.location.trim(),
            salaryMin: Number(form.salaryMin),
            salaryMax: Number(form.salaryMax),
            description: form.description.trim(),
        };

        try {
            setSubmitting(true);
            const res = await api.patch(`/api/job/companies/${companyId}/jobs/${jobId}`, payload);
            console.log("Updated:", res.data);
            setServerMsg("Job updated successfully!");
            setTimeout(() => navigate("/hr/JobPosition"), 1200);
        } catch (err) {
            console.error("Update failed:", err);
            setServerMsg("Failed to update job.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="app-root" style={{ backgroundColor: "#fffef7", minHeight: "100vh", overflowX: "hidden" }}>
            <Navigation role={role} username={name} />
            <p className="subheading">Update Job Position</p>

            <form className="card" onSubmit={handleSubmit} noValidate>
                <div>
                    <label>Job Title *</label>
                    <input type="text" value={form.title} style={{ background: "#f9fafb" }}
                           onChange={(e) => updateField("title", e.target.value)}
                           placeholder="Enter job title"/>
                    {errors.title && <p>{errors.title}</p>}
                </div>

                <div>
                    <label>Employment Type *</label>
                    <select value={form.employmentType} style={{ background: "#f9fafb" }}
                            onChange={(e) => updateField("employmentType", e.target.value)}>
                        <option value="">Select type</option>
                        {Object.entries(EMPLOYMENT_TYPE).map(([key, value]) => (
                            <option key={key} value={key}>
                                {value}
                            </option>
                        ))}
                    </select>
                    {errors.employmentType && <p>{errors.employmentType}</p>}
                </div>

                <div>
                    <label>Address *</label>
                    <input type="text" value={form.location} style={{ background: "#f9fafb" }}
                           onChange={(e) => updateField("location", e.target.value)}
                           placeholder="Enter job location"/>
                    {errors.location && <p>{errors.location}</p>}
                </div>

                <div>
                    <label>Min Salary *</label>
                    <input
                        type="number"
                        value={form.salaryMin}
                        onChange={(e) => updateField("salaryMin", e.target.value)}
                    />
                    {errors.salaryMin && <p>{errors.salaryMin}</p>}
                </div>

                <div>
                    <label>Max Salary *</label>
                    <input
                        type="number"
                        value={form.salaryMax}
                        onChange={(e) => updateField("salaryMax", e.target.value)}
                    />
                    {errors.salaryMax && <p>{errors.salaryMax}</p>}
                </div>

                <div>
                    <label>Job Description *</label>
                    <textarea
                        rows={6}
                        value={form.description}
                        onChange={(e) => updateField("description", e.target.value)}
                    />
                    {errors.description && <p>{errors.description}</p>}
                </div>

                <div>
                    <button type="submit" disabled={submitting}>
                        {submitting ? "Updating…" : "Update Job"}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/hr/JobPosition")}
                        style={{ marginLeft: "8px" }}
                    >
                        Cancel
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
