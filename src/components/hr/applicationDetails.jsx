import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navigation from "../navigation.jsx";
import { FaArrowLeft } from "react-icons/fa";
import Swal from "sweetalert2";
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
    const [updating] = useState(false);
    const [, setError] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");

    useEffect(() => {
        load();
    }, [id]);

    async function load() {
        setLoading(true);
        setError("");
        try {
            const r = await api.get(`/api/applications/${id}`);
            setData(r.data);
        } catch (e) {
            setError(e.message || "load failed");
        } finally {
            setLoading(false);
        }
    }

    // ✅ 新字段：后端现在会给一个文件ID（示例名 resumeFileId）
    const resumeFileId = data?.resumeFileId || data?.resume?.id || null;

    // 兼容旧字段：如果后端历史数据里还有 resumeUrl（可能是 http 链接或 data:URL）
    const legacyResumeUrl = data?.resumeUrl || "";

    // 🔎 判断文件类型（现在以“有文件ID=就是PDF”优先；否则看旧URL后缀）
    const fileKind = useMemo(() => {
        if (resumeFileId) return "pdf"; // 新逻辑：文件ID代表后端PDF下载
        if (!legacyResumeUrl) return "none";
        const lower = legacyResumeUrl.split("?")[0].toLowerCase();
        if (lower.endsWith(".pdf") || legacyResumeUrl.startsWith("data:application/pdf")) return "pdf";
        if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lower)) return "image";
        return "other";
    }, [resumeFileId, legacyResumeUrl]);

    // 🔗 生成预览地址：
    //   - 新：/api/files/{id}/download 直接预览（后端设置 inline）
    //   - 旧：把 resumeUrl 兜底转为可访问URL
    useEffect(() => {
        if (resumeFileId) {
            setPreviewUrl(`/api/files/${resumeFileId}/download`);
        } else if (legacyResumeUrl) {
            // 旧数据兜底
            setPreviewUrl(buildFileUrl(legacyResumeUrl));
        } else {
            setPreviewUrl("");
        }
    }, [resumeFileId, legacyResumeUrl]);

    const statusInfo = STATUS_MAP[data?.status ?? 0] ?? STATUS_MAP[0];

    async function handleUpdateStatus(status) {
        try {
            await api.patch(`/api/hr/applications/${id}/status`, { status });
            const word = status === 2 ? "passed" : "rejected";
            Swal.fire("Success", "Application status " + word, "success");
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
                    <span>Back</span>
                </button>
            </div>

            <div className="card" style={{ margin: "12px 24px" }}>
                <header className="header">
                    <div>
                        <div className="title">Application #{data.id}</div>
                        <div className="sub">
                            Job: <strong>{data.jobTitle}</strong>
                        </div>
                    </div>
                    <div className={statusInfo.className}>{statusInfo.label}</div>
                </header>

                <section className="meta">
                    <div>
                        <span className="label">Applicant</span>
                        <div className="val">{data.applicantName}</div>
                    </div>
                    <div>
                        <span className="label">Email</span>
                        <div className="val">
                            <a href={`mailto:${data.applicantEmail}`}>{data.applicantEmail}</a>
                        </div>
                    </div>
                    <div>
                        <span className="label">Applied At</span>
                        <div className="val">{formatDate(data.appliedAt)}</div>
                    </div>
                </section>

                <section className="preview-wrap">
                    <div className="preview-head">
                        <div className="ph-title">Resume Preview</div>
                        <div className="ph-actions">
                            {previewUrl && (
                                <>
                                    {/* download 按钮仍然可用：浏览器会直接下载或打开另存为 */}
                                    <a className="btn primary small" href={previewUrl} download>
                                        download resume
                                    </a>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="preview-pane" aria-label="Resume preview">
                        {!previewUrl && <div className="muted">No Document</div>}

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
                                This type of file cannot be previewed within the current window. Please use &quot;Open in
                                New Window&quot; or &quot;Download Attachment&quot; to view it.
                            </div>
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

