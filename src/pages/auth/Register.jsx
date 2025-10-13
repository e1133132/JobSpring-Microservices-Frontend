import {useMemo, useRef, useState} from "react";
import {register, sendVerificationCode} from "../../services/authService";
import {useNavigate} from "react-router-dom";
import React from "react";
import jobSpringLogo from "../../assets/jobspringt.png";
import {validateField} from "../../utils/validators.js";

export default function Register() {
    const [form, setForm] = useState({fullName: "", email: "", password: "", code: ""});
    const [msg, setMsg] = useState(null);
    const [cooldown, setCooldown] = useState(0);
    const navigate = useNavigate();
    const [errors, setErrors] = useState({});          // { fieldName: errorMessage }
    const [touched, setTouched] = useState({});        // { fieldName: true }
    const formRef = useRef(null);

    // form valid = all fields have value and no error messages
    const isFormValid = useMemo(() => {
        const hasValues =
            form.fullName.trim() && form.email.trim() && form.password && form.code;
        const hasNoErrors =
            !errors.fullName && !errors.email && !errors.password && !errors.code;
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
        const fields = ["fullName", "email", "password", "code"];
        const nextErrors = {};
        fields.forEach((n) => {
            const v = form[n] ?? "";
            const msg = validateField(n, v);
            if (msg) nextErrors[n] = msg;
        });
        setErrors(nextErrors);
        setTouched({fullName: true, email: true, password: true, code: true});
        return Object.keys(nextErrors).length === 0;
    };

    const handleSendCode = async () => {
        setMsg(null);
        // validate email before sending
        const emailErr = validateField("email", form.email);
        setTouched((t) => ({...t, email: true}));
        setErrors((prev) => ({...prev, email: emailErr || undefined}));
        if (emailErr) return;

        try {
            await sendVerificationCode(form.email);
            setCooldown(60);
            const timer = setInterval(() => {
                setCooldown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (error) {
            setMsg(error?.response?.data?.message || "Failed to send code");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateAll()) return;

        try {
            await register(form);
            navigate("/auth/login");
        } catch (error) {
            setMsg(error?.response?.data?.message || "Register failed");
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
                transform: "translateY(-30px)"
            }}>
                <h2 style={{
                    textAlign: "center",
                    marginBottom: "1.5rem",
                    color: "#065f46"
                }}>
                    Register
                </h2>

                <form ref={formRef} onSubmit={handleSubmit} noValidate
                      style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
                    <div>
                        <input
                            name="fullName"
                            placeholder="Full Name"
                            value={form.fullName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            required
                            style={borderStyle("fullName")}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "#10b981")}
                            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                        />
                        {errorText("fullName")}
                    </div>

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
                        <div style={{display: "flex", gap: "0.5rem"}}>
                            <input
                                name="code"
                                placeholder="Verification Code"
                                value={form.code}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                required
                                inputMode="numeric"
                                style={{...borderStyle("code"), flex: 1}}
                                onFocus={(e) => (e.currentTarget.style.borderColor = "#10b981")}
                                onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                            />
                            <button
                                type="button"
                                onClick={handleSendCode}
                                disabled={cooldown > 0}
                                style={{
                                    padding: "0.75rem",
                                    background: cooldown > 0 ? "#fbbf24" : "#f59e0b",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: cooldown > 0 ? "not-allowed" : "pointer",
                                    minWidth: 130,
                                }}
                            >
                                {cooldown > 0 ? `Resend (${cooldown})` : "Send Code"}
                            </button>
                        </div>
                        {errorText("code")}
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
                        Register
                    </button>
                </form>


                <button
                    onClick={() => navigate("/auth/login")}
                    style={{
                        marginTop: "1rem",
                        width: "100%",
                        padding: "0.75rem",
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: 600,
                        transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#2563eb")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#3b82f6")}
                >
                    Back to Login
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
