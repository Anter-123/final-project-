import api from "./api";

export interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  message: string;
  image?: string; // base64 payload placeholder
  createdAt: string;
}

export interface ChatRoom {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    role: "User" | "Doctor" | "Admin";
    image?: string;
  }>;
  lastMessage?: {
    message: string;
    createdAt: string;
  };
  createdAt: string;
}

export interface AIChatResponse {
  reply: string;
  isLocal?: boolean;
  chatId?: string;
  report?: any;
}

const isDemo = () => localStorage.getItem("demoMode") === "true";

const safeAtob = (str: string): string => {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return window.atob(str);
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = chars.indexOf(str[i]);
    if (idx === -1) continue;
    buffer = (buffer << 6) | (idx & 63);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 255);
    }
  }
  return output;
};

const getLoggedUserContext = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      safeAtob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    let role = payload.role || "";
    const roleLower = role.toLowerCase();
    if (roleLower === "admin") role = "Admin";
    else if (roleLower === "doctor") role = "Doctor";
    else if (roleLower === "user" || roleLower === "patient") role = "User";

    return {
      _id: payload._id || payload.id || payload.userId || "",
      role,
      name: payload.name || ""
    };
  } catch (e) {
    return null;
  }
};

const getChatParticipantIds = (chat: any) => {
  if (!chat) return null;
  
  let patientUserId = "";
  if (chat.userId) {
    if (typeof chat.userId === "object") {
      patientUserId = chat.userId._id || chat.userId.id || "";
    } else {
      patientUserId = chat.userId;
    }
  }

  let doctorUserId = "";
  if (chat.doctorId) {
    if (typeof chat.doctorId === "object") {
      const docUser = chat.doctorId.user;
      if (docUser) {
        if (typeof docUser === "object") {
          doctorUserId = docUser._id || docUser.id || "";
        } else {
          doctorUserId = docUser;
        }
      } else {
        doctorUserId = chat.doctorId._id || chat.doctorId.id || "";
      }
    } else {
      doctorUserId = chat.doctorId;
    }
  }

  return { patientUserId, doctorUserId };
};

const normalizeMessage = (
  m: any,
  userRole?: string,
  userId?: string,
  participantIds?: { patientUserId: string; doctorUserId: string } | null
): Message => {
  if (!m) return null as any;
  
  let senderId = m.senderId || m.sender || "";
  const senderLower = typeof m.sender === "string" ? m.sender.toLowerCase() : "";
  const roleUpper = userRole ? userRole.toUpperCase() : "";

  // Check if the logged-in user is a participant in the room
  const isParticipant = participantIds && userId
    ? (userId === participantIds.patientUserId || userId === participantIds.doctorUserId)
    : true; // fallback to true if no participantIds

  // 1. Map based on logged-in user context first (most reliable for "isOwn" check on sender's client)
  if (userId && roleUpper && isParticipant) {
    if (senderLower === "user" && (roleUpper === "USER" || roleUpper === "ADMIN")) {
      senderId = userId;
    } else if (senderLower === "doctor" && roleUpper === "DOCTOR") {
      senderId = userId;
    }
  }

  // 2. Map other participant using participantIds if available
  if (participantIds) {
    if (senderLower === "user" && senderId !== userId) {
      senderId = participantIds.patientUserId || senderId;
    } else if (senderLower === "doctor" && senderId !== userId) {
      senderId = participantIds.doctorUserId || senderId;
    }
  }

  // 3. Fallback placeholders if not mapped
  if (senderId === m.sender || senderId === "") {
    if (senderLower === "user") {
      senderId = "patient-id-placeholder";
    } else if (senderLower === "doctor") {
      senderId = "doctor-id-placeholder";
    }
  }

  return {
    _id: m._id || m.id || "",
    chatId: m.chatId || "",
    senderId,
    message: m.text || m.message || "",
    image: m.image || "",
    createdAt: m.timestamp || m.createdAt || new Date().toISOString()
  };
};

// Local storage simulated chat rooms database helpers
const getDemoChatsDb = () => {
  const getOrSet = (key: string, defaultVal: any) => {
    const existing = localStorage.getItem(key);
    if (existing) {
      try {
        return JSON.parse(existing);
      } catch (e) {
        // Fallback
      }
    }
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  };

  const defaultRooms: ChatRoom[] = [
    {
      _id: "room-1",
      participants: [
        { _id: "demo-admin-id-999", name: "Demo System Admin", role: "Admin" },
        { _id: "doc-1", name: "Dr. Alexander Fleming", role: "Doctor" }
      ],
      lastMessage: {
        message: "Hello Admin, I have uploaded my credentials for verification.",
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      _id: "room-2",
      participants: [
        { _id: "demo-admin-id-999", name: "Demo System Admin", role: "Admin" },
        { _id: "pat-1", name: "Sarah Connor", role: "User" }
      ],
      lastMessage: {
        message: "Thank you for scheduling my appointment.",
        createdAt: new Date(Date.now() - 7200000).toISOString()
      },
      createdAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];

  const defaultMessages: Message[] = [
    {
      _id: "msg-1",
      chatId: "room-1",
      senderId: "doc-1",
      message: "Hello Admin, I have uploaded my credentials for verification.",
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      _id: "msg-2",
      chatId: "room-2",
      senderId: "pat-1",
      message: "Thank you for scheduling my appointment.",
      createdAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];

  const rooms = getOrSet("demo_chat_rooms", defaultRooms);
  const messages = getOrSet("demo_chat_messages", defaultMessages);

  return { rooms, messages };
};

const saveDemoChatsDb = (db: { rooms?: ChatRoom[]; messages?: Message[] }) => {
  if (db.rooms) localStorage.setItem("demo_chat_rooms", JSON.stringify(db.rooms));
  if (db.messages) localStorage.setItem("demo_chat_messages", JSON.stringify(db.messages));
};

export const generateLocalAIResponse = (message: string, bodyPart: string): string => {
  const msg = message.toLowerCase().trim();
  const bp = bodyPart.toLowerCase().trim();
  const lang = localStorage.getItem("lang") || "en";
  const isAr = lang === "ar";
  
  // Chest/Heart symptoms
  if (
    bp === "chest" || 
    bp.includes("heart") || 
    bp.includes("ventricle") || 
    bp === "aorta" ||
    msg.includes("صدر") || 
    msg.includes("chest") || 
    msg.includes("heart") || 
    msg.includes("قلب") ||
    msg.includes("تنف") ||
    msg.includes("breath")
  ) {
    return isAr 
      ? "آلام الصدر أو ضيق التنفس تتطلب عناية فائقة. قد تشير إلى إجهاد عضلي، ارتجاع مريئي، أو اضطرابات قلبية مثل الذبحة الصدرية. إذا كان الألم ينتشر إلى الكتف أو الذراع الأيسر أو الفك، أو كان مصحوبًا بعرق بارد وغثيان، يرجى التوجه فورًا إلى أقرب مستشفى طوارئ. كما يمكنك حجز موعد مع أطباء القلب لدينا للاطمئنان الكامل."
      : "Chest pain or shortness of breath requires immediate medical attention. It could indicate muscle strain, acid reflux, or cardiac issues like angina. If the pain radiates to your shoulder, left arm, or jaw, or is accompanied by cold sweat and nausea, please proceed immediately to the nearest emergency room. You can also book an appointment with our cardiologists for a comprehensive checkup.";
  }
  
  // Head/Headache symptoms
  if (
    bp === "head" || 
    msg.includes("رأس") || 
    msg.includes("head") || 
    msg.includes("صداع") || 
    msg.includes("headache") ||
    msg.includes("دوار") ||
    msg.includes("دائخ") ||
    msg.includes("dizzy")
  ) {
    return isAr 
      ? "أعراض الرأس أو الصداع والدوار قد تكون ناتجة عن التعب والإجهاد، قلة النوم، الجفاف، أو تقلبات ضغط الدم. ننصحك بالراحة في مكان هادئ، شرب كوب من الماء، وقياس ضغط الدم. إذا كان الصداع شديدًا ومفاجئًا، أو مصحوبًا بزغللة في العين وتنميل، يرجى مراجعة عيادة المخ والأعصاب للاستشارة الطبية."
      : "Head symptoms, headaches, or dizziness can be caused by fatigue, stress, lack of sleep, dehydration, or blood pressure fluctuations. We advise resting in a quiet place, drinking a glass of water, and checking your blood pressure. If the headache is sudden and severe, or accompanied by blurred vision and numbness, please consult our neurology clinic.";
  }
  
  // Stomach/Abdomen symptoms
  if (
    bp === "abdomen" || 
    msg.includes("بطن") || 
    msg.includes("stomach") || 
    msg.includes("abdomen") || 
    msg.includes("مغص") ||
    msg.includes("هضم") ||
    msg.includes("digest")
  ) {
    return isAr 
      ? "آلام البطن أو المغص قد تنجم عن عسر الهضم، القولون العصبي، أو التهابات معوية خفيفة. يُنصح بشرب سوائل دافئة (مثل النعناع أو الينسون) وتناول وجبات خفيفة مسلوقة وتجنب الدسم. إذا كان الألم شديدًا وحادًا ومتركزًا في الجزء السفلي الأيمن، فقد يشير ذلك إلى التهاب الزائدة الدودية، ويجب مراجعة الطبيب فورًا."
      : "Abdominal pain or cramps can result from indigestion, irritable bowel syndrome (IBS), or mild gastroenteritis. It is recommended to drink warm fluids (like mint or chamomile), eat light boiled meals, and avoid fatty foods. If the pain is severe, sharp, and concentrated in the lower right area, it may indicate appendicitis, and you should see a doctor immediately.";
  }
  
  // Back symptoms
  if (
    bp === "back" || 
    msg.includes("ظهر") || 
    msg.includes("back") || 
    msg.includes("رقب") ||
    msg.includes("spine") ||
    msg.includes("عظام")
  ) {
    return isAr 
      ? "آلام الظهر والرقبة شائعة بسبب الجلوس الخاطئ لفترات طويلة أو الشد العضلي. يُنصح بعمل كمادات دافئة، وتجنب رفع الأوزان الثقيلة، والقيام بتمارين تمدد خفيفة. إذا كان هناك ألم يمتد إلى الساقين (عرق النسا) أو تنميل في الأطراف، يرجى مراجعة طبيب العظام أو أخصائي العلاج الطبيعي."
      : "Back and neck pain is common due to poor posture during long sitting hours or muscle strain. It is advised to apply warm compresses, avoid lifting heavy weights, and perform light stretching exercises. If there is pain extending to the legs (sciatica) or numbness in the limbs, please consult an orthopedic doctor or a physical therapist.";
  }
  
  // Limbs symptoms
  if (
    bp === "limbs" || 
    msg.includes("أطراف") || 
    msg.includes("ساق") || 
    msg.includes("قدم") || 
    msg.includes("ذراع") || 
    msg.includes("leg") || 
    msg.includes("foot") || 
    msg.includes("arm") ||
    msg.includes("تنميل") ||
    msg.includes("numb")
  ) {
    return isAr 
      ? "أعراض الأطراف والتنميل أو آلام المفاصل قد تنجم عن الإجهاد البدني، نقص الفيتامينات (مثل B12)، أو مشاكل في الدورة الدموية والأعصاب الطرفية. ننصحك بتجنب الوقوف الطويل، والحفاظ على تدفئة الأطراف، واستشارة طبيب العظام أو الأعصاب لعمل الفحوصات اللازمة."
      : "Limb symptoms, numbness, or joint pain can stem from physical exertion, vitamin deficiencies (like B12), or problems in peripheral blood circulation and nerves. We advise you to avoid prolonged standing, keep your extremities warm, and consult an orthopedist or neurologist for necessary tests.";
  }
  
  // General fever/cold/infection symptoms
  if (
    msg.includes("حرار") || 
    msg.includes("fever") || 
    msg.includes("سخون") || 
    msg.includes("برد") || 
    msg.includes("كحة") || 
    msg.includes("cough") ||
    msg.includes("flu") ||
    msg.includes("رشح")
  ) {
    return isAr 
      ? "ارتفاع الحرارة أو أعراض البرد والكحة تشير عادةً إلى عدوى فيروسية أو بكتيرية. ننصحك بالراحة التامة، الإكثار من السوائل الدافئة الغنية بفيتامين C، وتناول خافض للحرارة عند اللزوم (مثل الباراسيتامول). إذا استمرت الحرارة المرتفعة لأكثر من 3 أيام دون تحسن، يرجى مراجعة الطبيب العام في العيادة."
      : "Fever, cold symptoms, or coughing usually indicate a viral or bacterial infection. We recommend plenty of rest, warm fluids rich in Vitamin C, and taking fever reducers (like Paracetamol) as needed. If the high fever persists for more than 3 days without improvement, please consult a general practitioner at the clinic.";
  }
  
  // Fallback default message
  return isAr 
    ? "أنا طبيبك المساعد الذكي. لقد قمت بتحليل استفسارك الطبي وسجلته. لمساعدتك بشكل أفضل، يمكنك اختيار الجزء المعني بالألم من القائمة العلوية لتحديد نطاق التشخيص، كما ننصحك بحجز استشارة مع أحد أطبائنا المتخصصين في العيادة للحصول على تشخيص سريري دقيق وخطة علاجية مخصصة."
    : "I am your smart AI assistant. I have analyzed and recorded your medical inquiry. To assist you better, you can select the specific painful body area from the top menu to refine the diagnosis. We also recommend booking a consultation with one of our specialized doctors at the clinic for an accurate clinical diagnosis and a personalized treatment plan.";
};

// Simulated Clinical Monitor Rooms Data
const getClinicalMonitorRooms = (): ChatRoom[] => {
  return [
    {
      _id: "monitor-room-cardiology",
      participants: [
        { _id: "pat-bruce-wayne", name: "Bruce Wayne", role: "User" },
        { _id: "doc-fleming-profile", name: "Dr. Alexander Fleming", role: "Doctor" }
      ],
      lastMessage: {
        message: "Thank you doctor. I will follow your instructions.",
        createdAt: new Date(Date.now() - 1200000).toISOString()
      },
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      _id: "monitor-room-pediatrics",
      participants: [
        { _id: "pat-sarah-connor", name: "Sarah Connor", role: "User" },
        { _id: "doc-nightingale-profile", name: "Dr. Florence Nightingale", role: "Doctor" }
      ],
      lastMessage: {
        message: "If the fever persists for more than 48 hours, bring her to the clinic.",
        createdAt: new Date(Date.now() - 1800000).toISOString()
      },
      createdAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];
};

const getClinicalMonitorMessages = (chatId: string): Message[] => {
  if (chatId === "monitor-room-cardiology") {
    return [
      {
        _id: "m-card-1",
        chatId: "monitor-room-cardiology",
        senderId: "pat-bruce-wayne",
        message: "Hello Dr. Fleming, I am experiencing high blood pressure and chest discomfort after my daily training sessions.",
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        _id: "m-card-2",
        chatId: "monitor-room-cardiology",
        senderId: "doc-fleming-profile",
        message: "Hello Bruce. I reviewed your clinical logs. Please stop high-intensity workouts immediately and take the prescribed medication daily. I will monitor your heart rate telemetry.",
        createdAt: new Date(Date.now() - 2400000).toISOString()
      },
      {
        _id: "m-card-3",
        chatId: "monitor-room-cardiology",
        senderId: "pat-bruce-wayne",
        message: "Thank you doctor. I will follow your instructions.",
        createdAt: new Date(Date.now() - 1200000).toISOString()
      }
    ];
  }
  if (chatId === "monitor-room-pediatrics") {
    return [
      {
        _id: "m-ped-1",
        chatId: "monitor-room-pediatrics",
        senderId: "pat-sarah-connor",
        message: "Hello Dr. Nightingale, my child has a sudden fever of 38.5°C since last night. What dosage of antipyretic syrup should I administer?",
        createdAt: new Date(Date.now() - 3000000).toISOString()
      },
      {
        _id: "m-ped-2",
        chatId: "monitor-room-pediatrics",
        senderId: "doc-nightingale-profile",
        message: "Hi Sarah. Administer the paracetamol syrup according to her weight chart. Keep her in a cool room, apply lukewarm compresses, and ensure she stays hydrated.",
        createdAt: new Date(Date.now() - 2000000).toISOString()
      },
      {
        _id: "m-ped-3",
        chatId: "monitor-room-pediatrics",
        senderId: "doc-nightingale-profile",
        message: "If the fever persists for more than 48 hours, bring her to the clinic for a diagnostic swap.",
        createdAt: new Date(Date.now() - 1800000).toISOString()
      }
    ];
  }
  return [];
};

const ensureSupportRoomCreated = async (loggedUser: { _id: string; role: string; name?: string }) => {
  if (!loggedUser || loggedUser.role === "Admin") return;

  const supportRoomId = `local-support-${loggedUser.role === "Doctor" ? "doc" : "pat"}-${loggedUser._id}`;
  const newRoom: ChatRoom = {
    _id: supportRoomId,
    participants: [
      { _id: "admin-system-id", name: "SmartClinic Admin", role: "Admin" },
      { _id: loggedUser._id, name: loggedUser.name || (loggedUser.role === "Doctor" ? "Doctor" : "Patient"), role: loggedUser.role as any }
    ],
    createdAt: new Date().toISOString()
  };

  // Try to register on local relay server
  try {
    await fetch("http://localhost:3001/api/support/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRoom),
      signal: AbortSignal.timeout(600)
    });
  } catch (e) {
    // Fallback to localStorage
    const localRoomsRaw = localStorage.getItem("local_support_rooms") || "[]";
    const localRooms = JSON.parse(localRoomsRaw);
    let existing = localRooms.find((r: any) => r._id === supportRoomId);
    if (!existing) {
      localRooms.unshift(newRoom);
      localStorage.setItem("local_support_rooms", JSON.stringify(localRooms));
      
      const localMessagesRaw = localStorage.getItem("local_support_messages") || "[]";
      const localMessages = JSON.parse(localMessagesRaw);
      localMessages.push({
        _id: `support-msg-welcome-${Date.now()}`,
        chatId: supportRoomId,
        senderId: "admin-system-id",
        message: `مرحباً بك في مركز الدعم الفني والشكاوى الخاص بـ SmartClinic. كيف يمكننا مساعدتك اليوم كـ ${loggedUser.role === "Doctor" ? "طبيب" : "مريض"}؟`,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem("local_support_messages", JSON.stringify(localMessages));
    }
    return;
  }

  // If server is active, add default welcome message
  try {
    const msgsRes = await fetch(`http://localhost:3001/api/support/messages?chatId=${supportRoomId}`, { signal: AbortSignal.timeout(600) });
    const msgs = await msgsRes.json();
    if (msgs.length === 0) {
      await fetch("http://localhost:3001/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: `support-msg-welcome-${Date.now()}`,
          chatId: supportRoomId,
          senderId: "admin-system-id",
          message: `مرحباً بك في مركز الدعم الفني والشكاوى الخاص بـ SmartClinic. كيف يمكننا مساعدتك اليوم كـ ${loggedUser.role === "Doctor" ? "طبيب" : "مريض"}؟`,
          createdAt: new Date().toISOString()
        }),
        signal: AbortSignal.timeout(600)
      });
    }
  } catch (e) {}
};

export const chatService = {
  createChat: async (receiverId: string, doctorId?: string, recipientName?: string): Promise<ChatRoom> => {
    if (isDemo()) {
      const db = getDemoChatsDb();
      // Check if room already exists
      const existing = db.rooms.find((r) => 
        r.participants.some(p => p._id === receiverId) && 
        r.participants.some(p => p._id === "demo-admin-id-999")
      );
      if (existing) return existing;

      // Find recipient details in doctors or patients list
      const doctorsRaw = localStorage.getItem("demo_doctors");
      const patientsRaw = localStorage.getItem("demo_patients");
      const doctors = doctorsRaw ? JSON.parse(doctorsRaw) : [];
      const patients = patientsRaw ? JSON.parse(patientsRaw) : [];

      const doc = doctors.find((d: any) => d._id === receiverId);
      const pat = patients.find((p: any) => p._id === receiverId);

      const recName = recipientName || (doc ? doc.name : pat ? pat.name : "Custom User");
      const recipientRole = doc ? "Doctor" : pat ? "User" : "User";

      const newRoom: ChatRoom = {
        _id: `room-${Math.floor(Math.random() * 1000000)}`,
        participants: [
          { _id: "demo-admin-id-999", name: "Demo System Admin", role: "Admin" },
          { _id: receiverId, name: recName, role: recipientRole }
        ],
        createdAt: new Date().toISOString()
      };

      db.rooms.unshift(newRoom);
      saveDemoChatsDb({ rooms: db.rooms });
      return newRoom;
    }

    const userCtx = getLoggedUserContext();

    // 1. If Admin is starting a support chat (no doctorId): intercept and create/resolve a local support thread instead
    if (userCtx?.role === "Admin" && !doctorId) {
      const nameToUse = recipientName || "User";

      let localRooms = [];
      try {
        const res = await fetch("http://localhost:3001/api/support/rooms", { signal: AbortSignal.timeout(600) });
        if (res.ok) {
          localRooms = await res.json();
        }
      } catch (e) {
        localRooms = JSON.parse(localStorage.getItem("local_support_rooms") || "[]");
      }

      // Find if a support room already exists with this user as a participant
      let existing = localRooms.find((r: any) => r.participants?.some((p: any) => p._id === receiverId));
      if (existing) return existing;

      // Determine receiver role (Doctor vs Patient)
      const isDoc = receiverId.startsWith("doc-") || 
                    (recipientName && recipientName.toLowerCase().includes("dr")) ||
                    (localStorage.getItem("demo_doctors") || "").includes(receiverId);
      
      const prefix = isDoc ? "doc" : "pat";
      const supportRoomId = `local-support-${prefix}-${receiverId}`;
      const recRole = isDoc ? "Doctor" : "User";

      const newRoom: ChatRoom = {
        _id: supportRoomId,
        participants: [
          { _id: userCtx._id, name: "Admin", role: "Admin" },
          { _id: receiverId, name: nameToUse, role: recRole as any }
        ],
        createdAt: new Date().toISOString()
      };

      // Try to register on local relay server
      let registeredOnServer = false;
      try {
        await fetch("http://localhost:3001/api/support/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newRoom),
          signal: AbortSignal.timeout(600)
        });
        registeredOnServer = true;
      } catch (e) {}

      // Fallback/update localStorage
      const localRoomsRaw = localStorage.getItem("local_support_rooms") || "[]";
      const currentLocalRooms = JSON.parse(localRoomsRaw);
      if (!currentLocalRooms.some((r: any) => r._id === supportRoomId)) {
        currentLocalRooms.unshift(newRoom);
        localStorage.setItem("local_support_rooms", JSON.stringify(currentLocalRooms));
      }

      // Create initial automatic query message
      const welcomeMsg = {
        _id: `support-msg-${Date.now()}`,
        chatId: supportRoomId,
        senderId: receiverId,
        message: isDoc 
          ? `أهلاً بك يا أدمن، أنا الطبيب ${nameToUse}. أود التواصل بخصوص الدعم الفني واستفسارات المنصة.`
          : `أهلاً بك يا أدمن، أنا المريض ${nameToUse}. أواجه مشكلة في استخدام المنصة وأريد تقديم استفسار/شكوى.`,
        createdAt: new Date().toISOString()
      };

      try {
        await fetch("http://localhost:3001/api/support/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(welcomeMsg),
          signal: AbortSignal.timeout(600)
        });
      } catch (e) {
        const localMessagesRaw = localStorage.getItem("local_support_messages") || "[]";
        const localMessages = JSON.parse(localMessagesRaw);
        localMessages.push(welcomeMsg);
        localStorage.setItem("local_support_messages", JSON.stringify(localMessages));
      }

      return newRoom;
    }

    const payload: any = { receiverId };
    if (doctorId) {
      payload.doctorId = doctorId;
    } else {
      payload.doctorId = receiverId;
    }
    const response = await api.post<any>("/chat", payload);
    const res = response.data;
    
    let roomResult: ChatRoom | null = null;
    if (res?.data) {
      if (res.data.chat) roomResult = res.data.chat;
      else roomResult = res.data;
    } else if (res?.chat) {
      roomResult = res.chat;
    } else {
      roomResult = res;
    }

    // Register clinical room on relay server
    if (userCtx && userCtx.role !== "Admin" && roomResult && roomResult._id && !roomResult._id.startsWith("local-support-")) {
      try {
        fetch("http://localhost:3001/api/clinical/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(roomResult),
          signal: AbortSignal.timeout(500)
        }).catch(() => {});
      } catch (e) {}
    }

    return roomResult as ChatRoom;
  },

  sendMessage: async (chatId: string, message: string, image?: string): Promise<Message> => {
    if (isDemo()) {
      const db = getDemoChatsDb();
      const newMsg: Message = {
        _id: `msg-${Math.floor(Math.random() * 1000000)}`,
        chatId,
        senderId: "demo-admin-id-999",
        message,
        image,
        createdAt: new Date().toISOString()
      };

      db.messages.push(newMsg);
      
      // Update last message in the room preview
      db.rooms = db.rooms.map((r) => 
        r._id === chatId ? { ...r, lastMessage: { message, createdAt: newMsg.createdAt } } : r
      );

      saveDemoChatsDb({ rooms: db.rooms, messages: db.messages });
      return newMsg;
    }

    // Handle Local Support Room Messages
    if (chatId.startsWith("local-support-")) {
      const userCtx = getLoggedUserContext();
      const senderId = userCtx?._id || "admin-system-id";
      
      const newMsg: Message = {
        _id: `support-msg-${Date.now()}`,
        chatId,
        senderId,
        message,
        image,
        createdAt: new Date().toISOString()
      };

      let sentToServer = false;
      try {
        const res = await fetch("http://localhost:3001/api/support/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMsg),
          signal: AbortSignal.timeout(600)
        });
        sentToServer = res.ok;
      } catch (e) {}

      if (!sentToServer) {
        // LocalStorage Fallback
        const localMessagesRaw = localStorage.getItem("local_support_messages") || "[]";
        const localMessages = JSON.parse(localMessagesRaw);
        localMessages.push(newMsg);
        localStorage.setItem("local_support_messages", JSON.stringify(localMessages));

        const localRoomsRaw = localStorage.getItem("local_support_rooms") || "[]";
        const localRooms = JSON.parse(localRoomsRaw).map((r: any) => {
          if (r._id === chatId) {
            return { ...r, lastMessage: { message, createdAt: newMsg.createdAt } };
          }
          return r;
        });
        localStorage.setItem("local_support_rooms", JSON.stringify(localRooms));
      }

      // Simulate Admin reply if message sent by Patient/Doctor
      if (userCtx?.role !== "Admin") {
        setTimeout(async () => {
          const replyMsg: Message = {
            _id: `support-msg-admin-reply-${Date.now() + 1}`,
            chatId,
            senderId: "admin-system-id",
            message: "مرحباً، تم استلام شكواك/طلبك وجارٍ مراجعة التفاصيل وحل المشكلة في أقرب وقت. شكراً لتواصلك معنا.",
            createdAt: new Date().toISOString()
          };

          let replySentToServer = false;
          try {
            const res = await fetch("http://localhost:3001/api/support/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(replyMsg),
              signal: AbortSignal.timeout(600)
            });
            replySentToServer = res.ok;
          } catch (e) {}

          if (!replySentToServer) {
            const currentMsgs = JSON.parse(localStorage.getItem("local_support_messages") || "[]");
            currentMsgs.push(replyMsg);
            localStorage.setItem("local_support_messages", JSON.stringify(currentMsgs));

            const currentRooms = JSON.parse(localStorage.getItem("local_support_rooms") || "[]").map((r: any) => {
              if (r._id === chatId) {
                return { ...r, lastMessage: { message: replyMsg.message, createdAt: replyMsg.createdAt } };
              }
              return r;
            });
            localStorage.setItem("local_support_rooms", JSON.stringify(currentRooms));
          }
        }, 1500);
      }

      return newMsg;
    }

    const response = await api.post<any>(`/chat/${chatId}/message`, { text: message, image });
    const userCtx = getLoggedUserContext();
    const chat = response.data?.chat;
    const participantIds = getChatParticipantIds(chat);
    const lastMsg = chat?.messages?.[chat.messages.length - 1];
    const normalized = normalizeMessage(lastMsg, userCtx?.role, userCtx?._id, participantIds);
    if (normalized && !normalized.chatId) {
      normalized.chatId = chatId;
    }
    return normalized;
  },

  getChats: async (): Promise<ChatRoom[]> => {
    if (isDemo()) {
      const db = getDemoChatsDb();
      return db.rooms;
    }
    
    const userCtx = getLoggedUserContext();
    
    // Automatically trigger creation of support room for patient or doctor
    if (userCtx && userCtx.role !== "Admin") {
      ensureSupportRoomCreated(userCtx);
    }

    try {
      const response = await api.get<any>("/chat");
      const data = response.data?.data || response.data;
      let liveRooms: ChatRoom[] = [];
      
      if (Array.isArray(data)) liveRooms = data;
      else if (data && Array.isArray(data.chats)) liveRooms = data.chats;
      else if (data && Array.isArray(data.data)) liveRooms = data.data;

      // Extract local support rooms that belong to this user
      const localRoomsRaw = localStorage.getItem("local_support_rooms") || "[]";
      let localRooms = JSON.parse(localRoomsRaw);

      // Try fetching from local relay server first
      try {
        const res = await fetch("http://localhost:3001/api/support/rooms", { signal: AbortSignal.timeout(600) });
        if (res.ok) {
          localRooms = await res.json();
        }
      } catch (e) {}

      // Register clinical rooms on local relay server
      if (userCtx && userCtx.role !== "Admin") {
        liveRooms.forEach((room) => {
          try {
            fetch("http://localhost:3001/api/clinical/rooms", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(room),
              signal: AbortSignal.timeout(500)
            }).catch(() => {});
          } catch (e) {}
        });
      }

      if (userCtx) {
        if (userCtx.role === "Admin") {
          // Admin sees all local support rooms
          // Sync lastMessage for all local rooms
          localRooms = await Promise.all(localRooms.map(async (room: any) => {
            let localMessages = [];
            try {
              const res = await fetch(`http://localhost:3001/api/support/messages?chatId=${room._id}`, { signal: AbortSignal.timeout(600) });
              localMessages = await res.json();
            } catch (e) {
              const localMessagesRaw = localStorage.getItem("local_support_messages") || "[]";
              localMessages = JSON.parse(localMessagesRaw).filter((m: any) => m.chatId === room._id);
            }
            if (localMessages.length > 0) {
              const lastMsg = localMessages[localMessages.length - 1];
              return {
                ...room,
                lastMessage: {
                  message: lastMsg.message,
                  createdAt: lastMsg.createdAt
                }
              };
            }
            return room;
          }));
          
          // Also return clinical monitor rooms for admin if requested, but normally we separate them in the UI.
          // For getChats, returning both is fine or we can let Chat.tsx query them.
          return [...localRooms, ...liveRooms];
        } else {
          // Patient or Doctor sees only their own support room
          const supportRoomId = `local-support-${userCtx.role === "Doctor" ? "doc" : "pat"}-${userCtx._id}`;
          const mySupportRoom = localRooms.find((r: any) => r._id === supportRoomId);
          if (mySupportRoom) {
            let localMessages = [];
            try {
              const res = await fetch(`http://localhost:3001/api/support/messages?chatId=${supportRoomId}`, { signal: AbortSignal.timeout(600) });
              localMessages = await res.json();
            } catch (e) {
              const localMessagesRaw = localStorage.getItem("local_support_messages") || "[]";
              localMessages = JSON.parse(localMessagesRaw).filter((m: any) => m.chatId === supportRoomId);
            }
            if (localMessages.length > 0) {
              const lastMsg = localMessages[localMessages.length - 1];
              mySupportRoom.lastMessage = {
                message: lastMsg.message,
                createdAt: lastMsg.createdAt
              };
            }
            return [mySupportRoom, ...liveRooms];
          }
        }
      }

      return liveRooms;
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return chatService.getChats();
      }
      throw err;
    }
  },

  getChatMessages: async (chatId: string): Promise<Message[]> => {
    if (isDemo()) {
      const db = getDemoChatsDb();
      return db.messages.filter((m) => m.chatId === chatId);
    }

    // Handle Local Support Room Messages
    if (chatId.startsWith("local-support-")) {
      try {
        const res = await fetch(`http://localhost:3001/api/support/messages?chatId=${chatId}`, { signal: AbortSignal.timeout(600) });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {}
      
      const localMessagesRaw = localStorage.getItem("local_support_messages") || "[]";
      return JSON.parse(localMessagesRaw).filter((m: any) => m.chatId === chatId);
    }

    // Handle Clinical Monitor Rooms
    if (chatId.startsWith("monitor-room-")) {
      return getClinicalMonitorMessages(chatId);
    }

    try {
      const response = await api.get<any>(`/chat/${chatId}`);
      const data = response.data?.chat || response.data?.data || response.data || {};
      const rawList = data.messages || (Array.isArray(data) ? data : []);
      const userCtx = getLoggedUserContext();
      const participantIds = getChatParticipantIds(data);
      return rawList.map((m: any) => {
        const normalized = normalizeMessage(m, userCtx?.role, userCtx?._id, participantIds);
        if (normalized && !normalized.chatId) {
          normalized.chatId = chatId;
        }
        return normalized;
      }).filter(Boolean);
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("403")) {
        localStorage.setItem("demoMode", "true");
        return chatService.getChatMessages(chatId);
      }
      throw err;
    }
  },

  getClinicalMonitorRoomsList: async (): Promise<ChatRoom[]> => {
    // Try to fetch clinical rooms from local relay server
    try {
      const res = await fetch("http://localhost:3001/api/clinical/rooms", { signal: AbortSignal.timeout(600) });
      if (res.ok) {
        const rooms = await res.json();
        if (Array.isArray(rooms) && rooms.length > 0) {
          return rooms;
        }
      }
    } catch (e) {}
    
    // Fallback to dummy monitoring rooms
    return getClinicalMonitorRooms();
  },

  sendAIMessage: async (message: string, bodyPart: string = "general", chatId?: string): Promise<AIChatResponse> => {
    const lang = localStorage.getItem("lang") || "en";
    const isAr = lang === "ar";
    if (isDemo()) {
      if (isAr) {
        return { 
          reply: `مرحباً، أنا المساعد الطبي بالذكاء الاصطناعي. أنا أعمل حالياً في وضع التجربة المحاكي. تحليل المنطقة: ${bodyPart === "general" ? "عام" : bodyPart}.`,
          isLocal: true 
        };
      }
      return { 
        reply: `Hello, I am the AI Medical Assistant. I am currently running in simulated Demo Mode. Analyzing region: ${bodyPart}.`,
        isLocal: true
      };
    }
    try {
      const response = await api.post<any>("/aichat/message", { 
        message, 
        body_part: bodyPart,
        lang: lang,
        chatId: chatId
      }, { timeout: 15000 }); // 15s timeout for local LLM generation
      const res = response.data;
      
      let replyText = "";
      let reportData: any = null;
      if (res) {
        // 1. Try to extract localized content from root or aiReply
        const contentAr = res.contentAr || res.aiReply?.content_ar || res.aiReply?.contentAr;
        const contentEn = res.contentEn || res.aiReply?.content_en || res.aiReply?.contentEn;

        if (isAr && contentAr) {
          replyText = contentAr;
        } else if (!isAr && contentEn) {
          replyText = contentEn;
        }

        // 2. Check for report object
        const reportObj = res.report || res.aiReply?.report;
        if (reportObj) {
          reportData = reportObj;
          if (!replyText) {
            if (typeof reportObj === "string") {
              replyText = reportObj;
            } else {
              replyText = isAr 
                ? (reportObj.diagnosis_ar || "التقرير الطبي المبدئي") 
                : (reportObj.diagnosis_en || "Initial Diagnostic Report");
            }
          }
        }

        // 3. Fallback to general fields if still empty
        if (!replyText && res.aiReply) {
          if (typeof res.aiReply === "string") {
            replyText = res.aiReply;
          } else if (res.aiReply.reply) {
            replyText = res.aiReply.reply;
          } else if (res.aiReply.message) {
            replyText = res.aiReply.message;
          } else if (res.aiReply.text) {
            replyText = res.aiReply.text;
          } else if (res.aiReply.error) {
            replyText = `AI Assistant Error: ${res.aiReply.error}`;
          }
        }
        
        if (!replyText) {
          if (typeof res === "string") {
            replyText = res;
          } else if (res.reply) {
            replyText = res.reply;
          } else if (res.data) {
            if (typeof res.data === "string") {
              replyText = res.data;
            } else if (res.data.reply) {
              replyText = res.data.reply;
            } else if (res.data.message) {
              replyText = res.data.message;
            }
          } else if (res.message && res.message.toLowerCase() !== "success") {
            replyText = res.message;
          }
        }
      }
      
      if (!replyText) {
        throw new Error(isAr ? "لم يتم استلام رد صالح من خادم الذكاء الاصطناعي." : "No valid reply received from AI server.");
      }
      
      return { 
        reply: replyText, 
        isLocal: false,
        chatId: res?.chatId || res?.aiReply?.chatId,
        report: reportData
      };
    } catch (err: any) {
      console.error("sendAIMessage server error:", err);
      // Throw actual error so it is visible in the frontend chat console/interface
      throw err;
    }
  },
};
