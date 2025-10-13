import React, {useEffect, useState} from "react";
import "../../App.css";
import PropTypes from "prop-types";
import { getCurrentUser } from "../../services/authService";
import Navigation from "../navigation.jsx";
import axios from "axios";
import api from "../../services/api.js";
import { Link } from "react-router-dom";

const STATUS_MAP = {
  0: "submitted",
  1: "viewed",
  2: "resume_passed",
};

const TABS = [
  { key: "submitted", label: "Submitted" },
  { key: "viewed", label: "Viewed" },
  { key: "resume_passed", label: "Passed" },
  { key: "saved", label: "Saved" }
];

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso ?? "";
  }
}

export default function Apply_progress() {
  const [active, setActive] = useState("submitted");
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [savedCount, setSavedCount] = useState(0);
  const [role, ] = useState(getCurrentUser() ? getCurrentUser().role : 'guest');
  const [name, ] = useState(getCurrentUser() ? getCurrentUser().fullName : 'guest');

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const token = localStorage.getItem("jobspring_token");
        const res = await api.get("/api/job_seeker/applications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = res.data.content || [];
        setApplications(list);
      } catch (err) {
        console.error("Error fetching applications:", err);
      }
    };
    fetchApplications();
  }, []);

  const currentList =
      active === "saved"
          ? savedJobs
          : applications.filter((it) => STATUS_MAP[it.status] === active);

  const counts = {
    submitted: applications.filter((it) => it.status === 0).length,
    viewed: applications.filter((it) => it.status === 1).length,
    resume_passed: applications.filter((it) => it.status === 2).length,
  };

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const token = localStorage.getItem("jobspring_token");
        const res = await axios.get("/api/job_favorites", {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: 0, size: 50 }
        });
        setSavedJobs(res.data.content || []);
        setSavedCount(res.data.totalElements ?? res.data.content.length);
      } catch (err) {
        console.error("Error fetching saved jobs:", err);
      }
    };
    fetchSaved();
  }, [active]);

  return (
      <div className="app-root">
        <Navigation role={role} username={name}/>
        <p className="subheading">Application Progress and Saved</p>
        <main className="section" style={{marginTop: "10px"}}>
          <div className="tabs" role="tablist" aria-label="Applications Status" style={{marginBottom: "16px"}}>
            {TABS.map((t) => {
              let badgeCount = counts[t.key] ?? 0;
              if (t.key === "saved") {
                badgeCount = savedCount;
              }
              return (
                  <button
                      key={t.key}
                      className={`tab-btn ${active === t.key ? "active" : ""}`}
                      onClick={() => setActive(t.key)}
                      role="tab"
                      aria-selected={active === t.key}
                  >
                    {t.label}
                    <span className="badge">{badgeCount}</span>
                  </button>
              );
            })}
          </div>

          {/* 列表 */}
          <div className="list">
            {active === "saved" ? (
                savedJobs.length === 0 ? (
                    <div className="empty">No saved jobs yet.</div>
                ) : (
                    savedJobs.map((job) => (
                        <div key={job.id} className="app-card">
                          <div className="app-title"><Link
                              to={`/jobs/${job.jobId}`}
                              style={{
                                color: "#2563eb",
                                textDecoration: "none",
                                fontWeight: "700",
                              }}
                              onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                              onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                          >
                            {job.title}
                          </Link></div>
                          <div className="app-meta">
                            <span className="company">{job.company}</span>
                            <span className="dot">•</span>
                            <span className="date">{formatDate(job.favoritedAt)}</span>
                          </div>
                        </div>
                    ))
                )
            ) : (currentList.length === 0 ? (
                    <div className="empty">No applications in this status.</div>
                ) : (
                    currentList.map((it) => (
                        <div key={it.id} className="app-card">
                          <div className="app-title">
                            <Link
                                to={`/jobs/${it.jobId}`}
                                style={{
                                  color: "#2563eb",
                                  textDecoration: "none",
                                  fontWeight: "700",
                                }}
                                onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                                onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                            >
                              {it.jobTitle}
                            </Link></div>
                          <div className="app-meta">
                            <span className="company">{it.companyName}</span>
                            <span className="dot">•</span>
                            <span className="date">{formatDate(it.appliedAt)}</span>
                          </div>
                        </div>
                    )))
            )}
          </div>
        </main>
        <style>{`
       *{box-sizing:border-box}

         box-shadow:var(--ring)}
        .app-board { max-width: 860px; margin: 24px auto; padding: 16px; }
        .badge {
          display:inline-flex; align-items:center; justify-content:center;
          height: 22px; min-width: 22px; padding: 0 6px;
          border-radius: 999px; background: #111827; color: #fff; font-size: 12px;
        }
        .list { display: grid; gap: 12px; }
        .app-card {
          padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 12px;
          background: #fafafa;
        }
        .app-title { font-weight: 700; color: #111827; margin-bottom: 4px; }
        .app-meta { color: #6b7280; font-size: 14px; display: flex; align-items: center; gap: 6px; }
        .dot { opacity: .7; }
        .empty {
          padding: 24px; text-align: center; color: #6b7280;
          border: 1px dashed #e5e7eb; border-radius: 12px; background: #f9fafb;
        }
      `}</style>

        <footer
            className="section"
            style={{paddingBottom: 40, textAlign: "center", position: "fixed", bottom: 0, left: 0, width: "100%",}}
        >
          <div className="muted">
            © {new Date().getFullYear()} MySite. All rights reserved.
          </div>
        </footer>
      </div>
  );
}
Apply_progress.propTypes = {
  data: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        title: PropTypes.string,
        company: PropTypes.string,
        status: PropTypes.oneOf(["submitted", "viewed", "resume_passed"]),
      appliedAt: PropTypes.string, // ISO string
    })
  ),
};
