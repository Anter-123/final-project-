import api from "./api";

export interface SkinAIResponse {
  message: string;
  data: {
    predicted_class: string;
    predicted_class_index: number | null;
    confidence: number;
    description: string;
    risks?: string[];
    recommendations?: string[];
    all_probabilities?: Array<{
      class_index: number;
      class_name: string;
      confidence: number;
    }>;
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
          predicted_class: "Melanoma",
          predicted_class_index: 5,
          confidence: 99.11,
          description: "Melanoma is the most dangerous form of skin cancer. It develops in the cells (melanocytes) that produce melanin — the pigment that gives your skin its color. Melanoma can also form in your eyes and, rarely, inside your body. Early detection is critical, as melanoma can spread quickly to other organs if not treated early.",
          risks: [
            "Can spread (metastasize) to lymph nodes and other organs if not caught early",
            "One of the most deadly forms of skin cancer",
            "Risk factors include UV exposure, fair skin, family history, and many moles",
            "Survival rate drops significantly at advanced stages",
            "Can develop from an existing mole or appear as a new dark spot"
          ],
          recommendations: [
            " Seek URGENT medical evaluation — early diagnosis is critical for survival",
            "Do NOT delay — contact a dermatologist or oncologist immediately",
            "Avoid all UV exposure (sun and tanning beds) completely",
            "If diagnosed, treatment may include surgery, immunotherapy, or targeted therapy",
            "Inform close family members to get checked, as there is a hereditary component",
            "Support groups and mental health resources are available for cancer patients"
          ],
          all_probabilities: [
            {
              class_index: 5,
              class_name: "Melanoma",
              confidence: 99.11
            },
            {
              class_index: 2,
              class_name: "Benign Keratosis-like Lesions",
              confidence: 0.89
            },
            {
              class_index: 4,
              class_name: "Melanocytic Nevi (Moles)",
              confidence: 0.01
            },
            {
              class_index: 0,
              class_name: "Actinic Keratoses",
              confidence: 0
            },
            {
              class_index: 1,
              class_name: "Basal Cell Carcinoma",
              confidence: 0
            },
            {
              class_index: 3,
              class_name: "Dermatofibroma",
              confidence: 0
            },
            {
              class_index: 6,
              class_name: "Vascular Lesions",
              confidence: 0
            }
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
