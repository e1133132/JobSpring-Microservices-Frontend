import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navigation from "../navigation.jsx";
import { FaArrowLeft } from "react-icons/fa";
import Swal from 'sweetalert2';
import api from "../../services/api.js";

import { getCurrentUser } from "../../services/authService";

const STATUS_MAP = {
    0: { label: "Pending", className: "chip chip-pending" },
    1: { label: "Approved", className: "chip chip-approved" },
    2: { label: "Rejected", className: "chip chip-rejected" },
};

function formatDate(iso) {
    try {
        const d = new Date(iso);
        return isNaN(d) ? "-" : d.toLocaleString();
    } catch {
        return "-";
    }
}

function stripBase64Prefix(b64) {
    if (!b64) return "";
    const i = b64.indexOf("base64,");
    return i >= 0 ? b64.slice(i + "base64,".length) : b64;
}

function isPdfBase64(b64) {
    if (!b64) return false;
    const raw = stripBase64Prefix(b64);
    return raw.startsWith("JVBERi0");
}
function base64ToBlob(b64, mime = "application/octet-stream") {
    const raw = stripBase64Prefix(b64);
    const byteChars = atob(raw);
    const len = byteChars.length;
    const chunk = 1024 * 1024; 
    const chunks = [];
    for (let i = 0; i < len; i += chunk) {
        const end = Math.min(i + chunk, len);
        const slice = byteChars.slice(i, end);
        const arr = new Array(slice.length);
        for (let j = 0; j < slice.length; j++) arr[j] = slice.charCodeAt(j);
        chunks.push(new Uint8Array(arr));
    }
    return new Blob(chunks, { type: mime });
}

function toPdfDataUrl(b64) {
    if (!b64) return "";
    if (b64.startsWith("data:")) return b64;
    return `data:application/pdf;base64,${stripBase64Prefix(b64)}`;
}

function buildFileUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}


export default function ApplicationDetail() {
    const { state } = useLocation();
    const id = Number(state?.id);
    const navigate = useNavigate();
    const [role] = useState(getCurrentUser() ? getCurrentUser().role : "guest");
    const [name] = useState(getCurrentUser() ? getCurrentUser().fullName : "guest");
    const [data, setData] = useState([]);
    const [, setLoading] = useState(true);
    const [updating,] = useState(false);
    const [, setError] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");

    useEffect(() => {
        load();
    }, [id]);

    async function load() {
        setLoading(true);
        setError("");
        try {
            console.log("id:" + `/api/applications/${id}`);
            const r = await api.get(`/api/applications/${id}`);
            console.log("raw response:", r);
            console.log("application object:", r.data);
            console.log("application json:", JSON.stringify(r.data));
            console.log("application pretty:\n", JSON.stringify(r.data, null, 2));
            setData(r.data);
        } catch (e) {
            setError(e.message || "load failed");
        } finally {
            setLoading(false);
        }
    }

    const rawFile = data?.resumeUrl;

    const fileKind = useMemo(() => {
        if (!rawFile) return "none";
        if (rawFile.startsWith("data:")) {
            return rawFile.includes("application/pdf") ? "pdf" : "other";
        }
        if (isPdfBase64(rawFile)) return "pdf";

        const lower = rawFile.split("?")[0].toLowerCase();
        if (lower.startsWith("http")) {
            if (lower.endsWith(".pdf")) return "pdf";
            if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower)) return "image";
            return "other";
        }
        return "other";
    }, [rawFile]);



    useEffect(() => {
        let toRevoke = "";
        if (!rawFile) { setPreviewUrl(""); return; }

        if (fileKind === "pdf") {
            if (rawFile.startsWith("data:")) {
                setPreviewUrl(rawFile);
            } else if (isPdfBase64(rawFile)) {
                const blob = base64ToBlob(rawFile, "application/pdf");
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
                toRevoke = url;
            } else if (/^https?:\/\//i.test(rawFile)) {
                setPreviewUrl(buildFileUrl(rawFile));
            } else {
                setPreviewUrl(toPdfDataUrl(rawFile));
            }
        } else {
            setPreviewUrl(buildFileUrl(rawFile));
        }

        return () => {
            if (toRevoke) URL.revokeObjectURL(toRevoke);
        };
    }, [rawFile, fileKind]);

    const statusInfo = STATUS_MAP[data?.status ?? 0] ?? STATUS_MAP[0];

    async function handleUpdateStatus(status) {
        try {
            await api.patch(`/api/hr/applications/${id}/status`, {status});
            const word=status===2?'passed':'rejected';
            Swal.fire('Success', 'Application status '+word, 'success');
        } catch (error) {
            console.error("/api/hr/applications:", error.response ?? error);
        }
    }

    return (
        <div className="app-root">
            <Navigation role={role} username={name} />
            <div className="topbar" style={{ marginLeft: "24px" }}>
                <button className="btn ghost flex items-center gap-2" onClick={() => navigate(-1)}>
                    <FaArrowLeft className="icon" aria-hidden="true" />
                    <span >Back</span>
                </button>
            </div>

            <div className="card" style={{ margin: "12px 24px"}}>
                <header className="header">
                    <div>
                        <div className="title">Application #{data.id}</div>
                        <div className="sub">Job: <strong>{data.jobTitle}</strong></div>
                    </div>
                    <div className={statusInfo.className}>{statusInfo.label}</div>
                </header>

                <section className="meta">
                    <div><span className="label">Applicant</span><div className="val">{data.applicantName}</div></div>
                    <div><span className="label">Email</span>
                        <div className="val"><a href={`mailto:${data.applicantEmail}`}>{data.applicantEmail}</a></div>
                    </div>
                    <div><span className="label">Applied At</span><div className="val">{formatDate(data.appliedAt)}</div></div>
                </section>

                <section className="preview-wrap">
                    <div className="preview-head">
                        <div className="ph-title">Resume Preview</div>
                        <div className="ph-actions">
                            {previewUrl && (
                                <>
                                    <a className="btn primary small" href={previewUrl} download>download resume</a>
                                </>
                            )}
                        </div>
                    </div>


                    <div className="preview-pane" aria-label="Resume preview">
                        {!previewUrl && (
                            <div className="muted">No Document{data.resumeProfile ? "text abstract:" : ""}</div>
                        )}

                        {previewUrl && fileKind === "pdf" && (
                            <iframe
                                title="resume-pdf"
                                src={`${previewUrl}#toolbar=1&navpanes=0`}
                                style={{ width: "100%", height: "100%", border: 0 }}
                            />
                        )}

                        {previewUrl && fileKind === "image" && (
                            <div className="img-box">
                                <img src={previewUrl} alt="Resume Image" />
                            </div>
                        )}

                        {previewUrl && fileKind === "other" && (
                            <div className="muted">
                                This type of file cannot be previewed within the current window. Please use &quot;Open in New Window&quot; or &quot;Download Attachment&quot; to view it.
                            </div>
                        )}

                        {!previewUrl && data.resumeProfile && (
                            <pre className="text-preview">{data.resumeProfile}</pre>
                        )}
                    </div>
                </section>

                <footer className="actions">
                    <button
                        className="btn danger"
                        disabled={updating || data.status === 3}
                        onClick={() => handleUpdateStatus(3)}
                    >
                        Reject
                    </button>
                    <button
                        className="btn success"
                        disabled={updating || data.status === 2}
                        onClick={() => handleUpdateStatus(2)}
                    >
                        Pass
                    </button>
                </footer>
            </div>

            <style>{`
      *{box-sizing:border-box}
        .page { max-width: 960px; margin: 24px auto; padding: 0 12px; }
        .topbar { display:flex; justify-content:flex-start; margin-bottom:12px; }
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:0px; padding:20px; box-shadow:0 8px 30px rgba(0,0,0,.06); }
        .card.err { border-color:#fecaca; }
        .header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
        .title { font-size:20px; font-weight:700; }
        .sub { color:#475569; margin-top:4px; }
        .chip{ padding:6px 10px; border-radius:999px; font-weight:600; font-size:12px;}
        .chip-pending{ background:#fff7ed; color:#9a3412; border:1px solid #fdba74;}
        .chip-approved{ background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;}
        .chip-rejected{ background:#fef2f2; color:#991b1b; border:1px solid #fecaca;}
        .back-btn {
        display: inline-flex;
        align-items: center;  
        gap: 8px;
        line-height: 1;      
        }
        .icon {
        position: relative;
        top: 3px;           
        width: 1em;
        height: 1em;         
        }
        .meta { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin:12px 0 18px;}
        .label{ font-size:15px; color:#6b7280; }
        .val{ font-weight:600; }

        .preview-wrap{ margin-top:8px; }
        .preview-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .ph-title{ font-weight:700; }
        .ph-actions{ display:flex; gap:8px; }

        .preview-pane{ height:420px; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; background:#fafafa; }
        .img-box{ width:100%; height:100%; overflow:auto; display:flex; justify-content:center; align-items:flex-start; background:#111827; }
        .img-box img{ max-width:100%; height:auto; display:block; }

        .text-preview{ margin:0; padding:12px; height:100%; overflow:auto; white-space:pre-wrap; word-break:break-word; background:#fff; }

        .actions{ display:flex; gap:12px; justify-content:flex-end; margin-top:18px; }
        .btn{ appearance:none; border:1px solid #e5e7eb; background:#fff; color:#111827; border-radius:12px; padding:10px 14px; font-weight:700; cursor:pointer; }
        .btn:hover{ background:#f9fafb; }
        .btn.small{ padding:6px 10px; font-weight:600; }
        .btn.primary{ background:#111827; color:#fff; border-color:#111827; }
        .btn.primary:hover{ filter:brightness(1.03); }
        .btn.success{ background:#10b981; border-color:#10b981; color:#fff; }
        .btn.success:disabled{ opacity:.7; }
        .btn.danger{ background:#ef4444; border-color:#ef4444; color:#fff; }
        .btn.danger:disabled{ opacity:.7; }
        .btn.ghost{ background:transparent; border-color:transparent; color:#111827; padding-left:0; }
        .muted{ color:#6b7280; font-size:14px; }
      `}</style>
        </div>
    );
}

