import api from "./api";

export interface SkinAIResponse {
  message: string;
  data: {
    predicted_class: string;
    predicted_class_index: number;
    confidence: number;
    description: string;
    risks: string[];
  };
}

const isDemo = () => localStorage.getItem("demoMode") === "true";

export const skinService = {
  predictSkinCondition: async (imageFile: File): Promise<SkinAIResponse> => {
    if (isDemo()) {
      // Simulate network latency
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return {
        message: "Success",
        data: {
          predicted_class: "Melonoma",
          predicted_class_index: 5,
          confidence: 99.11,
          description: "Melanoma is the most dangerous form of skin cancer. It develops in the cells (melanocytes) that produce melanin - the pigment that gives your skin its color. Melanoma can also form in your eyes and, rarely, inside your body. Early detection is critical, as melanoma can spread quickly to other organs if not treated early.",
          risks: [
            "Can spread (metastasize) to lymph nodes and other organs if not caught early"
          ]
        }
      };
    }

    const formData = new FormData();
    formData.append("image", imageFile);

    const response = await api.post<SkinAIResponse>("/skin-ai/predict/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },
};
