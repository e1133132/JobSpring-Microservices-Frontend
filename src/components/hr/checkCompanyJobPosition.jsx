import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../navigation.jsx";
import { FaArrowLeft, FaSync } from "react-icons/fa";
import api from "../../services/api.js";
import { getCurrentUser } from "../../services/authService";

function formatDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d) ? "-" : d.toLocaleString();
}

function normalizePosition(p = {}) {
  const statusNum = Number(p.status ?? p.state ?? 0);
  const status = statusNum === 0 ? "valid" : "invalid";

  return {
    id: p.id ?? p.positionId ?? p.pid,
    title: p.title ?? p.name ?? "",
    company: p.companyName ?? p.company ?? "",
    location: p.location ?? p.city ?? "",
    type: p.type ?? p.employmentType ?? "",
    statusNum,
    status, 
    postedAt: p.postedAt ?? p.posted_at,
  };
}

const STATUS_MAP = {
  valid:   { text: "valid",   cls: "chip chip-valid" },
  invalid: { text: "invalid", cls: "chip chip-invalid" },
};

export default function CheckCompanyJobPosition() {
  const navigate = useNavigate();
  const me = getCurrentUser();
  const [role] = useState(me ? me.role : "guest");
  const [username] = useState(me ? me.fullName : "guest");

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/job/companies/jobs");
      const raw = Array.isArray(res.data?.content) ? res.data.content
                : Array.isArray(res.data) ? res.data
                : [];
      setList(raw.map(normalizePosition));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Load failed");
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const companyName = useMemo(() => list[0]?.company || "", [list]);

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
          <div className="title">
            My Company Positions {companyName ? <span className="muted">— {companyName}</span> : null}
          </div>
          <button className="btn" onClick={load} disabled={loading} title="Refresh">
            <FaSync style={{ position: "relative", top: 2, marginRight: 6 }} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </header>

        {error && <div className="err-text" style={{ marginBottom: 8 }}>{error}</div>}
        {!loading && list.length === 0 && !error && (
          <div className="empty"><div className="muted">No positions found.</div></div>
        )}

        <section className="grid">
          {list.map((p) => {
            const s = STATUS_MAP[p.status] || STATUS_MAP.invalid;
            return (
              <article key={p.id} className="pos-card">
                <div className="pc-left">
                  <div className="pc-title">
                    {p.title || "(Untitled)"} <span className={s.cls}>{s.text}</span>
                  </div>
                  <div className="row"><span className="label">ID:</span><span className="val">{p.id}</span></div>
                  {p.location && <div className="row"><span className="label">Location:</span><span className="val">{p.location}</span></div>}
                  {p.type && <div className="row"><span className="label">Type:</span><span className="val">{p.type}</span></div>}
                  <div className="row"><span className="label">Created:</span><span className="val">{formatDate(p.postedAt)}</span></div>
                </div>
                <div className="pc-right">
                  {p.statusNum === 0 ? (
                  <button
                    className="btn primary"
                    onClick={() => navigate(`/hr/jobs-detail/${p.id}`, { state: { id: p.id } })}
                    title="Update this position"
                  >
                    Update
                  </button>
                  ) : (
                      <button className="btn disabled" disabled title="This position is closed">
                        Closed
                      </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>

      <style>{`
        *{box-sizing:border-box}
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:0; padding:20px; box-shadow:0 8px 30px rgba(0,0,0,.06); }
        .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .title { font-size:20px; font-weight:700; }
        .muted{ color:#6b7280; font-size:13px; }
        .err-text{ color:#b91c1c; font-size:13px; }
        .btn{ appearance:none; border:1px solid #e5e7eb; background:#fff; color:#111827; border-radius:12px; padding:10px 14px; font-weight:700; cursor:pointer; }
        .btn:hover{ background:#f9fafb; }
        .btn.primary{ background:#111827; color:#fff; border-color:#111827; }
        .btn.primary:hover{ filter:brightness(1.03); }
        .btn.ghost{ background:transparent; border-color:transparent; color:#111827; padding-left:0; }
        .icon{ position:relative; top:3px; width:1em; height:1em; }

        .empty{ padding:16px 0; }
        .grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap:12px; }
        .pos-card{ display:flex; justify-content:space-between; gap:12px; border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#fff; }
        .pc-left{ min-width:0; }
        .pc-right{ display:flex; align-items:center; }
        .pc-title{ font-weight:700; margin-bottom:8px; font-size:16px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .row{ display:flex; gap:8px; margin:3px 0; align-items:baseline; }
        .label{ color:#6b7280; width:80px; flex:0 0 80px; font-size:13px; }
        .val{ font-size:14px; word-break:break-all; }

        .chip{ padding:3px 8px; border-radius:999px; font-size:12px; font-weight:600; border:1px solid #e5e7eb; }
        .chip-valid{  background:#ecfdf5; color:#065f46; border-color:#a7f3d0; }   /* 绿 */
        .chip-invalid{ background:#fef2f2; color:#991b1b; border-color:#fecaca; }  /* 红 */
      `}</style>
    </div>
  );
}
