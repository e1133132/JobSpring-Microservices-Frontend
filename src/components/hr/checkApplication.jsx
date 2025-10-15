// src/components/hr/CheckApplications.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api.js";
import { getCurrentUser } from "../../services/authService";
import Navigation from "../navigation.jsx";
import { useNavigate } from "react-router-dom";


const STATUS_MAP = {
  0: "Submitted",
  1: "Selecting",
  2: "Passed",
  3: "Rejected",
  4: "Invalid",
};

const statusText = (s) => STATUS_MAP[s] ?? `Unknown(${s})`;
const statusClass = (s) => {
  if (s === 2) return "passed";
  if (s === 4) return "invalid";
  if (s === 0) return "pending";
  return "info";
};

export default function CheckApplication() {
  const [apps, setApps] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); 
  const [role] = useState(getCurrentUser() ? getCurrentUser().role : "guest");
  const [name] = useState(getCurrentUser() ? getCurrentUser().fullName : "guest");
  const [errMsg, setErrMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    try {
      const res = await api.get("/api/application/applications", { params: { page: 0, size: 50 } });
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : payload?.content ?? [];
      setApps(list ?? []);
      setErrMsg("");
      console.table(list.map(a => ({ id: a.id, jobId: a.jobId, status: a.status })));
    } catch (error) {
      const msg =
        error.response?.status === 403
          ? (error.response?.data?.message ?? "No permission (HR role & company binding required).")
          : error.response?.data?.message || error.message || "Request failed.";
      setErrMsg(msg);
      setApps([]);
      console.error("FETCH /api/hr/applications:", error.response ?? error);
    }
  }

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (apps ?? [])
      .filter((a) => {
        const passKw =
          !kw ||
          String(a.jobTitle ?? "").toLowerCase().includes(kw) ||
          String(a.applicantName ?? "").toLowerCase().includes(kw) ||
          String(a.id ?? "").includes(kw) ||
          String(a.jobId ?? "").includes(kw);
        const passStatus = filter === "all" ? true : Number(a.status) === Number(filter);
        return passKw && passStatus;
      })
      .sort((a, b) => {
        const ta = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
        const tb = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
        return tb - ta;
      });
  }, [apps, q, filter]);

  return (
    <div className="app-root">
      <Navigation role={role} username={name} />

      <div className="container">
        <section className="toolbar" aria-label="Filters">
          <input
            className="input"
            placeholder="Search: Job Title / Applicant / ID / JobId"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Status filter"
          >
            <option value="all">All statuses</option>
            <option value="0">Submitted</option>
            <option value="1">Selecting</option>
            <option value="2">Passed</option>
            <option value="3">Rejected</option>
            <option value="4">Invalid</option>
          </select>
          <button className="btn ghost" onClick={() => { setQ(""); setFilter("all"); }}>
            Reset
          </button>
        </section>

        {errMsg && (
          <div className="section" role="alert" style={{ marginBottom: 12, color: "#991b1b", background: "#fff1f2" }}>
            {errMsg}
          </div>
        )}

        <main className="section" aria-label="Applications list">
          <h2>Applications</h2>
          <div className="muted" style={{ marginBottom: 8 }}>
            Showing {filtered?.length ?? 0} result{(filtered?.length ?? 0) === 1 ? "" : "s"}
          </div>

          <div className="grid">
            {filtered?.length === 0 && <div className="muted">No applications found.</div>}

            {filtered?.map((a) => (
              <article key={a.id} className="card" aria-label={`Application ${a.id}`}>
                <div>
                  <div className="row">
                    <span className="name">{a.jobTitle ?? "(Untitled Job)"}</span>
                    <span className="pill">#ID: {a.id}</span>
                    {typeof a.jobId !== "undefined" && <span className="pill">JobId: {a.jobId}</span>}
                  </div>

                  <div className="row" style={{ marginTop: 6 }}>
                    <span className={`pill ${statusClass(a.status)}`}>
                      Status: {statusText(a.status)}
                    </span>
                    <span className="pill">Applicant: {a.applicantName ?? "-"}</span>
                    {a.appliedAt && (
                      <span className="pill">
                        Applied at: {new Date(a.appliedAt).toLocaleString()}
                      </span>
                    )}
                    {<button className="btn" style={{ fontSize: 15, padding: "6px 10px",marginLeft: 'auto',transform: "translateY(-15px)" }}
                    onClick={() => navigate("/hr/applications/applicationDetail", { state: { id: a.id } })}> 
                      Manage 
                    </button>}
                  </div>
                </div>
                <div className="actions" />
              </article>
            ))}
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
          .ghost{ background:#fff; border:1px solid var(--border); color:#0f172a; }
          .ghost:hover{ border-color: rgba(34,197,94,.45); }
          .section{ width:100%; background:var(--section); margin:0; padding:24px; border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--shadow); }
          .section h2{ margin:0 0 15px; color:var(--text); font-weight:700; font-size:1.5rem; }
          .muted{ color:var(--muted); font-size:14px; }

          .grid{ display:grid; gap:14px; isolation:isolate; grid-template-columns: repeat(1, minmax(0,1fr)); }
          @media (min-width:720px){ .grid{ grid-template-columns: repeat(2, minmax(0,1fr)); } }
          @media (min-width:1280px){ .grid{ grid-template-columns: repeat(3, minmax(0,1fr)); } }

          .card{ background:var(--surface); width:1000px; border:1px solid var(--border); border-radius:var(--radius); padding:12px; display:grid; grid-template-columns:1fr auto; gap:10px; align-items:center; box-shadow:var(--shadow); transition:.2s; }
          .card:hover{ transform:translateY(-2px); border-color: rgba(34,197,94,.35); box-shadow:0 10px 28px rgba(0,0,0,.10); }
          .row{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
          .name{ font-weight:800; }
          .pill{ font-size:12px; padding:6px 8px; border-radius:999px; border:1px solid var(--border); color:#334155; background:#fff; text-decoration:none; }
          .pill.invalid{ border-color: rgba(248,113,113,.45); color:#991b1b; background:#fff1f2; }
          .pill.approved{ border-color: rgba(34,197,94,.45); color:#065f46; background:rgba(34,197,94,.08); }
          .pill.pending{ border-color: rgba(59,130,246,.35); color:#1e3a8a; background: rgba(191,219,254,.35); }
          .pill.info{ border-color: rgba(234,179,8,.35); color:#92400e; background: rgba(254,240,138,.5); }
          .actions{ display:flex; gap:8px; }
        `}</style>
      </div>
    </div>
  );
}
