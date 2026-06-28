import api from "./api";

export interface SymptomLog {
  _id: string;
  patient: string;
  painLevel: number;
  bodyPart: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const symptomService = {
  logSymptom: async (symptomData: {
    symptomName: string;
    severity: "low" | "medium" | "severe";
    duration: string;
  }): Promise<SymptomLog> => {
    // Map string severity representation to 1-10 numerical scale required by backend
    let painLevel = 5;
    if (symptomData.severity === "low") painLevel = 3;
    else if (symptomData.severity === "medium") painLevel = 6;
    else if (symptomData.severity === "severe") painLevel = 9;

    const backendPayload = {
      painLevel,
      bodyPart: symptomData.symptomName,
      notes: `Duration: ${symptomData.duration}`
    };

    const response = await api.post<{ status: string; message: string; data: SymptomLog }>("/symptom", backendPayload);
    return response.data?.data;
  },
};
