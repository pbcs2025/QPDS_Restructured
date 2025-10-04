//Main.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RoleSelection from "./RoleSelection";
import SuperAdminLogin from "../roles/superadmin/SuperAdminLogin";
import AdminLogin from "../roles/admin/AdminLogin";
import FacultyLogin from "../roles/faculty/FacultyLogin";
import Registration from "../roles/faculty/Registration";
import PaperSetterLogin from "../roles/papersetter/PaperSetterLogin";
import VerifierLogin from "../roles/verifier/VerifierLogin";
import SuperAdminDashboard from "../roles/superadmin/SuperAdminDashboard";
import AdminDashboard from "../roles/admin/AdminDashboard";
import FacultyDashboard from "../roles/faculty/Facultydashboard";
import PaperSetterDashboard from "../roles/papersetter/Papersetterdashboard";
import VerifierDashboard from "../roles/verifier/VerifierDashboard";
import ManageUsers from "../roles/superadmin/ManageUsers";
import AdminManageFaculty from "../roles/superadmin/AdminManageFaculty";
import AdminManageFacultyPage from "../roles/superadmin/AdminManageFacultyPage";
import AssigneeDetails from "../roles/superadmin/AssigneeDetails";
import SubjectsPage from "../roles/superadmin/SubjectsPage"
import DepartmentsPage from "../roles/superadmin/DepartmentsPage";
import QuestionPaperBuilder from './questionPaperBuilder';




function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoleSelection />} />
        <Route path="/login/super-admin" element={<SuperAdminLogin />} />
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/login/faculty" element={<FacultyLogin />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/login/paper-setter" element={<PaperSetterLogin />} />
        <Route path="/login/verifier" element={<VerifierLogin />} />
        <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/faculty-dashboard" element={<FacultyDashboard />} />
        <Route path="/paper-setter-dashboard" element={<PaperSetterDashboard />} />
        <Route path="/verifier-dashboard" element={<VerifierDashboard />} />
        <Route path="/manage-users" element={<ManageUsers />} />
        <Route path="/admin/manage-faculty" element={<AdminManageFaculty />} />
        <Route path="/admin/manage-faculty-page" element={<AdminManageFacultyPage />} />
        <Route path="/assignees/:subjectCode" element={<AssigneeDetails />} />
        <Route path="/subjects" element={<SubjectsPage />} />
        <Route path="/departments" element={<DepartmentsPage />} />
         <Route path="/question-paper-builder" element={<QuestionPaperBuilder />} />

      </Routes>
    </Router>
  );
}

export default App;
