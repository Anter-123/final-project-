import api from "./api";

export interface Tip {
  _id: string;
  title: string;
  content: string;
  image?: string;
  createdAt: string;
}

export const tipService = {
  getTips: async (): Promise<Tip[]> => {
    const response = await api.get<Tip[]>("/tip");
    return (response.data as any)?.data || response.data;
  },

  createTip: async (formData: FormData): Promise<Tip> => {
    const response = await api.post<Tip>("/tip", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
