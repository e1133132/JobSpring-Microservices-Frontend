import React, { useMemo, useState, useEffect } from "react";
import api from "../../services/api.js";
import { getCurrentUser } from "../../services/authService";
import Navigation from "../navigation.jsx";

export default function AdminDashboard() {
  const [jobs, setJobs] = useState([]);
  const [q, setQ] = useState("");
  const [filter, ] = useState("all");
  const [role,] = useState(getCurrentUser() ? getCurrentUser().role : 'guest');
  const [name,] = useState(getCurrentUser() ? getCurrentUser().fullName : 'guest');
  const [locking, setLocking] = useState(new Set());

  const isInvalid = (s) => s === 1 || s === "invalid";
  const statusLabel = (s) => (isInvalid(s) ? "inactive" : "active");
  useEffect(() => {
    fetchJobStatus();
  }, []);

  const fetchJobStatus = async () => {
    try {
      const response = await api.get('/api/job/status');
      setJobs(response.data);
      console.log('Fetched jobs:', response.data);
    } catch (error) {
      if (error.response) {
        console.error('HTTP', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('NO RESPONSE', error.message);
      } else {
        console.error('SETUP ERROR', error.message);
      }
    }
  }


  const invalidJob = async (companyId, jobId) => {
    if (isInvalid(jobs.find(x => x.jobId === jobId)?.status)) return;
    if (locking.has(jobId)) return;
    setLocking(prev => new Set(prev).add(jobId));
    try {
      await api.post(`/api/job/companies/${companyId}/jobs/${jobId}/invalid`);
      setJobs(prev => prev.map(j => j.jobId === jobId ? { ...jobId, status: 1 } : j));
    } catch (error) {
      if (error.response) {
        console.error('HTTP', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('NO RESPONSE', error.message);
      } else {
        console.error('SETUP ERROR', error.message);
      }
    }
  }

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return jobs?.filter((j) => {
      const text = `${j.title} ${j.company} ${j.status}`.toLowerCase();
      const passKw = text.includes(kw);
      const passStatus = filter === "all" ? true : j.status === filter;
      console.log("status"+j.status );
      return passKw && passStatus;
    });
  }, [jobs,q]);


  return (
    <div className="app-root">
      <Navigation role={role} username={name} />

      <div className="container">
        <section className="toolbar" aria-label="Filters">
          <input
            className="input"
            placeholder="input title / company / status to search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
         
        </section>

          <main className="section" aria-label="Jobs list">
            <h2>Jobs</h2>
            <div className="muted" style={{ marginBottom: 10 }}>
              Showing {filtered?.length} result{filtered?.length === 1 ? "" : "s"}
            </div>
            <div className="grid"
            style={{display:'flex', flexDirection:'column', gap:13}}>
              {filtered?.length === 0 && <div className="muted">No jobs found.</div>}
              {filtered?.map((j) => (
                <article key={j.id} className="card" aria-label={`Job ${j.id}`}>
                  <div>
                    <div className="row">
                      <span className="name">{j.title}</span>
                      <span className="muted">@ {j.company}</span>
                    </div>
                    <div className="row" style={{ marginTop: 6 }}>
                      <span className={`pill ${j.status === "invalid" ? "invalid" : ""}`}>
                         status: {statusLabel(j.status)}
                      </span>
                      <span className="pill">id: {j.id}</span>
                    </div>
                  </div>
                  <div className="actions">
                    <button
                      className="btn warning"
                      disabled={isInvalid(j.status) || locking.has(j.id)}
                      onClick={() => invalidJob(j.companyId, j.id)}
                      title={isInvalid(j.status) ? "Already inactive" : "Mark as invalid"}
                    >
                      invalid
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </main>
        <style>{`
        *{box-sizing:border-box}

        .spacer{ flex:1; }
        .card{ width:1000px;background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:12px; display:grid; grid-template-columns:1fr auto; gap:10px; align-items:center; box-shadow:var(--shadow); transition:.2s; }
        .tabs{ display:flex; gap:8px; }
        .tab-btn{
          padding: 10px 14px; border-radius: 12px;
          border: 1px solid var(--border); background: transparent;
          color:#334155; cursor:pointer;
        }
        .tab-btn:hover{ border-color: rgba(34,197,94,.45); color:#111827; }
        .tab-btn.active{
          background: rgba(34,197,94,.12);
          border-color: rgba(34,197,94,.45);
          color:#065f46;
          box-shadow: var(--ring);
        }

        
        .container{ max-width:1100px; margin: 0 auto; padding: 18px 20px; }

        .toolbar{
          margin: 18px 0; display:flex; gap:10px; flex-wrap: wrap;
          align-items: center;
        }
        .input{
          flex: 2 1 520px;                
          height: 46px; 
          padding: 0 14px; 
          border-radius: 12px;
          border: 1px solid var(--border); 
          background: #fff; 
          color: var(--text);
        }
        .input::placeholder{ color:#9aa3af; }
        .input:focus{ outline:none; border-color: rgba(34,197,94,.55); box-shadow: var(--ring); }

        .select{
          flex: 0 0 180px;
          height: 46px; padding: 0 12px; border-radius: 12px;
          border: 1px solid var(--border); background: #fff; color: var(--text);
        }

        .btn{
          height: 46px; padding: 0 16px; border-radius: 12px; border: 0;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color:#042f2e; font-weight:800; cursor: pointer;
        }
        .btn:disabled {
          opacity: .55;
          cursor: not-allowed;
          filter: grayscale(100%);
        }

        .ghost{
          background: #fff; border:1px solid var(--border); color:#0f172a;
        }
        .ghost:hover{ border-color: rgba(34,197,94,.45); }

        .section{
          width: 100%;
          background: var(--section);
          margin: 0;
          padding: 24px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
        }
        .section h2{
          margin: 0 0 15px;
          color: var(--text);
          font-weight: 700; font-size: 1.5rem;
        }
        .muted{ color: var(--muted); font-size: 14px; }

        .grid{
          display:grid; gap: 14px; isolation: isolate;
          grid-template-columns: repeat(1, minmax(0,1fr));
        }
        @media (min-width: 720px){ .grid{ grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (min-width: 1280px){ .grid{ grid-template-columns: repeat(3, minmax(0,1fr)); } }

        .card{
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 12px;
          display: grid; grid-template-columns: 1fr auto;
          gap: 10px; align-items: center;
          box-shadow: var(--shadow);
          transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
        }
        .card:hover{
          transform: translateY(-2px);
          border-color: rgba(34,197,94,.35);
          box-shadow: 0 10px 28px rgba(0,0,0,.10);
        }

        .row{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .name{ font-weight: 800; }
        .pill{
          font-size:12px; padding:6px 8px; border-radius:999px;
          border:1px solid var(--border); color:#334155; background:#fff;
        }
        .pill.invalid{
          border-color: rgba(248,113,113,.45);
          color:#991b1b; background: #fff1f2;
        }

        .actions{ display:flex; gap:8px; }
        .danger{ background:#ef4444; color:#0b1220; font-weight:800; }
        .warning{ background:#f59e0b; color:#0b1220; font-weight:800; }
      `}</style>

      </div>
    </div>

  );

}
