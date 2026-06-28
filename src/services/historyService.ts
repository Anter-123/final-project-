import api from "./api";

export interface PatientRecord {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: string;
  image?: string;
}

export interface MedicalReport {
  _id: string;
  patientId: string;
  doctorId: {
    _id: string;
    name: string;
    doctorProfile?: {
      specialty: string;
    };
  };
  diagnosis: string;
  notes?: string;
  createdAt: string;
}

export const historyService = {
  getMyPatients: async (): Promise<PatientRecord[]> => {
    const response = await api.get<any>("/history/my-patients");
    const rawList = response.data?.data || response.data || [];
    if (!Array.isArray(rawList)) return [];
    
    return rawList.map((item: any) => {
      if (item && item.patientInfo) {
        return {
          _id: item.patientInfo._id || item.patientInfo.id || "",
          name: item.patientInfo.name,
          email: item.patientInfo.email,
          phone: item.patientInfo.phone,
          age: item.patientInfo.age,
          gender: item.patientInfo.gender,
          image: item.patientInfo.image,
        };
      }
      return item;
    });
  },

  getPatientHistory: async (patientId: string): Promise<MedicalReport[]> => {
    const response = await api.get<MedicalReport[]>(`/history/patient/${patientId}`);
    const resData = (response.data as any)?.data || response.data;
    // Some endpoints wrap patient history array inside data.data or return it directly. Let's make sure it's an array
    return Array.isArray(resData) ? resData : [];
  },

  addDiagnosis: async (reportData: { patientId: string; diagnosis: string; notes?: string }): Promise<MedicalReport> => {
    const response = await api.post<MedicalReport>("/history", reportData);
    return response.data;
  },
};
