import {useMemo, useRef, useState} from "react";
import {login} from "../../services/authService";
import {useNavigate} from "react-router-dom";
import React from "react";
import jobSpringLogo from "../../assets/jobspringt.png";
import {validateField} from "../../utils/validators.js";

export default function Login() {
    const [form, setForm] = useState({email: "", password: ""});
    const [msg, setMsg] = useState(null);
    const navigate = useNavigate();
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const formRef = useRef(null);

    const isFormValid = useMemo(() => {
        const hasValues = form.email.trim() && form.password;
        const hasNoErrors = !errors.email && !errors.password;
        return Boolean(hasValues && hasNoErrors);
    }, [form, errors]);

    const setField = (name, value) => {
        setForm((f) => ({...f, [name]: value}));
        if (touched[name]) {
            const msg = validateField(name, value);
            setErrors((prev) => ({...prev, [name]: msg || undefined}));
        }
    };

    const handleChange = (e) => {
        setField(e.target.name, e.target.value);
    };

    const handleBlur = (e) => {
        const {name, value} = e.target;
        setTouched((t) => ({...t, [name]: true}));
        const msg = validateField(name, value);
        setErrors((prev) => ({...prev, [name]: msg || undefined}));
    };

    const validateAll = () => {
        const fields = ["email", "password"];
        const nextErrors = {};
        fields.forEach((n) => {
            const v = form[n] ?? "";
            const msg = validateField(n, v);
            if (msg) nextErrors[n] = msg;
        });
        setErrors(nextErrors);
        setTouched({email: true, password: true});
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg(null);
        if (!validateAll()) return;
        try {
            const data = await login(form);
            localStorage.setItem("jobspring_token", data.token);
            localStorage.setItem("jobspring_user", JSON.stringify(data.user));
            console.log("Login successful:", localStorage.getItem("jobspring_user"));

            switch (data.user.role) {
                case 0: // Candidate
                    navigate("/home");
                    break;
                case 1: // HR
                    navigate("/hr/JobPosition");
                    break;
                case 2: // Admin
                    navigate("/admin/status");
                    break;
                default:
                    navigate("/home");
            }
            //localStorage.setItem("jobspring_role", data.user.role);
            console.log(data.user.role);
            //navigate("/home");
        } catch (error) {
            setMsg(error?.response?.data?.message || "Login failed");
        }
    };

    const borderStyle = (field) => ({
        padding: "0.75rem 1rem",
        border: `1px solid ${touched[field] && errors[field] ? "#b91c1c" : "#d1d5db"}`,
        borderRadius: "8px",
        outline: "none",
        transition: "border-color 0.2s",
        width: "100%",
        boxSizing: "border-box",
    });

    const errorText = (field) =>
        touched[field] && errors[field] ? (
            <div style={{color: "#b91c1c", fontSize: 12, marginTop: 4}}>{errors[field]}</div>
        ) : null;

    return (
        <div style={{marginTop: "-20px"}}>
            <div className="logo">
                <img
                    src={jobSpringLogo}
                    alt="JobSpring Logo"
                    style={{width: "260px", height: "auto"}}
                />
            </div>
            <div style={{
                maxWidth: 400,
                margin: "4rem auto",
                padding: "2rem",
                background: "#fafafa",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                fontFamily: "Segoe UI, sans-serif",
                transform: "translateY(-25px)"
            }}>

                <h2 style={{
                    textAlign: "center",
                    marginBottom: "1.5rem",
                    color: "#065f46"
                }}>
                    Login
                </h2>

                <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    noValidate
                    style={{display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%"}}
                >
                    <div>
                        <input
                            name="email"
                            type="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            required
                            style={borderStyle("email")}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "#10b981")}
                            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                        />
                        {errorText("email")}
                    </div>
                    <div>
                        <input
                            name="password"
                            type="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            required
                            minLength={6}
                            style={borderStyle("password")}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "#10b981")}
                            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                        />
                        {errorText("password")}
                    </div>

                    <button
                        type="submit"
                        disabled={!isFormValid}
                        style={{
                            width: "100%",
                            padding: "0.75rem",
                            background: isFormValid ? "#10b981" : "#9ca3af",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: isFormValid ? "pointer" : "not-allowed",
                            fontWeight: 600,
                            transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            if (isFormValid) e.currentTarget.style.background = "#059669";
                        }}
                        onMouseLeave={(e) => {
                            if (isFormValid) e.currentTarget.style.background = "#10b981";
                        }}
                    >
                        Login
                    </button>
                </form>

                <button
                    onClick={() => navigate("/auth/register")}
                    style={{
                        marginTop: "1rem",
                        width: "100%",
                        padding: "0.75rem",
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.background = "#2563eb"}
                    onMouseLeave={(e) => e.target.style.background = "#3b82f6"}
                >
                    Register
                </button>

                {msg && <p style={{
                    marginTop: "1rem",
                    textAlign: "center",
                    color: msg.includes("success") ? "#065f46" : "#b91c1c"
                }}>{msg}</p>}
            </div>
        </div>
    );

}
