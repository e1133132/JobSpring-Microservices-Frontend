import React, {useEffect, useState} from "react";
import "../../App.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import {getCurrentUser} from "../../services/authService";
import Navigation from "../navigation.jsx";
import {useNavigate} from "react-router-dom";

export default function Profile() {
    const [form, setForm] = useState({
        summary: "",
        school: "",
        degree: "",
        major: "",
        gpa: "",
        company: "",
        title: "",
        achievements: "",
        skill: "",
        skill_id: "",
        skillYears: "",
    });
    const [role,] = useState(getCurrentUser() ? getCurrentUser().role : 'guest');
    const [name,] = useState(getCurrentUser() ? getCurrentUser().fullName : 'guest');
    // 日期单独 state（存储为 Date 对象）
    const [startDateSchool, setStartDateSchool] = useState(null);
    const [endDateSchool, setEndDateSchool] = useState(null);
    const [startDateWork, setStartDateWork] = useState(null);
    const [endDateWork, setEndDateWork] = useState(null);
    // select 单独 state
    const [visibility, setVisibility] = useState("2");
    const [level, setLevel] = useState("3");
    const [skillsList, setSkillsList] = useState([]);
    const navigate = useNavigate();

    // 初始化时请求后端数据
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem("jobspring_token");
                const response = await axios.get("/api/profile", {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                });

                const data = response.data;

                // 填充表单数据
                setForm({
                    summary: data.profile?.summary ?? "",
                    school: data.education?.[0]?.school ?? "",
                    degree: data.education?.[0]?.degree ?? "",
                    major: data.education?.[0]?.major ?? "",
                    gpa: data.education?.[0]?.gpa?.toString() ?? "",
                    company: data.experience?.[0]?.company ?? "",
                    title: data.experience?.[0]?.title ?? "",
                    achievements: data.experience?.[0]?.achievements ?? "",
                    skill: data.skills?.[0]?.skill_name ?? "",
                    skill_id: data.skills?.[0]?.skill_id?.toString() ?? "",
                    skillYears: data.skills?.[0]?.years?.toString() ?? "",
                });

                // 日期转为 Date 对象
                setStartDateSchool(data.education?.[0]?.start_date ? new Date(data.education[0].start_date) : null);
                setEndDateSchool(data.education?.[0]?.end_date ? new Date(data.education[0].end_date) : null);
                setStartDateWork(data.experience?.[0]?.start_date ? new Date(data.experience[0].start_date) : null);
                setEndDateWork(data.experience?.[0]?.end_date ? new Date(data.experience[0].end_date) : null);

                // 下拉选择框
                setVisibility(data.profile?.visibility?.toString() || "2");
                setLevel(data.skills?.[0]?.level?.toString() || "3");
            } catch (error) {
                console.error("Failed to fetch profile:", error);
            }
        };

        fetchProfile();
    }, []);


    useEffect(() => {
        const fetchSkills = async () => {
            try {
                const token = localStorage.getItem("jobspring_token");
                const response = await axios.get("/api/skills", {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                });
                setSkillsList(response.data);
            } catch (error) {
                console.error("Failed to fetch skills:", error);
            }
        };

        fetchSkills();
    }, []);

    const handleChange = (e) => {
        const {name, value} = e.target;

        if (name === "skill_id") {
            const skillObj = skillsList.find((s) => String(s.id) === value);
            setForm({
                ...form,
                skill_id: value,
                skill: skillObj ? skillObj.name : "",
            });
        } else {
            setForm({
                ...form,
                [name]: value,
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 构造请求体
        const payload = {
            profile: {
                summary: form.summary,
                visibility: parseInt(visibility, 10),
                file_url: null,
            },
            education: [
                {
                    school: form.school,
                    degree: form.degree,
                    major: form.major,
                    start_date: startDateSchool ? startDateSchool.toISOString().split("T")[0] : null,
                    end_date: endDateSchool ? endDateSchool.toISOString().split("T")[0] : null,
                    gpa: form.gpa ? parseFloat(form.gpa) : null,
                    description: "Focused on software engineering and AI-related courses.",
                },
            ],
            experience: [
                {
                    company: form.company,
                    title: form.title,
                    start_date: startDateWork ? startDateWork.toISOString().split("T")[0] : null,
                    end_date: endDateWork ? endDateWork.toISOString().split("T")[0] : null,
                    description: "Designed and optimized APIs with ASP.NET and SQL Server.",
                    achievements: form.achievements,
                },
            ],
            skills: [
                {
                    skill_id: form.skill_id ? parseInt(form.skill_id, 10) : 0,
                    skill_name: form.skill,
                    level: parseInt(level, 10),
                    years: form.skillYears ? parseFloat(form.skillYears) : 1,
                },
            ],
        };

        try {
            const token = localStorage.getItem("jobspring_token");
            const response = await axios.post("/api/profile", payload, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
            });

            console.log("Success:", response.data);
            alert("Profile Submitted Successfully!");
        } catch (error) {
            console.error("Error submitting profile:", error);
            alert("Failed to submit profile, check console for details.");
        }
    };

    return (
        <div className="app-root">

            <Navigation role={role} username={name}/>

            <p className="subheading">YOUR PROFILE DETAILS</p>

            {/* 表单内容 */}

            <form
                className="card"
                id="profileForm"
                onSubmit={handleSubmit}
            >
                {/* Summary */}
                <div>
                    <label>Summary</label>
                    <input
                        className="search-input"
                        name="summary"
                        rows={4}
                        value={form.summary || ""}
                        onChange={handleChange}
                        placeholder="Please enter your profile summary"
                    />
                </div>

                <div style={{height: 12}}/>

                {/* Visibility */}
                <div>
                    <label>Visibility</label>
                    <select
                        className="select"
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                    >
                        <option value="0">Private</option>
                        <option value="1">Company Only</option>
                        <option value="2">Public</option>
                    </select>
                </div>

                {/* Education */}
                <h3 style={{marginTop: "20px"}}>Education</h3>
                <div>
                    <label>School</label>
                    <input
                        className="search-input"
                        name="school"
                        value={form.school}
                        onChange={handleChange}
                        placeholder="School name"
                    />
                </div>
                <div>
                    <label>Degree</label>
                    <input
                        className="search-input"
                        name="degree"
                        value={form.degree}
                        onChange={handleChange}
                        placeholder="Degree"
                    />
                </div>
                <div>
                    <label>Major</label>
                    <input
                        className="search-input"
                        name="major"
                        value={form.major}
                        onChange={handleChange}
                        placeholder="Please fill in the names of your main course"
                    />
                </div>
                <div>
                    <label>Start Date</label>
                    <DatePicker
                        selected={startDateSchool}
                        onChange={(date) => setStartDateSchool(date)}
                        className="search-input"
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select start date"
                    />
                </div>
                <div>
                    <label>End Date</label>
                    <DatePicker
                        selected={endDateSchool}
                        onChange={(date) => setEndDateSchool(date)}
                        className="search-input"
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select end date"
                    />
                </div>
                <div>
                    <label>GPA</label>
                    <input
                        type="number"
                        step="0.01"
                        className="search-input"
                        name="gpa"
                        value={form.gpa}
                        onChange={handleChange}
                        placeholder="e.g. 3.80"
                    />
                </div>

                <div style={{height: 12}}/>

                {/* Experience */}
                <h3 style={{marginTop: "20px"}}>Experience</h3>
                <div>
                    <label>Company</label>
                    <input
                        className="search-input"
                        name="company"
                        value={form.company}
                        onChange={handleChange}
                        placeholder="Company name"
                    />
                </div>
                <div>
                    <label>Title</label>
                    <input
                        className="search-input"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="Job Title"
                    />
                </div>
                <div>
                    <label>Start Date</label>
                    <DatePicker
                        selected={startDateWork}
                        onChange={(date) => setStartDateWork(date)}
                        className="search-input"
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select start date"
                    />
                </div>
                <div>
                    <label>End Date</label>
                    <DatePicker
                        selected={endDateWork}
                        onChange={(date) => setEndDateWork(date)}
                        className="search-input"
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select end date"
                    />
                </div>
                <div>
                    <label>Achievements</label>
                    <input
                        className="search-input"
                        name="achievements"
                        rows={3}
                        value={form.achievements}
                        onChange={handleChange}
                        placeholder="List your key achievements"
                    />
                </div>

                <div style={{height: 12}}/>

                {/* Skills */}
                <h3 style={{marginTop: "20px"}}>Skills</h3>
                <div>
                    <label>Skill</label>
                    <select
                        className="select"
                        name="skill_id"
                        value={form.skill_id}
                        onChange={handleChange}
                    >
                        <option value="">-- Select a Skill --</option>
                        {["Backend", "Frontend", "Database", "DevOps", "Cloud", "Tools", "CI/CD", "System", "Methodology"].map(cat => (
                            <optgroup key={cat} label={cat}>
                                {skillsList.filter(s => s.category === cat).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>
                <div>
                    <label>Level</label>
                    <select
                        className="select"
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                    >
                        <option value="1">Beginner</option>
                        <option value="2">Intermediate</option>
                        <option value="3">Proficient</option>
                        <option value="4">Advanced</option>
                        <option value="5">Expert</option>
                    </select>
                </div>
                <div>
                    <label>Years of Skill</label>
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        className="search-input"
                        name="skillYears"
                        value={form.skillYears}
                        onChange={handleChange}
                        placeholder="e.g. 2.5"
                    />
                </div>


                <div>
                    <button
                        type="submit"
                        form="profileForm"
                        style={{
                            marginTop: "20px"
                        }}
                    >
                        Save
                    </button>
                    <button
                        style={{marginLeft: "20px"}}
                        type="reset"
                        form="profileForm"
                        onClick={() => {
                            setForm({
                                summary: "",
                                school: "",
                                degree: "",
                                major: "",
                                gpa: "",
                                company: "",
                                title: "",
                                achievements: "",
                                skill: "",
                            });
                            setStartDateSchool(null);
                            setEndDateSchool(null);
                            setStartDateWork(null);
                            setEndDateWork(null);
                            setVisibility("2");
                            setLevel("3");
                        }}
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
                .card p { 
                margin: 6px 0 0; 
                font-size: 13px; 
                color: #ef4444;        
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

               
                .card [aria-invalid="true"] {
                border-color: #f87171 !important;
                box-shadow: 0 0 0 3px rgba(254,202,202,.6) !important;
                }

                
                .card input::placeholder,
                .card textarea::placeholder {
                color: #94a3b8;
                }

               
                .card button[type="submit"],
                .card button[type="reset"],
                .card button[type="button"] {
                appearance: none;
                border: 0;
                border-radius: 12px;
                padding: 10px 16px;
                font-weight: 700;
                cursor: pointer;
                transition: filter .15s ease, opacity .15s ease, box-shadow .15s ease;
                }
                .card button[type="submit"] {
                background: #111827;   
                color: #fff;
                }
                .card button[type="submit"]:hover { filter: brightness(1.03); }
                .card button[type="submit"]:disabled { opacity: .6; cursor: not-allowed; }

                .card button[type="button"] {
                background: #fff;
                color: #0f172a;
                border: 1px solid #e5e7eb;
                margin-left: 8px;
                }
                .card button[type="button"]:hover { background: #f9fafb; }
                .card button.back-btn {
                background: #111827;   
                color: #fff;
                margin-left: 8px;
                }
                .card button.back-btn:hover { filter: brightness(1.03); }
                
                .card .hint, .card .small {
                font-size: 12px;
                color: #6b7280;
                margin-top: 6px;
                }
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
