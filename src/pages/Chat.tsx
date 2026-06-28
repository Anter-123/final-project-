import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { chatService } from "../services/chatService";
import type { ChatRoom, Message } from "../services/chatService";
import { 
  Send, 
  Search, 
  Image as ImageIcon, 
  FileCheck, 
  Paperclip,
  Check,
  CheckCheck,
  User,
  Circle,
  Loader2,
  ArrowLeft,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import { adminService } from "../services/adminService";
import { doctorService } from "../services/doctorService";
import { bookingService } from "../services/bookingService";
import { useLanguage } from "../context/LanguageContext";

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const { socket, onlineUsers, typingUsers } = useSocket();
  const location = useLocation();
  const { t, lang } = useLanguage();

  // Chat lists
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [clinicalRooms, setClinicalRooms] = useState<ChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarTab] = useState<"clinical" | "support" | "monitor">("clinical");

  // Form controls
  const [textInput, setTextInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Search filter
  const [messageSearch, setMessageSearch] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        if (user?.role === "Admin") {
          const [docList, patList] = await Promise.all([
            adminService.getDoctors(),
            adminService.getPatients()
          ]);
          setAllDoctors(Array.isArray(docList) ? docList : []);
          setAllPatients(Array.isArray(patList) ? patList : []);
        } else if (user?.role === "User") {
          const docList = await doctorService.getDoctors();
          setAllDoctors(Array.isArray(docList) ? docList : []);
        } else if (user?.role === "Doctor") {
          const bookingList = await bookingService.getDoctorBookings();
          const patientsMap = new Map();
          bookingList.forEach((b: any) => {
            if (b.patientId && b.patientId._id) {
              patientsMap.set(b.patientId._id, b.patientId);
            }
          });
          setAllPatients(Array.from(patientsMap.values()));
        }
      } catch (e) {
        console.error("Failed to load search directory:", e);
      }
    };
    
    if (user) {
      fetchDirectory();
    }
  }, [user]);

  const handleStartChat = async (receiverId: string, doctorId?: string, recipientName?: string) => {
    setStartingChat(true);
    try {
      const room = await chatService.createChat(receiverId, doctorId, recipientName);
      
      // Update local rooms list if it's not already in there
      setChatRooms((prev) => {
        if (prev.some((r) => r._id === room._id)) return prev;
        return [room, ...prev];
      });
      
      setActiveChatId(room._id);
      setRoomSearch(""); // clear search
      
      // Cleaned up support tab switcher
      toast.success(`Started conversation with ${recipientName || "User"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start chat session");
    } finally {
      setStartingChat(false);
    }
  };
  
  // Refs
  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  const fetchRooms = async () => {
    try {
      const list = await chatService.getChats();
      setChatRooms(Array.isArray(list) ? list : []);
      // Cleaned up monitor list fetching
    } catch (err: any) {
      toast.error("Failed to load chat thread index");
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchRoomsSilent = async () => {
    try {
      const list = await chatService.getChats();
      const listArray = Array.isArray(list) ? list : [];
      setChatRooms((prev) => {
        if (prev.length === listArray.length && prev[0]?._id === listArray[0]?._id && prev[0]?.lastMessage?.message === listArray[0]?.lastMessage?.message) {
          return prev;
        }
        return listArray;
      });

      // Cleaned up silent monitor fetching
    } catch (err) {
      console.error("Silent fetch rooms failed:", err);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(() => {
      fetchRoomsSilent();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (location.state?.activeChatId) {
      const chatId = location.state.activeChatId;
      setActiveChatId(chatId);
      if (location.state.newRoom) {
        const newRoom = location.state.newRoom;
        setChatRooms((prev) => {
          if (prev.some(r => r._id === newRoom._id)) return prev;
          return [newRoom, ...prev];
        });
      }
    }
  }, [location.state, location.search, user]);

  // Socket listener for new messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg: Message) => {
      // Append if it's the active chat room
      if (msg.chatId === activeChatId) {
        setMessages((prev) => [...prev, msg]);
      }
      
      // Update last message in the room preview
      setChatRooms((prevRooms) => 
        prevRooms.map((room) => {
          if (room._id === msg.chatId) {
            return {
              ...room,
              lastMessage: {
                message: msg.message,
                createdAt: msg.createdAt
              }
            };
          }
          return room;
        })
      );
    };

    socket.on("message-receive", handleReceiveMessage);
    return () => {
      socket.off("message-receive", handleReceiveMessage);
    };
  }, [socket, activeChatId]);

  // Join chat room in socket
  useEffect(() => {
    if (socket && activeChatId && !activeChatId.startsWith("local-support-") && !activeChatId.startsWith("monitor-room-")) {
      socket.emit("join-chat", activeChatId);
    }
    if (activeChatId) {
      loadMessages(activeChatId);
    }
  }, [socket, activeChatId]);

  // Poll active chat messages as a fallback for socket delivery issues in serverless (Vercel) environment
  useEffect(() => {
    if (!activeChatId) return;
    const interval = setInterval(() => {
      loadMessagesSilent(activeChatId);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeChatId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const loadMessages = async (chatId: string) => {
    setLoadingMessages(true);
    try {
      const list = await chatService.getChatMessages(chatId);
      setMessages(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error("Failed to load message history");
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadMessagesSilent = async (chatId: string) => {
    try {
      const list = await chatService.getChatMessages(chatId);
      const listArray = Array.isArray(list) ? list : [];
      setMessages((prev) => {
        if (prev.length === listArray.length && prev[prev.length - 1]?._id === listArray[listArray.length - 1]?._id) {
          return prev;
        }
        return listArray;
      });
    } catch (err) {
      console.error("Silent load messages failed:", err);
    }
  };

  const getRecipient = (room: any) => {
    if (!room) return null;
    
    // For clinical monitor rooms, we want to display the patient and doctor name
    if (room._id?.startsWith("monitor-room-") || sidebarTab === "monitor") {
      let patientName = "Patient";
      let doctorName = "Doctor";
      
      if (room.participants && Array.isArray(room.participants)) {
        const patient = room.participants.find((p: any) => p.role === "User");
        const doctor = room.participants.find((p: any) => p.role === "Doctor");
        if (patient) patientName = patient.name;
        if (doctor) doctorName = doctor.name;
      } else {
        if (room.userId) {
          patientName = room.userId.name || room.userId.email || "Patient";
        }
        if (room.doctorId) {
          doctorName = room.doctorId.user?.name || room.doctorId.name || "Doctor";
        }
      }
      
      return {
        _id: room._id,
        name: `${patientName} ↔ ${doctorName}`,
        role: "Clinical Discussion",
        image: ""
      };
    }
    
    // Support real Vercel backend structure
    if (room.userId && room.doctorId) {
      const loggedUserId = user?._id || "";
      const roomPatientId = room.userId?._id || room.userId?.id || room.userId;
      const roomDoctorUserId = room.doctorId?.user?._id || room.doctorId?.user?.id || room.doctorId?.user || "";
      
      // If the logged-in user is Admin
      if (user?.role === "Admin") {
        if (roomPatientId === loggedUserId) {
          const docUserObj = room.doctorId?.user || {};
          return {
            _id: docUserObj._id || docUserObj.id || room.doctorId._id || "",
            name: docUserObj.name || room.doctorId.name || "Doctor",
            role: "Doctor",
            image: docUserObj.image || docUserObj.imageUrl || room.doctorId.image || ""
          };
        }
      }

      const isUserPatient = user?.role === "User";
      
      if (isUserPatient) {
        // Logged-in user is Patient, recipient is Doctor
        const docUserObj = room.doctorId?.user || {};
        return {
          _id: docUserObj._id || docUserObj.id || room.doctorId._id || "",
          name: docUserObj.name || room.doctorId.name || "Doctor",
          role: "Doctor",
          image: docUserObj.image || docUserObj.imageUrl || room.doctorId.image || ""
        };
      } else {
        // Logged-in user is Doctor, recipient is Patient
        const patObj = room.userId || {};
        return {
          _id: patObj._id || patObj.id || "",
          name: patObj.name || "Patient",
          role: "User",
          image: patObj.image || patObj.imageUrl || ""
        };
      }
    }
    
    // Support local support channels
    if (room._id?.startsWith("local-support-")) {
      if (user?.role === "Admin") {
        return room.participants?.find((p: any) => p && p.role !== "Admin" && p._id !== "admin-system-id") || null;
      } else {
        return room.participants?.find((p: any) => p && (p.role === "Admin" || p._id === "admin-system-id")) || null;
      }
    }

    // Fallback/Demo support (including local support channels)
    if (Array.isArray(room.participants)) {
      return room.participants.find((p: any) => p && p._id !== user?._id) || null;
    }
    
    return null;
  };

  const getSenderName = (senderId: string) => {
    if (senderId === user?._id) return t("You");
    if (senderId === "admin-system-id") return t("System Admin");
    
    // Check placeholders first
    if (senderId === "patient-id-placeholder") return t("Patient");
    if (senderId === "doctor-id-placeholder") return t("Doctor");
    
    // Find in activeRoom
    if (activeRoom) {
      if (Array.isArray(activeRoom.participants)) {
        const p = activeRoom.participants.find((p: any) => p && p._id === senderId);
        if (p) return p.name;
      }
      
      const pId = activeRoom.userId?._id || activeRoom.userId?.id || (typeof activeRoom.userId === "string" ? activeRoom.userId : null);
      if (pId === senderId) {
        return activeRoom.userId?.name || "Patient";
      }
      
      const dUserObj = activeRoom.doctorId?.user || {};
      const dUserId = dUserObj._id || dUserObj.id || activeRoom.doctorId?._id || activeRoom.doctorId?.id || (typeof activeRoom.doctorId === "string" ? activeRoom.doctorId : null);
      if (dUserId === senderId) {
        return dUserObj.name || activeRoom.doctorId?.name || "Doctor";
      }
    }
    return "User";
  };

  const compressAndConvertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let maxWidth = 800;
          let maxHeight = 800;
          let quality = 0.6;

          const scaleDimensions = (w: number, h: number, maxW: number, maxH: number) => {
            if (w > maxW || h > maxH) {
              if (w > h) {
                h = Math.round((h * maxW) / w);
                w = maxW;
              } else {
                w = Math.round((w * maxH) / h);
                h = maxH;
              }
            }
            return { w, h };
          };

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          
          let attempts = 0;
          const maxAttempts = 6;
          let dataUrl = "";

          while (attempts < maxAttempts) {
            const dims = scaleDimensions(img.width, img.height, maxWidth, maxHeight);
            canvas.width = dims.w;
            canvas.height = dims.h;

            if (ctx) {
              // Fill background with white to handle transparency in PNGs converted to JPEG
              ctx.fillStyle = "#FFFFFF";
              ctx.fillRect(0, 0, dims.w, dims.h);
              ctx.drawImage(img, 0, 0, dims.w, dims.h);
            }

            dataUrl = canvas.toDataURL("image/jpeg", quality);

            // If base64 dataUrl is under ~85,000 characters (~83KB), it will safely fit in the server's 100KB JSON limit
            if (dataUrl.length <= 85000) {
              break;
            }

            // Otherwise, reduce size and quality for the next iteration
            maxWidth = Math.round(maxWidth * 0.8);
            maxHeight = Math.round(maxHeight * 0.8);
            quality = Math.max(0.15, quality - 0.1);
            attempts++;
          }

          resolve(dataUrl);
        };
        img.onerror = () => {
          reject(new Error("Failed to load image for compression"));
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validation: Type check
      if (!file.type.startsWith("image/")) {
        toast.error(lang === "ar" ? "يرجى اختيار ملف صورة صالح" : "Please select a valid image file");
        return;
      }
      
      // Validation: Max raw file size check (15MB)
      if (file.size > 15 * 1024 * 1024) {
        toast.error(lang === "ar" ? "حجم الصورة كبير جداً (الحد الأقصى 15 ميجابايت)" : "Image file is too large (maximum 15MB)");
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || (!textInput.trim() && !imageFile)) return;

    setSendingMessage(true);
    try {
      let base64Img: string | undefined = undefined;
      if (imageFile) {
        try {
          base64Img = await compressAndConvertToBase64(imageFile);
        } catch (compressionErr) {
          console.error("Compression failed, trying raw base64 conversion:", compressionErr);
          // Fallback to reading file directly if canvas compression fails
          base64Img = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(imageFile);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
          });
        }
      }

      // 1. Post to API / Local Storage
      const newMsg = await chatService.sendMessage(activeChatId, textInput, base64Img);
      
      // 2. Clear inputs
      setTextInput("");
      setImageFile(null);
      setImagePreview(null);
      
      // 3. Emit via socket to notify receiver if live chat room
      if (socket && !activeChatId.startsWith("local-support-") && !activeChatId.startsWith("monitor-room-")) {
        socket.emit("send-message", newMsg);
        // Turn off typing indicator
        socket.emit("typing", { chatId: activeChatId, isTyping: false });
      }

      setMessages((prev) => [...prev, newMsg]);
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleTyping = () => {
    if (!socket || !activeChatId || activeChatId.startsWith("local-support-") || activeChatId.startsWith("monitor-room-")) return;

    socket.emit("typing", { chatId: activeChatId, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { chatId: activeChatId, isTyping: false });
    }, 2000);
  };

  const roomList = Array.isArray(chatRooms)
    ? chatRooms
    : (chatRooms as any)?.chats
    ? (chatRooms as any).chats
    : (chatRooms as any)?.data
    ? (chatRooms as any).data
    : [];

  const messageList = Array.isArray(messages)
    ? messages
    : (messages as any)?.messages
    ? (messages as any).messages
    : (messages as any)?.data
    ? (messages as any).data
    : [];

  // Filter rooms list
  const displayedRooms = roomList;

  const activeRoom = roomList.find((r) => r._id === activeChatId);

  const activeRecipient = activeRoom ? getRecipient(activeRoom) : null;
  const isOnline = activeRecipient && !activeChatId?.startsWith("local-support-") && !activeChatId?.startsWith("monitor-room-")
    ? !!onlineUsers[activeRecipient._id]
    : false;
  const isTyping = activeRecipient && activeChatId && !activeChatId.startsWith("local-support-") && !activeChatId.startsWith("monitor-room-")
    ? typingUsers[activeChatId]?.[activeRecipient._id]
    : false;

  // Message filters
  const filteredMessages = messageList.filter((m) => 
    m.message.toLowerCase().includes(messageSearch.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-140px)] border rounded-2xl overflow-hidden glass-panel flex flex-col md:flex-row shadow-sm">
      
      {/* Side bar: Chats list */}
      <div className={`
        w-full md:w-80 border-r flex flex-col h-full bg-card/20
        ${activeChatId ? "hidden md:flex" : "flex"}
      `}>
        {/* Header search and tabs */}
        <div className="p-4 border-b space-y-3">
          <h3 className="font-bold text-sm">
            {user?.role === "Admin" ? t("Communication & Support Center") : t("Clinician & Patient Threads")}
          </h3>
          <div className="relative">
            <Search className="absolute inset-y-0 left-3 h-4 w-4 my-auto text-muted-foreground" />
            <input
              type="text"
              placeholder={t("Search conversations or start new...")}
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border rounded-xl text-xs focus:outline-none"
            />
          </div>
          
          {/* Tab Selector Removed */}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingRooms ? (
            <div className="p-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            </div>
          ) : (() => {
            // Filter active rooms by search query
            const activeRoomsFiltered = displayedRooms.filter((room) => {
              const rec = getRecipient(room);
              if (!rec) return false;
              return rec.name?.toLowerCase().includes(roomSearch.toLowerCase()) ||
                     rec.role?.toLowerCase().includes(roomSearch.toLowerCase());
            });

            // Find system users (Doctors/Patients) matching search who don't have an active room
            let searchResultsUsers: any[] = [];
            if (roomSearch.trim() !== "") {
              const query = roomSearch.toLowerCase();
              
              if (sidebarTab === "support" && user?.role === "Admin") {
                // Admin can start support chat with any Doctor or Patient
                const matchedDocs = allDoctors.filter(d => {
                  const name = d.name || "";
                  const email = d.email || "";
                  const docUserId = d.userId?._id || d.userId?.id || d.userId || d._id;
                  const alreadyHasRoom = displayedRooms.some(r => 
                    r.participants?.some(p => p._id === docUserId)
                  );
                  return !alreadyHasRoom && (name.toLowerCase().includes(query) || email.toLowerCase().includes(query));
                }).map(d => ({
                  _id: d.userId?._id || d.userId?.id || d.userId || d._id,
                  name: d.name,
                  email: d.email,
                  role: "Doctor",
                  image: d.image,
                  doctorProfileId: d._id
                }));

                const matchedPats = allPatients.filter(p => {
                  const name = p.name || "";
                  const email = p.email || "";
                  const alreadyHasRoom = displayedRooms.some(r => 
                    r.participants?.some(part => part._id === p._id)
                  );
                  return !alreadyHasRoom && (name.toLowerCase().includes(query) || email.toLowerCase().includes(query));
                }).map(p => ({
                  _id: p._id,
                  name: p.name,
                  email: p.email,
                  role: "User",
                  image: p.image
                }));

                searchResultsUsers = [...matchedDocs, ...matchedPats];
              } else if (sidebarTab === "clinical" && user?.role === "User") {
                // Patient can start clinical chat with any Doctor
                searchResultsUsers = allDoctors.filter(d => {
                  const name = d.name || "";
                  const email = d.email || "";
                  const docUserId = d.userId?._id || d.userId?.id || d.userId || d._id;
                  const alreadyHasRoom = displayedRooms.some(r => {
                    const docObj = (r as any).doctorId || {};
                    const dId = docObj.user?._id || docObj.user?.id || docObj._id || docObj;
                    return dId === docUserId;
                  });
                  return !alreadyHasRoom && (name.toLowerCase().includes(query) || email.toLowerCase().includes(query));
                }).map(d => ({
                  _id: d.userId?._id || d.userId?.id || d.userId || d._id,
                  name: d.name,
                  email: d.email,
                  role: "Doctor",
                  image: d.image,
                  doctorProfileId: d._id
                }));
              } else if (sidebarTab === "clinical" && user?.role === "Doctor") {
                // Doctor can start clinical chat with any Patient
                searchResultsUsers = allPatients.filter(p => {
                  const name = p.name || "";
                  const email = p.email || "";
                  const alreadyHasRoom = displayedRooms.some(r => {
                    const pId = (r as any).userId?._id || (r as any).userId?.id || (r as any).userId;
                    return pId === p._id;
                  });
                  return !alreadyHasRoom && (name.toLowerCase().includes(query) || email.toLowerCase().includes(query));
                }).map(p => ({
                  _id: p._id,
                  name: p.name,
                  email: p.email,
                  role: "User",
                  image: p.image
                }));
              }
            }

            if (activeRoomsFiltered.length === 0 && searchResultsUsers.length === 0) {
              return <p className="text-xs text-muted-foreground p-6 text-center">{t("No results found")}</p>;
            }

            return (
              <div className="divide-y divide-muted/40">
                {/* Active Conversations Section */}
                {activeRoomsFiltered.length > 0 && (
                  <div>
                    {roomSearch && (
                      <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/20 border-b">
                        {t("Active Conversations")}
                      </div>
                    )}
                    {activeRoomsFiltered.map((room) => {
                      const rec = getRecipient(room);
                      const recOnline = rec && !room._id.startsWith("local-support-") && !room._id.startsWith("monitor-room-")
                        ? !!onlineUsers[rec._id]
                        : false;
                      if (!rec) return null;
                      
                      return (
                        <button
                          key={room._id}
                          onClick={() => setActiveChatId(room._id)}
                          className={`w-full p-4 flex items-start gap-3 text-left transition-all ${
                            activeChatId === room._id 
                              ? "bg-primary/5 dark:bg-primary/10 border-l-4 border-primary" 
                              : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="relative">
                            <div className="h-9 w-9 rounded-full bg-slate-300 dark:bg-slate-800 flex items-center justify-center font-bold text-xs uppercase text-slate-700 dark:text-slate-300">
                              {rec.image ? <img src={rec.image} alt={rec.name} className="h-full w-full object-cover rounded-full" /> : rec.name.charAt(0)}
                            </div>
                            {recOnline && (
                              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 rounded-full border border-background" />
                            )}
                          </div>
                          
                          <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-baseline">
                              <span className="font-semibold text-xs truncate block">{rec.name}</span>
                              {room.lastMessage && (
                                <span className="text-[9px] text-muted-foreground">
                                  {new Date(room.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide mt-0.5 block">
                              {rec.role === "User" ? t("Patient") : t(rec.role)}
                            </span>
                            {room.lastMessage && (
                              <p className="text-[11px] text-muted-foreground/80 truncate mt-1">{room.lastMessage.message}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Start New Conversation Section */}
                {searchResultsUsers.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/20 border-b">
                      {t("Start a New Conversation")}
                    </div>
                    {searchResultsUsers.map((item) => (
                      <button
                        key={item._id}
                        disabled={startingChat}
                        onClick={() => handleStartChat(item._id, item.doctorProfileId, item.name)}
                        className="w-full p-4 flex items-center gap-3 text-left transition-all hover:bg-muted/30 disabled:opacity-50"
                      >
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs uppercase">
                          {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover rounded-full" /> : item.name.charAt(0)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <span className="font-semibold text-xs truncate block">{item.name}</span>
                          <span className="text-[10px] text-muted-foreground block truncate">{item.email}</span>
                          <span className="text-[9px] text-primary font-bold uppercase tracking-wider mt-0.5 block">
                            {item.role === "Doctor" ? `${t("Doctor")} (Doctor)` : `${t("Patient")} (Patient)`}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className={`
        flex-1 flex flex-col h-full bg-background/20
        ${!activeChatId ? "hidden md:flex" : "flex"}
      `}>
        {activeChatId && activeRecipient ? (
          <>
            {/* Header info */}
            <div className="p-4 border-b flex justify-between items-center bg-card/25 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveChatId(null)}
                  className="md:hidden p-1.5 hover:bg-muted rounded-lg text-muted-foreground mr-1"
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                </button>

                <div className="relative">
                  <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center font-bold text-primary text-xs">
                    {activeRecipient.image ? <img src={activeRecipient.image} alt={activeRecipient.name} className="h-full w-full object-cover rounded-full" /> : activeRecipient.name.charAt(0)}
                  </div>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 rounded-full border border-background" />
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-xs block leading-none">{activeRecipient.name}</h4>
                  <span className="text-[9px] text-muted-foreground uppercase font-semibold mt-1 inline-block">
                    {isOnline ? t("Online") : t("Offline")} {isTyping && ` | ${t("typing...")}`}
                  </span>
                </div>
              </div>

              {/* Local Message Filter */}
              <div className="relative w-40 sm:w-48">
                <Search className="absolute inset-y-0 left-2.5 h-3.5 w-3.5 my-auto text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("Filter messages...")}
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-background border rounded-lg text-[10px] focus:outline-none"
                />
              </div>
            </div>

            {/* Message feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isOwn = msg.senderId === user?._id || (user?.role === "Admin" && msg.senderId === "admin-system-id");
                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[70%] space-y-1`}>
                        {sidebarTab === "monitor" && (
                          <span className="text-[10px] font-semibold text-primary/80 block px-1">
                            {getSenderName(msg.senderId)}
                          </span>
                        )}
                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-tr-none shadow"
                              : "bg-muted text-foreground rounded-tl-none border"
                          }`}
                        >
                          {msg.image && (
                            <img src={msg.image} alt="Attachment" className="max-w-full rounded-lg mb-2 max-h-48 object-cover" />
                          )}
                          <p>{msg.message}</p>
                        </div>
                        <span className={`text-[9px] text-muted-foreground/80 block ${isOwn ? "text-right" : "text-left"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted text-muted-foreground p-3 rounded-2xl rounded-tl-none border flex items-center gap-1">
                    <span className="typing-dot h-1.5 w-1.5 bg-slate-400 rounded-full" />
                    <span className="typing-dot h-1.5 w-1.5 bg-slate-400 rounded-full" />
                    <span className="typing-dot h-1.5 w-1.5 bg-slate-400 rounded-full" />
                  </div>
                </div>
              )}
              <div ref={feedEndRef} />
            </div>

            {/* Input form or monitor warning */}
            {false ? (
              <div className="p-4 bg-muted/65 text-center text-xs text-muted-foreground border-t font-semibold">
                {t("This clinical conversation is monitored (read-only) and cannot be modified or sent messages in.")}
              </div>
            ) : (
              <form onSubmit={handleSend} className="p-4 border-t bg-card/25 space-y-2">
                {imagePreview && (
                  <div className="relative inline-block border rounded-lg overflow-hidden h-14 w-14 bg-muted mb-2">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <div className="flex gap-2 items-center">
                  <label className="p-2.5 border rounded-xl hover:bg-muted cursor-pointer text-muted-foreground transition-all">
                    <ImageIcon className="h-4.5 w-4.5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>

                  <input
                    type="text"
                    required={!imageFile}
                    disabled={sendingMessage}
                    value={textInput}
                    onChange={(e) => {
                      setTextInput(e.target.value);
                      handleTyping();
                    }}
                    placeholder={t("Type message here...")}
                    className="flex-1 px-4 py-2.5 bg-background border rounded-xl text-xs focus:outline-none focus:border-primary disabled:opacity-50"
                  />

                  <button
                    type="submit"
                    disabled={sendingMessage}
                    className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:shadow hover:shadow-primary/25 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {sendingMessage ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Send className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <User className="h-12 w-12 opacity-35 animate-pulse" />
            <p className="text-xs">{t("Select a user thread from the index sidebar to establish communication")}</p>
          </div>
        )}
      </div>
    </div>
  );
};
