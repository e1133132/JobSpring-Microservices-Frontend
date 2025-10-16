import React, { useEffect, useState } from "react";
import {useNavigate, useParams} from "react-router-dom";
import "../../App.css";
import api from "../../services/api.js";
import { getCurrentUser } from "../../services/authService";
import Navigation from "../navigation.jsx";
import {FaRegStar, FaStar} from "react-icons/fa";

export default function JobDetail() {
    const { id } = useParams();
    const [job, setJob] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isFavorited, setIsFavorited] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [role, ] = useState(getCurrentUser() ? getCurrentUser().role : 'guest');
    const [name, ] = useState(getCurrentUser() ? getCurrentUser().fullName : 'guest');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const response = await api.get('/api/job/job_list');
                const jobs = response.data.content;
                const found = jobs.find((j) => String(j.id) === String(id));
                setJob(found);
            } catch (error) {
                console.error("Failed to fetch job:", error);
            }
        };

        const fetchFavoriteStatus = async () => {
            try {
                const token = localStorage.getItem("jobspring_token");
                if (!token) return;
                const res = await api.get(`/api/job/job_favorites/${id}/is-favorited`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setIsFavorited(res.data === true);
            } catch (e) {
                console.error("Failed to check favorite status:", e);
            }
        };

        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem("jobspring_token");
                if (!token) return;
                const res = await api.get("/api/user/profile", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setProfile(res.data);
            } catch (e) {
                console.error("Failed to fetch profile:", e);
            }
        };

        fetchJob();
        fetchFavoriteStatus();
        fetchProfile();
    }, [id]);


    if (!job) return <div className="section">Job not found.</div>;

    const rawType = job.employment_type || job.employmentType;

    const typeMap = {
        1: "Full-time",
        2: "Internship",
        3: "Contract",
    };

    const typeText = typeMap[rawType] || rawType || "N/A";

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        try {
            return new Date(dateStr).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                hour12: true,
            });
        } catch {
            return dateStr;
        }
    };

    const handleApply = async () => {
        if (!selectedFile) {
            alert("Please upload your resume file before applying!");
            return;
        }

        try {
            const token = localStorage.getItem("jobspring_token");
            if (!token) {
                alert("Please login first!");
                return;
            }

            const formData = new FormData();
            formData.append("resumeProfile", profile?.profile?.summary || "No profile data");
            formData.append("file", selectedFile);

            for (let [key, value] of formData.entries()) {
                console.log(key, value);
            }

            const res = await api.post(`/api/application/applications/${id}/applications`, formData );
            const data = res.data;
            console.log("Response:", data);
            if (data?.publicId) {
                console.log("ID:", data.publicId);

                alert(`Apply successfully!`);
            } else {
                alert("Apply Successfully!");
            }
            setShowUpload(false);
            setSelectedFile(null);
        } catch (e) {
            console.error("Failed to apply:", e);
            alert("Apply failed! You have applied before.");
        }
    };

    const toggleFavorite = async () => {
        try {
            const token = localStorage.getItem("jobspring_token");
            if (!token) {
                alert("Please login first!");
                return;
            }
            if (isFavorited) {
                await api.delete(`/api/job_favorites/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setIsFavorited(false);
                alert(`Removed from favorites: ${job.title}`);
            } else {
                await api.post(`/api/job_favorites/${id}`, {}, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setIsFavorited(true);
                alert(`Saved: ${job.title}`);
            }
        } catch (e) {
            console.error("Error toggling favorite:", e);
        }
    };

    return (
        <div className="app-root">
            <Navigation role={role} username={name} />

            <main
                className="section"
                style={{
                    display: "flex",
                    gap: "24px",
                    marginTop: "20px",
                    padding: "20px",
                    maxWidth: "1200px",
                    marginLeft: "auto",
                    marginRight: "auto",
                    boxSizing: "border-box",
                    flexWrap: "wrap"
                }}
            >
                {/* 左边 */}
                <div style={{ flex: "2 1 600px", minWidth: "300px" }}>
                    <article className="card" style={{ padding: "24px" }}>
                        <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "12px" }}>
                            {job.title}
                        </h1>
                        <div className="muted" style={{ marginBottom: "20px" }}>
                            <span style={{ fontWeight: 600, color: "#16a34a" }}>
                                {job.salaryMin ? job.salaryMin : "N/A"} - {job.salaryMax ? job.salaryMax : "N/A"} SGD
                            </span>
                            {" · "}
                            {job.location || "N/A"} {" · "}
                            {typeText} {" · "}
                            Posted at {formatDate(job.postedAt)}
                        </div>

                        <h3 style={{ marginBottom: "10px" }}>Job Description</h3>
                        <p style={{ lineHeight: 1.6, color: "#333" }}>{job.description}</p>

                        <div className="cta" style={{marginTop: "20px"}}>
                            <button className="btn" onClick={() => setShowUpload(true)}>Apply Now</button>
                            <button
                                className="tab-btn ghost"
                                onClick={toggleFavorite}
                                style={{fontSize: "20px", color: isFavorited ? "#fbbf24" : "#6b7280"}}
                            >
                                {isFavorited ? <FaStar/> : <FaRegStar/>}
                            </button>
                        </div>
                    </article>
                </div>

                {/* 右边 */}
                <div style={{flex: "1 1 300px", minWidth: "260px"}}>
                    <article className="card" style={{padding: "20px"}}>
                        <h3 style={{marginBottom: "10px"}}>Company Info</h3>
                        <p style={{fontWeight: 600}}>
                            Name:&nbsp;
                            <span
                                onClick={() => navigate(`/company/${job.companyId}`)}
                                style={{
                                    color: "#2563eb",
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                }}
                            >{job.company}</span>
                        </p>
                        <p className="muted">Location: {job.location}</p>
                    </article>
                </div>
            </main>

            {showUpload && (
                <div
                    style={{
                        position: "fixed",
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: "rgba(0,0,0,.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        zIndex: 1000
                    }}
                >
                    <div
                        style={{
                            background: "#fff",
                            padding: "24px",
                            borderRadius: "8px",
                            width: "400px",
                            textAlign: "center"
                        }}
                    >
                        <h3>Upload Resume (PDF)</h3>
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => setSelectedFile(e.target.files[0])}
                            style={{ marginTop: "10px" }}
                        />
                        <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button className="btn" onClick={handleApply}>Submit</button>
                            <button className="btn ghost" onClick={() => setShowUpload(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}


            <style>{`
        *{box-sizing:border-box}

        .logo{display:flex; align-items:center; gap:10px}
        .logo-mark{width:36px; height:36px; border-radius:10px;
         background:linear-gradient(135deg,var(--accent),var(--accent-2));
          display:grid; place-items:center; box-shadow:var(--shadow)}
        .logo-mark span{font-weight:800; color:#0b1220}
        .brand{font-weight:700; letter-spacing:.3px}
        .spacer{flex:1}
        .tabs{display:flex; gap:10px}
        .tab-btn{
            padding:10px 14px; border-radius:12px;
            border:1px solid var(--border);
            color:#334155;font-weight: 600; background: transparent; cursor:pointer;
        }
        .tab-btn:hover{
            border-color: rgba(34,197,94,.45); color:#111827;
        }
        .tab-btn.active{
            background: rgba(34,197,94,.12);
            border-color: rgba(34,197,94,.45);
            color:#065f46;
            box-shadow: var(--ring);
        }
        .muted{color:var(--muted); font-size:14px}
        .cta{margin-top:auto; display:flex; gap:12px}
               
        .app-root {
            background: #fffcf5;
            min-height: 100vh;
        }
      `}</style>

            <footer className="section"
                    style={{paddingBottom: 40, textAlign: "center"}}>
                <div className="muted">© {new Date().getFullYear()} MySite. All rights reserved.</div>
            </footer>
        </div>
    );
}
