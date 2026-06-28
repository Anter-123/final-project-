import api from "./api";

export interface AdminStats {
  patientsCount: number;
  doctorsCount: number;
  operationsCount: number; // custom KPI
  pendingDoctorsCount?: number;
}

export interface AdminDoctor {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  image?: string;
  createdAt: string;
  doctorProfile: {
    specialty: string;
    coordinates: [number, number];
    bio?: string;
    consultationFee?: number;
    feeVideo?: number;
    feeHome?: number;
    isVerified: boolean;
    isActive: boolean;
    documents?: string[];
  };
}

export interface AdminPatient {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  image?: string;
  isActive: boolean; // freeze/unfreeze state
  createdAt: string;
}

export interface AdminBooking {
  _id: string;
  patientId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    image?: string;
  };
  doctorId: {
    _id: string;
    name: string;
    doctorProfile?: {
      specialty: string;
    };
  };
  day: string;
  slot: string;
  date: string;
  status: "pending" | "accepted" | "confirmed" | "completed" | "rejected";
  createdAt: string;
}

const normalizeAdminBooking = (b: any): any => {
  if (!b) return null;
  
  const patient = b.patientId || b.user || b.patient || { _id: "", name: "Unknown Patient" };
  const patientId = {
    _id: patient._id || patient.id || "",
    name: patient.name || "Unknown Patient",
    email: patient.email || "",
    phone: patient.phone || "",
    image: patient.image || patient.imageUrl || ""
  };

  let doctorIdObj = { _id: "", name: "Unknown Doctor", doctorProfile: { specialty: "General" } };
  if (b.doctorId && typeof b.doctorId === "object") {
    doctorIdObj = {
      _id: b.doctorId._id || b.doctorId.id || "",
      name: b.doctorId.user?.name || b.doctorId.userId?.name || b.doctorId.name || "Unknown Doctor",
      doctorProfile: {
        specialty: b.doctorId.doctorProfile?.specialty || b.doctorId.specialty || "General"
      }
    };
  } else if (b.doctor && typeof b.doctor === "object") {
    doctorIdObj = {
      _id: b.doctor._id || b.doctor.id || "",
      name: b.doctor.user?.name || b.doctor.userId?.name || b.doctor.name || "Unknown Doctor",
      doctorProfile: {
        specialty: b.doctor.doctorProfile?.specialty || b.doctor.specialty || "General"
      }
    };
  } else if (typeof b.doctorId === "string") {
    doctorIdObj._id = b.doctorId;
  } else if (typeof b.doctor === "string") {
    doctorIdObj._id = b.doctor;
  }

  let date = b.date || "";
  let slot = b.slot || "";
  let day = b.day || "";

  if (b.scheduledAt) {
    const d = new Date(b.scheduledAt);
    date = b.scheduledAt.split("T")[0];
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    const pad = (n: number) => n.toString().padStart(2, "0");
    slot = `${pad(displayHour)}:${pad(minutes)} ${ampm}`;
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    day = days[d.getDay()];
  }

  return {
    _id: b._id || b.id || "",
    patientId,
    doctorId: doctorIdObj,
    day,
    slot,
    date,
    status: b.status || "pending",
    createdAt: b.createdAt || new Date().toISOString()
  };
};

// Local Storage Simulated Database Helpers
const getMockDatabase = () => {
  const getOrSet = (key: string, defaultVal: any) => {
    const existing = localStorage.getItem(key);
    if (existing) {
      try {
        return JSON.parse(existing);
      } catch (e) {
        // Fallback if parsing fails
      }
    }
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  };

  const defaultDoctors: AdminDoctor[] = [
    {
      _id: "doc-1",
      name: "Dr. Alexander Fleming",
      email: "fleming@smartclinic.com",
      phone: "+1 (555) 0110",
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      doctorProfile: {
        specialty: "Cardiology",
        coordinates: [40.7128, -74.0060],
        bio: "Specialist in cardiovascular therapies with over 15 years of clinical and academic research experience.",
        consultationFee: 150,
        feeVideo: 120,
        feeHome: 200,
        isVerified: true,
        isActive: true,
        documents: ["https://example.com/cert1.pdf"]
      }
    },
    {
      _id: "doc-2",
      name: "Dr. Florence Nightingale",
      email: "nightingale@smartclinic.com",
      phone: "+1 (555) 0120",
      createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
      doctorProfile: {
        specialty: "Pediatrics",
        coordinates: [34.0522, -118.2437],
        bio: "Dedicated pediatric practitioner committed to providing comprehensive clinical care for children.",
        consultationFee: 110,
        feeVideo: 90,
        feeHome: 160,
        isVerified: false,
        isActive: true,
        documents: ["https://example.com/cert2.pdf"]
      }
    },
    {
      _id: "doc-3",
      name: "Dr. Elizabeth Blackwell",
      email: "blackwell@smartclinic.com",
      phone: "+1 (555) 0130",
      createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      doctorProfile: {
        specialty: "Dermatology",
        coordinates: [41.8781, -87.6298],
        bio: "Board-certified dermatologist focusing on oncological dermatology and laser micro-surgeries.",
        consultationFee: 140,
        feeVideo: 110,
        feeHome: 180,
        isVerified: true,
        isActive: false,
        documents: ["https://example.com/cert3.pdf"]
      }
    }
  ];

  const defaultPatients: AdminPatient[] = [
    {
      _id: "pat-1",
      name: "Sarah Connor",
      email: "sarah@terminator.com",
      phone: "+1 (555) 0150",
      isActive: true,
      createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString()
    },
    {
      _id: "pat-2",
      name: "Bruce Wayne",
      email: "bruce@gotham.com",
      phone: "+1 (555) 0160",
      isActive: true,
      createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString()
    },
    {
      _id: "pat-3",
      name: "John Doe",
      email: "john@doe.com",
      phone: "+1 (555) 0170",
      isActive: false,
      createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
    }
  ];

  const defaultBookings: AdminBooking[] = [
    {
      _id: "book-1",
      patientId: {
        _id: "pat-1",
        name: "Sarah Connor",
        email: "sarah@terminator.com",
        phone: "+1 (555) 0150"
      },
      doctorId: {
        _id: "doc-1",
        name: "Dr. Alexander Fleming",
        doctorProfile: { specialty: "Cardiology" }
      },
      day: "Monday",
      slot: "09:00 AM",
      date: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split("T")[0],
      status: "accepted",
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
    },
    {
      _id: "book-2",
      patientId: {
        _id: "pat-2",
        name: "Bruce Wayne",
        email: "bruce@gotham.com",
        phone: "+1 (555) 0160"
      },
      doctorId: {
        _id: "doc-2",
        name: "Dr. Florence Nightingale",
        doctorProfile: { specialty: "Pediatrics" }
      },
      day: "Wednesday",
      slot: "04:00 PM",
      date: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().split("T")[0],
      status: "pending",
      createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
    },
    {
      _id: "book-3",
      patientId: {
        _id: "pat-3",
        name: "John Doe",
        email: "john@doe.com",
        phone: "+1 (555) 0170"
      },
      doctorId: {
        _id: "doc-1",
        name: "Dr. Alexander Fleming",
        doctorProfile: { specialty: "Cardiology" }
      },
      day: "Monday",
      slot: "10:00 AM",
      date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().split("T")[0],
      status: "completed",
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
    }
  ];

  const doctors = getOrSet("demo_doctors", defaultDoctors);
  const patients = getOrSet("demo_patients", defaultPatients);
  const bookings = getOrSet("demo_bookings", defaultBookings);

  return { doctors, patients, bookings };
};

const saveMockDatabase = (db: { doctors?: AdminDoctor[]; patients?: AdminPatient[]; bookings?: AdminBooking[] }) => {
  if (db.doctors) localStorage.setItem("demo_doctors", JSON.stringify(db.doctors));
  if (db.patients) localStorage.setItem("demo_patients", JSON.stringify(db.patients));
  if (db.bookings) localStorage.setItem("demo_bookings", JSON.stringify(db.bookings));
};

const isDemo = () => localStorage.getItem("demoMode") === "true";

export const adminService = {
  getStats: async (): Promise<AdminStats> => {
    if (isDemo()) {
      const db = getMockDatabase();
      return {
        patientsCount: db.patients.length,
        doctorsCount: db.doctors.filter((d: any) => d.doctorProfile.isVerified).length,
        operationsCount: db.bookings.filter((b: any) => b.status === "accepted" || b.status === "completed").length,
        pendingDoctorsCount: db.doctors.filter((d: any) => !d.doctorProfile.isVerified).length
      };
    }
    try {
      const response = await api.get<any>(`/admin/stats?t=${Date.now()}`);
      const rawData = response.data?.data || response.data || {};
      
      // If the response contains the nested stats object (standard format from vercel backend)
      if (rawData.stats) {
        const s = rawData.stats;
        return {
          patientsCount: s.totalUsers || 0,
          doctorsCount: s.totalDoctors || 0,
          operationsCount: s.totalBookings || 0,
          pendingDoctorsCount: rawData.pendingDoctorsCount || 0
        };
      }
      
      // Fallback direct mapping
      return {
        patientsCount: rawData.patientsCount || rawData.totalUsers || 0,
        doctorsCount: rawData.doctorsCount || rawData.totalDoctors || 0,
        operationsCount: rawData.operationsCount || rawData.totalBookings || 0,
        pendingDoctorsCount: rawData.pendingDoctorsCount || 0
      };
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403") || err.message?.includes("login")) {
        localStorage.setItem("demoMode", "true");
        return adminService.getStats();
      }
      throw err;
    }
  },

  getPendingDoctors: async (): Promise<AdminDoctor[]> => {
    if (isDemo()) {
      const db = getMockDatabase();
      return db.doctors.filter((d: any) => !d.doctorProfile.isVerified);
    }
    try {
      const response = await api.get<AdminDoctor[]>(`/admin/pending-doctors?t=${Date.now()}`);
      return (response.data as any)?.data || response.data;
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return adminService.getPendingDoctors();
      }
      throw err;
    }
  },

  verifyDoctor: async (doctorId: string): Promise<any> => {
    if (isDemo()) {
      const db = getMockDatabase();
      db.doctors = db.doctors.map((d: any) => 
        d._id === doctorId ? { ...d, doctorProfile: { ...d.doctorProfile, isVerified: true } } : d
      );
      saveMockDatabase({ doctors: db.doctors });
      return { message: "Doctor verified successfully" };
    }
    try {
      const response = await api.put(`/admin/verify-doctor/${doctorId}`, { isVerified: true });
      return response.data;
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return adminService.verifyDoctor(doctorId);
      }
      throw err;
    }
  },

  getDoctors: async (): Promise<AdminDoctor[]> => {
    if (isDemo()) {
      const db = getMockDatabase();
      return db.doctors;
    }
    try {
      const response = await api.get<AdminDoctor[]>(`/admin/doctors?t=${Date.now()}`);
      return (response.data as any)?.data || response.data;
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return adminService.getDoctors();
      }
      throw err;
    }
  },

  getPatients: async (): Promise<AdminPatient[]> => {
    if (isDemo()) {
      const db = getMockDatabase();
      return db.patients;
    }
    try {
      const response = await api.get<AdminPatient[]>(`/admin/patients?t=${Date.now()}`);
      return (response.data as any)?.data || response.data;
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return adminService.getPatients();
      }
      throw err;
    }
  },

  toggleDoctorActive: async (id: string): Promise<any> => {
    if (isDemo()) {
      const db = getMockDatabase();
      db.doctors = db.doctors.map((d: any) => 
        d._id === id ? { ...d, doctorProfile: { ...d.doctorProfile, isActive: !d.doctorProfile.isActive } } : d
      );
      saveMockDatabase({ doctors: db.doctors });
      return { message: "Doctor activity status toggled" };
    }
    try {
      const response = await api.put(`/admin/doctor/${id}/toggle-active`);
      return response.data;
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return adminService.toggleDoctorActive(id);
      }
      throw err;
    }
  },

  togglePatientActive: async (id: string): Promise<any> => {
    if (isDemo()) {
      const db = getMockDatabase();
      db.patients = db.patients.map((p: any) => 
        p._id === id ? { ...p, isActive: !p.isActive } : p
      );
      saveMockDatabase({ patients: db.patients });
      return { message: "Patient activity status toggled" };
    }
    try {
      const response = await api.patch(`/admin/patient/${id}/toggle-active`);
      return response.data;
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return adminService.togglePatientActive(id);
      }
      throw err;
    }
  },

  broadcastAnnouncement: async (broadcastData: { title: string; message: string }): Promise<any> => {
    if (isDemo()) {
      return { message: "System announcement broadcasted successfully (simulated)" };
    }
    try {
      const response = await api.post("/admin/broadcast", broadcastData);
      return response.data;
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return adminService.broadcastAnnouncement(broadcastData);
      }
      throw err;
    }
  },

  getBookings: async (): Promise<AdminBooking[]> => {
    if (isDemo()) {
      const db = getMockDatabase();
      return db.bookings;
    }
    try {
      const response = await api.get<any>(`/admin/stats?t=${Date.now()}`);
      const data = response.data?.data || response.data || {};
      const bookingsArray = data.bookings || response.data?.bookings || [];
      const recentBookingsArray = data.recentBookings || response.data?.recentBookings || [];
      
      const combined = [...bookingsArray, ...recentBookingsArray];
      const seen = new Set();
      const uniqueBookings = combined.filter((b: any) => {
        if (!b?._id) return false;
        if (seen.has(b._id)) return false;
        seen.add(b._id);
        return true;
      });

      return uniqueBookings.map(normalizeAdminBooking).filter(Boolean);
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return adminService.getBookings();
      }
      throw err;
    }
  },

  addBooking: async (bookingData: {
    patientId: string;
    doctorId: string;
    date: string;
    slot: string;
    day: string;
  }): Promise<AdminBooking> => {
    const db = getMockDatabase();
    const patient = db.patients.find((p: any) => p._id === bookingData.patientId) || {
      _id: bookingData.patientId,
      name: "Custom Patient",
      email: "custompatient@example.com"
    };
    const doctor = db.doctors.find((d: any) => d._id === bookingData.doctorId) || {
      _id: bookingData.doctorId,
      name: "Custom Doctor",
      doctorProfile: { specialty: "General Medicine" }
    };

    const newBooking: AdminBooking = {
      ...bookingData,
      _id: `book-${Math.floor(Math.random() * 1000000)}`,
      patientId: {
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        phone: (patient as any).phone
      },
      doctorId: {
        _id: doctor._id,
        name: doctor.name,
        doctorProfile: {
          specialty: doctor.doctorProfile?.specialty || "General Medicine"
        }
      },
      status: "pending",
      createdAt: new Date().toISOString()
    };

    db.bookings.unshift(newBooking);
    saveMockDatabase({ bookings: db.bookings });
    return newBooking;
  },

  updateBooking: async (
    bookingId: string,
    updates: { status?: any; date?: string; slot?: string; day?: string; doctorId?: string }
  ): Promise<AdminBooking> => {
    if (isDemo()) {
      const db = getMockDatabase();
      let updated: AdminBooking | null = null;
      db.bookings = db.bookings.map((b: any) => {
        if (b._id === bookingId) {
          updated = { ...b, ...updates };
          return updated;
        }
        return b;
      });

      if (!updated) {
        throw new Error("Booking not found");
      }

      saveMockDatabase({ bookings: db.bookings });
      return updated;
    }

    let backendStatus = updates.status;
    if (updates.status === "accepted") {
      backendStatus = "confirmed";
    }

    const payload: any = {};
    if (backendStatus) payload.status = backendStatus;
    if (updates.doctorId) payload.doctorId = updates.doctorId;

    if (updates.date && updates.slot) {
      const parseTimeSlot = (timeStr: string) => {
        const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
        if (!match) return { hour: 12, minute: 0 };
        let hour = parseInt(match[1], 10);
        const minute = parseInt(match[2], 10);
        const meridiem = match[3] ? match[3].toUpperCase() : null;
        if (meridiem === "PM" && hour < 12) hour += 12;
        if (meridiem === "AM" && hour === 12) hour = 0;
        return { hour, minute };
      };

      const [year, month, day] = updates.date.split("-").map(Number);
      const { hour, minute } = parseTimeSlot(updates.slot);
      const date = new Date(year, month - 1, day, hour, minute, 0, 0);
      payload.scheduledAt = date.toISOString();
    }

    const response = await api.patch<any>(`/booking/${bookingId}`, payload);
    const rawBooking = response.data?.booking || response.data?.data || response.data;
    return normalizeAdminBooking(rawBooking);
  },

  deleteBooking: async (bookingId: string): Promise<any> => {
    if (isDemo()) {
      const db = getMockDatabase();
      db.bookings = db.bookings.filter((b: any) => b._id !== bookingId);
      saveMockDatabase({ bookings: db.bookings });
      return { message: "Booking deleted/cancelled successfully" };
    }
    try {
      const response = await api.delete(`/booking/${bookingId}`);
      return response.data;
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return adminService.deleteBooking(bookingId);
      }
      throw err;
    }
  }
};
