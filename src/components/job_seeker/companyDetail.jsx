import React, { useEffect, useState } from "react";
import "../../App.css";
import { getCurrentUser } from "../../services/authService";
import Navigation from "../navigation.jsx";
import api from "../../services/api.js";
import { useParams, useNavigate } from "react-router-dom";

export default function CompanyDetail() {
    const { companyId } = useParams();
    const [company, setCompany] = useState(null);
    const [activeTab, setActiveTab] = useState("about");
    const [jobs, setJobs] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const role = getCurrentUser() ? getCurrentUser().role : "guest";
    const name = getCurrentUser() ? getCurrentUser().fullName : "guest";
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const token = localStorage.getItem("jobspring_token");
                const res = await api.get(`/api/company/${companyId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setCompany(res.data);
            } catch (err) {
                console.error("Failed to fetch company:", err);
                setError("Failed to load company details.");
            } finally {
                setLoading(false);
            }
        };
        fetchCompany();
    }, [companyId]);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const token = localStorage.getItem("jobspring_token");
                const res = await api.get(`/api/company/${companyId}/jobs?page=0&size=10`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setJobs(res.data.content || res.data);
            } catch (err) {
                console.error("Failed to fetch jobs:", err);
            }
        };
        fetchJobs();
    }, [companyId]);

    if (loading) return <div className="section">Loading company details...</div>;
    if (error) return <div className="section">{error}</div>;
    if (!company) return <div className="section">Company not found.</div>;

    return (
        <div className="app-root" style={{ overflowX: "hidden" }}>
            <Navigation role={role} username={name} />

            <p className="subheading">COMPANY DETAILS</p>

            <div className="card" style={{ maxWidth: "1200px", margin: "0 auto" }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        marginBottom: "10px",
                    }}
                >
                    <div>
                        <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#111827" }}>
                            {company.name}
                        </h1>
                        {company.location && (
                            <p style={{ fontSize: "14px", color: "#6b7280" }}>{company.location}</p>
                        )}
                    </div>

                    {company.logoUrl && (
                        <img
                            src={company.logoUrl}
                            alt="Company Logo"
                            style={{
                                width: "100px",
                                height: "100px",
                                objectFit: "contain",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                            }}
                        />
                    )}
                </div>

                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        borderBottom: "1px solid #e5e7eb",
                        paddingBottom: "10px",
                        flexWrap: "wrap",
                        marginBottom: "20px",
                    }}
                >
                    {[
                        { key: "about", label: "Company Intro" },
                        { key: "jobs", label: "Posted Jobs" },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "12px",
                                border: activeTab === tab.key ? "2px solid #111827" : "1px solid #e5e7eb",
                                background: activeTab === tab.key ? "#111827" : "#fff",
                                color: activeTab === tab.key ? "#fff" : "#111827",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all .15s ease",
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div style={{ marginTop: "10px" }}>
                    {activeTab === "about" && (
                        <div>
                            {company.website && (
                                <div style={{ marginBottom: "28px" }}>
                                    <p
                                        style={{
                                            fontWeight: 700,
                                            color: "#111827",
                                            fontSize: "16px",
                                            marginBottom: "6px",
                                        }}
                                    >
                                        Website
                                    </p>
                                    <p style={{ margin: 0, lineHeight: 1.7 }}>
                                        <a
                                            href={company.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                color: "#2563eb",
                                                fontWeight: 500,
                                                textDecoration: "underline",
                                                wordBreak: "break-all",
                                            }}
                                        >
                                            {company.website}
                                        </a>
                                    </p>
                                </div>
                            )}

                            <div>
                                <p
                                    style={{
                                        fontWeight: 700,
                                        color: "#111827",
                                        fontSize: "16px",
                                        marginBottom: "6px",
                                    }}
                                >
                                    Description
                                </p>

                                {company.description ? (
                                    company.description.split(/\n+/).map((para, i) => (
                                        <p
                                            key={i}
                                            style={{
                                                margin: "0 0 12px 0",
                                                lineHeight: 1.8,
                                                color: "#374151",
                                            }}
                                        >
                                            {para.trim()}
                                        </p>
                                    ))
                                ) : (
                                    <p style={{ color: "#6b7280" }}>No description provided.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "jobs" && (
                        <div>
                            {jobs.length === 0 ? (
                                <p>No active jobs posted yet.</p>
                            ) : (
                                <ul style={{ paddingLeft: "0", listStyle: "none", marginTop: "10px" }}>
                                    {jobs.map((job) => (
                                        <li
                                            key={job.id}
                                            style={{
                                                border: "1px solid #e5e7eb",
                                                borderRadius: "10px",
                                                padding: "16px",
                                                marginBottom: "12px",
                                                background: "#fafafa",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    flexWrap: "wrap",
                                                }}
                                            >
                        <span
                            style={{
                                color: "#2563eb",
                                textDecoration: "underline",
                                fontWeight: "600",
                                fontSize: "18px",
                                cursor: "pointer",
                            }}
                            onClick={() => navigate(`/jobs/${job.id}`)}
                        >
                          {job.title}
                        </span>
                                                <span style={{ fontSize: "14px", color: "#6b7280" }}>
                          Posted on {new Date(job.postedAt).toLocaleDateString()}
                        </span>
                                            </div>
                                            <p style={{ color: "#4b5563", marginTop: "10px" }}>
                                                Salary: ${job.salaryMin?.toFixed(0)} - ${job.salaryMax?.toFixed(0)}
                                            </p>
                                            <p style={{ color: "#374151", marginTop: "8px", lineHeight: 1.6 }}>
                                                {job.description}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: "40px" }}>
                    <button
                        type="button"
                        className="back-btn"
                        onClick={() => navigate(-1)}
                    >
                        Back
                    </button>
                </div>
            </div>

            <style>{`
        .card { 
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          padding: 24px;
          box-shadow: 0 8px 30px rgba(0,0,0,.06);
        }

        .card button.back-btn {
          appearance: none;
          border: 0;
          border-radius: 12px;
          padding: 10px 16px;
          font-weight: 700;
          cursor: pointer;
          background: #111827;   
          color: #fff;
          transition: filter .15s ease;
        }
        .card button.back-btn:hover { filter: brightness(1.03); }

        * { box-sizing: border-box; }
      `}</style>

            <footer
                className="section"
                style={{ paddingBottom: 40, textAlign: "center" }}
            >
                <div className="muted">
                    © {new Date().getFullYear()} MySite. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
