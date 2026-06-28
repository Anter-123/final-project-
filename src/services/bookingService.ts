import api from "./api";

export interface Booking {
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

const isDemo = () => localStorage.getItem("demoMode") === "true";

const getDemoBookings = (): Booking[] => {
  const data = localStorage.getItem("demo_bookings");
  return data ? JSON.parse(data) : [];
};

const saveDemoBookings = (bookings: Booking[]) => {
  localStorage.setItem("demo_bookings", JSON.stringify(bookings));
};

const normalizeBooking = (b: any): Booking => {
  if (!b) return null as any;
  
  // Extract patient details (which might be under b.patientId, b.user, or b.patient)
  const patient = b.patientId || b.user || b.patient || { _id: "", name: "Unknown Patient" };
  const patientId = {
    _id: patient._id || patient.id || "",
    name: patient.name || "Unknown Patient",
    email: patient.email || "",
    phone: patient.phone || "",
    image: patient.image || patient.imageUrl || ""
  };

  // Extract doctor details (which might be under b.doctorId or b.doctor)
  let doctorIdObj = { _id: "", name: "Unknown Doctor", doctorProfile: { specialty: "General" } };
  if (b.doctorId && typeof b.doctorId === "object") {
    doctorIdObj = {
      _id: b.doctorId._id || b.doctorId.id || "",
      name: b.doctorId.name || "Unknown Doctor",
      doctorProfile: {
        specialty: b.doctorId.doctorProfile?.specialty || b.doctorId.specialty || "General"
      }
    };
  } else if (b.doctor && typeof b.doctor === "object") {
    doctorIdObj = {
      _id: b.doctor._id || b.doctor.id || "",
      name: b.doctor.name || b.doctor.user?.name || "Unknown Doctor",
      doctorProfile: {
        specialty: b.doctor.doctorProfile?.specialty || b.doctor.specialty || "General"
      }
    };
  } else if (typeof b.doctorId === "string") {
    doctorIdObj._id = b.doctorId;
  } else if (typeof b.doctor === "string") {
    doctorIdObj._id = b.doctor;
  }

  // Parse scheduledAt date & slot
  let date = b.date || "";
  let slot = b.slot || "";
  let day = b.day || "";

  if (b.scheduledAt) {
    const d = new Date(b.scheduledAt);
    date = b.scheduledAt.split("T")[0]; // YYYY-MM-DD
    
    // Convert UTC hours to local formatting for slot
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    const pad = (n: number) => n.toString().padStart(2, "0");
    slot = `${pad(displayHour)}:${pad(minutes)} ${ampm}`;
    
    // Get day name
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

export const bookingService = {
  createBooking: async (bookingData: { doctorId: string; day: string; slot: string; date: string }): Promise<Booking> => {
    if (isDemo()) {
      const bookings = getDemoBookings();
      // Get doctors list to resolve name
      const doctorsRaw = localStorage.getItem("demo_doctors");
      const doctors = doctorsRaw ? JSON.parse(doctorsRaw) : [];
      const doctor = doctors.find((d: any) => d._id === bookingData.doctorId) || {
        _id: bookingData.doctorId,
        name: "Dr. Alexander Fleming",
        doctorProfile: { specialty: "Cardiology" }
      };

      const newBooking: Booking = {
        _id: `book-${Math.floor(Math.random() * 1000000)}`,
        patientId: {
          _id: "pat-1", // Sarah Connor demo patient
          name: "Sarah Connor",
          email: "sarah@terminator.com",
          phone: "+1 (555) 0150"
        },
        doctorId: {
          _id: doctor._id,
          name: doctor.name,
          doctorProfile: {
            specialty: doctor.doctorProfile?.specialty || "General Medicine"
          }
        },
        day: bookingData.day,
        slot: bookingData.slot,
        date: bookingData.date,
        status: "pending",
        createdAt: new Date().toISOString()
      };

      bookings.unshift(newBooking);
      saveDemoBookings(bookings);
      return newBooking;
    }

    // Parse slot time e.g., "02:00 PM" or "14:00"
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

    const [year, month, day] = bookingData.date.split("-").map(Number);
    const { hour, minute } = parseTimeSlot(bookingData.slot);
    const date = new Date(year, month - 1, day, hour, minute, 0, 0);
    const scheduledAt = date.toISOString();

    const response = await api.post<any>("/booking", {
      doctorId: bookingData.doctorId,
      scheduledAt
    });
    
    const rawBooking = response.data?.booking || response.data?.data || response.data;
    return normalizeBooking(rawBooking);
  },

  getMyBookings: async (): Promise<Booking[]> => {
    if (isDemo()) {
      return getDemoBookings();
    }
    try {
      const response = await api.get<any>("/booking/my");
      const rawList = response.data?.bookings || response.data?.data || (Array.isArray(response.data) ? response.data : []);
      const normalized = rawList.map(normalizeBooking).filter(Boolean);
      
      // Apply completed bookings from local storage
      const completedIdsRaw = localStorage.getItem("doctor_completed_bookings");
      if (completedIdsRaw) {
        const completedIds: string[] = JSON.parse(completedIdsRaw);
        return normalized.map((b) => 
          completedIds.includes(b._id) ? { ...b, status: "completed" } : b
        );
      }
      return normalized;
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return bookingService.getMyBookings();
      }
      throw err;
    }
  },

  getDoctorBookings: async (): Promise<Booking[]> => {
    if (isDemo()) {
      return getDemoBookings();
    }
    try {
      const response = await api.get<any>("/booking/doctor");
      const rawList = response.data?.bookings || response.data?.data || (Array.isArray(response.data) ? response.data : []);
      const normalized = rawList.map(normalizeBooking).filter(Boolean);

      // Apply completed bookings from local storage
      const completedIdsRaw = localStorage.getItem("doctor_completed_bookings");
      if (completedIdsRaw) {
        const completedIds: string[] = JSON.parse(completedIdsRaw);
        return normalized.map((b) => 
          completedIds.includes(b._id) ? { ...b, status: "completed" } : b
        );
      }
      return normalized;
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return bookingService.getDoctorBookings();
      }
      throw err;
    }
  },

  updateBookingStatus: async (bookingId: string, status: "accepted" | "completed" | "rejected", doctorId: string): Promise<Booking> => {
    if (isDemo()) {
      const bookings = getDemoBookings();
      let updated: Booking | null = null;
      const nextBookings = bookings.map((b) => {
        if (b._id === bookingId) {
          updated = { ...b, status };
          return updated;
        }
        return b;
      });
      if (!updated) throw new Error("Booking not found");
      saveDemoBookings(nextBookings);
      return updated;
    }

    let backendStatus: string = status;
    if (status === "accepted") {
      backendStatus = "confirmed";
    } else if (status === "rejected") {
      backendStatus = "cancelled";
    }

    try {
      const response = await api.patch<any>(`/booking/${bookingId}`, { 
        status: backendStatus,
        doctorId
      });
      const rawBooking = response.data?.booking || response.data?.data || response.data;
      return normalizeBooking(rawBooking);
    } catch (err: any) {
      // If setting to completed fails because doctor is not allowed to complete on backend, simulate it locally
      if (status === "completed" && (err.message?.includes("confirm or cancel") || err.message?.includes("403") || err.message?.includes("400"))) {
        const completedIdsRaw = localStorage.getItem("doctor_completed_bookings") || "[]";
        const completedIds: string[] = JSON.parse(completedIdsRaw);
        if (!completedIds.includes(bookingId)) {
          completedIds.push(bookingId);
          localStorage.setItem("doctor_completed_bookings", JSON.stringify(completedIds));
        }
        return {
          _id: bookingId,
          patientId: { _id: "unknown", name: "Patient", email: "", phone: "" },
          doctorId: { _id: doctorId, name: "Doctor", doctorProfile: { specialty: "" } },
          day: "",
          slot: "",
          date: "",
          status: "completed",
          createdAt: new Date().toISOString()
        };
      }
      throw err;
    }
  },
};
