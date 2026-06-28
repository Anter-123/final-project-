import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { adminService } from "../services/adminService";
import type { AdminStats, AdminDoctor, AdminPatient, AdminBooking } from "../services/adminService";
import { chatService } from "../services/chatService";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { 
  Users, 
  Stethoscope, 
  Activity, 
  FileText, 
  Search, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  Megaphone,
  Filter,
  UserCheck,
  UserMinus,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit,
  PlusCircle,
  Eye,
  DollarSign,
  MessageSquare
} from "lucide-react";
import toast from "react-hot-toast";

export const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "doctors" | "patients" | "broadcast" | "bookings">("overview");

  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith("/doctors")) {
      setActiveTab("doctors");
    } else if (path.endsWith("/patients")) {
      setActiveTab("patients");
    } else if (path.endsWith("/broadcast")) {
      setActiveTab("broadcast");
    } else if (path.endsWith("/bookings")) {
      setActiveTab("bookings");
    } else {
      setActiveTab("overview");
    }
  }, [location.pathname]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<AdminDoctor[]>([]);
  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [loading, setLoading] = useState(true);

  // Bookings state
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingFilter, setBookingFilter] = useState<"all" | "pending" | "accepted" | "confirmed" | "completed" | "rejected">("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  // Form states
  const [formPatientId, setFormPatientId] = useState("");
  const [formDoctorId, setFormDoctorId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formSlot, setFormSlot] = useState("");
  const [formDay, setFormDay] = useState("Monday");
  const [formStatus, setFormStatus] = useState<"pending" | "accepted" | "confirmed" | "completed" | "rejected">("pending");
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Search/Filter state
  const [doctorSearch, setDoctorSearch] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState<"all" | "verified" | "pending">("all");

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  const [chatLoading, setChatLoading] = useState(false);
  const handleStartChat = async (receiverId: string, doctorId?: string, recipientName?: string) => {
    setChatLoading(true);
    try {
      const room = await chatService.createChat(receiverId, doctorId, recipientName);
      navigate("/chat", { state: { activeChatId: room._id, newRoom: room } });
    } catch (err: any) {
      toast.error(err.message || "Failed to start chat session");
    } finally {
      setChatLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, pendingData, doctorsList, patientsList, bookingsList] = await Promise.all([
        adminService.getStats(),
        adminService.getPendingDoctors(),
        adminService.getDoctors(),
        adminService.getPatients(),
        adminService.getBookings(),
      ]);

      console.log("Admin Dashboard - Raw API Response:", {
        demoMode: localStorage.getItem("demoMode"),
        stats: statsData,
        pendingDoctors: pendingData,
        doctors: doctorsList,
        patients: patientsList,
        bookings: bookingsList
      });

      // Safely extract arrays from wrapped backend responses if necessary
      const safePendingDoctors = Array.isArray(pendingData) 
        ? pendingData 
        : (pendingData as any)?.data || (pendingData as any)?.pendingDoctors || (pendingData as any)?.doctors || [];
      
      const safeDoctors = Array.isArray(doctorsList) 
        ? doctorsList 
        : (doctorsList as any)?.data || (doctorsList as any)?.doctors || (doctorsList as any)?.formattedDoctors || [];
      
      const safePatients = Array.isArray(patientsList) 
        ? patientsList 
        : (patientsList as any)?.data || (patientsList as any)?.patients || [];

      const safeBookings = Array.isArray(bookingsList) 
        ? bookingsList 
        : [];

      console.log("Doctors list summary:", safeDoctors.map((d: any) => ({
        id: d._id || d.id,
        name: d.userId?.name || d.user?.name || d.name,
        specialty: d.specialty || d.doctorProfile?.specialty,
        isVerified: d.isVerified,
        isVerified_profile: d.doctorProfile?.isVerified,
        isActive: d.isActive,
        isActive_profile: d.doctorProfile?.isActive,
        user_isVerified: d.userId?.isVerified || d.user?.isVerified,
        user_isActive: d.userId?.isActive || d.user?.isActive,
        user_docProfile_isVerified: d.userId?.doctorProfile?.isVerified || d.user?.doctorProfile?.isVerified,
        user_docProfile_isActive: d.userId?.doctorProfile?.isActive || d.user?.doctorProfile?.isActive
      })));

      setStats(statsData);
      setPendingDoctors(safePendingDoctors);
      setDoctors(safeDoctors);
      setPatients(safePatients);
      setBookings(safeBookings);
    } catch (err: any) {
      console.error("fetchData Error:", err);
      toast.error(err.message || "Failed to load admin dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerifyDoctor = async (id: string) => {
    console.log("handleVerifyDoctor triggered for ID:", id);
    try {
      const response = await adminService.verifyDoctor(id);
      console.log("verifyDoctor API Response:", JSON.stringify(response, null, 2));
      toast.success("Doctor account verified successfully!");

      // Optimistic update: immediately mark doctor as verified in local state
      setDoctors((prev: any) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((d: any) => {
          const dId = d._id || d.id;
          if (dId === id) {
            return {
              ...d,
              isVerified: true,
              ...(d.doctorProfile ? { doctorProfile: { ...d.doctorProfile, isVerified: true } } : {}),
              ...(d.userId && typeof d.userId === 'object' ? { userId: { ...d.userId, isVerified: true } } : {}),
              ...(d.user && typeof d.user === 'object' ? { user: { ...d.user, isVerified: true } } : {}),
            };
          }
          return d;
        });
      });
      setPendingDoctors((prev: any) => {
        if (!Array.isArray(prev)) return prev;
        return prev.filter((d: any) => (d._id || d.id) !== id);
      });

      // Delayed refetch to let backend propagate, avoid overwriting optimistic update
      setTimeout(() => fetchData(), 3000);
    } catch (err: any) {
      console.error("verifyDoctor Error:", err);
      toast.error(err.message || "Failed to verify doctor");
    }
  };

  const handleToggleDoctor = async (id: string) => {
    console.log("handleToggleDoctor triggered for ID:", id);
    try {
      const response = await adminService.toggleDoctorActive(id);
      console.log("toggleDoctorActive API Response:", JSON.stringify(response, null, 2));
      toast.success("Doctor active status toggled");

      // Optimistic update: toggle isActive in local state
      setDoctors((prev: any) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((d: any) => {
          const dId = d._id || d.id;
          if (dId === id) {
            const wasActive = d.isActive !== false && d.doctorProfile?.isActive !== false;
            return {
              ...d,
              isActive: !wasActive,
              ...(d.doctorProfile ? { doctorProfile: { ...d.doctorProfile, isActive: !wasActive } } : {}),
            };
          }
          return d;
        });
      });

      // Delayed refetch to let backend propagate, avoid overwriting optimistic update
      setTimeout(() => fetchData(), 3000);
    } catch (err: any) {
      console.error("toggleDoctorActive Error:", err);
      toast.error(err.message || "Failed to toggle doctor status");
    }
  };

  const handleTogglePatient = async (id: string) => {
    console.log("handleTogglePatient triggered for ID:", id);
    try {
      const response = await adminService.togglePatientActive(id);
      console.log("togglePatientActive API Response:", response);
      toast.success("Patient active status toggled");
      fetchData();
    } catch (err: any) {
      console.error("togglePatientActive Error:", err);
      toast.error(err.message || "Failed to toggle patient status");
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      toast.error("Please fill in all fields");
      return;
    }

    setBroadcasting(true);
    try {
      await adminService.broadcastAnnouncement({ title: broadcastTitle, message: broadcastMessage });
      toast.success("System announcement broadcasted successfully!");
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to broadcast announcement");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleOpenAddBooking = () => {
    const docList = Array.isArray(doctors) ? doctors : [];
    const patList = Array.isArray(patients) ? patients : [];
    setFormPatientId(patList[0]?._id || "");
    setFormDoctorId(docList[0]?._id || "");
    setFormDate(new Date(Date.now() + 24 * 3600 * 1000).toISOString().split("T")[0]);
    setFormSlot("09:00 AM");
    setFormDay("Monday");
    setShowAddModal(true);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatientId || !formDoctorId || !formDate || !formSlot) {
      toast.error("Please fill in all booking fields");
      return;
    }
    setSubmittingBooking(true);
    try {
      await adminService.addBooking({
        patientId: formPatientId,
        doctorId: formDoctorId,
        date: formDate,
        slot: formSlot,
        day: formDay
      });
      toast.success("Appointment created successfully!");
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create appointment booking");
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleOpenEditBooking = (b: AdminBooking) => {
    setSelectedBooking(b);
    setFormDate(b.date);
    setFormSlot(b.slot);
    setFormDay(b.day);
    setFormStatus(b.status);
    setShowEditModal(true);
  };

  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setSubmittingBooking(true);
    try {
      await adminService.updateBooking(selectedBooking._id, {
        date: formDate,
        slot: formSlot,
        day: formDay,
        status: formStatus
      });
      toast.success("Appointment updated successfully!");
      setShowEditModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update appointment booking");
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (window.confirm("Are you sure you want to cancel and delete this appointment booking?")) {
      try {
        await adminService.deleteBooking(id);
        toast.success("Appointment booking cancelled successfully");
        fetchData();
      } catch (err: any) {
        toast.error("Failed to cancel appointment");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const pendingDoctorsListRaw = Array.isArray(pendingDoctors) ? pendingDoctors : (pendingDoctors as any)?.data || (pendingDoctors as any)?.doctors || (pendingDoctors as any)?.formattedDoctors || [];
  const pendingDoctorsList = Array.isArray(pendingDoctorsListRaw) ? pendingDoctorsListRaw : [];

  const doctorsListRaw = Array.isArray(doctors) ? doctors : (doctors as any)?.data || (doctors as any)?.doctors || (doctors as any)?.formattedDoctors || [];
  const doctorsList = Array.isArray(doctorsListRaw) ? doctorsListRaw : [];

  const patientsListRaw = Array.isArray(patients) ? patients : (patients as any)?.data || (patients as any)?.patients || (patients as any)?.formattedDoctors || [];
  const patientsList = Array.isArray(patientsListRaw) ? patientsListRaw : [];

  const bookingList = Array.isArray(bookings) ? bookings : [];

  // Helper to normalize doctor details returned from the backend (supporting nested user structures)
  const normalizeAdminDoctor = (doc: any) => {
    if (!doc) return null;

    // ── Deep-log every doctor's raw verification-related fields ──
    console.log("[normalizeAdminDoctor] RAW doc:", {
      _id: doc._id,
      id: doc.id,
      name_root: doc.name,
      name_userId: doc.userId?.name,
      name_user: doc.user?.name,
      isVerified_root: doc.isVerified,
      isVerified_profile: doc.doctorProfile?.isVerified,
      isVerified_userId: doc.userId?.isVerified,
      isVerified_user: doc.user?.isVerified,
      isActive_root: doc.isActive,
      isActive_profile: doc.doctorProfile?.isActive,
      specialty_root: doc.specialty,
      specialty_profile: doc.doctorProfile?.specialty,
      hasUserId: !!doc.userId,
      hasUser: !!doc.user,
      hasDoctorProfile: !!doc.doctorProfile,
      allKeys: Object.keys(doc)
    });

    const name = 
      doc.userId?.name || 
      doc.user?.name || 
      doc.user?.userId?.name || 
      doc.doctorProfile?.user?.name || 
      doc.doctorProfile?.userId?.name || 
      doc.name || 
      "Unnamed";

    const email = 
      doc.userId?.email || 
      doc.user?.email || 
      doc.user?.userId?.email || 
      doc.doctorProfile?.user?.email || 
      doc.doctorProfile?.userId?.email || 
      doc.email || 
      "";

    const phone = 
      doc.userId?.phone || 
      doc.user?.phone || 
      doc.user?.userId?.phone || 
      doc.doctorProfile?.user?.phone || 
      doc.doctorProfile?.userId?.phone || 
      doc.phone || 
      "";

    const image = 
      doc.userId?.image || 
      doc.user?.image || 
      doc.userId?.imageUrl || 
      doc.user?.imageUrl || 
      doc.doctorProfile?.user?.image || 
      doc.image || 
      doc.imageUrl || 
      "";

    const specialty = doc.specialty || doc.doctorProfile?.specialty || "General";
    
    // The backend might update the verification/active status on the User object, nested doctorProfile, or DoctorProfile document root. 
    // We check all potential locations to ensure UI states are perfectly synced.
    const isVerified = 
      doc.isVerified === true ||
      doc.doctorProfile?.isVerified === true ||
      doc.userId?.isVerified === true ||
      doc.user?.isVerified === true ||
      doc.userId?.doctorProfile?.isVerified === true ||
      doc.user?.doctorProfile?.isVerified === true;

    const isActive = !(
      doc.isActive === false ||
      doc.doctorProfile?.isActive === false ||
      doc.userId?.isActive === false ||
      doc.user?.isActive === false ||
      doc.userId?.doctorProfile?.isActive === false ||
      doc.user?.doctorProfile?.isActive === false
    );

    const documents = doc.documents || doc.doctorProfile?.documents || [];
    const bio = doc.bio || doc.doctorProfile?.bio || "";
    const consultationFee = doc.consultationFee || doc.doctorProfile?.consultationFee || 0;
    const feeVideo = doc.feeVideo || doc.doctorProfile?.feeVideo || 0;
    const feeHome = doc.feeHome || doc.doctorProfile?.feeHome || 0;

    // The backend API routes /admin/verify-doctor/:id and /admin/doctor/:id/toggle-active expect the DoctorProfile ID (the root _id of the profile document).
    const doctorProfileId = doc._id || doc.id;
    // The user ID (just in case we need it)
    const userId = doc.userId?._id || doc.user?._id || (typeof doc.userId === "string" ? doc.userId : null) || (typeof doc.user === "string" ? doc.user : null);

    return {
      _id: doctorProfileId,
      userId,
      name,
      email,
      phone,
      image,
      specialty,
      isVerified,
      isActive,
      documents,
      bio,
      consultationFee,
      feeVideo,
      feeHome
    };
  };

  const normalizedPendingDoctors = pendingDoctorsList.map(normalizeAdminDoctor).filter(Boolean) as any[];
  const normalizedDoctors = doctorsList.map(normalizeAdminDoctor).filter(Boolean) as any[];

  // Filtered lists
  const filteredBookings = bookingList.filter((b) => {
    if (!b) return false;
    const matchesSearch = 
      (b.patientId?.name || "").toLowerCase().includes(bookingSearch.toLowerCase()) || 
      (b.doctorId?.name || "").toLowerCase().includes(bookingSearch.toLowerCase()) ||
      (b.doctorId?.doctorProfile?.specialty || "").toLowerCase().includes(bookingSearch.toLowerCase());
    
    const matchesFilter = bookingFilter === "all" || b.status === bookingFilter;
    return matchesSearch && matchesFilter;
  });

  // Filtered lists
  const filteredDoctors = normalizedDoctors.filter((doc) => {
    const name = doc.name || "";
    const specialty = doc.specialty || "";
    const isVerified = !!doc.isVerified;

    const matchesSearch = name.toLowerCase().includes(doctorSearch.toLowerCase()) || 
                          specialty.toLowerCase().includes(doctorSearch.toLowerCase());
    const matchesFilter = doctorFilter === "all" || 
                          (doctorFilter === "verified" && isVerified) || 
                          (doctorFilter === "pending" && !isVerified);
    return matchesSearch && matchesFilter;
  });

  const filteredPatients = patientsList.filter((pat) => {
    if (!pat) return false;
    const name = pat.name || "";
    const email = pat.email || "";
    return name.toLowerCase().includes(patientSearch.toLowerCase()) || 
           email.toLowerCase().includes(patientSearch.toLowerCase());
  });

  // Stats data for charts
  const statsChartData = [
    { name: "Patients", count: stats?.patientsCount || 0 },
    { name: "Doctors", count: stats?.doctorsCount || 0 },
    { name: "Operations", count: stats?.operationsCount || 0 },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Control Center</h2>
        <p className="text-sm text-muted-foreground">Monitor platform statistics, approve registrations, and broadcast system bulletins</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto gap-4">
        {[
          { id: "overview", label: "Analytics Overview" },
          { id: "doctors", label: `Doctors Management (${doctorsList.length})` },
          { id: "patients", label: `Patients Management (${patientsList.length})` },
          { id: "bookings", label: `Appointments Manager (${bookingList.length})` },
          { id: "broadcast", label: "Broadcast Bulletin" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === "doctors") navigate("/admin/doctors");
              else if (tab.id === "patients") navigate("/admin/patients");
              else if (tab.id === "broadcast") navigate("/admin/broadcast");
              else if (tab.id === "bookings") navigate("/admin/bookings");
              else navigate("/admin");
            }}
            className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-2xl border flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Patients</span>
                <h3 className="text-3xl font-extrabold">{stats?.patientsCount || 0}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Verified Doctors</span>
                <h3 className="text-3xl font-extrabold">{stats?.doctorsCount || 0}</h3>
              </div>
              <div className="p-3 bg-teal-500/10 rounded-xl text-teal-500">
                <Stethoscope className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Scheduled Operations</span>
                <h3 className="text-3xl font-extrabold">{stats?.operationsCount || 0}</h3>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                <Activity className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Pending Approval List */}
          {pendingDoctorsList.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 border shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-amber-500 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldAlert className="h-5 w-5" /> Pending Doctor Verifications ({normalizedPendingDoctors.length})
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground uppercase font-semibold">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Specialty</th>
                      <th className="py-3 px-4">Uploaded Documents</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {normalizedPendingDoctors.map((doc) => (
                      <tr key={doc._id} className="hover:bg-muted/30">
                        <td className="py-3.5 px-4 font-medium">{doc.name}</td>
                        <td className="py-3.5 px-4 text-xs">{doc.specialty}</td>
                        <td className="py-3.5 px-4">
                          {doc.documents && doc.documents.length > 0 ? (
                            <div className="flex gap-2">
                              {doc.documents.map((d: string, index: number) => (
                                <a 
                                  key={index} 
                                  href={d} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline"
                                >
                                  Doc {index + 1}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No documents uploaded</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleVerifyDoctor(doc._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl border shadow-sm">
              <h4 className="font-bold text-sm mb-4">Platform Distribution</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip cursor={{ fill: "transparent" }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border shadow-sm">
              <h4 className="font-bold text-sm mb-4">System Transaction Load</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { day: "Mon", load: 20 },
                    { day: "Tue", load: 45 },
                    { day: "Wed", load: 30 },
                    { day: "Thu", load: 80 },
                    { day: "Fri", load: 60 },
                    { day: "Sat", load: 40 },
                    { day: "Sun", load: 50 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="load" stroke="#0ea5e9" fillOpacity={0.2} fill="#0ea5e9" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctors tab */}
      {activeTab === "doctors" && (
        <div className="glass-panel rounded-2xl p-6 border shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute inset-y-0 left-3 h-4 w-4 my-auto text-muted-foreground" />
              <input
                type="text"
                placeholder="Search specialty or name..."
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background border rounded-xl text-xs focus:outline-none focus:border-primary transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={doctorFilter}
                onChange={(e: any) => setDoctorFilter(e.target.value)}
                className="bg-background border rounded-xl px-3 py-2 text-xs focus:outline-none"
              >
                <option value="all">All Doctors</option>
                <option value="verified">Verified Only</option>
                <option value="pending">Pending Verification</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase font-semibold">
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Specialty</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDoctors.map((doc) => {
                  const nameChar = (doc.name || "?").charAt(0);
                  return (
                    <tr key={doc._id} className="hover:bg-muted/30">
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                          {doc.image ? <img src={doc.image} alt={doc.name} className="h-full w-full object-cover animate-fade-in" /> : nameChar}
                        </div>
                        <div>
                          <span className="font-semibold block">{doc.name || "Unnamed"}</span>
                          <span className="text-[11px] text-muted-foreground block">{doc.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">{doc.specialty}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          doc.isVerified 
                            ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/25 animate-pulse-glow" 
                            : "text-amber-500 bg-amber-500/10 border-amber-500/25"
                        }`}>
                          {doc.isVerified ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          doc.isActive 
                            ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/25" 
                            : "text-rose-500 bg-rose-500/10 border-rose-500/25"
                        }`}>
                          {doc.isActive ? "Active" : "Frozen"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedDoctor(doc);
                              setShowDetailsModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-950/45 hover:bg-slate-950/80 border border-slate-800 text-primary hover:text-primary-foreground rounded-lg text-xs font-semibold transition-all shadow-sm"
                            title="View Doctor Details"
                          >
                            <Eye className="h-3.5 w-3.5" /> Details
                          </button>

                          <button
                            onClick={() => handleStartChat(doc.userId || doc._id, doc._id, doc.name)}
                            disabled={chatLoading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
                            title="Chat with Doctor"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Chat
                          </button>
                          
                          {!doc.isVerified && (
                            <button
                              onClick={() => handleVerifyDoctor(doc._id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                              title="Approve / Verify Doctor"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Approve
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleDoctor(doc._id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                              doc.isActive
                                ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20"
                            }`}
                          >
                            {doc.isActive ? (
                              <>
                                <UserMinus className="h-3.5 w-3.5" /> Freeze
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3.5 w-3.5" /> Activate
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Patients Tab */}
      {activeTab === "patients" && (
        <div className="glass-panel rounded-2xl p-6 border shadow-sm space-y-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute inset-y-0 left-3 h-4 w-4 my-auto text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patients..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border rounded-xl text-xs focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase font-semibold">
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Registration Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPatients.map((pat) => (
                  <tr key={pat._id} className="hover:bg-muted/30">
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                        {pat.image ? <img src={pat.image} alt={pat.name} className="h-full w-full object-cover" /> : pat.name.charAt(0)}
                      </div>
                      <span className="font-semibold">{pat.name}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="block text-xs font-semibold">{pat.email}</span>
                      <span className="block text-[10px] text-muted-foreground">{pat.phone || "No phone"}</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {new Date(pat.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        pat.isActive 
                          ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/25" 
                          : "text-rose-500 bg-rose-500/10 border-rose-500/25"
                      }`}>
                        {pat.isActive ? "Active" : "Frozen"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleStartChat(pat._id, undefined, pat.name)}
                          disabled={chatLoading}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
                          title="Chat with Patient"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Chat
                        </button>

                        <button
                          onClick={() => handleTogglePatient(pat._id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                            pat.isActive
                              ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20"
                              : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20"
                          }`}
                        >
                          {pat.isActive ? (
                            <>
                              <UserMinus className="h-3.5 w-3.5" /> Freeze
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5" /> Activate
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Broadcast tab */}
      {activeTab === "broadcast" && (
        <div className="glass-panel rounded-2xl p-6 border shadow-sm max-w-lg">
          <h3 className="font-bold text-sm mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <Megaphone className="h-5 w-5 text-primary" /> Send System Broadcast
          </h3>
          <p className="text-xs text-muted-foreground mb-6">
            Dispatching this notification will push an alert to the inbox of every registered user on the platform.
          </p>

          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Broadcast Title
              </label>
              <input
                type="text"
                required
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="Scheduled Server Maintenance"
                className="w-full px-3 py-2.5 bg-background border rounded-xl text-xs focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Detailed Message
              </label>
              <textarea
                required
                rows={4}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Dear users, the SmartClinic server will undergo routine updates at 02:00 UTC tonight..."
                className="w-full px-3 py-2.5 bg-background border rounded-xl text-xs focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={broadcasting}
              className="flex items-center gap-2 justify-center py-2.5 px-6 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:shadow hover:shadow-primary/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {broadcasting && <Activity className="h-4 w-4 animate-spin" />}
              Publish Broadcast
            </button>
          </form>
        </div>
      )}

      {/* Bookings tab */}
      {activeTab === "bookings" && (
        <div className="glass-panel rounded-2xl p-6 border shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute inset-y-0 left-3 h-4 w-4 my-auto text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search patient, doctor, specialty..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border rounded-xl text-xs focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={bookingFilter}
                  onChange={(e: any) => setBookingFilter(e.target.value)}
                  className="bg-background border rounded-xl px-3 py-2 text-xs focus:outline-none"
                >
                  <option value="all">All Bookings</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleOpenAddBooking}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:shadow active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" /> Book New Appointment
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase font-semibold">
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Specialty</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                      No appointment bookings found matching the filters
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => (
                    <tr key={b._id} className="hover:bg-muted/30">
                      <td className="py-3.5 px-4 font-semibold">{b.patientId?.name || "Unknown Patient"}</td>
                      <td className="py-3.5 px-4 font-medium">{b.doctorId?.name || "Unknown Doctor"}</td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Stethoscope className="h-3.5 w-3.5 text-primary" />
                          {b.doctorId?.doctorProfile?.specialty || "General"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{new Date(b.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{b.slot} ({b.day})</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase ${
                          b.status === "accepted" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/25" :
                          b.status === "pending" ? "text-amber-500 bg-amber-500/10 border-amber-500/25" :
                          b.status === "completed" ? "text-primary bg-primary/10 border-primary/25" :
                          "text-rose-500 bg-rose-500/10 border-rose-500/25"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditBooking(b)}
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 rounded-lg text-xs transition-all animate-fade-in"
                            title="Edit Appointment"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBooking(b._id)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-lg text-xs transition-all animate-fade-in"
                            title="Cancel Appointment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Booking */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 glass-panel transform scale-100 transition-all duration-300">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Book New Appointment Slot</h3>
            
            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Select Patient</label>
                <select
                  required
                  value={formPatientId}
                  onChange={(e) => setFormPatientId(e.target.value)}
                  className="w-full bg-background border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">-- Choose Patient --</option>
                  {patientsList.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} ({p.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Select Doctor</label>
                <select
                  required
                  value={formDoctorId}
                  onChange={(e) => setFormDoctorId(e.target.value)}
                  className="w-full bg-background border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">-- Choose Doctor --</option>
                  {normalizedDoctors.map((d) => (
                    <option key={d._id} value={d._id}>{d.name} ({d.specialty})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Consultation Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-background border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Consultation Day</label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value)}
                    className="w-full bg-background border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  >
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Consultation Hour Slot</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 09:00 AM"
                  value={formSlot}
                  onChange={(e) => setFormSlot(e.target.value)}
                  className="w-full bg-background border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl text-xs active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBooking}
                  className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:shadow active:scale-95 transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {submittingBooking && <Activity className="h-3.5 w-3.5 animate-spin" />}
                  Book Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Booking */}
      {showEditModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 glass-panel transform scale-100 transition-all duration-300">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Modify Booking: {selectedBooking.patientId?.name}</h3>
            
            <form onSubmit={handleUpdateBooking} className="space-y-4 text-xs">
              <div className="space-y-1 bg-slate-950/45 p-3 rounded-xl border border-slate-850">
                <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Appointment Metadata</span>
                <div className="text-[11px] text-slate-350 mt-1">
                  <div>Doctor: <span className="font-semibold">{selectedBooking.doctorId?.name}</span></div>
                  <div>Specialty: <span className="font-semibold">{selectedBooking.doctorId?.doctorProfile?.specialty}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Consultation Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-background border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Consultation Day</label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value)}
                    className="w-full bg-background border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  >
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Consultation Hour Slot</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 09:00 AM"
                  value={formSlot}
                  onChange={(e) => setFormSlot(e.target.value)}
                  className="w-full bg-background border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Booking Status</label>
                <select
                  value={formStatus}
                  onChange={(e: any) => setFormStatus(e.target.value)}
                  className="w-full bg-background border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="pending">Pending Approval</option>
                  <option value="accepted">Accepted / Confirmed</option>
                  <option value="completed">Completed / Archival</option>
                  <option value="rejected">Rejected / Cancelled</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl text-xs active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBooking}
                  className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:shadow active:scale-95 transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {submittingBooking && <Activity className="h-3.5 w-3.5 animate-spin" />}
                  Save Modification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Doctor Details & Approval */}
      {showDetailsModal && selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 glass-panel transform scale-100 transition-all duration-300">
            <div className="flex justify-between items-start">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Doctor Profile Credentials</h3>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-4 bg-slate-950/30 p-4 rounded-xl border border-slate-850">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xl border-2 border-primary/20 overflow-hidden">
                {selectedDoctor.image ? (
                  <img src={selectedDoctor.image} alt={selectedDoctor.name} className="h-full w-full object-cover" />
                ) : (
                  (selectedDoctor.name || "?").charAt(0)
                )}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-foreground">{selectedDoctor.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{selectedDoctor.email}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{selectedDoctor.phone || "No phone number listed"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Clinical Specialty</span>
                <span className="text-slate-200 font-medium flex items-center gap-1.5 mt-0.5">
                  <Stethoscope className="h-3.5 w-3.5 text-primary" /> {selectedDoctor.specialty}
                </span>
              </div>

              <div className="space-y-1">
                <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Verification Status</span>
                <div>
                  <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase mt-0.5 ${
                    selectedDoctor.isVerified 
                      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/25" 
                      : "text-amber-500 bg-amber-500/10 border-amber-500/25"
                  }`}>
                    {selectedDoctor.isVerified ? "Verified" : "Pending Approval"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Consultation Tariff</span>
              <div className="grid grid-cols-3 gap-2 bg-slate-950/20 p-2.5 rounded-xl border border-slate-850">
                <div className="text-center">
                  <span className="block text-[9px] text-muted-foreground uppercase">Video Consultation</span>
                  <span className="font-bold text-emerald-400 text-xs">${selectedDoctor.feeVideo || 0}</span>
                </div>
                <div className="text-center border-x border-slate-850">
                  <span className="block text-[9px] text-muted-foreground uppercase">Home Visit</span>
                  <span className="font-bold text-emerald-400 text-xs">${selectedDoctor.feeHome || 0}</span>
                </div>
                <div className="text-center">
                  <span className="block text-[9px] text-muted-foreground uppercase">In-Clinic Tariff</span>
                  <span className="font-bold text-emerald-400 text-xs">${selectedDoctor.consultationFee || 0}</span>
                </div>
              </div>
            </div>

            {selectedDoctor.bio && (
              <div className="space-y-1 text-xs">
                <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Biography / Core Profile</span>
                <p className="text-slate-300 leading-relaxed bg-slate-950/20 p-3 rounded-xl border border-slate-850 text-[11px] max-h-24 overflow-y-auto">{selectedDoctor.bio}</p>
              </div>
            )}

            <div className="space-y-2 text-xs">
              <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Uploaded License Documents</span>
              {selectedDoctor.documents && selectedDoctor.documents.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedDoctor.documents.map((docLink: string, idx: number) => (
                    <a
                      key={idx}
                      href={docLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/45 hover:bg-slate-950/80 border border-slate-800 text-primary hover:underline rounded-xl transition-all"
                    >
                      <FileText className="h-3.5 w-3.5" /> License File {idx + 1}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic text-[11px] bg-slate-950/20 p-2.5 rounded-xl border border-slate-850">No verification documents uploaded</p>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-850 text-xs">
              <div>
                <span className="text-muted-foreground">Status: </span>
                <span className={selectedDoctor.isActive ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
                  {selectedDoctor.isActive ? "Active" : "Frozen / Suspended"}
                </span>
              </div>
              <div className="flex gap-2">
                {!selectedDoctor.isVerified && (
                  <button
                    onClick={async () => {
                      try {
                        await handleVerifyDoctor(selectedDoctor._id);
                        setSelectedDoctor((prev: any) => ({ ...prev, isVerified: true }));
                      } catch (err) {}
                    }}
                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center gap-1"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Verify & Approve
                  </button>
                )}
                <button
                  onClick={async () => {
                    try {
                      await handleToggleDoctor(selectedDoctor._id);
                      setSelectedDoctor((prev: any) => ({ ...prev, isActive: !prev.isActive }));
                    } catch (err) {}
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold shadow transition-all border ${
                    selectedDoctor.isActive
                      ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/20"
                      : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20"
                  }`}
                >
                  {selectedDoctor.isActive ? "Freeze" : "Activate"}
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-foreground rounded-xl text-xs font-semibold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
