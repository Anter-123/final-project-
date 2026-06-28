import api from "./api";

export interface AssessmentResult {
  _id: string;
  userId: string;
  selectedArea: string;
  answers: Array<{ question: string; answer: string; _id?: string }>;
  preliminaryDiagnosis?: string[];
  createdAt: string;
}

export const assessmentService = {
  submitAssessment: async (assessmentData: {
    selectedArea: string;
    answers: Array<{ question: string; answer: string }>;
  }): Promise<AssessmentResult> => {
    const response = await api.post<any>("/assessment", assessmentData);
    return response.data?.assessment || response.data;
  },
};
