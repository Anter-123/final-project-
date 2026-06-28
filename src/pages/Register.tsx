import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Activity, Mail, Lock, User, Phone, MapPin, Stethoscope, FileText, DollarSign, Loader2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

const registerSchema = zod.object({
  role: zod.enum(["User", "Doctor"]),
  name: zod.string().min(2, "Name must be at least 2 characters"),
  email: zod.string().email("Please enter a valid email address"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
  age: zod.preprocess((val) => (val === "" ? undefined : Number(val)), zod.number().min(1, "Please enter a valid age").optional()),
  phone: zod.string().min(7, "Please enter a valid phone number").optional(),
  gender: zod.enum(["male", "female", "not specified"]).default("not specified"),
  addressLine: zod.string().optional(),
  
  // Doctor details (Conditional validation)
  specialty: zod.string().optional(),
  longitude: zod.preprocess((val) => (val === "" ? undefined : Number(val)), zod.number().optional()),
  latitude: zod.preprocess((val) => (val === "" ? undefined : Number(val)), zod.number().optional()),
  bio: zod.string().optional(),
  consultationFee: zod.preprocess((val) => (val === "" ? undefined : Number(val)), zod.number().optional()),
  feeVideo: zod.preprocess((val) => (val === "" ? undefined : Number(val)), zod.number().optional()),
  feeHome: zod.preprocess((val) => (val === "" ? undefined : Number(val)), zod.number().optional()),
}).refine((data) => {
  if (data.role === "Doctor") {
    return !!data.specialty;
  }
  return true;
}, {
  message: "Specialty is required for Doctor accounts",
  path: ["specialty"],
});

type RegisterFormValues = zod.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"User" | "Doctor">("User");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: {
      role: "User",
      gender: "not specified",
    },
  });

  const handleTabChange = (role: "User" | "Doctor") => {
    setActiveTab(role);
    setValue("role", role);
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      const payload: any = {
        role: data.role,
        name: data.name,
        email: data.email,
        password: data.password,
        age: data.age,
        phone: data.phone,
        gender: data.gender,
        address: data.addressLine ? [data.addressLine] : [],
      };

      if (data.role === "Doctor") {
        payload.specialty = data.specialty;
        payload.coordinates = [data.longitude || 0, data.latitude || 0];
        payload.bio = data.bio;
        payload.consultationFee = data.consultationFee;
        payload.feeVideo = data.feeVideo;
        payload.feeHome = data.feeHome;
      }

      await authService.signUp(payload);
      toast.success("Registration completed! Please sign in.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Try using a different email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden py-12">
      
      {/* Background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse-glow" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] animate-pulse-glow" />
      
      <div className="w-full max-w-xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-8 rounded-2xl shadow-2xl relative z-10">
        
        {/* Brand header */}
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 mb-3 border border-cyan-500/20">
            <Activity className="h-8 w-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Create your Account</h2>
          <p className="text-slate-400 text-xs mt-1">Join SmartClinic and manage your digital healthcare footprint</p>
        </div>

        {/* Custom Tab Selector */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950/60 border border-slate-800/80 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => handleTabChange("User")}
            className={`py-2 rounded-lg font-medium text-xs transition-all ${
              activeTab === "User" 
                ? "bg-gradient-to-r from-cyan-550 to-teal-500 text-white shadow" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            Register as Patient
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("Doctor")}
            className={`py-2 rounded-lg font-medium text-xs transition-all ${
              activeTab === "Doctor" 
                ? "bg-gradient-to-r from-cyan-550 to-teal-500 text-white shadow" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            Register as Doctor
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Section 1: Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-slate-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  {...register("name")}
                  placeholder="John Doe"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-550 focus:ring-1 focus:ring-cyan-500 transition-all text-xs"
                />
              </div>
              {errors.name && <p className="text-[10px] text-rose-500 mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-slate-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  {...register("email")}
                  placeholder="john@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-550 focus:ring-1 focus:ring-cyan-500 transition-all text-xs"
                />
              </div>
              {errors.email && <p className="text-[10px] text-rose-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  {...register("password")}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-550 focus:ring-1 focus:ring-cyan-500 transition-all text-xs"
                />
              </div>
              {errors.password && <p className="text-[10px] text-rose-500 mt-1">{errors.password.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-slate-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Phone className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  {...register("phone")}
                  placeholder="010XXXXXXXX"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-550 focus:ring-1 focus:ring-cyan-500 transition-all text-xs"
                />
              </div>
              {errors.phone && <p className="text-[10px] text-rose-500 mt-1">{errors.phone.message}</p>}
            </div>

            {/* Age */}
            <div>
              <label className="block text-slate-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                Age
              </label>
              <input
                type="number"
                {...register("age")}
                placeholder="28"
                className="w-full px-3 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-550 focus:ring-1 focus:ring-cyan-500 transition-all text-xs"
              />
              {errors.age && <p className="text-[10px] text-rose-500 mt-1">{errors.age.message}</p>}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-slate-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                Gender
              </label>
              <select
                {...register("gender")}
                className="w-full px-3 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-cyan-550 focus:ring-1 focus:ring-cyan-500 transition-all text-xs"
              >
                <option value="not specified">Not Specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-slate-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
              Clinic/Home Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <MapPin className="h-4 w-4" />
              </span>
              <input
                type="text"
                {...register("addressLine")}
                placeholder="Cairo, Egypt"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-550 focus:ring-1 focus:ring-cyan-500 transition-all text-xs"
              />
            </div>
          </div>

          {/* Section 2: Conditional Doctor Fields */}
          {activeTab === "Doctor" && (
            <div className="border-t border-slate-800/80 pt-4 mt-2 space-y-4 animate-in fade-in slide-in-from-top-3 duration-350">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4" /> Professional Credentials
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Specialty */}
                <div>
                  <label className="block text-slate-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                    Medical Specialty
                  </label>
                  <input
                    type="text"
                    {...register("specialty")}
                    placeholder="Cardiology / Internal Medicine"
                    className="w-full px-3 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-550 focus:ring-1 focus:ring-cyan-500 transition-all text-xs"
                  />
                  {errors.specialty && <p className="text-[10px] text-rose-500 mt-1">{errors.specialty.message}</p>}
                </div>

                {/* Geo Coordinates */}
                <div>
                  <label className="block text-slate-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                    Coordinates (Lon & Lat)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="any"
                      {...register("longitude")}
                      placeholder="Longitude"
                      className="w-full px-3 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-550 focus:ring-1 focus:ring-cyan-500 transition-all text-xs"
                    />
                    <input
                      type="number"
                      step="any"
                      {...register("latitude")}
                      placeholder="Latitude"
                      className="w-full px-3 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-550 focus:ring-1 focus:ring-cyan-500 transition-all text-xs"
                    />
                  </div>
                </div>

                {/* Fees */}
                <div className="grid grid-cols-3 gap-2 md:col-span-2">
                  <div>
                    <label className="block text-slate-300 text-[9px] font-semibold uppercase tracking-wider mb-1">
                      Consultation Fee
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-[10px]">
                        $
                      </span>
                      <input
                        type="number"
                        {...register("consultationFee")}
                        placeholder="120"
                        className="w-full pl-6 pr-2 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-[9px] font-semibold uppercase tracking-wider mb-1">
                      Video Consultation
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-[10px]">
                        $
                      </span>
                      <input
                        type="number"
                        {...register("feeVideo")}
                        placeholder="100"
                        className="w-full pl-6 pr-2 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-[9px] font-semibold uppercase tracking-wider mb-1">
                      Home Visit
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-[10px]">
                        $
                      </span>
                      <input
                        type="number"
                        {...register("feeHome")}
                        placeholder="150"
                        className="w-full pl-6 pr-2 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="md:col-span-2">
                  <label className="block text-slate-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                    Professional Bio
                  </label>
                  <textarea
                    {...register("bio")}
                    rows={3}
                    placeholder="Brief history of professional accomplishments, medical expertise..."
                    className="w-full px-3 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-550 focus:ring-1 focus:ring-cyan-500 transition-all text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95 transition-all text-xs disabled:opacity-55 disabled:scale-100 mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scaffolding Account...
              </>
            ) : (
              <>
                Register Account
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Login redirect */}
        <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-800/80 pt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-cyan-400 hover:text-cyan-300 hover:underline font-semibold"
          >
            Login Here
          </Link>
        </div>
      </div>
    </div>
  );
};
