import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api.js";
import { getCurrentUser } from "../../services/authService";
import Navigation from "../navigation.jsx";
import { useNavigate } from "react-router-dom";

export default function CheckReview() {
    const [reviews, setReviews] = useState([]);
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("all"); // all | approved | rejected | pending
    const [role] = useState(getCurrentUser() ? getCurrentUser().role : "guest");
    const [name] = useState(getCurrentUser() ? getCurrentUser().fullName : "guest");
    const [pending, setPending] = React.useState({});
    const [decided, setDecided] = React.useState({});
    const [note,] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        fetchAllReview();
    }, []);

    async function fetchAllReview() {
        try {
            const res = await api.get("/api/admin/check_review");
            setReviews(res.data ?? []);
            console.log("Fetched reviews:", res.data);
        } catch (error) {
            if (error.response) {
                console.error("HTTP", error.response.status, error.response.data);
            } else if (error.request) {
                console.error("NO RESPONSE", error.message);
            } else {
                console.error("SETUP ERROR", error.message);
            }
        }
    }

    const statusText = (s) => {
        if (s === 0) return "pending";
        if (s === 1) return "passed";
        return "rejected";
    };
    const statusClass = (s) => {
        if (s === 1) return "approved";
        if (s === 2) return "invalid";
        return "pending";
    };

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        return (reviews ?? []).filter((r) => {
            const matchesText =
                !qq ||
                String(r.title ?? "").toLowerCase().includes(qq) ||
                String(r.content ?? "").toLowerCase().includes(qq) ||
                String(r.id ?? "").includes(qq) ||
                String(r.applicationId ?? "").includes(qq) ||
                String(r.rating ?? "").includes(qq);

            const st = statusText(r.status);
            const matchesFilter = filter === "all" ? true : st === filter;

            return matchesText && matchesFilter;
        });
    }, [reviews, q, filter]);

    async function passReview(review) {
        const id = review.id;
        setPending((s) => ({ ...s, [id]: true }));
        setDecided((s) => ({ ...s, [id]: "approved" }));
        try {
            await api.post(`/api/admin/review/pass/${id}`, {
                note: note ?? ""
            }, {
                headers: { "Content-Type": "application/json" }
            });
            setReviews((prev) => prev.map((r) =>
                (r.id === id ? { ...r, status: 1 } : r)));
        } catch (err) {
            setDecided((s) => {
                const next = { ...s };
                delete next[id];
                return next;
            });
            console.error("pass review failed:", err.response?.data || err.message);
        } finally {
            setPending((s) => {
                const next = { ...s };
                delete next[id];
                return next;
            });
        }
    }

    async function rejectReview(review) {
        const id = review.id;
        setPending((s) => ({ ...s, [id]: true }));
        setDecided((s) => ({ ...s, [id]: "rejected" }));
        try {
            await api.post(`/api/admin/review/reject/${id}`, {
                note: note ?? ""
            }, {
                headers: { "Content-Type": "application/json" }
            });
            setReviews((prev) => prev.map((r) =>
                (r.id === id ? { ...r, status: 2 } : r)));
        } catch (err) {
            setDecided((s) => {
                const next = { ...s };
                delete next[id];
                return next;
            });
            console.error("reject review failed:", err.response?.data || err.message);
        } finally {
            setPending((s) => {
                const next = { ...s };
                delete next[id];
                return next;
            });
        }
    }

    return (

        <div className="app-root">
            <Navigation role={role} username={name} />

            <div className="container">
                <section className="toolbar" aria-label="Filters">
                    <input
                        className="input"
                        placeholder="input title / content / id / applicationId / rating to search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    <select
                        className="select"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        aria-label="Status filter"
                    >
                        <option value="all">All</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="pending">Pending</option>
                    </select>
                    <button className="btn ghost" onClick={() => { setQ(""); setFilter("all"); }}>
                        Reset
                    </button>
                </section>


                <main className="section" aria-label="Reviews list">
                    <h2>Reviews</h2>
                    <div className="muted" style={{ marginBottom: 8 }}>
                        Showing {filtered?.length} result{filtered?.length === 1 ? "" : "s"}
                    </div>

                    <div className="grid" style={{display:'flex', flexDirection:'column', gap:13}}>

                        
                        {filtered?.length === 0 && <div className="muted">No reviews found.</div>}

                        {filtered?.map((r) => {
                            const st = statusText(r.status);
                            const isDisabled = !!(pending[r.id] || decided[r.id]);
                            const busyPass = pending[r.id] && decided[r.id] === "approved";
                            const busyReject = pending[r.id] && decided[r.id] === "rejected";

                            return (
                                <article key={r.id} className="card" aria-label={`Review ${r.id}`}>
                                    <div>
                                        <div className="row">
                                            <span className="name">{r.title ?? "(No title)"}</span>
                                            <span className="muted">#{r.id}</span>
                                        </div>

                                        <div className="row" style={{ marginTop: 6 }}>
                                            <span className={`pill ${statusClass(r.status)}`}>
                                                status: {st}
                                            </span>
                                            {typeof r.rating !== "undefined" && (
                                                <span className="pill">rating: {r.rating}</span>
                                            )}
                                            {typeof r.applicationId !== "undefined" && (
                                                <span className="pill">applicationId: {r.applicationId}</span>
                                            )}
                                            {r.submittedAt && (
                                                <span className="pill">
                                                    submitted: {new Date(r.submittedAt).toLocaleString()}
                                                </span>
                                            )}
                                        </div>

                                        {r.content && (
                                            <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
                                                {r.content}
                                            </div>
                                        )}

                                        {r.reviewNote && (
                                            <div className="muted" style={{ marginTop: 6 }}>
                                                <strong>note:</strong> {r.reviewNote}
                                            </div>
                                        )}
                                    </div>

                                    <div className="actions">
                                        {st !== "passed" && st !== "rejected" && (
                                            <button
                                                className="btn"
                                                onClick={() => passReview(r)}
                                                disabled={isDisabled}
                                                aria-busy={busyPass}
                                            >
                                                {busyPass ? "passing…" : "pass"}
                                            </button>
                                        )}
                                        {st !== "passed" && st !== "rejected" && (
                                            <button
                                                className="btn danger"
                                                onClick={() => rejectReview(r)}
                                                disabled={isDisabled}
                                                aria-busy={busyReject}
                                            >
                                                {busyReject ? "rejecting…" : "reject"}
                                            </button>
                                        )}
                                        <button
                                            className="btnDetail"
                                           onClick={() => navigate("/admin/audit/reviewDetail",{ state: { id: r.id } })}
                                        >
                                            Review Detail
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </main>

                <style>{`
          *{box-sizing:border-box}
          .container{ max-width:1100px; margin: 0 auto; padding: 18px 20px; }
          .toolbar{ margin: 18px 0; display:flex; gap:10px; flex-wrap: wrap; align-items:center; }
          .input{ flex: 2 1 520px; height:46px; padding:0 14px; border-radius:12px; border:1px solid var(--border); background:#fff; color:var(--text); }
          .input::placeholder{ color:#9aa3af; }
          .input:focus{ outline:none; border-color: rgba(34,197,94,.55); box-shadow: var(--ring); }
          .select{ flex: 0 0 180px; height:46px; padding:0 12px; border-radius:12px; border:1px solid var(--border); background:#fff; color:var(--text); }
          .btn{ height:46px; padding:0 16px; border-radius:12px; border:0; background: linear-gradient(135deg, var(--accent), var(--accent-2)); color:#042f2e; font-weight:800; cursor:pointer; }
          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
            }
          .btnDetail{ height:46px; padding:0 16px; border-radius:12px; border:0; background: linear-gradient(135deg, #FFFF66, var(--accent-2)); color:#042f2e; font-weight:800; cursor:pointer; }
          .ghost{ background:#fff; border:1px solid var(--border); color:#0f172a; }
          .ghost:hover{ border-color: rgba(34,197,94,.45); }
          .section{ width:100%; background:var(--section); margin:0; padding:24px; border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--shadow); }
          .section h2{ margin:0 0 15px; color:var(--text); font-weight:700; font-size:1.5rem; }
          .muted{ color:var(--muted); font-size:14px; }
          .grid{ display:grid; gap:14px; isolation:isolate; grid-template-columns: repeat(1, minmax(0,1fr)); }
          @media (min-width:720px){ .grid{ grid-template-columns: repeat(2, minmax(0,1fr)); } }
          @media (min-width:1280px){ .grid{ grid-template-columns: repeat(3, minmax(0,1fr)); } }
          .card{ width:1000px;background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:12px; display:grid; grid-template-columns:1fr auto; gap:10px; align-items:center; box-shadow:var(--shadow); transition:.2s; }
          .card:hover{ transform:translateY(-2px); border-color: rgba(34,197,94,.35); box-shadow:0 10px 28px rgba(0,0,0,.10); }
          .row{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
          .name{ font-weight:800; }
          .pill{ font-size:12px; padding:6px 8px; border-radius:999px; border:1px solid var(--border); color:#334155; background:#fff; }
          .pill.invalid{ border-color: rgba(248,113,113,.45); color:#991b1b; background:#fff1f2; }    /* rejected */
          .pill.approved{ border-color: rgba(34,197,94,.45); color:#065f46; background:rgba(34,197,94,.08); }
          .pill.pending{ border-color: rgba(59,130,246,.35); color:#1e3a8a; background: rgba(191,219,254,.35); }
          .actions{ display:flex; gap:8px; }
          .danger{ background:#ef4444; color:#0b1220; font-weight:800; }
        `}</style>
            </div>
        </div>
    );
}
