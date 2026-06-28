import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";
import { ForgotPassword } from "../pages/ForgotPassword";
import { ResetPassword } from "../pages/ResetPassword";
import { Profile } from "../pages/Profile";
import { AdminDashboard } from "../pages/AdminDashboard";
import { DoctorDashboard } from "../pages/DoctorDashboard";
import { PatientDashboard } from "../pages/PatientDashboard";
import { DoctorDirectory } from "../pages/DoctorDirectory";
import { AIHealthAssessment } from "../pages/AIHealthAssessment";
import { Chat } from "../pages/Chat";
import { Anatomy3D } from "../pages/Anatomy3D";
import { SkinAI } from "../pages/SkinAI";
import { useAuth } from "../context/AuthContext";

const HomeRedirect: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  if (user.role === "Admin") {
    return <Navigate to="/admin" replace />;
  }
  if (user.role === "Doctor") {
    return <Navigate to="/doctor" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Main App Dashboard Routes (Protected) */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        {/* Profile */}
        <Route path="/profile" element={<Profile />} />
        
        {/* Chat */}
        <Route path="/chat" element={<Chat />} />

        {/* Admin Specific Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/doctors" 
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/patients" 
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/broadcast" 
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/bookings" 
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Doctor Specific Routes */}
        <Route 
          path="/doctor" 
          element={
            <ProtectedRoute allowedRoles={["Doctor"]}>
              <DoctorDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/doctor/patients" 
          element={
            <ProtectedRoute allowedRoles={["Doctor"]}>
              <DoctorDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/doctor/schedule" 
          element={
            <ProtectedRoute allowedRoles={["Doctor"]}>
              <DoctorDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/doctor/verification" 
          element={
            <ProtectedRoute allowedRoles={["Doctor"]}>
              <DoctorDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Patient Specific Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={["User"]}>
              <PatientDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/patient/doctors" 
          element={
            <ProtectedRoute allowedRoles={["User"]}>
              <DoctorDirectory />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/patient/medications" 
          element={
            <ProtectedRoute allowedRoles={["User"]}>
              <PatientDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/patient/assessment" 
          element={
            <ProtectedRoute allowedRoles={["User"]}>
              <AIHealthAssessment />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/anatomy-3d" 
          element={
            <ProtectedRoute allowedRoles={["User"]}>
              <Anatomy3D />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/patient/skin-ai" 
          element={
            <ProtectedRoute allowedRoles={["User"]}>
              <SkinAI />
            </ProtectedRoute>
          } 
        />
      </Route>

      {/* Wildcard / Redirect */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
