import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
import type { UserProfile } from "../services/authService";

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const decodeToken = (token: string): any => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

const normalizeUserProfileRole = (profile: any) => {
  if (profile && profile.role) {
    const r = profile.role.toString().toLowerCase();
    if (r === "admin") profile.role = "Admin";
    else if (r === "doctor") profile.role = "Doctor";
    else if (r === "user" || r === "patient") profile.role = "User";
  }
  return profile;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async (jwtToken: string) => {
    try {
      const decoded = decodeToken(jwtToken);
      const userId = decoded?.id || decoded?._id || decoded?.userId;
      if (decoded && userId) {
        const response = await authService.getUserProfile(userId);
        const profile = (response as any).data || response;
        setUser(normalizeUserProfileRole(profile));
      } else {
        logout();
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setIsLoading(false);
    }

    // Listen to unauthorized event dispatched by Axios interceptor
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener("unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("unauthorized", handleUnauthorized);
    };
  }, [token]);

  const login = async (newToken: string) => {
    setIsLoading(true);
    localStorage.setItem("token", newToken);
    setToken(newToken);
    await fetchProfile(newToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("demoMode");
    setToken(null);
    setUser(null);
    setIsLoading(false);
  };

  const refreshUser = async () => {
    if (token) {
      const decoded = decodeToken(token);
      const userId = decoded?.id || decoded?._id || decoded?.userId;
      if (decoded && userId) {
        const response = await authService.getUserProfile(userId);
        const profile = (response as any).data || response;
        setUser(normalizeUserProfileRole(profile));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
