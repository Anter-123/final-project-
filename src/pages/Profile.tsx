import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { Activity, User, Mail, Lock, Phone, Upload, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";

export const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [userName, setUserName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(user?.image || null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      if (userName && userName !== user.name) formData.append("name", userName);
      if (email && email !== user.email) formData.append("email", email);
      if (password) formData.append("password", password);
      if (imageFile) formData.append("image", imageFile);

      await authService.updateProfile(user._id, formData);
      await refreshUser();
      setPassword("");
      toast.success(t("Profile updated successfully!"));
    } catch (err: any) {
      toast.error(err.message || t("Failed to update profile."));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("Account Settings")}</h2>
        <p className="text-sm text-muted-foreground">{t("Manage your credentials, bio, and visual avatar")}</p>
      </div>

      <div className="glass-panel rounded-2xl p-6 border shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Avatar upload */}
          <div className="flex flex-col items-center sm:flex-row gap-6 pb-6 border-b border-muted">
            <div className="relative group">
              <div className="h-24 w-24 rounded-full bg-primary/10 border-2 border-primary/30 overflow-hidden flex items-center justify-center font-bold text-primary text-3xl shadow">
                {imagePreview ? (
                  <img src={imagePreview} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <label 
                htmlFor="avatar-input"
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
              >
                <Upload className="h-5 w-5" />
              </label>
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            
            <div className="text-center sm:text-left space-y-1">
              <h3 className="font-semibold text-base">{t("Profile Photo")}</h3>
              <p className="text-xs text-muted-foreground">{t("Click the image to upload a new JPG, PNG, or WEBP file.")}</p>
              {imageFile && (
                <span className="inline-block text-[10px] text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/25 mt-1 font-semibold">
                  {t("New file selected")}: {imageFile.name}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t("Display Name")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 ltr:left-0 rtl:right-0 pl-3 rtl:pr-3 flex items-center text-muted-foreground">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full ltr:pl-9 rtl:pr-9 ltr:pr-4 rtl:pl-4 py-2.5 bg-background border rounded-xl text-sm focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
 
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t("Email Address")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 ltr:left-0 rtl:right-0 pl-3 rtl:pr-3 flex items-center text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full ltr:pl-9 rtl:pr-9 ltr:pr-4 rtl:pl-4 py-2.5 bg-background border rounded-xl text-sm focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
 
            {/* Password */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t("Change Password (Leave blank to keep current)")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 ltr:left-0 rtl:right-0 pl-3 rtl:pr-3 flex items-center text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("Enter new password")}
                  className="w-full ltr:pl-9 rtl:pr-9 ltr:pr-4 rtl:pl-4 py-2.5 bg-background border rounded-xl text-sm focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>
 
          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:shadow hover:shadow-primary/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Save Changes")}
            </button>
          </div>
        </form>
      </div>

      {/* Role specific static meta settings */}
      {user.role === "Doctor" && user.doctorProfile && (
        <div className="glass-panel rounded-2xl p-6 border shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
            <Activity className="h-4 w-4" /> {t("Doctor Public Information")}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground font-medium block">{t("Specialty")}</span>
              <span className="font-semibold mt-0.5 block">{t(user.doctorProfile.specialty)}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-medium block">{t("Verification Status")}</span>
              <span className={`font-semibold mt-0.5 inline-block px-2 py-0.5 rounded-full border ${
                user.doctorProfile.isVerified 
                  ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/25" 
                  : "text-amber-500 bg-amber-500/10 border-amber-500/25"
              }`}>
                {user.doctorProfile.isVerified ? t("Verified") : t("Pending Verification")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground font-medium block">{t("Consultation Fee")}</span>
              <span className="font-semibold mt-0.5 block">${user.doctorProfile.consultationFee || 120}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-medium block">{t("Account State")}</span>
              <span className={`font-semibold mt-0.5 inline-block px-2 py-0.5 rounded-full border ${
                user.doctorProfile.isActive 
                  ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/25" 
                  : "text-rose-500 bg-rose-500/10 border-rose-500/25"
              }`}>
                {user.doctorProfile.isActive ? t("Active") : t("Frozen")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
