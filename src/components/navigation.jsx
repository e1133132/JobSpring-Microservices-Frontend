// src/components/Navigation.jsx
import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { logout } from "../services/authService";
import jobSpringLogo from "../assets/jobspringt.png";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

function buildTopMenus(role) {
  if (role === "guest") {
    return [
      { key: "home", label: "Home", to: "/home" },
      { key: "login", label: "Login", to: "/auth/login" },
      { key: "register", label: "Register", to: "/auth/register" },
    ];
  }
  if (role === 0) { // job seeker
    return [
      { key: "home", label: "Home", to: "/home" },
      { key: "logout", label: "logout", action: "logoutUser" },
    ];
  }
  if (role === 1) { // hr
    return [
       { key: "job position", label: "Job position management", to: "/hr/JobPosition" },
      { key: "logout", label: "logout", action: "logoutAdmin" },
    ];
  }
  if (role === 2) { // admin
    return [
      { key: "jobs", label: "manage job position", to: "/admin/status" },
      { key: "createHR", label: "create HR account", to: "/admin/create/hr" },
      { key: "createCompany", label: "create Company", to: "/admin/create/company" },
      { key: "audit", label: "Audit review", to: "/admin/audit" },
      { key: "logout", label: "Logout", action: "logoutAdmin" },
    ];
  }

  return [
    { key: "home", label: "Home", to: "/home" },
    { key: "login", label: "Login", to: "/auth/login" },
    { key: "register", label: "Register", to: "/auth/register" },
  ];
}

function buildDropdown(role) {
  if (role === 0) {
    return [
      { key: "profile", label: "Profile", to: "/profile" },
      { key: "application", label: "Application", to: "/applications" },
      { key: "upload-review", label: "Upload review", to: "/reviews/upload" },
    ];
  }
  if (role === 1) {
    return [
      { key: "profile", label: "Profile", to: "/profile_hr" },
      { key: "application", label: "Applications", to: "/hr/applications" },
      { key: "post-job", label: "Post job position", to: "/hr/post-job" },
    ];
  }
  return [];
}

export default function Navigation({ role = "guest", username = "guest" }) {
  const [open, setOpen] = useState(false);
  // const navigate = useNavigate();
  console.log(role);
  const menus = buildTopMenus(role);
  const dropdown = useMemo(() => buildDropdown(role), [role]);
  const navigate = useNavigate();


  const logoutUser = async () => {
    logout();
    navigate("/auth/login")
  };

  const logoutAdmin = async () => {
    logout();
    navigate("/auth/login")
  };

  const ACTIONS = {
    logoutUser,
    logoutAdmin,
  };

  return (
    <div>
      <nav className="nav">
        <div className="nav-inner">
          <div className="logo">
            <img
              src={jobSpringLogo}
              alt="JobSpring Logo"
              style={{ width: "260px", height: "auto" }}
            />

          </div>
          <div className="spacer" />
          <div className="tabs" role="tablist" aria-label="Primary">
            {menus.map((t) => {
              const onAction = t.action ? ACTIONS[t.action] : null;

              return onAction ? (
                <button
                  key={t.key}
                  type="button"
                  className="tab-btn"
                  onClick={onAction}
                >
                  {t.label}
                </button>
              ) : (
                <NavLink
                  key={t.key}
                  to={t.to}
                  className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}
                >
                  {t.label}
                </NavLink>
              );
            })}
          </div>
          {(role === 0 || role === 1) && (
            <div className="user">
              <button
                className="user-btn"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                <span style={{ fontWeight: 700 }}>{username || "User"}</span>
                <span aria-hidden>▾</span>
              </button>
              {open && (
                <div className="menu" role="menu">
                  {dropdown.map((d) => (
                    <NavLink key={d.key} to={d.to} onClick={() => setOpen(false)}>
                      {d.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
Navigation.propTypes = {
  role: PropTypes.oneOfType([
    PropTypes.oneOf(["guest"]),
    PropTypes.oneOf([0, 1, 2]),
  ]),
  username: PropTypes.string,
};