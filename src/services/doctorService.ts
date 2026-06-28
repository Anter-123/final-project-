import api from "./api";

export interface DoctorListItem {
  _id: string;
  id: string;
  name: string;
  email: string;
  phone?: string;
  image?: string;
  doctorProfile?: {
    specialty: string;
    coordinates: [number, number];
    bio?: string;
    consultationFee?: number;
    feeVideo?: number;
    feeHome?: number;
    isVerified: boolean;
    isActive: boolean;
    rating?: number;
  };
}

export interface DoctorDetails extends DoctorListItem {
  doctorProfile: {
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
      _id: string;
      userId: {
        _id: string;
        name: string;
        image?: string;
      };
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

const normalizeDoctor = (doc: any): any => {
  if (!doc) return null;
  const id = doc.id || doc._id || "";
  
  // Extract profile fields (from either flat structure or nested doctorProfile structure)
  const specialty = doc.specialty || doc.doctorProfile?.specialty || "";
  const bio = doc.bio || doc.doctorProfile?.bio || "";
  const consultationFee = doc.consultationFee !== undefined ? doc.consultationFee : doc.doctorProfile?.consultationFee;
  const feeVideo = doc.feeVideo !== undefined ? doc.feeVideo : doc.doctorProfile?.feeVideo;
  const feeHome = doc.feeHome !== undefined ? doc.feeHome : doc.doctorProfile?.feeHome;
  const isVerified = doc.isVerified !== undefined ? doc.isVerified : doc.doctorProfile?.isVerified;
  const isActive = doc.isActive !== undefined ? doc.isActive : doc.doctorProfile?.isActive;
  const rating = doc.rating !== undefined ? doc.rating : doc.doctorProfile?.rating;
  const coordinates = doc.coordinates || doc.doctorProfile?.coordinates || [30.0, 31.0];
  const reviews = doc.reviews || doc.doctorProfile?.reviews || [];
  const workingHours = doc.workingHours || doc.doctorProfile?.workingHours || [
    { day: "Monday", slots: ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM"] },
    { day: "Tuesday", slots: ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM"] },
    { day: "Wednesday", slots: ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM"] },
    { day: "Thursday", slots: ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM"] },
    { day: "Friday", slots: ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM"] }
  ];

  return {
    _id: id,
    id: id,
    name: doc.name || "",
    email: doc.email || "",
    phone: doc.phone || "",
    image: doc.image || doc.imageUrl || "",
    doctorProfile: {
      specialty,
      coordinates,
      bio,
      consultationFee: consultationFee !== undefined ? Number(consultationFee) : 120,
      feeVideo: feeVideo !== undefined ? Number(feeVideo) : 100,
      feeHome: feeHome !== undefined ? Number(feeHome) : 150,
      isVerified: !!isVerified,
      isActive: isActive !== false,
      rating: rating !== undefined ? Number(rating) : 0,
      reviews,
      workingHours
    }
  };
};

export const doctorService = {
  getDoctors: async (): Promise<DoctorListItem[]> => {
    const response = await api.get<any>("/doctor");
    const rawList = response.data?.formattedDoctors || response.data?.doctors || response.data?.data || (Array.isArray(response.data) ? response.data : []);
    return rawList.map(normalizeDoctor).filter(Boolean);
  },

  getDoctorDetails: async (id: string): Promise<DoctorDetails> => {
    const response = await api.get<any>(`/doctor/${id}`);
    const rawDoc = response.data?.doctor || response.data?.data || response.data;
    return normalizeDoctor(rawDoc);
  },

  rateDoctor: async (id: string, ratingData: { rating: number; review?: string }): Promise<any> => {
    const response = await api.post(`/doctor/${id}/rate`, ratingData);
    return response.data;
  },

  uploadVerification: async (id: string, formData: FormData): Promise<any> => {
    const response = await api.post(`/doctor/${id}/verification`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  updateWorkingHours: async (id: string, workingHours: Array<{ day: string; slots: string[] }>): Promise<any> => {
    const response = await api.put(`/doctor/${id}/working-hours`, { workingHours });
    return response.data;
  },
};
