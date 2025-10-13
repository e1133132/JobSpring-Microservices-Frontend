import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../navigation.jsx";
import { FaArrowLeft } from "react-icons/fa";
import Swal from "sweetalert2";
import api from "../../services/api.js";
import { getCurrentUser } from "../../services/authService";

function isValidUrl(v) {
    if (!v) return true;
    try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch { return false; }
}

export default function CreateCompany() {
    const navigate = useNavigate();
    const me = getCurrentUser();
    const role = me ? me.role : "guest";
    const username = me ? me.fullName : "guest";
    const fileRef = useRef(null);
    const [form, setForm] = useState({
        name: "",
        website: "",
        logo_url: "",
        description: "",
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [uploading,] = useState(false);
    const [, setUploadProgress] = useState(0);


    function setField(k, v) { setForm((s) => ({ ...s, [k]: v })); }

    function validate() {
        const e = {};
        if (!form.name?.trim()) e.name = "Name is required.";
        if (form.website && !isValidUrl(form.website)) e.website = "Website must be a valid http(s) URL.";
        if (form.logo_url && !isValidUrl(form.logo_url)) e.logo_url = "Logo URL must be a valid http(s) URL.";
        return e;
    }
    function onPickLogo(e) {
        const f = e.target.files?.[0];
        setUploadProgress(0);
        if (!f) { setSelectedFile(null); setPreviewUrl(""); return; }
        if (!f.type.startsWith("image/")) {
            setErrors((er) => ({ ...er, logo_url: "Please choose an image file." }));
            return;
        }

        if (f.size > 3 * 1024 * 1024) {
            setErrors((er) => ({ ...er, logo_url: "Image too large (max 3MB)." }));
            return;
        }
        setErrors((er) => ({ ...er, logo_url: undefined }));
        setSelectedFile(f);
        setPreviewUrl(URL.createObjectURL(f));
    }

    function clearLogo() {
        try {
            if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
        } catch { throw new Error("Failed to revoke object URL"); }
        setSelectedFile(null);
        setPreviewUrl("");
        setField("logo_url", "");
        setErrors((er) => ({ ...er, logo_url: undefined }));

        if (fileRef.current) fileRef.current.value = "";
    }


    function handleReset() {
        setForm({ name: "", website: "", logo_url: "", description: "" });
        if (fileRef.current) fileRef.current.value = "";
        setSelectedFile(null);
        setPreviewUrl("");
        setField("logo_url", "");
        setErrors({});
    }

    async function handleSubmit(ev) {
        ev.preventDefault();

        const e = validate();
        setErrors(e);
        if (Object.keys(e).length) return;

        try {
            setSubmitting(true);

            const companyDto = {
                name: form.name.trim(),
                website: form.website?.trim() || null,
                description: form.description?.trim() || null,
            };

            const fd = new FormData();
            fd.append("company", new Blob([JSON.stringify(companyDto)], { type: "application/json" }));
            if (selectedFile) {
                fd.append("logo", selectedFile, selectedFile.name);
            }


            const res = await api.post("/api/admin/company/create", fd,
                {
                    onUploadProgress: (p) => {
                        if (p.total) setUploadProgress(Math.round((p.loaded * 100) / p.total));
                    },
                });

            await Swal.fire({
                icon: "success",
                title: "Company created",
                text: `ID: ${res.data?.id ?? "(unknown)"}`,
            });
            navigate(-1);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Failed",
                text: err?.response?.data?.message || err.message || "Create failed",
            });
        } finally {
            setSubmitting(false);
        }
    }



    return (
        <div className="app-root">
            <Navigation role={role} username={username} />

            <div className="topbar" style={{ marginLeft: 24 }}>
                <button className="btn ghost flex items-center gap-2" onClick={() => navigate(-1)}>
                    <FaArrowLeft className="icon" aria-hidden="true" />
                    <span>Back</span>
                </button>
            </div>

            <div className="card" style={{ margin: "12px 24px" }}>
                <header className="header">
                    <div className="title">Create Company</div>
                </header>

                <form onSubmit={handleSubmit} className="form">
                    <div className="grid">
                        <div className="field">
                            <label className="label">Name<span className="req">*</span></label>
                            <input
                                className={`input ${errors.name ? "err" : ""}`}
                                type="text"
                                value={form.name}
                                onChange={(e) => setField("name", e.target.value)}
                                placeholder="e.g. ACME Inc."
                            />
                            {errors.name && <div className="err-text">{errors.name}</div>}
                        </div>

                        <div className="field">
                            <label className="label">Website</label>
                            <input
                                className={`input ${errors.website ? "err" : ""}`}
                                type="url"
                                value={form.website}
                                onChange={(e) => setField("website", e.target.value)}
                                placeholder="https://www.example.com"
                            />
                            {errors.website && <div className="err-text">{errors.website}</div>}
                        </div>

                        <div className="field">
                            <label className="label">Logo</label>

                            <div className="uploader">
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={onPickLogo}
                                    className="file-input"
                                />

                            </div>


                            {previewUrl && (
                                <div className="logo-wrap" style={{ marginTop: 8 }}>
                                    <div className="logo-box">
                                        <img src={previewUrl} alt="Logo preview" />
                                    </div>
                                    <button
                                        type="button"
                                        className="close-btn"
                                        onClick={clearLogo}
                                        aria-label="Remove selected image"
                                        title="Remove"
                                        disabled={uploading}
                                    >
                                        x
                                    </button>
                                </div>
                            )}


                            {form.logo_url && (
                                <div className="muted" style={{ marginTop: 6, wordBreak: "break-all" }}>
                                    Saved URL: <code>{form.logo_url}</code>
                                </div>
                            )}

                            {errors.logo_url && <div className="err-text">{errors.logo_url}</div>}
                        </div>

                    </div>

                    <div className="field">
                        <label className="label">Description</label>
                        <textarea
                            className="textarea"
                            rows={5}
                            value={form.description}
                            onChange={(e) => setField("description", e.target.value)}
                            placeholder="Short description of the company..."
                        />
                    </div>

                    {form.logo_url && isValidUrl(form.logo_url) && (
                        <div className="logo-preview">
                            <div className="muted" style={{ marginBottom: 6 }}>Logo Preview</div>
                            <div className="logo-box">
                                <img src={form.logo_url} alt="Logo preview" />
                            </div>
                        </div>
                    )}

                    <footer className="actions">
                        <button type="button" className="btn" onClick={handleReset} disabled={submitting}>
                            Reset
                        </button>
                        <button type="submit" className="btn success" disabled={submitting}>
                            {submitting ? "Creating..." : "Create"}
                        </button>
                    </footer>
                </form>
            </div>

            <style>{`
        *{box-sizing:border-box}
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:0; padding:20px; box-shadow:0 8px 30px rgba(0,0,0,.06); }
        .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .title { font-size:20px; font-weight:700; }
        .label{ font-size:14px; color:#374151; display:block; margin-bottom:6px; }
        .req{ color:#ef4444; margin-left:4px; }
        .form { display:block; }
        .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:12px; }
        .field { margin-bottom:12px; }
        .input, .textarea{
          width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; font-size:14px; outline:none;
        }
        .textarea{ resize:vertical; }
        .input:focus, .textarea:focus{ border-color:#111827; }
        .input.err{ border-color:#ef4444; }
        .err-text{ color:#b91c1c; font-size:12px; margin-top:4px; }
        .muted{ color:#6b7280; font-size:13px; }

        .logo-wrap{ position:relative; display:inline-block; }
        .close-btn{
        position:absolute; top:6px; right:6px;
        width:24px; height:24px; padding:0;
        border:none; border-radius:50%;
        background:#ef4444; color:#fff;
        display:flex; align-items:center; justify-content:center;  
        font-size:16px; line-height:1;                              
        cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,.15);
        z-index:2;                                               
        }
        .close-btn:hover{ filter:brightness(0.95); }
        .close-btn:disabled{ opacity:.6; cursor:not-allowed; }

        .logo-preview{ margin:10px 0 4px; }
        .logo-box{
            position:relative;             
            width:220px; height:120px;
            border:1px solid #e5e7eb; border-radius:12px;
            overflow:hidden; background:#111827;
            display:flex; align-items:center; justify-content:center;
            }
        .logo-box img{ width:100%; height:100%; object-fit:contain; background:#111827; }

        .uploader { display:flex; gap:8px; align-items:center; }
        .file-input{ border:1px dashed #d1d5db; padding:8px; border-radius:8px; background:#fff; }
        .logo-box{ width:220px; height:120px; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; background:#111827; display:flex; align-items:center; justify-content:center; }
        .logo-box img{ width:100%; height:100%; object-fit:contain; background:#111827; }

        .actions{ display:flex; gap:12px; justify-content:flex-end; margin-top:16px; }
        .btn{ appearance:none; border:1px solid #e5e7eb; background:#fff; color:#111827; border-radius:12px; padding:10px 14px; font-weight:700; cursor:pointer; }
        .btn:hover{ background:#f9fafb; }
        .btn.success{ background:#10b981; border-color:#10b981; color:#fff; }
        .btn.success:disabled{ opacity:.7; }
        .btn.ghost{ background:transparent; border-color:transparent; color:#111827; padding-left:0; }
        .icon{ position:relative; top:3px; width:1em; height:1em; }
      `}</style>
        </div>
    );
}
