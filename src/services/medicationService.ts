import api from "./api";

export interface Medication {
  _id: string;
  patientId: string;
  name: string;
  dosage: string;
  times: string[];
  durationDays: number;
  takenToday: boolean;
  history?: Array<{
    date: string;
    taken: boolean;
  }>;
  createdAt: string;
}

export const medicationService = {
  getMedications: async (): Promise<Medication[]> => {
    const response = await api.get<any>("/medication");
    const rawList = response.data?.data || response.data || [];
    if (!rawList || !Array.isArray(rawList)) return [];

    const todayStr = new Date().toISOString().split("T")[0];
    const storageKey = `taken_meds_${todayStr}`;
    const takenMedsRaw = localStorage.getItem(storageKey) || "[]";
    let takenMeds: string[] = [];
    try {
      takenMeds = JSON.parse(takenMedsRaw);
      if (!Array.isArray(takenMeds)) takenMeds = [];
    } catch {
      takenMeds = [];
    }

    return rawList.map((m: any) => {
      const medId = m._id || m.id || "";
      const isTakenInStorage = takenMeds.includes(medId);
      
      return {
        _id: medId,
        patientId: m.patient || m.patientId || "",
        name: m.name || "",
        dosage: m.dosage || "",
        times: m.timeOfDay || m.times || [],
        durationDays: m.durationDays || m.duration || 0,
        takenToday: isTakenInStorage || (Array.isArray(m.takenDates) && m.takenDates.some((d: string) => d.startsWith(todayStr))) || false,
        createdAt: m.createdAt || new Date().toISOString()
      };
    });
  },

  addMedication: async (medData: { name: string; dosage: string; times: string[]; durationDays: number }): Promise<Medication> => {
    const response = await api.post<any>("/medication", {
      name: medData.name,
      dosage: medData.dosage,
      timeOfDay: medData.times,
      frequency: "Daily",
      durationDays: medData.durationDays
    });
    const m = response.data?.data || response.data;
    
    const todayStr = new Date().toISOString().split("T")[0];
    return {
      _id: m._id || m.id || "",
      patientId: m.patient || m.patientId || "",
      name: m.name || "",
      dosage: m.dosage || "",
      times: m.timeOfDay || m.times || [],
      durationDays: m.durationDays || 0,
      takenToday: (Array.isArray(m.takenDates) && m.takenDates.some((d: string) => d.startsWith(todayStr))) || false,
      createdAt: m.createdAt || new Date().toISOString()
    };
  },

  toggleMedicationDose: async (id: string, timeSlot: string = "Morning"): Promise<any> => {
    const todayStr = new Date().toISOString().split("T")[0];
    const response = await api.patch<any>(`/medication/${id}/toggle`, {
      dateStr: todayStr,
      timeSlot: timeSlot
    });
    return response.data;
  },

  deleteMedication: async (id: string): Promise<any> => {
    const response = await api.delete<any>(`/medication/${id}`);
    return response.data;
  },
};
