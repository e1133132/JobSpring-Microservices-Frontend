import React, { useState } from "react";
import "../../App.css";
import { getCurrentUser } from "../../services/authService";
import Navigation from "../navigation.jsx";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.js";

export default function ReviewUpload() {
    const [form, setForm] = useState({
        applicationId: "",
        title: "",
        content: "",
        rating: "5",
        imageFile: null,
    });
    const [loading, setLoading] = useState(false);
    const role = getCurrentUser() ? getCurrentUser().role : "guest";
    const name = getCurrentUser() ? getCurrentUser().fullName : "guest";
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setForm({ ...form, imageFile: file });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.imageFile) {
            alert("Please upload images before submitting!");
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("jobspring_token");

            const formData = new FormData();
            formData.append("applicationId", form.applicationId);
            formData.append("title", form.title);
            formData.append("content", form.content);
            formData.append("rating", form.rating);
            formData.append("file", form.imageFile);

            const response = await api.post(
                "/api/job_seeker/postReview",
                {
                    applicationId: Number(form.applicationId),
                    title: form.title,
                    content: form.content,
                    rating: Number(form.rating),
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            console.log("Review submitted:", response.data);
            alert("Review submitted successfully!");
            setForm({
                applicationId: "",
                title: "",
                content: "",
                rating: "5",
                imageFile: null,
            });
        } catch (error) {
            console.error("Error submitting review:", error);
            alert("Failed to submit review, check console for details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-root">
            <Navigation role={role} username={name}/>

            <p className="subheading">UPLOAD A REVIEW</p>

            <form className="card" id="reviewForm" onSubmit={handleSubmit}>
                <div>
                    <label>Application ID</label>
                    <input
                        className="search-input"
                        name="applicationId"
                        type="number"
                        value={form.applicationId}
                        onChange={handleChange}
                        placeholder="Enter your application ID"
                        required
                    />
                </div>

                <div>
                    <label>Title</label>
                    <input
                        className="search-input"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="Review title"
                        required
                    />
                </div>

                <div>
                    <label>Content</label>
                    <textarea
                        className="search-input"
                        name="content"
                        rows={4}
                        value={form.content}
                        onChange={handleChange}
                        placeholder="Write your review here"
                        required
                    />
                </div>

                <div>
                    <label>Upload Supporting Image *</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        required
                    />
                    {form.imageFile && (
                        <p style={{fontSize: "14px", color: "#16a34a", marginTop: "6px"}}>
                            Selected: {form.imageFile.name}
                        </p>
                    )}
                </div>

                <div>
                    <label>Rating</label>
                    <select
                        className="select"
                        name="rating"
                        value={form.rating}
                        onChange={handleChange}
                    >
                        <option value="1">1 - Very Poor</option>
                        <option value="2">2 - Poor</option>
                        <option value="3">3 - Average</option>
                        <option value="4">4 - Good</option>
                        <option value="5">5 - Excellent</option>
                    </select>
                </div>

                <div>
                    <button type="submit" disabled={loading}>
                        {loading ? "Submitting..." : "Submit"}
                    </button>
                    <button
                        type="reset"
                        style={{marginLeft: "20px"}}
                        onClick={() =>
                            setForm({
                                applicationId: "",
                                title: "",
                                content: "",
                                rating: "5",
                            })
                        }
                    >
                        Reset
                    </button>
                    <button
                        type="button"
                        className="back-btn"
                        style={{marginLeft: "20px"}}
                        onClick={() => navigate("/home")}
                    >
                        Back
                    </button>
                </div>
            </form>

            <style>{`
                .card { 
                    border-radius: 16px;
                    border: 1px solid #e5e7eb;
                    background: #ffffff;
                    padding: 24px;
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

                .card input,
                .card textarea,
                .card select {
                    width: 100%;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    background: #fff;
                    padding: 10px 12px;
                    font: inherit;
                    color: #0f172a;
                    outline: none;
                    transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
                    box-sizing: border-box;
                }

                .card input:hover,
                .card textarea:hover,
                .card select:hover {
                    border-color: #d1d5db;
                }
                .card input:focus,
                .card textarea:focus,
                .card select:focus {
                    border-color: #93c5fd;                     
                    box-shadow: 0 0 0 3px rgba(147,197,253,.45); 
                }

                /* 三个按钮统一黑色样式 */
                .card button {
                    appearance: none;
                    border: 0;
                    border-radius: 12px;
                    padding: 10px 16px;
                    font-weight: 700;
                    cursor: pointer;
                    background: #111827;   
                    color: #fff;
                    transition: filter .15s ease, opacity .15s ease, box-shadow .15s ease;
                }
                .card button:hover { filter: brightness(1.1); }
                .card button:disabled { opacity: .6; cursor: not-allowed; }

                *{box-sizing:border-box}
            `}</style>

            <footer
                className="section"
                style={{paddingBottom: 40, textAlign: "center"}}
            >
                <div className="muted">
                    © {new Date().getFullYear()} MySite. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
