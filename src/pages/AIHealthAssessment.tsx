import React, { useState, useEffect } from "react";
import { assessmentService } from "../services/assessmentService";
import { chatService, generateLocalAIResponse } from "../services/chatService";
import { 
  BrainCircuit, 
  HelpCircle, 
  Sparkles, 
  Send, 
  Loader2, 
  CheckCircle, 
  MessageSquare,
  AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";

interface AIMessage {
  sender: "user" | "ai";
  text: string;
  type?: "welcome" | "focus" | "local_ai" | "report";
  bodyPart?: string;
  userMessage?: string;
  reportData?: any;
}

const formatReport = (report: any, isAr: boolean): string => {
  if (!report) return "";
  
  const diagnosis = isAr ? report.diagnosis_ar : report.diagnosis_en;
  const severity = report.severity;
  const specialist = isAr ? report.specialist_ar : report.specialist_en;
  const summary = isAr ? report.summary_ar : report.summary_en;
  const immediateActions = isAr ? report.immediate_actions_ar : report.immediate_actions_en;
  const lifestyleAdvice = isAr ? report.lifestyle_advice_ar : report.lifestyle_advice_en;
  const followUp = isAr ? report.follow_up_ar : report.follow_up_en;
  
  let formatted = "";
  
  if (isAr) {
    formatted += `🏥 التقرير الطبي التشخيصي:\n\n`;
    if (diagnosis) formatted += `• التشخيص المبدئي: ${diagnosis}\n`;
    if (severity) {
      let severityLabel = severity;
      if (severity.toLowerCase() === "low") severityLabel = "منخفضة";
      else if (severity.toLowerCase() === "medium") severityLabel = "متوسطة";
      else if (severity.toLowerCase() === "severe" || severity.toLowerCase() === "high") severityLabel = "مرتفعة / خطيرة ⚠️";
      formatted += `• درجة خطورة الأعراض: ${severityLabel}\n`;
    }
    if (specialist) formatted += `• التخصص الموصى به: ${specialist}\n`;
    if (summary) formatted += `• ملخص الحالة: ${summary}\n`;
    if (followUp) formatted += `• المتابعة: ${followUp}\n`;
    
    if (immediateActions && Array.isArray(immediateActions) && immediateActions.length > 0) {
      formatted += `\n🚨 الإجراءات العاجلة المطلوبة:\n`;
      immediateActions.forEach(action => {
        formatted += `- ${action}\n`;
      });
    }
    
    if (lifestyleAdvice && Array.isArray(lifestyleAdvice) && lifestyleAdvice.length > 0) {
      formatted += `\n💡 نصائح وإرشادات صحية:\n`;
      lifestyleAdvice.forEach(advice => {
        formatted += `- ${advice}\n`;
      });
    }
  } else {
    formatted += `🏥 Clinical Diagnostic Report:\n\n`;
    if (diagnosis) formatted += `• Initial Impression: ${diagnosis}\n`;
    if (severity) formatted += `• Severity Level: ${severity.toUpperCase()}\n`;
    if (specialist) formatted += `• Recommended Specialist: ${specialist}\n`;
    if (summary) formatted += `• Case Summary: ${summary}\n`;
    if (followUp) formatted += `• Follow-Up Guidance: ${followUp}\n`;
    
    if (immediateActions && Array.isArray(immediateActions) && immediateActions.length > 0) {
      formatted += `\n🚨 Immediate Actions Required:\n`;
      immediateActions.forEach(action => {
        formatted += `- ${action}\n`;
      });
    }
    
    if (lifestyleAdvice && Array.isArray(lifestyleAdvice) && lifestyleAdvice.length > 0) {
      formatted += `\n💡 Lifestyle & Wellness Advice:\n`;
      lifestyleAdvice.forEach(advice => {
        formatted += `- ${advice}\n`;
      });
    }
  }
  
  return formatted.trim();
};

export const AIHealthAssessment: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"quiz" | "chat">("quiz");
  const { t, lang } = useLanguage();
  
  // Quiz states
  const [answers, setAnswers] = useState<Record<string, string>>({
    q1: "",
    q2: "",
    q3: "",
  });
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<any | null>(null);

  // Chat states
  const [chatMessages, setChatMessages] = useState<AIMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>("general");
  const [aiChatId, setAiChatId] = useState<string | null>(null);

  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([
        { sender: "ai", text: "", type: "welcome" }
      ]);
    }
  }, [chatMessages.length]);

  const bodyParts = [
    { id: "general", label: "General / عام", icon: "✨" },
    { id: "head", label: "Head / الرأس", icon: "🧠" },
    { id: "chest", label: "Chest / الصدر", icon: "🫁" },
    { id: "abdomen", label: "Abdomen / البطن", icon: "🍏" },
    { id: "back", label: "Back / الظهر", icon: "🧍" },
    { id: "limbs", label: "Limbs / الأطراف", icon: "🦵" },
  ];

  const handleBodyPartChange = (partId: string) => {
    setSelectedBodyPart(partId);
    setAiChatId(null);
    setChatMessages(prev => [
      ...prev,
      { sender: "ai", text: "", type: "focus", bodyPart: partId }
    ]);
  };

  const quizQuestions = [
    {
      id: "q1",
      question: t("Are you experiencing persistent headaches?"),
      options: [
        { label: t("No headaches"), value: "None", score: 0 },
        { label: t("Mild / Intermittent headaches"), value: "Mild/Intermittent", score: 2 },
        { label: t("Constant / Severe headaches"), value: "Constant/Severe", score: 4 }
      ]
    },
    {
      id: "q2",
      question: t("Do you have difficulty breathing during daily tasks?"),
      options: [
        { label: t("No breathing difficulties"), value: "None", score: 0 },
        { label: t("Occasional chest tightness"), value: "Occasional tightness", score: 2 },
        { label: t("Severe shortness of breath"), value: "Severe tightness", score: 5 }
      ]
    },
    {
      id: "q3",
      question: t("Have you recorded an elevated body temperature?"),
      options: [
        { label: t("Normal body temperature (<37°C)"), value: "Normal", score: 0 },
        { label: t("Low-grade fever (37°C - 38°C)"), value: "Low-grade fever", score: 2 },
        { label: t("High-grade fever (>38°C)"), value: "High-grade fever", score: 4 }
      ]
    }
  ];

  const handleSelectOption = (qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleCalculateScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(answers).some(a => a === "")) {
      toast.error("Please answer all questions");
      return;
    }

    setSubmittingQuiz(true);
    try {
      // Calculate total score based on questions
      let score = 0;
      quizQuestions.forEach(q => {
        const option = q.options.find(o => o.value === answers[q.id]);
        if (option) score += option.score;
      });

      // Get AI advice based on score
      let recommendation = "";
      if (score >= 8) {
        recommendation = t("Emergency Warning: Your symptoms score indicates potential health distress. We recommend scheduling an immediate clinical visit or contacting emergency services.");
      } else if (score >= 4) {
        recommendation = t("Clinical Advice: You have mild to moderate symptoms. We suggest booking a virtual consultation with a general practitioner and tracking daily symptoms.");
      } else {
        recommendation = t("Wellness Advice: Your health indices look stable. Continue to stay hydrated, ensure proper rest, and eat balanced meals.");
      }

      // Format answers as array of objects containing question text and answer value
      const formattedAnswers = quizQuestions.map((q) => ({
        question: q.question,
        answer: answers[q.id],
      }));

      const response = await assessmentService.submitAssessment({
        selectedArea: "general",
        answers: formattedAnswers,
      });

      // Merge backend payload with local score calculations to support UI displays
      setQuizResult({
        ...response,
        score,
        aiRecommendation: recommendation,
      });
      toast.success(t("AI Diagnostic Assessment saved successfully!"));
    } catch (err: any) {
      toast.error(err.message || t("Failed to submit assessment"));
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setSendingChat(true);

    try {
      const response = await chatService.sendAIMessage(userMsg, selectedBodyPart, aiChatId || undefined);
      if (response.chatId) {
        setAiChatId(response.chatId);
      }
      setChatMessages(prev => [
        ...prev,
        { 
          sender: "ai", 
          text: response.reply, 
          type: response.report ? "report" : (response.isLocal ? "local_ai" : undefined),
          userMessage: userMsg,
          bodyPart: selectedBodyPart,
          reportData: response.report
        }
      ]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { sender: "ai", text: `AI Assistant Error: ${err.message || "Failed to communicate with diagnostic servers. Please check your connection."}` }]);
    } finally {
      setSendingChat(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("AI Diagnostic Center")}</h2>
        <p className="text-sm text-muted-foreground">{t("Self-assess health severity or converse with our AI medical assistant")}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto gap-4">
        <button
          onClick={() => setActiveTab("quiz")}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "quiz" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <HelpCircle className="h-4.5 w-4.5" /> {t("AI Health Assessment Quiz")}
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "chat" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-4.5 w-4.5" /> {t("AI Medical Chatbot")}
        </button>
      </div>

      {/* Quiz tab */}
      {activeTab === "quiz" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border shadow-sm space-y-6">
            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary animate-pulse" /> {t("Diagnostic Self-Assessment")}
            </h3>

            {!quizResult ? (
              <form onSubmit={handleCalculateScore} className="space-y-6">
                {quizQuestions.map((q) => (
                  <div key={q.id} className="space-y-3">
                    <h4 className="font-semibold text-xs text-foreground">{q.question}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectOption(q.id, opt.value)}
                          className={`px-3 py-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                            answers[q.id] === opt.value
                              ? "bg-primary border-primary text-primary-foreground shadow"
                              : "bg-background border-muted hover:border-slate-500"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={submittingQuiz}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-6 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:shadow active:scale-95 transition-all disabled:opacity-55"
                >
                  {submittingQuiz && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("Generate AI Diagnostic Recommendation")}
                </button>
              </form>
            ) : (
              <div className="space-y-6 text-center py-6 animate-in fade-in zoom-in-95 duration-250">
                <div className="flex justify-center text-emerald-500">
                  <CheckCircle className="h-16 w-16" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-base">{t("Assessment Score:")} {quizResult.score}</h4>
                  <div className="inline-block px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs rounded-full font-bold">
                    {t("Risk level:")} {quizResult.score >= 8 ? t("High") : quizResult.score >= 4 ? t("Medium") : t("Low")}
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-muted/20 text-left text-xs space-y-2 max-w-md mx-auto leading-relaxed">
                  <h5 className="font-bold flex items-center gap-1.5 text-primary">
                    <Sparkles className="h-4.5 w-4.5" /> {t("AI Recommendation")}
                  </h5>
                  <p className="text-muted-foreground">{quizResult.aiRecommendation}</p>
                </div>

                <button
                  onClick={() => {
                    setQuizResult(null);
                    setAnswers({ q1: "", q2: "", q3: "" });
                  }}
                  className="inline-flex py-2 px-5 bg-background border hover:bg-muted text-foreground font-semibold rounded-xl text-xs"
                >
                  {t("Restart Assessment")}
                </button>
              </div>
            )}
          </div>

          {/* Left panel warning alerts */}
          <div className="glass-panel p-6 rounded-2xl border shadow-sm flex flex-col justify-center text-muted-foreground gap-4">
            <AlertTriangle className="h-8 w-8 text-amber-500 animate-bounce" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">{t("Important Medical Notice")}</h4>
            <p className="text-xs leading-relaxed">
              {t("These self-assessment quizzes are generated by algorithmic automation. They represent diagnostic guidance metrics, not absolute clinical prescriptions. Always coordinate care with a verified clinical physician.")}
            </p>
          </div>
        </div>
      )}

      {/* Chat tab */}
      {activeTab === "chat" && (
        <div className="glass-panel rounded-2xl p-6 border shadow-sm h-[60vh] flex flex-col justify-between">
          {/* Header & Body Part Selector */}
          <div className="border-b pb-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <div>
                <h4 className="font-semibold text-xs">{t("AI Medical Assisting Bot")}</h4>
                <span className="text-[10px] text-muted-foreground">{t("Select a body area focus below to refine AI diagnosis")}</span>
              </div>
            </div>

            {/* Premium Selector Pills */}
            <div className="flex flex-wrap gap-1">
              {bodyParts.map((part) => (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => handleBodyPartChange(part.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 active:scale-95 ${
                    selectedBodyPart === part.id
                      ? "bg-primary/15 border-primary/30 text-primary shadow-sm"
                      : "bg-background border-muted hover:border-slate-400 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{part.icon}</span>
                  <span>{lang === "ar" ? part.label.split(" / ")[1] : part.label.split(" / ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message feed */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
            {chatMessages.map((msg, index) => {
              let messageText = msg.text;
              if (msg.type === "welcome") {
                messageText = t("Hello! I am your AI Medical Assistant. Please describe any symptoms or wellness concerns you have, and I will offer guidance.");
              } else if (msg.type === "focus" && msg.bodyPart) {
                const partObj = bodyParts.find(p => p.id === msg.bodyPart);
                if (lang === "ar") {
                  const partLabelAr = partObj ? partObj.label.split(" / ")[1] : msg.bodyPart;
                  messageText = `[تم تغيير التركيز الطبي إلى: ${partLabelAr}] كيف يمكنني مساعدتك بشأن الأعراض أو الأسئلة المتعلقة بهذه المنطقة؟`;
                } else {
                  const partLabelEn = partObj ? partObj.label.split(" / ")[0] : msg.bodyPart;
                  messageText = `[Medical Focus Switched to: ${partLabelEn}] How can I assist you with symptoms or questions related to this area?`;
                }
              } else if (msg.type === "local_ai" && msg.userMessage && msg.bodyPart) {
                messageText = generateLocalAIResponse(msg.userMessage, msg.bodyPart);
              } else if (msg.type === "report" && msg.reportData) {
                messageText = formatReport(msg.reportData, lang === "ar");
              }

              return (
                <div
                  key={index}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none shadow"
                        : "bg-muted text-foreground rounded-tl-none border"
                    }`}
                  >
                    {messageText}
                  </div>
                </div>
              );
            })}
            {sendingChat && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground p-3.5 rounded-2xl rounded-tl-none border flex items-center gap-1">
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" />
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Input control */}
          <form onSubmit={handleSendChatMessage} className="flex gap-2">
            <input
              type="text"
              required
              disabled={sendingChat}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={t("Ask medical inquiries (e.g. What are symptoms of iron deficiency?)...")}
              className="flex-1 px-4 py-2.5 bg-background border rounded-xl text-xs focus:outline-none focus:border-primary transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sendingChat || !chatInput.trim()}
              className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:shadow hover:shadow-primary/25 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
