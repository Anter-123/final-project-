import api from "./api";

export interface SignUpResponse {
  status: string;
  message: string;
  data: {
    _id: string;
    name: string;
    email: string;
    role: "User" | "Doctor" | "Admin";
    doctorProfile?: any;
  };
}

export interface SignInResponse {
  message: string;
  token: string;
}

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: "User" | "Doctor" | "Admin";
  age?: number;
  phone?: string;
  gender?: string;
  address?: string[];
  image?: string;
  doctorProfile?: {
    _id?: string;
    specialty: string;
    coordinates: [number, number];
    bio?: string;
    consultationFee?: number;
    feeVideo?: number;
    feeHome?: number;
    isVerified: boolean;
    isActive: boolean;
    rating?: number;
    reviews?: Array<{
      userId: string;
      rating: number;
      review?: string;
      createdAt: string;
    }>;
    workingHours?: Array<{
      day: string;
      slots: string[];
    }>;
  };
}

export const authService = {
  signUp: async (formData: any): Promise<SignUpResponse> => {
    const response = await api.post<SignUpResponse>("/user/signUp", formData);
    return response.data;
  },

  signIn: async (credentials: any): Promise<SignInResponse> => {
    const response = await api.post<SignInResponse>("/user/signIn", credentials);
    return response.data;
  },

  updateProfile: async (id: string, formData: FormData): Promise<any> => {
    // For file upload, need multipart/form-data
    const response = await api.put(`/user/update-profile/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  getUserProfile: async (id: string): Promise<UserProfile> => {
    if (localStorage.getItem("demoMode") === "true") {
      return {
        _id: "demo-admin-id-999",
        name: "Demo System Administrator",
        email: "admin@smartclinic.com",
        role: "Admin",
        age: 35,
        phone: "+1 (555) 0199",
        gender: "male",
        address: ["SmartClinic Head Office, NY"]
      };
    }
    const response = await api.get<UserProfile>(`/user/${id}`);
    return response.data;
  },
};
