import React, { useEffect, useState } from "react";
import "../../App.css";
import { getCurrentUser } from "../../services/authService";
import Navigation from "../navigation.jsx";
import {useNavigate} from "react-router-dom";
import api from "../../services/api.js";

export default function ProfileHR() {
    const navigate = useNavigate();

    const [user, setUser] = useState({ email: "", fullName: "" });
    const [companyName, setCompanyName] = useState("Loading...");

    useEffect(() => {
        const currentUser = getCurrentUser();
        console.log("currentUser:", currentUser);

        if (currentUser) {
            setUser({
                email: currentUser.email || "unknown@email.com",
                fullName: currentUser.fullName || "Unknown HR",
            });
        }

        fetchHRCompanyName();
    }, []);

    const fetchHRCompanyName = async () => {
        try {
            const token = localStorage.getItem("jobspring_token");
            if (!token) {
                console.warn("No token found — please login first.");
                setCompanyName("Not Available");
                return;
            }

            const res = await api.get("/api/user/hr/company-name", {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log("HR company name:", res.data);
            setCompanyName(res.data || "Not Linked Yet");
        } catch (error) {
            console.error("Failed to fetch HR company name:", error);
            setCompanyName("Error fetching company name");
        }
    };

    return (
        <div
            className="app-root"
            style={{
                backgroundColor: "#fffef7",
                minHeight: "100vh",
                overflowX: "hidden",
            }}
        >
            <Navigation role={1} username={user.fullName} />

            <div
                style={{
                    textAlign: "center",
                    marginTop: "24px",
                    marginBottom: "16px",
                }}
            >
                <p
                    className="subheading"
                    style={{
                        fontSize: "18px",
                        fontWeight: 600,
                        color: "#111827",
                        backgroundColor: "#fffef7",
                        display: "inline-block",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        boxShadow: "none",
                        border: "none",
                        margin: 0,
                    }}
                >
                    YOUR HR PROFILE
                </p>
            </div>

            <form
                className="card"
                id="profileHRForm"
                style={{
                    width: "90%",
                    maxWidth: "800px",
                    margin: "0 auto",
                    padding: "24px",
                    background: "#ffffff",
                }}
            >
                <div style={{ marginBottom: "16px" }}>
                    <label>Full Name</label>
                    <input
                        className="search-input"
                        value={user.fullName}
                        readOnly
                        style={{ background: "#f9fafb" }}
                    />
                </div>

                <div style={{ marginBottom: "16px" }}>
                    <label>Email</label>
                    <input
                        className="search-input"
                        value={user.email}
                        readOnly
                        style={{ background: "#f9fafb" }}
                    />
                </div>

                <div style={{ marginBottom: "16px" }}>
                    <label>Company Name</label>
                    <input
                        className="search-input"
                        value={companyName}
                        readOnly
                        style={{ background: "#f9fafb" }}
                    />
                </div>

                <div>
                    <button
                        type="button"
                        className="back-btn"
                        style={{ marginTop: "20px" }}
                        onClick={() => navigate("/hr/JobPosition")}
                    >
                        Back
                    </button>
                </div>
            </form>

            <style>{`
                body, html, .app-root {
                    background-color: #fffef7;
                    margin: 0;
                    padding: 0;
                    font-family: "Inter", sans-serif;
                    color: #0f172a;
                }

                .card { 
                    border-radius: 16px;
                    border: 1px solid #e5e7eb;
                    background: #ffffff;
                    box-shadow: 0 8px 30px rgba(0,0,0,.06);
                }

                .card > div { margin-bottom: 16px; }

                .card label { 
                    display: block; 
                    font-weight: 600; 
                    font-size: 14px; 
                    margin-bottom: 6px; 
                    color: #0f172a;
                }

                .card input {
                    width: 100%;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    background: #fff;
                    padding: 10px 12px;
                    font: inherit;
                    color: #0f172a;
                    outline: none;
                    transition: border-color .15s ease, box-shadow .15s ease;
                    box-sizing: border-box;
                }

                .card input:hover {
                    border-color: #d1d5db;
                }

                .card input:focus {
                    border-color: #93c5fd;                     
                    box-shadow: 0 0 0 3px rgba(147,197,253,.45); 
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

                footer.section {
                    padding-bottom: 40px;
                    text-align: center;
                }

                footer .muted {
                    color: #6b7280;
                    font-size: 14px;
                }

                *{box-sizing:border-box}
            `}</style>

            <footer
                className="section"
                style={{ paddingBottom: 20, textAlign: "center" }}
            >
                <div className="muted">
                    © {new Date().getFullYear()} MySite. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
