import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Activity, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

const loginSchema = zod.object({
  email: zod.string().email("Please enter a valid email address"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = zod.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Determine where to redirect after login
  const from = location.state?.from?.pathname || "/";



  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      const response = await authService.signIn(data);
      if (response.token) {
        await login(response.token);
        toast.success("Welcome back! Logged in successfully.");
        // Redirect user
        navigate(from, { replace: true });
      } else {
        toast.error("Failed to receive authorization token.");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Decorative background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse-glow" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] animate-pulse-glow" />
      
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-8 rounded-2xl shadow-2xl relative z-10">
        
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 mb-3 border border-cyan-500/20">
            <Activity className="h-8 w-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Welcome to SmartClinic</h2>
          <p className="text-slate-400 text-xs mt-1">Sign in to manage your medical records and appointments</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail className="h-5 w-5" />
              </span>
              <input
                type="email"
                {...register("email")}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-rose-500 mt-1.5 font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-all"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type="password"
                {...register("password")}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-rose-500 mt-1.5 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95 transition-all text-sm disabled:opacity-55 disabled:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>



        {/* Register link */}
        <div className="mt-8 text-center text-xs text-slate-400 border-t border-slate-800/80 pt-6">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-cyan-400 hover:text-cyan-300 hover:underline font-semibold"
          >
            Register Here
          </Link>
        </div>
      </div>
    </div>
  );
};
