import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Record<string, boolean>;
  typingUsers: Record<string, Record<string, boolean>>; // chatId -> { userId: isTyping }
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || "https://final-project-izjy.vercel.app";
    const newSocket = io(socketUrl, {
      auth: { token },
      autoConnect: true,
      transports: ["websocket"],
      reconnectionAttempts: 3,
      timeout: 5000
    });

    setSocket(newSocket);

    // Online status event listeners
    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
    });

    newSocket.on("online-users", (usersList: string[]) => {
      const usersMap: Record<string, boolean> = {};
      usersList.forEach((uid) => {
        usersMap[uid] = true;
      });
      setOnlineUsers(usersMap);
    });

    newSocket.on("user-status-change", ({ userId, online }: { userId: string; online: boolean }) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [userId]: online,
      }));
    });

    newSocket.on("typing-update", ({ chatId, userId, isTyping }: { chatId: string; userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const chatTyping = prev[chatId] || {};
        return {
          ...prev,
          [chatId]: {
            ...chatTyping,
            [userId]: isTyping,
          },
        };
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, typingUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used within SocketProvider");
  return context;
};
