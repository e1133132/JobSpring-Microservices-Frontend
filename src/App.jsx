import {BrowserRouter as Router, Routes, Route, Navigate} from "react-router-dom";
import Home from "./components/job_seeker/home";
import Profile from "./components/job_seeker/profile";
import React from "react";
import AdminDashboard from "./components/admin/dashboard";
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import JobDetail from "./components/job_seeker/jobDetail.jsx";
import Apply_progress from "./components/job_seeker/apply_progress.jsx";
import {getCurrentUser} from "./services/authService";
import PostJob from "./components/hr/PostJob.jsx";
import CheckReview from "./components/admin/checkReview.jsx";
import CheckApplication from "./components/hr/checkApplication.jsx";
import ReviewDetail from "./components/admin/reviewDetails.jsx";
import ReviewUpload from "./components/job_seeker/reviewUpload.jsx";
import CompanyDetail from "./components/job_seeker/companyDetail.jsx";
import ApplicationDetail from "./components/hr/applicationDetails.jsx";
import ProfileHR from "./components/hr/profile_hr.jsx";
import CreateHR from "./components/admin/createHR.jsx";
import CreateCompany from "./components/admin/createCompany.jsx";
import CheckCompanyJobPosition from "./components/hr/checkCompanyJobPosition.jsx";
import UpdateJob from "./components/hr/updateJob.jsx";

function RoleDetect() {
    const role = getCurrentUser()?.role;
    console.log(role);
    switch (role) {
    case 2:
      return "/admin/status";
    case 1:
      return "/hr/JobPosition";                 
    case 0:
    default:
      return "/home";
  }
}

function App() {
    const initialPath = RoleDetect();

    return (
        <Router>

            <Routes>
                <Route path="/" element={<Navigate to={initialPath} replace />} />
                <Route path="/auth/login" element={<Login />} />
                <Route path="/home" element={<Home />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/applications" element={<Apply_progress />} />
                <Route path="/reviews/upload" element={<ReviewUpload />} />
                <Route path="/admin/status" element={<AdminDashboard />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/hr/post-job" element={<PostJob />} />
                <Route path="/admin/audit" element={<CheckReview />} />
                <Route path="/admin/audit/reviewDetail" element={<ReviewDetail />} />
                <Route path="/admin/create/hr" element={<CreateHR />} />
                <Route path="/admin/create/company" element={<CreateCompany />} />
                <Route path="/hr/applications" element={<CheckApplication />} />
                <Route path="/hr/JobPosition" element={<CheckCompanyJobPosition />} />
                <Route path="/hr/applications/applicationDetail" element={<ApplicationDetail />} />
                <Route path="/company/:companyId" element={<CompanyDetail />} />
                <Route path="/profile_hr" element={<ProfileHR />} />
                <Route path="/hr/jobs-detail/:jobId" element={<UpdateJob />} />
            </Routes>
        </Router>
    );
}

export default App;
