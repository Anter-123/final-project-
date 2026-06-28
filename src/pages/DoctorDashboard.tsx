import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { bookingService } from "../services/bookingService";
import type { Booking } from "../services/bookingService";
import { doctorService } from "../services/doctorService";
import { historyService } from "../services/historyService";
import type { PatientRecord, MedicalReport } from "../services/historyService";
import { chatService } from "../services/chatService";
import { 
  Calendar, 
  Users, 
  Upload, 
  Clock, 
  FileText, 
  Check, 
  X, 
  Plus, 
  FolderHeart,
  Loader2,
  Bookmark,
  MessageSquare
} from "lucide-react";
import toast from "react-hot-toast";

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"appointments" | "patients" | "schedule" | "verification">("appointments");

  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith("/patients")) {
      setActiveTab("patients");
    } else if (path.endsWith("/schedule")) {
      setActiveTab("schedule");
    } else if (path.endsWith("/verification")) {
      setActiveTab("verification");
    } else {
      setActiveTab("appointments");
    }
  }, [location.pathname]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [myPatients, setMyPatients] = useState<PatientRecord[]>([]);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<MedicalReport[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  
  // Diagnosis form
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [submittingDiagnosis, setSubmittingDiagnosis] = useState(false);

  // Schedule form
  const [workingHours, setWorkingHours] = useState<Array<{ day: string; slots: string[] }>>([
    { day: "Monday", slots: ["09:00 AM", "10:00 AM", "11:00 AM"] },
    { day: "Wednesday", slots: ["04:00 PM", "05:00 PM"] }
  ]);
  const [newDay, setNewDay] = useState("Monday");
  const [newSlot, setNewSlot] = useState("");

  // Verification documents upload
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [bookingsData, patientsData] = await Promise.all([
        bookingService.getDoctorBookings(),
        historyService.getMyPatients(),
      ]);
      const activeBookings = Array.isArray(bookingsData) ? bookingsData : [];
      const activePatients = Array.isArray(patientsData) ? patientsData : [];

      // Extract patients from bookings (so they appear in the list as soon as they book)
      const bookingPatients: PatientRecord[] = [];
      activeBookings.forEach((b) => {
        if (b.patientId && b.patientId._id) {
          const exists = bookingPatients.some((p) => p._id === b.patientId._id) || 
                         activePatients.some((p) => p._id === b.patientId._id);
          if (!exists) {
            bookingPatients.push({
              _id: b.patientId._id,
              name: b.patientId.name,
              email: b.patientId.email,
              phone: b.patientId.phone,
              age: (b.patientId as any).age,
              gender: (b.patientId as any).gender,
              image: b.patientId.image
            });
          }
        }
      });

      setBookings(activeBookings);
      setMyPatients([...activePatients, ...bookingPatients]);
      
      if (user.doctorProfile?.workingHours) {
        const wh = user.doctorProfile.workingHours;
        setWorkingHours(Array.isArray(wh) ? wh : []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleUpdateBooking = async (bookingId: string, status: "accepted" | "completed" | "rejected") => {
    try {
      const doctorId = user?.doctorProfile?._id || "";
      await bookingService.updateBookingStatus(bookingId, status, doctorId);
      toast.success(`Booking marked as ${status}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update booking status");
    }
  };

  const handleLoadPatientHistory = async (patient: PatientRecord) => {
    setSelectedPatient(patient);
    try {
      const reports = await historyService.getPatientHistory(patient._id);
      setSelectedPatientHistory(Array.isArray(reports) ? reports : []);
    } catch (err: any) {
      toast.error("Failed to load patient history");
    }
  };

  const handleAddDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !diagnosis) {
      toast.error("Please provide a diagnosis");
      return;
    }

    setSubmittingDiagnosis(true);
    try {
      await historyService.addDiagnosis({
        patientId: selectedPatient._id,
        diagnosis,
        notes: diagnosisNotes,
      });
      toast.success("Medical report successfully added to patient file");
      setDiagnosis("");
      setDiagnosisNotes("");
      
      // Reload history
      const updatedReports = await historyService.getPatientHistory(selectedPatient._id);
      setSelectedPatientHistory(updatedReports);
    } catch (err: any) {
      toast.error(err.message || "Failed to add diagnosis");
    } finally {
      setSubmittingDiagnosis(false);
    }
  };

  const handleUploadDocuments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      toast.error("Please select files first");
      return;
    }
    if (files.length > 5) {
      toast.error("Maximum 5 files allowed");
      return;
    }

    setUploadingDocs(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("documents", files[i]);
      }

      await doctorService.uploadVerification(user!._id, formData);
      toast.success("Verification documents uploaded successfully!");
      setFiles(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload documents");
    } finally {
      setUploadingDocs(false);
    }
  };

  const [chatLoading, setChatLoading] = useState(false);
  const handleStartChat = async (patientId: string) => {
    setChatLoading(true);
    try {
      // Fetch all existing chat rooms first
      const rooms = await chatService.getChats();
      const existingRoom = rooms.find((r: any) => {
        const pId = r.userId?._id || r.userId;
        return pId === patientId;
      });

      if (existingRoom) {
        navigate("/chat", { state: { activeChatId: existingRoom._id, newRoom: existingRoom } });
      } else {
        // Fallback: create room passing both patientId and doctorProfile ID
        const doctorId = user?.doctorProfile?._id || "";
        const room = await chatService.createChat(patientId, doctorId);
        navigate("/chat", { state: { activeChatId: room._id, newRoom: room } });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start chat session");
    } finally {
      setChatLoading(false);
    }
  };

  const handleSaveWorkingHours = async () => {
    try {
      await doctorService.updateWorkingHours(user!._id, workingHours);
      toast.success("Working hours schedule updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update working hours");
    }
  };

  const addSlot = () => {
    if (!newSlot) return;
    setWorkingHours(prev => {
      return prev.map(item => {
        if (item.day === newDay) {
          if (item.slots.includes(newSlot)) return item;
          return { ...item, slots: [...item.slots, newSlot] };
        }
        return item;
      });
    });
    setNewSlot("");
  };

  const removeSlot = (dayName: string, slotIndex: number) => {
    setWorkingHours(prev => {
      return prev.map(item => {
        if (item.day === dayName) {
          return { ...item, slots: item.slots.filter((_, idx) => idx !== slotIndex) };
        }
        return item;
      });
    });
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const pendingBookings = bookings.filter(b => b.status === "pending");
  const activeBookings = bookings.filter(b => b.status === "accepted" || b.status === "confirmed");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clinical Administration</h2>
          <p className="text-sm text-muted-foreground">Manage active consultations, review patient histories, and configure your availability</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto gap-4">
        {[
          { id: "appointments", label: "Appointments Manager" },
          { id: "patients", label: `Patients Directory (${myPatients.length})` },
          { id: "schedule", label: "Availability Schedule" },
          { id: "verification", label: "Account Credentials" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === "patients") navigate("/doctor/patients");
              else if (tab.id === "schedule") navigate("/doctor/schedule");
              else if (tab.id === "verification") navigate("/doctor/verification");
              else navigate("/doctor");
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

      {/* Appointments */}
      {activeTab === "appointments" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Queue */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-amber-500 flex items-center gap-1.5 uppercase tracking-wider">
                Pending Requests ({pendingBookings.length})
              </h3>
              
              {pendingBookings.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No pending appointment requests</p>
              ) : (
                <div className="space-y-3">
                  {pendingBookings.map((b) => (
                    <div key={b._id} className="p-4 rounded-xl border bg-slate-900/5 dark:bg-slate-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="font-semibold text-sm">{b.patientId.name}</h4>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3.5 w-3.5" /> {new Date(b.date).toLocaleDateString()} at {b.slot}
                        </span>
                      </div>
                      
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleStartChat(b.patientId._id)}
                          disabled={chatLoading}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-semibold shadow disabled:opacity-50"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Chat
                        </button>
                        <button
                          onClick={() => handleUpdateBooking(b._id, "accepted")}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow"
                        >
                          <Check className="h-3.5 w-3.5" /> Accept
                        </button>
                        <button
                          onClick={() => handleUpdateBooking(b._id, "rejected")}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold shadow"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Schedule */}
            <div className="glass-panel p-6 rounded-2xl border shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-primary flex items-center gap-1.5 uppercase tracking-wider">
                Confirmed Consultations ({activeBookings.length})
              </h3>
              
              {activeBookings.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No confirmed consultations today</p>
              ) : (
                <div className="space-y-3">
                  {activeBookings.map((b) => (
                    <div key={b._id} className="p-4 rounded-xl border bg-slate-900/5 dark:bg-slate-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="font-semibold text-sm">{b.patientId.name}</h4>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3.5 w-3.5" /> {new Date(b.date).toLocaleDateString()} at {b.slot}
                        </span>
                      </div>
                      
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleStartChat(b.patientId._id)}
                          disabled={chatLoading}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-semibold shadow disabled:opacity-50"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Chat
                        </button>
                        <button
                          onClick={() => handleUpdateBooking(b._id, "completed")}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold shadow"
                        >
                          <Check className="h-3.5 w-3.5" /> Complete Visit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Column */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Bookings</span>
                <h3 className="text-2xl font-extrabold mt-1">{activeBookings.length}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Clock className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Unique Patients</span>
                <h3 className="text-2xl font-extrabold mt-1">{myPatients.length}</h3>
              </div>
              <div className="p-3 bg-teal-550/10 rounded-xl text-teal-500">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patients Tab */}
      {activeTab === "patients" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patients list */}
          <div className="glass-panel rounded-2xl p-6 border shadow-sm space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider">Patients History Directory</h3>
            
            <div className="space-y-2">
              {myPatients.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No patient records found</p>
              ) : (
                myPatients.map((pat) => (
                  <button
                    key={pat._id}
                    onClick={() => handleLoadPatientHistory(pat)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
                      selectedPatient?._id === pat._id 
                        ? "bg-primary border-primary text-primary-foreground shadow" 
                        : "bg-slate-900/5 dark:bg-slate-950/20 hover:bg-muted border-transparent"
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-slate-300 dark:bg-slate-800 flex items-center justify-center font-bold text-xs uppercase text-slate-800 dark:text-slate-100">
                      {pat.image ? <img src={pat.image} alt={pat.name} className="h-full w-full object-cover rounded-full" /> : pat.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-semibold text-xs block">{pat.name}</span>
                      <span className={`text-[10px] block ${selectedPatient?._id === pat._id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        Age: {pat.age || "N/A"} | {pat.gender || "Gender N/A"}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Patient History Viewer & Diagnostic form */}
          <div className="lg:col-span-2 space-y-6">
            {selectedPatient ? (
              <>
                {/* Reports lists */}
                <div className="glass-panel p-6 rounded-2xl border shadow-sm space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <h3 className="font-bold text-sm flex items-center gap-2 text-primary">
                      <FolderHeart className="h-5 w-5" /> Medical History: {selectedPatient.name}
                    </h3>
                    <button
                      onClick={() => handleStartChat(selectedPatient._id)}
                      disabled={chatLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Start Clinical Chat
                    </button>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                    {selectedPatientHistory.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-6 text-center">No diagnostic history on record.</p>
                    ) : (
                      selectedPatientHistory.map((report) => (
                        <div key={report._id} className="p-4 rounded-xl border bg-muted/20">
                          <h4 className="font-bold text-xs flex justify-between">
                            <span className="text-primary">{report.diagnosis}</span>
                            <span className="text-muted-foreground text-[10px]">{new Date(report.createdAt).toLocaleDateString()}</span>
                          </h4>
                          {report.notes && (
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{report.notes}</p>
                          )}
                          <span className="text-[9px] text-muted-foreground/60 block mt-2">Diagnosed by: {report.doctorId?.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add Diagnosis */}
                <div className="glass-panel p-6 rounded-2xl border shadow-sm">
                  <h3 className="font-bold text-sm mb-4">Add Diagnosis / Prescription</h3>
                  
                  <form onSubmit={handleAddDiagnosis} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Primary Diagnosis / Condition
                      </label>
                      <input
                        type="text"
                        required
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="Acute Pharyngitis / Hypertension / Diabetes Type II"
                        className="w-full px-3 py-2.5 bg-background border rounded-xl text-xs focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Treatment & Prescription Notes
                      </label>
                      <textarea
                        rows={3}
                        value={diagnosisNotes}
                        onChange={(e) => setDiagnosisNotes(e.target.value)}
                        placeholder="Prescribed Amoxicillin 500mg, twice daily for 7 days. Advised hydration and follow-up in 1 week."
                        className="w-full px-3 py-2.5 bg-background border rounded-xl text-xs focus:outline-none focus:border-primary"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingDiagnosis}
                      className="flex items-center gap-2 py-2 px-5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:shadow active:scale-95 transition-all disabled:opacity-50"
                    >
                      {submittingDiagnosis && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                      Add to Medical Record
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="glass-panel h-64 rounded-2xl border shadow-sm flex flex-col items-center justify-center text-muted-foreground gap-2">
                <FileText className="h-8 w-8 opacity-40" />
                <p className="text-xs">Select a patient from the directory to review their medical records</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule slots config */}
      {activeTab === "schedule" && (
        <div className="glass-panel rounded-2xl p-6 border shadow-sm space-y-6 max-w-2xl">
          <div>
            <h3 className="font-bold text-sm mb-1 uppercase tracking-wider">Weekly Schedule Grid</h3>
            <p className="text-xs text-muted-foreground">Setup timeslots that patients can select when booking consultation visits</p>
          </div>

          {/* Add slot widget */}
          <div className="flex flex-wrap gap-4 items-end bg-slate-900/5 dark:bg-slate-950/20 p-4 rounded-xl border">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Day</label>
              <select
                value={newDay}
                onChange={(e) => setNewDay(e.target.value)}
                className="bg-background border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              >
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Slot Hour</label>
              <input
                type="text"
                placeholder="e.g. 09:30 AM"
                value={newSlot}
                onChange={(e) => setNewSlot(e.target.value)}
                className="px-3 py-1.5 bg-background border rounded-lg text-xs focus:outline-none"
              />
            </div>

            <button
              onClick={addSlot}
              className="inline-flex items-center gap-1 py-2 px-4 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:shadow active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" /> Add Slot
            </button>
          </div>

          {/* Working hours display */}
          <div className="space-y-4">
            {Array.isArray(workingHours) && workingHours.map((item) => (
              <div key={item.day} className="p-4 rounded-xl border bg-muted/20 space-y-2">
                <h4 className="font-semibold text-xs text-primary">{item.day}</h4>
                {item.slots.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No slots declared for {item.day}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {item.slots.map((s, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-background border rounded-full text-xs"
                      >
                        {s}
                        <button 
                          onClick={() => removeSlot(item.day, index)}
                          className="p-0.5 hover:bg-rose-500/10 hover:text-rose-500 rounded-full transition-colors text-muted-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveWorkingHours}
            className="flex items-center gap-2 py-2.5 px-6 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:shadow active:scale-95 transition-all"
          >
            Save Availability Settings
          </button>
        </div>
      )}

      {/* Verification tab */}
      {activeTab === "verification" && (
        <div className="glass-panel rounded-2xl p-6 border shadow-sm max-w-lg space-y-6">
          <div>
            <h3 className="font-bold text-sm mb-1 uppercase tracking-wider">Professional Verification</h3>
            <p className="text-xs text-muted-foreground">Upload certifications, diplomas, or licenses to obtain clinical validation from the system administrator</p>
          </div>

          <form onSubmit={handleUploadDocuments} className="space-y-4">
            <div className="border-2 border-dashed border-muted rounded-xl p-8 text-center hover:border-primary/50 transition-all cursor-pointer relative">
              <input
                type="file"
                multiple
                accept=".pdf,image/*"
                onChange={(e) => setFiles(e.target.files)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <span className="block text-xs font-semibold mb-1">Drag and drop or click to upload certificates</span>
              <span className="block text-[10px] text-muted-foreground">Support PDF or Images, max 5 credentials files</span>
            </div>

            {files && files.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-primary font-semibold block">Files selected:</span>
                {Array.from(files).map((f, i) => (
                  <span key={i} className="block text-xs text-muted-foreground">{i + 1}. {f.name} ({(f.size / 1024).toFixed(1)} KB)</span>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={uploadingDocs}
              className="flex items-center justify-center gap-2 py-2 px-6 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:shadow active:scale-95 transition-all disabled:opacity-50"
            >
              {uploadingDocs ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Upload className="h-4.5 w-4.5" />}
              Upload Documents
            </button>
          </form>

          {user.doctorProfile?.isVerified && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
              <Check className="h-5 w-5" /> Account status verified. All medical features are unlocked.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
