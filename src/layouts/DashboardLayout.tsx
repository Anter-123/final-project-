import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { notificationService } from "../services/notificationService";
import type { SystemNotification } from "../services/notificationService";
import { 
  LayoutDashboard, 
  Users, 
  UserSquare, 
  MessageSquare, 
  Bell, 
  Sun, 
  Moon, 
  LogOut, 
  Calendar, 
  Activity, 
  Pill, 
  BrainCircuit, 
  ShieldAlert, 
  HeartHandshake,
  UserCog,
  Menu,
  X,
  FileCheck,
  Megaphone,
  Globe,
  Camera
} from "lucide-react";
import toast from "react-hot-toast";
import { MedicationReminder } from "../components/MedicationReminder";
import { useLanguage } from "../context/LanguageContext";

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t, isRtl } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        if (user) {
          const list = await notificationService.getNotifications();
          setNotifications(list);
        }
      } catch (err) {
        console.error("Failed to load notifications", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // refresh notifications every 15s
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.readAllNotifications();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Successfully logged out");
  };

  const handleNotificationClick = async (notif: SystemNotification) => {
    try {
      await notificationService.readAllNotifications();
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }

    setShowNotifications(false);

    if (user.role === "Doctor") {
      if (notif.title.toLowerCase().includes("verification")) {
        navigate("/doctor/verification");
      } else {
        navigate("/doctor");
      }
    } else if (user.role === "Admin") {
      if (notif.title.toLowerCase().includes("doctor") || notif.title.toLowerCase().includes("verification")) {
        navigate("/admin/doctors");
      } else if (notif.title.toLowerCase().includes("booking") || notif.title.toLowerCase().includes("appointment")) {
        navigate("/admin/bookings");
      } else {
        navigate("/admin");
      }
    } else {
      navigate("/dashboard");
    }
  };

  if (!user) return null;

  // Build navigation items based on role
  const getNavLinks = () => {
    const common = [
      { to: "/profile", label: "My Profile", icon: UserCog },
      { to: "/chat", label: "Messages", icon: MessageSquare },
    ];

    if (user.role === "Admin") {
      return [
        { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { to: "/admin/doctors", label: "Doctors List", icon: Users },
        { to: "/admin/patients", label: "Patients List", icon: UserSquare },
        { to: "/admin/bookings", label: "Manage Bookings", icon: Calendar },
        ...common
      ];
    }

    if (user.role === "Doctor") {
      return [
        { to: "/doctor", label: "Dashboard", icon: LayoutDashboard },
        { to: "/doctor/patients", label: "My Patients", icon: Users },
        { to: "/doctor/schedule", label: "Working Hours", icon: Calendar },
        { to: "/doctor/verification", label: "Verification Documents", icon: FileCheck },
        ...common
      ];
    }

    // Default Patient links
    return [
      { to: "/dashboard", label: "Health Overview", icon: LayoutDashboard },
      { to: "/patient/doctors", label: "Book Appointment", icon: HeartHandshake },
      { to: "/patient/medications", label: "My Medications", icon: Pill },
      { to: "/patient/assessment", label: "Health Quiz & AI", icon: BrainCircuit },
      { to: "/anatomy-3d", label: "3D Organ Anatomy", icon: Activity },
      { to: "/patient/skin-ai", label: "Skin AI Diagnostic", icon: Camera },
      ...common
    ];
  };

  const menuItems = getNavLinks();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row transition-all duration-300">
      {/* Global Medication Reminder — runs for Patient users on every page */}
      <MedicationReminder />
      
      {/* Mobile Sidebar Trigger & Navbar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card text-card-foreground">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary animate-pulse" />
          <span className="font-bold text-lg tracking-wide bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
            SmartClinic
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-muted rounded-md">
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 ltr:left-0 rtl:right-0 z-50 w-64 bg-card text-card-foreground ltr:border-r rtl:border-l transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex flex-col h-screen
        ${sidebarOpen ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full ltr:md:translate-x-0 rtl:md:translate-x-0"}
      `}>
        <div className="p-6 hidden md:flex items-center gap-3 border-b">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <span className="font-bold text-xl tracking-wider bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
            SmartClinic
          </span>
        </div>

        {/* User Card */}
        <div className="p-6 border-b flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/20 border-2 border-primary/30 overflow-hidden flex items-center justify-center font-bold text-primary">
            {user.image ? (
              <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              (user.name || "U").charAt(0).toUpperCase()
            )}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-semibold truncate text-sm">{user.name}</h4>
            <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 mt-1 inline-block">
              {t(user.role === "User" ? "Patient" : user.role)}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{t(item.label)}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer Actions */}
        <div className="p-4 border-t space-y-2">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <span className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-teal-500" />
              <span>{lang === "ar" ? "English" : "العربية"}</span>
            </span>
          </button>

          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <span className="flex items-center gap-3">
              {theme === "dark" ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-slate-500" />}
              <span>{t(theme === "dark" ? "Light Mode" : "Dark Mode")}</span>
            </span>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="h-5 w-5" />
            <span>{t("Logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top bar (Header) */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b bg-card/50 backdrop-blur-md sticky top-0 z-40">
          <div>
            <h1 className="text-lg font-semibold capitalize">{t("Welcome back, ")}{user.name}</h1>
            <p className="text-xs text-muted-foreground">{t("Smart Clinic Interactive Medical Management Suite")}</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notification system */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-muted rounded-full relative transition-all"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-background animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-card text-card-foreground border rounded-xl shadow-2xl p-4 z-50 glass-panel animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b pb-2 mb-2">
                    <span className="font-semibold text-sm flex items-center gap-1.5">
                      <Bell className="h-4 w-4 text-primary" /> Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-2 py-1 pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No new notifications</p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif._id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer hover:bg-muted/50 ${
                            notif.read ? "bg-muted/30 border-muted/50" : "bg-primary/5 border-primary/20 shadow-sm"
                          }`}
                        >
                          <h5 className="font-semibold text-xs flex justify-between items-center">
                            {notif.title}
                            {!notif.read && <span className="h-1.5 w-1.5 bg-primary rounded-full" />}
                          </h5>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{notif.message}</p>
                          <span className="text-[9px] text-muted-foreground/70 block mt-1">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Profile Widget */}
            <div className="flex items-center gap-3 border-l pl-4">
              <div className="h-9 w-9 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center font-semibold text-primary text-sm">
                {user.image ? (
                  <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  (user.name || "U").charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-xs font-semibold">{user.name}</span>
            </div>
          </div>
        </header>

        {/* Router Outlet for Dashboard Pages */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background/50">
          <Outlet />
        </main>
      </div>

      {/* Background overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
        />
      )}
    </div>
  );
};
