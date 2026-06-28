import api from "./api";

export interface SystemNotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const isDemo = () => localStorage.getItem("demoMode") === "true";

export const notificationService = {
  getNotifications: async (): Promise<SystemNotification[]> => {
    if (isDemo()) {
      return [
        {
          _id: "notif-1",
          userId: "demo-admin-id-999",
          title: "System Update",
          message: "SmartClinic Platform is running in local Demo/Bypass simulation mode.",
          read: false,
          createdAt: new Date().toISOString()
        },
        {
          _id: "notif-2",
          userId: "demo-admin-id-999",
          title: "New Verification Request",
          message: "Dr. Florence Nightingale uploaded credentials. Review required.",
          read: true,
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ];
    }
    try {
      const response = await api.get<SystemNotification[]>("/notification");
      return (response.data as any)?.data || response.data;
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return notificationService.getNotifications();
      }
      throw err;
    }
  },

  readAllNotifications: async (): Promise<any> => {
    if (isDemo()) {
      return { message: "All notifications marked as read (simulated)" };
    }
    try {
      const response = await api.patch("/notification/read-all");
      return response.data;
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return notificationService.readAllNotifications();
      }
      throw err;
    }
  },
};
