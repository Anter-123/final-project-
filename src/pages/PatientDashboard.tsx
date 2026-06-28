import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { bookingService } from "../services/bookingService";
import type { Booking } from "../services/bookingService";
import { historyService } from "../services/historyService";
import type { MedicalReport } from "../services/historyService";
import { medicationService } from "../services/medicationService";
import type { Medication } from "../services/medicationService";
import { symptomService } from "../services/symptomService";
import { chatService } from "../services/chatService";
import { useLanguage } from "../context/LanguageContext";
import { 
  Heart, 
  Pill, 
  Activity, 
  Plus, 
  Loader2, 
  CheckSquare, 
  Square,
  AlertCircle,
  FileHeart,
  ChevronRight,
  TrendingUp,
  Clock,
  Calendar,
  MessageSquare,
  Pencil,
  Trash2
} from "lucide-react";
import toast from "react-hot-toast";

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  
  // States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [history, setHistory] = useState<MedicalReport[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  // Symptom logger form state
  const [symptomName, setSymptomName] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "severe">("medium");
  const [duration, setDuration] = useState("");
  const [loggingSymptom, setLoggingSymptom] = useState(false);

  // Helper functions for 12h/24h time formatting
  const format24to12 = (time24: string): string => {
    const [hourStr, minStr] = time24.split(":");
    let hour = parseInt(hourStr, 10);
    const minute = minStr;
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12;
    const hourFormatted = hour.toString().padStart(2, "0");
    return `${hourFormatted}:${minute} ${ampm}`;
  };

  const format12to24 = (time12: string): string => {
    const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return "08:00";
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const ampm = match[3]?.toUpperCase();

    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, "0")}:${minute}`;
  };

  // New medication form state
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medTimesList, setMedTimesList] = useState<string[]>(["08:00", "20:00"]);
  const [medStartDate, setMedStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [medEndDate, setMedEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [addingMed, setAddingMed] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [lastLoggedSeverity, setLastLoggedSeverity] = useState<"low" | "medium" | "severe">("low");


  const fetchData = async () => {
    if (!user) return;
    try {
      const [bookingsData, historyData, medsData] = await Promise.all([
        bookingService.getMyBookings(),
        historyService.getPatientHistory(user._id),
        medicationService.getMedications(),
      ]);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setHistory(Array.isArray(historyData) ? historyData : []);
      setMedications(Array.isArray(medsData) ? medsData : []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load patient health dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Medication reminders are now handled globally by <MedicationReminder /> in DashboardLayout.
  // This ensures notifications fire even when the patient navigates away from this page.

  const handleToggleMedication = async (medId: string) => {
    try {
      const med = medications.find(m => m._id === medId);
      const timeSlot = med && med.times && med.times[0] ? med.times[0] : "Morning";
      
      await medicationService.toggleMedicationDose(medId, timeSlot);
      
      // Update local storage taken list for today
      const todayStr = new Date().toISOString().split("T")[0];
      const storageKey = `taken_meds_${todayStr}`;
      const takenMedsRaw = localStorage.getItem(storageKey) || "[]";
      let takenMeds: string[] = JSON.parse(takenMedsRaw);
      
      const isCurrentlyTaken = med?.takenToday;
      if (isCurrentlyTaken) {
        takenMeds = takenMeds.filter(id => id !== medId);
      } else {
        if (!takenMeds.includes(medId)) {
          takenMeds.push(medId);
        }
      }
      localStorage.setItem(storageKey, JSON.stringify(takenMeds));

      setMedications(prev => 
        prev.map(m => m._id === medId ? { ...m, takenToday: !m.takenToday } : m)
      );
      toast.success("Medication dose status updated!");
    } catch (err: any) {
      toast.error("Failed to toggle medication dose");
    }
  };

  const handleLogSymptom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomName || !duration) {
      toast.error("Please fill in all symptom fields");
      return;
    }

    setLoggingSymptom(true);
    try {
      await symptomService.logSymptom({ symptomName, severity, duration });
      toast.success("Symptom logged. Take care!");
      setLastLoggedSeverity(severity);
      setShowEmergencyModal(true);
      setSymptomName("");
      setDuration("");
    } catch (err: any) {
      toast.error("Failed to log symptom");
    } finally {
      setLoggingSymptom(false);
    }
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName || !medDosage || medTimesList.length === 0) {
      toast.error("Please fill in medication details");
      return;
    }

    setAddingMed(true);
    try {
      const start = new Date(medStartDate + 'T00:00:00');
      const end = new Date(medEndDate + 'T00:00:00');
      const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      const parsedTimes = medTimesList.map(t => format24to12(t));
      
      if (editingMedId) {
        // Delete old schedule first
        await medicationService.deleteMedication(editingMedId);
      }

      await medicationService.addMedication({
        name: medName,
        dosage: medDosage,
        times: parsedTimes,
        durationDays: durationDays
      });
      
      toast.success(editingMedId ? "Medication schedule updated successfully!" : "Medication schedule added successfully!");
      
      setMedName("");
      setMedDosage("");
      setMedTimesList(["08:00", "20:00"]);
      setMedStartDate(new Date().toISOString().split("T")[0]);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setMedEndDate(nextWeek.toISOString().split("T")[0]);
      setEditingMedId(null);
      setShowAddMed(false);
      
      // Reload meds
      const meds = await medicationService.getMedications();
      setMedications(Array.isArray(meds) ? meds : []);
    } catch (err: any) {
      toast.error(editingMedId ? "Failed to update medication schedule" : "Failed to add medication schedule");
    } finally {
      setAddingMed(false);
    }
  };

  const handleDeleteMedication = async (medId: string) => {
    if (!window.confirm("Are you sure you want to delete this medication schedule?")) return;
    try {
      await medicationService.deleteMedication(medId);
      setMedications(prev => prev.filter(m => m._id !== medId));
      toast.success("Medication schedule deleted successfully!");
    } catch (err: any) {
      toast.error("Failed to delete medication schedule");
    }
  };

  const handleEditClick = (med: Medication) => {
    setEditingMedId(med._id);
    setMedName(med.name);
    setMedDosage(med.dosage);
    
    const mappedTimes = med.times.map(t => format12to24(t));
    setMedTimesList(mappedTimes);

    const todayStr = new Date().toISOString().split("T")[0];
    setMedStartDate(todayStr);
    
    const end = new Date();
    end.setDate(end.getDate() + (med.durationDays || 7));
    setMedEndDate(end.toISOString().split("T")[0]);
    
    setShowAddMed(true);
  };

  const [chatLoading, setChatLoading] = useState(false);
  const handleStartChat = async (doctorId: string) => {
    setChatLoading(true);
    try {
      const room = await chatService.createChat(doctorId);
      navigate("/chat", { state: { activeChatId: room._id, newRoom: room } });
    } catch (err: any) {
      toast.error(err.message || "Failed to start chat session");
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const bookingList = Array.isArray(bookings) 
    ? bookings 
    : (bookings as any)?.bookings 
    ? (bookings as any).bookings 
    : (bookings as any)?.data 
    ? (bookings as any).data 
    : [];

  const historyList = Array.isArray(history) 
    ? history 
    : (history as any)?.history 
    ? (history as any).history 
    : (history as any)?.data 
    ? (history as any).data 
    : [];

  const medicationList = Array.isArray(medications) 
    ? medications 
    : (medications as any)?.medications 
    ? (medications as any).medications 
    : (medications as any)?.data 
    ? (medications as any).data 
    : [];

  // Get active doctors the patient has appointments with
  const activeDoctors = bookingList
    .filter((b: any) => b.status === "accepted" || b.status === "confirmed")
    .map((b: any) => b.doctorId)
    .filter((doc: any, idx: number, self: any[]) => self.findIndex(d => d._id === doc._id) === idx);

  return (
    <div className="space-y-8">
      {/* Header Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Patient Health Dashboard</h2>
          <p className="text-sm text-muted-foreground">Monitor daily prescriptions, log symptoms, and check upcoming medical consultations</p>
        </div>

        {/* Mini stats */}
        <div className="glass-panel p-4 rounded-xl border flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Today's Compliance</span>
            <h3 className="text-lg font-bold mt-1">
              {medicationList.length > 0 
                ? `${medicationList.filter((m: any) => m.takenToday).length}/${medicationList.length}` 
                : "No meds"}
            </h3>
          </div>
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
            <CheckSquare className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Assigned Doctors</span>
            <h3 className="text-lg font-bold mt-1">{activeDoctors.length}</h3>
          </div>
          <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
            <Heart className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Daily Prescriptions Tracker & Symptom Logger */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Medications Tracker */}
          <div className="glass-panel p-6 rounded-2xl border shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" /> Daily Medication Schedule
              </h3>
              <button
                onClick={() => {
                  setEditingMedId(null);
                  setMedName("");
                  setMedDosage("");
                  setMedTimesList(["08:00", "20:00"]);
                  setMedStartDate(new Date().toISOString().split("T")[0]);
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  setMedEndDate(nextWeek.toISOString().split("T")[0]);
                  setShowAddMed(!showAddMed);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> {lang === "ar" ? "تسجيل دواء" : "Log Schedule"}
              </button>
            </div>

            {/* Add Medication mini form */}
            {showAddMed && (
              <form onSubmit={handleAddMedication} className="p-4 border rounded-xl bg-slate-900/5 dark:bg-slate-950/20 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center border-b pb-2 mb-2">
                  <h4 className="font-bold text-xs text-primary flex items-center gap-1.5">
                    <Pill className="h-4 w-4 text-primary animate-pulse" /> {editingMedId ? (lang === "ar" ? "تعديل جدول الدواء" : "Edit Medication Schedule") : (lang === "ar" ? "إضافة جدول دواء" : "Add Medication Schedule")}
                  </h4>
                  {editingMedId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMedId(null);
                        setMedName("");
                        setMedDosage("");
                        setMedTimesList(["08:00", "20:00"]);
                        setMedStartDate(new Date().toISOString().split("T")[0]);
                        const nextWeek = new Date();
                        nextWeek.setDate(nextWeek.getDate() + 7);
                        setMedEndDate(nextWeek.toISOString().split("T")[0]);
                        setShowAddMed(false);
                      }}
                      className="text-[10px] text-rose-500 hover:underline font-semibold"
                    >
                      {lang === "ar" ? "إلغاء التعديل" : "Clear Edit"}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                      {lang === "ar" ? "اسم الدواء" : "Medication Name"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={lang === "ar" ? "مثال: بنادول / ليبتور" : "Panadol Joint / Lipitor"}
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      className="w-full px-2 py-1.5 bg-background border rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                      {lang === "ar" ? "الجرعة" : "Dosage"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={lang === "ar" ? "مثال: قرص كل 8 ساعات" : "1 tablet every 8 hours"}
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                      className="w-full px-2 py-1.5 bg-background border rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                      {lang === "ar" ? "تاريخ البدء (التقويم)" : "Start Date"}
                    </label>
                    <input
                      type="date"
                      required
                      value={medStartDate}
                      onChange={(e) => {
                        setMedStartDate(e.target.value);
                        if (new Date(medEndDate) < new Date(e.target.value)) {
                          setMedEndDate(e.target.value);
                        }
                      }}
                      className="w-full px-2 py-1.5 bg-background border rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                      {lang === "ar" ? "تاريخ الانتهاء (التقويم)" : "End Date"}
                    </label>
                    <input
                      type="date"
                      required
                      value={medEndDate}
                      min={medStartDate}
                      onChange={(e) => setMedEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 bg-background border rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase text-muted-foreground mb-2">
                      {lang === "ar" ? "مواعيد منبه الدواء (اختر من الساعة)" : "Medication Times (Clock Pickers)"}
                    </label>
                    <div className="space-y-2">
                      {medTimesList.map((time, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="time"
                            required
                            value={time}
                            onChange={(e) => {
                              const newTimes = [...medTimesList];
                              newTimes[idx] = e.target.value;
                              setMedTimesList(newTimes);
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-background border rounded-lg text-xs focus:outline-none"
                          />
                          {medTimesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setMedTimesList(medTimesList.filter((_, i) => i !== idx));
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all active:scale-95"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setMedTimesList([...medTimesList, "12:00"])}
                        className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 mt-1"
                      >
                        <Plus className="h-3 w-3" /> {lang === "ar" ? "إضافة موعد آخر" : "Add Another Time"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMed(false)}
                    className="px-3 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-semibold"
                  >
                    {lang === "ar" ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={addingMed}
                    className="inline-flex items-center gap-1 px-4.5 py-1 bg-primary text-white rounded-lg text-xs font-semibold shadow"
                  >
                    {addingMed && <Loader2 className="h-3 w-3 animate-spin" />} {lang === "ar" ? "حفظ" : "Save"}
                  </button>
                </div>
              </form>
            )}

            {/* Medications List */}
            {medicationList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No medications logged in your database</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {medicationList.map((m: any) => (
                  <div 
                    key={m._id} 
                    className={`p-4 rounded-xl border flex justify-between items-center transition-all ${
                      m.takenToday 
                        ? "bg-emerald-500/5 border-emerald-500/20" 
                        : "bg-slate-900/5 dark:bg-slate-950/20 border-transparent hover:border-slate-800"
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold text-xs">{m.name}</h4>
                      <p className="text-[10px] text-muted-foreground">{m.dosage}</p>
                      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/80 mt-2">
                        <Clock className="h-3 w-3 text-primary" /> 
                        {m.times.join(" | ")}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditClick(m)}
                        title="Edit schedule"
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-95"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteMedication(m._id)}
                        title="Delete schedule"
                        className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all active:scale-95"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      <button 
                        onClick={() => handleToggleMedication(m._id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          m.takenToday ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        {m.takenToday ? <CheckSquare className="h-4.5 w-4.5" /> : <Square className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Symptom Logger */}
          <div className="glass-panel p-6 rounded-2xl border shadow-sm space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-rose-500">
              <AlertCircle className="h-5 w-5" /> Log Current Symptom (Emergency)
            </h3>
            
            <form onSubmit={handleLogSymptom} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Symptom Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sudden Chest Pain / Dizziness"
                  value={symptomName}
                  onChange={(e) => setSymptomName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border rounded-xl text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Severity Degree
                </label>
                <select
                  value={severity}
                  onChange={(e: any) => setSeverity(e.target.value)}
                  className="w-full px-3 py-2 bg-background border rounded-xl text-xs focus:outline-none focus:border-primary"
                >
                  <option value="low">Low (Mild discomfort)</option>
                  <option value="medium">Medium (Impedes activities)</option>
                  <option value="severe">Severe (Requires immediate care)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Duration (hrs/days)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2 hours"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-background border rounded-xl text-xs focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={loggingSymptom}
                    className="py-2 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow active:scale-95 transition-all disabled:opacity-50"
                  >
                    Log
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Appointments & Diagnostic Records */}
        <div className="space-y-6">
          {/* Active Appointments */}
          <div className="glass-panel p-6 rounded-2xl border shadow-sm space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-5 w-5 text-primary" /> Consultations
            </h3>

            <div className="space-y-3">
              {bookingList.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No active appointments scheduled</p>
              ) : (
                bookingList.map((b: any) => (
                  <div key={b._id} className="p-3.5 rounded-xl border bg-slate-900/5 dark:bg-slate-950/20 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold block">{b.doctorId.name}</span>
                        <span className="text-[10px] text-muted-foreground block">{b.doctorId.doctorProfile?.specialty}</span>
                      </div>
                      
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border uppercase ${
                        (b.status === "accepted" || b.status === "confirmed") ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/25" :
                        b.status === "pending" ? "text-amber-500 bg-amber-500/10 border-amber-500/25" :
                        b.status === "completed" ? "text-primary bg-primary/10 border-primary/25" :
                        "text-rose-500 bg-rose-500/10 border-rose-500/25"
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-muted/50 text-muted-foreground text-[10px]">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{new Date(b.date).toLocaleDateString()} at {b.slot}</span>
                      </span>
                    </div>

                    {(b.status === "accepted" || b.status === "confirmed") && (
                      <button
                        onClick={() => handleStartChat(b.doctorId._id)}
                        disabled={chatLoading}
                        className="mt-2.5 w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Chat with Doctor
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Diagnostic Records */}
          <div className="glass-panel p-6 rounded-2xl border shadow-sm space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-1.5">
              <FileHeart className="h-5 w-5 text-teal-500" /> Diagnosis History
            </h3>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {historyList.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No medical diagnoses recorded</p>
              ) : (
                historyList.map((h: any) => (
                  <div key={h._id} className="p-3.5 rounded-xl border bg-muted/20 text-xs space-y-1">
                    <div className="flex justify-between items-start font-semibold">
                      <span className="text-primary">{h.diagnosis}</span>
                      <span className="text-muted-foreground text-[9px]">{new Date(h.createdAt).toLocaleDateString()}</span>
                    </div>
                    {h.notes && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed pt-1.5">{h.notes}</p>
                    )}
                    <span className="text-[9px] text-muted-foreground/60 block pt-1">Signed by: {h.doctorId?.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Redirection Choice Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="glass-panel max-w-md w-full mx-4 p-6 rounded-2xl border border-white/10 shadow-2xl space-y-6 animate-scale-up text-right animate-fade-in-up" dir="rtl">
            
            {/* Header / Icon */}
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${lastLoggedSeverity === "severe" ? "bg-rose-500/20 text-rose-500 animate-pulse" : "bg-primary/20 text-primary"}`}>
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {lastLoggedSeverity === "severe" ? "تنبيه طبي طارئ ⚠️" : "تم تسجيل الحالة بنجاح ✅"}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  إجراء طبي موصى به بناءً على تقييم الأعراض
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {lastLoggedSeverity === "severe" 
                ? "لقد قمت بتسجيل أعراض شديدة الخطورة (Severe). ننصحك بشدة بطلب استشارة طبيب مختص على الفور للتحدث معه، أو يمكنك استخدام الطبيب الذكي المساعد للحصول على توجيهات أولية سريعة."
                : "تم حفظ تفاصيل الأعراض في ملفك الصحي. كيف تود المتابعة الآن للاطمئنان على صحتك؟"}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowEmergencyModal(false);
                  navigate("/patient/doctors");
                }}
                className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 text-center ${
                  lastLoggedSeverity === "severe" 
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/25" 
                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                }`}
              >
                {lastLoggedSeverity === "severe" ? "استشارة طبيب فوراً 🩺" : "البحث عن طبيب مختص"}
              </button>

              <button
                onClick={() => {
                  setShowEmergencyModal(false);
                  navigate("/patient/assessment");
                }}
                className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-foreground rounded-xl text-xs font-bold transition-all active:scale-95 text-center"
              >
                استشارة الطبيب الذكي 🤖
              </button>
            </div>

            {/* Dismiss */}
            <div className="text-center pt-2">
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground underline transition-all"
              >
                تخطي والعودة للوحة التحكم
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
