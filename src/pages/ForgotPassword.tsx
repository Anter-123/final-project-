import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export const ForgotPassword: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    // Simulate reset request
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success("Simulation: Password reset email sent!");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse-glow" />
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10">
        
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 mb-3 border border-cyan-500/20">
            <Activity className="h-8 w-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Reset Password</h2>
          <p className="text-slate-400 text-xs mt-1 text-center">
            {submitted 
              ? "Check your inbox for a magic reset link" 
              : "Enter your email, and we'll dispatch password recovery instructions"}
          </p>
        </div>

        {submitted ? (
          <div className="space-y-6 text-center">
            <div className="flex justify-center text-teal-400">
              <CheckCircle className="h-16 w-16 animate-bounce" />
            </div>
            <p className="text-slate-350 text-xs leading-relaxed">
              If an account exists for <span className="font-semibold text-white">{email}</span>, you will receive an email shortly with directions to create a new password.
            </p>
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-cyan-450 hover:text-cyan-305 text-sm font-semibold hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-550 focus:ring-1 focus:ring-cyan-550 transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95 transition-all text-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Requesting link...
                </>
              ) : (
                "Send Recovery Link"
              )}
            </button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-slate-400 hover:text-white text-xs font-medium transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel and Return
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};
