import React, { useMemo, useState, useEffect } from "react";
import "../../App.css";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import api from "../../services/api.js";
import {FaRegStar, FaStar} from "react-icons/fa";
import { getCurrentUser } from "../../services/authService";
import Navigation from "../navigation.jsx";



export default function Home() {
  const [query, setQuery] = useState("");
  const [q, setq] = useState("");
  const [t, sett] = useState("all");
  const [role, ] = useState(getCurrentUser() ? getCurrentUser().role : 'guest');
  const [name, ] = useState(getCurrentUser() ? getCurrentUser().fullName : 'guest');
  const [type, setType] = useState("all");
  const [JobPosition, setJobPosition] = useState([]);
  const navigate = useNavigate();
  const [favoriteIds, setFavoriteIds] = useState(new Set());

  useEffect(() => {
    fetchJobPosition();
    fetchFavorites();
  }, []);

  const fetchJobPosition = async () => {
    try {
      const response = await api.get('/api/job/job_list');
      setJobPosition(response.data.content);
    } catch (error) {
      console.error('Error fetching JobPosition:', error);
    } 
  };

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem("jobspring_token");
      const res = await api.get("/api/job/job_favorites", {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 0, size: 100 } 
      });
      const ids = new Set((res.data.content || []).map(f => f.jobId));
      setFavoriteIds(ids);
    } catch (e) {
      console.error("Error fetching favorites:", e);
    }
  };

  const filtered = useMemo(() => {
    console.log('[Home] compute filtered', { len: (JobPosition || []).length, query, type });
    const q = query.trim().toLowerCase();
    return (JobPosition ?? []).filter((j) => {
      const hay = `${j.title ?? ''} ${j.company ?? ''} ${j.location ?? ''} ${(j.tags ?? []).join(' ')}`.toLowerCase();
      const inText = q ? hay.includes(q) : true;
      const t = (j.employmentType ?? '').toString().toLowerCase();
      const typeOK = type === 'all' ? true : t === type;

      return inText && typeOK;
    });
  }, [JobPosition, q, t]);

  const handleSearch = async () => {
    setq(query.trim());
    sett(type);
    if (!query.trim()) {
      fetchJobPosition();
      return;
    }
    try {
      const res = await axios.get("/api/job/job_seeker/job_list/search", {
        params: { keyword: query, page: 0, size: 50 },
      });
      let list = res.data.content ?? [];
      if (type && type !== "all") {
        list = list.filter((j) => {
          const t = (j.employmentType ?? "").toLowerCase();
          return t === type.toLowerCase();
        });
      }
      setJobPosition(list);
    } catch (e) {
      console.error("Error searching jobs:", e);
    } finally {
      //  setLoading(false);
    }
  };

  const toggleFavorite = async (jobId, jobTitle) => {
    try {
      const token = localStorage.getItem("jobspring_token");
      if (favoriteIds.has(jobId)) {
        await api.delete(`/api/job/job_favorites/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavoriteIds(prev => {
          const copy = new Set(prev);
          copy.delete(jobId);
          return copy;
        });
        alert(`Saved job: ${jobTitle} has been canceled!`)
      } else {
        await api.post(`/api/job/job_favorites/${jobId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavoriteIds(prev => new Set(prev).add(jobId));
        alert(`Saved: ${jobTitle} successfully!`)
      }
    } catch (e) {
      console.error("Error toggling favorite:", e);
    }
  };

  return (
    <div className="app-root">

      <Navigation role={role} username={name} />

      <header className="hero" aria-label="Search jobs">
        <div className="hero-img">
          <div className="hero-overlay" />
          <div className="search-wrap">
            <input
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs, companies, locations, or tags..."
              aria-label="Search"
            />
            <select
              className="select"
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Job type"
            >
              <option value="all">All types</option>
              <option value="full-time">Full-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
            <button className="btn" onClick={handleSearch}>
              Search
            </button>
          </div>
        </div>
      </header>

      <main className="section">
        <br></br> <h2>Jobs</h2>
        <div className="muted">
          Showing {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </div>
        <br></br>
        <div className="grid">
          {filtered.map((j) => (
            <article key={j.id} className="card" aria-label={`${j.title} at ${j.company}`}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700 }}>{j.title}</div>
                {/* <span className="chip">{j.type}</span> */}
              </div>
              <div className="row" style={{ color: "black" }}>
                <span>{j.company}</span>
                <span> • </span>
                <span>{j.location}</span>
              </div>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {j.tags.map((t) => (
                  <span key={t} className="chip" style={{ borderColor: "rgba(96,165,250,.35)", color: "#192534ff" }}>
                    {t}
                  </span>
                ))}
              </div>
              <p className="muted" style={{ margin: 0 }}>{j.description}</p>
              <div className="cta">
                <button
                  className="btn"
                  onClick={() => navigate(`/jobs/${j.id}`)}   
                >
                  Apply
                </button>
                <button
                  className="tab-btn ghost"
                  onClick={() => toggleFavorite(j.id, j.title)}
                  style={{ fontSize: "20px", color: favoriteIds.has(j.id) ? "#fbbf24" : "#6b7280" }}
                >
                  {favoriteIds.has(j.id) ? <FaStar /> : <FaRegStar />}
                </button>

              </div>
              <div className="muted" style={{ fontSize: 12 }}>Posted on {j.postedAt}</div>
            </article>
          ))}
        </div>
      </main>
      <style>{`
        *{box-sizing:border-box}
      `}</style>

      <footer className="site-footer">NUS ISS JobSpring</footer>
    </div>
  );
}
