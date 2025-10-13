import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../navigation.jsx";
import { FaArrowLeft, FaSearch } from "react-icons/fa";
import Swal from "sweetalert2";
import api from "../../services/api.js";
import { getCurrentUser } from "../../services/authService";

function normalizeUser(u = {}) {
    return {
        id: u.id ?? u.userId ?? u.uid,
        email: u.email ?? u.emailAddress ?? "",
        fullName: u.full_name ?? u.fullName ?? u.name ?? "",
        phone: u.phone ?? u.phoneNumber ?? "",
        role: u.role,
    };
}
function isHR(role) {
    if (role == null) return false;
    if (typeof role === "string") return role.toLowerCase() === "hr";
    return Number(role) === 1;
}

export default function CreateHR() {
    const navigate = useNavigate();
    const me = getCurrentUser();
    const [role] = useState(me ? me.role : "guest");
    const [username] = useState(me ? me.fullName : "guest");

    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);
    const [list, setList] = useState([]);
    const [error, setError] = useState("");


    const [companies, setCompanies] = useState([]);           
    const [companiesLoading, setCompaniesLoading] = useState(false);
    const [pickerOpenFor, setPickerOpenFor] = useState(null);  
    const [selectedCompany, setSelectedCompany] = useState({}); 

    async function handleSearch(ev) {
        ev?.preventDefault?.();
        setError("");
        if (!q.trim()) { setList([]); return; }
        setLoading(true);
        try {
            const res = await api.get("/api/admin/search_user", { params: { q: q.trim() } });
            const raw = Array.isArray(res.data?.content)
                ? res.data.content
                : (Array.isArray(res.data) ? res.data : []);
            const arr = raw.map(normalizeUser);
            setList(arr);
        } catch (e) {
            setError(e?.response?.data?.message || e.message || "Search failed");
            setList([]);
        } finally {
            setLoading(false);
        }
    }

    async function loadCompaniesOnce() {
        if (companies.length > 0 || companiesLoading) return;
        setCompaniesLoading(true);
        try {
            const res = await api.get("/api/admin/company/list");
            const raw = Array.isArray(res.data?.content) ? res.data.content : [];

            const items = raw
                .map(x => {
                    const id = x?.id;
                    const name = x?.name ?? x?.companyName ?? x?.label;
                    if (id == null || !name) return null;
                    return { id, name };
                })
                .filter(Boolean);
            setCompanies(items);
        } catch (e) {
            Swal.fire({ icon: "error", title: "Load companies failed", text: e?.message || "Error" });
        } finally {
            setCompaniesLoading(false);
        }
    }


    function togglePicker(userId) {
        loadCompaniesOnce();
        setPickerOpenFor((cur) => (cur === userId ? null : userId));
    }

    async function makeHR(userId) {
        const picked = selectedCompany[userId];
        if (!picked) {
            Swal.fire({ icon: "warning", title: "Please select company first", text: "pls select company first" });
            return;
        }
        try {
            await api.patch(`/api/admin/${userId}/make-hr`, { companyId: picked });
            setList((prev) => prev.map((u) => (u.id === userId ? { ...u, role: "hr" } : u)));
            Swal.fire({ icon: "success", title: "Succeeded", text: `User ${userId} is now HR of ${picked}.` });
        } catch (e) {
            Swal.fire({ icon: "error", title: "Failed", text: e?.response?.data?.message || e.message || "Make HR failed" });
        }
    }


    useEffect(() => {
        const handler = (e) => { if (e.key === "Enter") handleSearch(e); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [q]);

    return (
        <div className="app-root">
            <Navigation role={role} username={username} />

            <div className="topbar" style={{ marginLeft: 24 }}>
                <button className="btn ghost flex items-center gap-2" onClick={() => navigate(-1)}>
                    <FaArrowLeft className="icon" aria-hidden="true" />
                    <span>Back</span>
                </button>
            </div>

            <div className="card" style={{ margin: "12px 24px", position: "relative" }}>
                <header className="header">
                    <div className="title">Create HR</div>
                    <div className="micro-link">
                        <span className="muted">no company exist? </span>
                        <a className="tiny-link" onClick={() => navigate("/admin/create/company")}>Create one</a>
                    </div>
                </header>

                <form onSubmit={handleSearch} className="search-bar">
                    <div className="row">
                        <input
                            className="input"
                            type="text"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by email / full_name / phone / id"
                        />
                        <button className="btn primary" type="submit" disabled={loading}>
                            <FaSearch style={{ marginRight: 8, position: "relative", top: 2 }} />
                            {loading ? "Searching..." : "Search"}
                        </button>
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Supports: <code>email</code>, <code>full_name</code>, <code>phone</code>, <code>id</code>
                    </div>
                </form>

                {error && <div className="err-text" style={{ marginTop: 8 }}>{error}</div>}

                <section className="results">
                    {(!loading && list.length === 0 && q.trim()) && (
                        <div className="muted">No results.</div>
                    )}

                    <div className="grid">
                        {list.map((u) => {
                            const picked = selectedCompany[u.id];
                            const open = pickerOpenFor === u.id;
                            return (
                                <article key={u.id} className="user-card">
                                    <div className="uc-left">
                                        <div className="name">{u.fullName || "-"}</div>
                                        <div className="line">
                                            <span className="label">ID:</span>
                                            <span className="val">{u.id ?? "-"}</span>
                                        </div>
                                        <div className="line">
                                            <span className="label">Email:</span>
                                            <a className="val" href={u.email ? `mailto:${u.email}` : "#"}>{u.email || "-"}</a>
                                        </div>
                                        <div className="line">
                                            <span className="label">Phone:</span>
                                            <span className="val">{u.phone || "-"}</span>
                                        </div>
                                        <div className="line">
                                            <span className="label">Role:</span>
                                            <span className={`pill ${isHR(u.role) ? "hr" : "other"}`}>
                                                {isHR(u.role) ? "HR" : String(u.role === 0 ? "job seeker" : "admin")}
                                            </span>
                                        </div>
                                        {picked && (
                                            <div className="line">
                                                <span className="label">Company:</span>
                                                <span className="val">{picked}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="uc-right">
                                        <div className="btn-col">
                                            {u.role == 0 && <button
                                                type="button"
                                                className="btn"
                                                onClick={() => togglePicker(u.id)}
                                                disabled={companiesLoading}
                                                title="Bind Company"
                                            >
                                                {open ? "Hide Companies" : "Bind Company"}
                                            </button>}

                                            {open && (
                                                <select
                                                    value={selectedCompany[u.id] ?? ""}
                                                    onChange={(e) =>
                                                        setSelectedCompany((s) => ({
                                                            ...s,
                                                            [u.id]: e.target.value ? Number(e.target.value) : null,
                                                        }))
                                                    }
                                                >
                                                    {companies.map((c) => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}

                                            {u.role != 2 && <button
                                                type="button"
                                                className="btn success"
                                                disabled={isHR(u.role)}
                                                onClick={() => makeHR(u.id)}
                                                title={isHR(u.role) ? "Already HR" : "Create HR"}
                                            >
                                                {isHR(u.role) ? "Already HR" : "Create HR"}
                                            </button>}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            </div>

            <style>{`
        *{box-sizing:border-box}
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:0; padding:20px; box-shadow:0 8px 30px rgba(0,0,0,.06); }
        .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .title { font-size:20px; font-weight:700; }
        .micro-link { font-size:12px; color:#6b7280; }
        .tiny-link { color:#111827; text-decoration:underline; cursor:pointer; }
        .tiny-link:hover { opacity:.8; }

        .search-bar .row { display:flex; gap:10px; align-items:center; }
        .input{
          flex:1; border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; font-size:14px; outline:none;
        }
        .input:focus{ border-color:#111827; }
        .btn{ appearance:none; border:1px solid #e5e7eb; background:#fff; color:#111827; border-radius:12px; padding:10px 14px; font-weight:700; cursor:pointer; }
        .btn:hover{ background:#f9fafb; }
        .btn.primary{ background:#111827; color:#fff; border-color:#111827; }
        .btn.success{ background:#10b981; border-color:#10b981; color:#fff; }
        .btn.success:disabled{ opacity:.7; cursor:not-allowed; }
        .btn.ghost{ background:transparent; border-color:transparent; color:#111827; padding-left:0; }
        .icon{ position:relative; top:3px; width:1em; height:1em; }
        .muted{ color:#6b7280; font-size:13px; }
        .err-text{ color:#b91c1c; font-size:13px; }

        .results{ margin-top:16px; }
        .grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(500px, 1fr)); gap:12px; }

        .user-card{ display:flex; justify-content:space-between; gap:12px; border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#fff; }
        .uc-left{ min-width:0; }
        .uc-right{ display:flex; align-items:center; }
        .btn-col{ display:flex; flex-direction:column; gap:8px; align-items:flex-end; }
        .select{
          border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; font-size:14px; outline:none; background:#fff; min-width:220px;
        }

        .name{ font-weight:700; margin-bottom:6px; font-size:15px; }
        .line{ display:flex; gap:8px; margin:3px 0; align-items:baseline; }
        .label{ color:#6b7280; width:80px; flex:0 0 80px; font-size:13px; }
        .val{ font-size:14px; word-break:break-all; }
        .pill{ display:inline-block; padding:4px 8px; border-radius:999px; font-size:12px; font-weight:600; border:1px solid #e5e7eb; }
        .pill.hr{ background:#ecfdf5; color:#065f46; border-color:#a7f3d0; }
      `}</style>
        </div>
    );
}
