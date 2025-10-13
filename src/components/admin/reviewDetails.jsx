import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navigation from "../navigation.jsx";
import { FaArrowLeft } from "react-icons/fa";
import Swal from "sweetalert2";
import api from "../../services/api.js";
import { getCurrentUser } from "../../services/authService";

const STATUS_MAP = {
    0: { label: "Pending", className: "chip chip-pending" },
    2: { label: "Approved", className: "chip chip-approved" },
    3: { label: "Rejected", className: "chip chip-rejected" },
};

function formatDate(iso) {
    try {
        if (!iso) return "-";
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

export default function ReviewDetail() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const id = Number(state?.id);
    const [role] = useState(getCurrentUser() ? getCurrentUser().role : "guest");
    const [name] = useState(getCurrentUser() ? getCurrentUser().fullName : "guest");

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchReviewDetail();
    }, []);

    const fetchReviewDetail = async () => {
        try {
            const res = await api.get(`/api/admin/check_review`);
            console.log("Fetched review:", res.data);
            setData(res.data?.[0] ?? null); 
        } catch (e) {
            setError(e?.message || "Load failed");
        } finally {
            setLoading(false);
        }
    };

    const review = useMemo(() => {
        console.log("Review data review:", data);
        const d = data || [];
        console.log("Review data review d:", d.rating);
        return {
            applicationId: d.application_id ?? d.applicationId,
            title: d.title ?? "",
            content: d.content ?? "",
            rating: d.rating ?? 0,
            id: d.id ?? 0,
            status: d.status ?? 0,
            submittedAt: d.submitted_at ?? d.submittedAt,
            reviewedBy: d.reviewed_by ?? d.reviewedBy ?? "",
            publicAt: d.public_at ?? d.publicAt ?? null,
            reviewNote: d.review_note ?? d.reviewNote ?? "",
            imageUrl: d.imageurl ?? d.imageUrl ?? "",
        };
    }, [data]);

    const statusInfo = STATUS_MAP[review.status] ?? STATUS_MAP[0];
    const previewUrl = useMemo(() => (review.imageUrl ? buildFileUrl(review.imageUrl) : ""), [review.imageUrl]);

    async function handleUpdateStatus(nextStatus) {
        try {
            setUpdating(true);
            await api.patch(`/api/admin/review/pass/${id}`, { status: nextStatus });
            setData((old) => ({ ...(old || {}), status: nextStatus }));
            Swal.fire({
                icon: "success",
                title: "Success",
                text: nextStatus === 2 ? "Review approved." : "Review rejected.",
                confirmButtonText: "OK",
                allowOutsideClick: false,
            });
        } catch (e) {
            Swal.fire({
                icon: "error",
                title: "Failed",
                text: e?.response?.data?.message || e.message || "Update failed",
                confirmButtonText: "OK",
            });
        } finally {
            setUpdating(false);
        }
    }

    return (
        <div className="app-root">
            <Navigation role={role} username={name} />

            <div className="topbar" style={{ marginLeft: 24 }}>
                <button className="btn ghost flex items-center gap-2" onClick={() => navigate(-1)}>
                    <FaArrowLeft className="icon" aria-hidden="true" />
                    <span>Back</span>
                </button>
            </div>

            <div className={`card ${error ? "err" : ""}`} style={{ margin: "12px 24px" }}>
                <header className="header">
                    <div>
                        <div className="title">Review #{review.id}</div>
                        <div className="sub">
                            For Application:&nbsp;<strong>{review.applicationId ?? "-"}</strong>
                        </div>
                        {review.title && <div className="sub">Title: <strong>{review.title}</strong></div>}
                    </div>
                    <div className={statusInfo.className}>{statusInfo.label}</div>
                </header>

                {loading && <div className="muted">Loading…</div>}
                {error && <div className="muted" style={{ color: "#991b1b" }}>{error}</div>}

                {!loading && !error && (
                    <>
                        <section className="meta">
                            <div>
                                <span className="label">Rating</span>
                                <div className="val">{review.rating ?? "-"}</div>
                            </div>
                            <div>
                                <span className="label">Submitted At</span>
                                <div className="val">{formatDate(review.submittedAt)}</div>
                            </div>
                            <div>
                                <span className="label">Reviewed By</span>
                                <div className="val">{review.reviewedBy || "-"}</div>
                            </div>
                            <div>
                                <span className="label">Public At</span>
                                <div className="val">{formatDate(review.publicAt)}</div>
                            </div>
                        </section>

                        {review.content && (
                            <section className="content-block">
                                <div className="block-title">Content</div>
                                <div className="content-body">{review.content}</div>
                            </section>
                        )}

                        {review.reviewNote && (
                            <section className="content-block">
                                <div className="block-title">Review Note</div>
                                <div className="content-body">{review.reviewNote}</div>
                            </section>
                        )}

                        <section className="preview-wrap">
                            <div className="preview-head">
                                <div className="ph-title">Attachment (Image)</div>
                                <div className="ph-actions">
                                    {previewUrl ? (
                                        <>
                                            <a className="btn primary small" href={previewUrl} target="_blank" rel="noreferrer">Open</a>
                                            <a className="btn small" href={previewUrl} download>Download</a>
                                        </>
                                    ) : (
                                        <span className="muted">No Image</span>
                                    )}
                                </div>
                            </div>

                            <div className="preview-pane" aria-label="Attachment preview">
                                {previewUrl ? (
                                    <div className="img-box">
                                        <img src={previewUrl} alt="Review Attachment" />
                                    </div>
                                ) : (
                                    <div className="muted" style={{ padding: 12 }}>No image to preview.</div>
                                )}
                            </div>
                        </section>

                        <footer className="actions">
                            <button
                                className="btn danger"
                                disabled={updating || review.status === 3}
                                onClick={() => handleUpdateStatus(3)}
                            >
                                Reject
                            </button>
                            <button
                                className="btn success"
                                disabled={updating || review.status === 2}
                                onClick={() => handleUpdateStatus(2)}
                            >
                                Approve
                            </button>
                        </footer>
                    </>
                )}
            </div>

            <style>{`
        *{box-sizing:border-box}
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
        .icon { position: relative; top: 3px; width: 1em; height: 1em; }

        .meta { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin:12px 0 18px;}
        .label{ font-size:15px; color:#6b7280; }
        .val{ font-weight:600; }

        .content-block{ margin-top:16px; }
        .block-title{ font-weight:700; margin-bottom:6px; }
        .content-body{ white-space:pre-wrap; word-break:break-word; color:#111827; }

        .preview-wrap{ margin-top:16px; }
        .preview-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .ph-title{ font-weight:700; }
        .ph-actions{ display:flex; gap:8px; }

        .preview-pane{ height:420px; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; background:#fafafa; }
        .img-box{ width:100%; height:100%; overflow:auto; display:flex; justify-content:center; align-items:flex-start; background:#111827; }
        .img-box img{ max-width:100%; height:auto; display:block; }

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
