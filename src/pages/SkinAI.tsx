import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { skinService, SkinAIResponse } from "../services/skinService";
import { 
  Upload, 
  Image as ImageIcon, 
  RefreshCw, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  FileImage,
  CheckCircle2,
  Trash2,
  CalendarCheck,
  Camera,
  X,
  FlipHorizontal,
  CameraOff
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const CLINICAL_DISEASE_DETAILS: Record<string, {
  description: string;
  risks: string[];
  recommendations: string[];
}> = {
  "melanoma": {
    description: "Melanoma is the most dangerous form of skin cancer. It develops in the cells (melanocytes) that produce melanin — the pigment that gives your skin its color. Melanoma can also form in your eyes and, rarely, inside your body. Early detection is critical, as melanoma can spread quickly to other organs if not treated early.",
    risks: [
      "Can spread (metastasize) to lymph nodes and other organs if not caught early",
      "One of the most deadly forms of skin cancer",
      "Risk factors include UV exposure, fair skin, family history, and many moles",
      "Survival rate drops significantly at advanced stages",
      "Can develop from an existing mole or appear as a new dark spot"
    ],
    recommendations: [
      " Seek URGENT medical evaluation — early diagnosis is critical for survival",
      "Do NOT delay — contact a dermatologist or oncologist immediately",
      "Avoid all UV exposure (sun and tanning beds) completely",
      "If diagnosed, treatment may include surgery, immunotherapy, or targeted therapy",
      "Inform close family members to get checked, as there is a hereditary component",
      "Support groups and mental health resources are available for cancer patients"
    ]
  },
  "dermatofibroma": {
    description: "Dermatofibroma is a common, benign (non-cancerous) skin growth that appears as a small, firm, red-to-brown bump, most commonly on the legs. They are harmless, asymptomatic, and persist indefinitely. They are caused by a reactive proliferation of fibroblasts, typically triggered by minor skin trauma like insect bites or minor cuts.",
    risks: [
      "Extremely low risk — benign skin lesion that does not become cancerous",
      "May cause minor discomfort, itching, or tenderness if bumped or shaved over",
      "Can be cosmetically undesirable due to hyperpigmentation"
    ],
    recommendations: [
      "No treatment is necessary in most cases as they are completely harmless",
      "Visit a dermatologist if it grows rapidly, bleeds, or changes color",
      "Can be surgically removed or frozen with liquid nitrogen if causing irritation"
    ]
  },
  "benign keratosis-like lesions": {
    description: "Benign Keratosis-like Lesions (such as Seborrheic Keratosis) are non-cancerous skin growths that are common in older adults. They typically appear as waxy, scaly, or 'stuck-on' raised spots on the face, chest, shoulders, or back. They are harmless and not contagious, though they can sometimes resemble skin cancer.",
    risks: [
      "Completely benign and do not turn into skin cancer",
      "Can become irritated, itchy, or bleed if rubbed against clothing",
      "Multiple lesions may appear over time, causing cosmetic concerns"
    ],
    recommendations: [
      "Generally require no treatment unless they become irritated or cosmetically problematic",
      "Dermatologists can remove them using cryotherapy (freezing), curettage, or laser therapy",
      "Get any new or rapidly changing spot checked by a professional to ensure it is not malignant"
    ]
  },
  "melanocytic nevi (moles)": {
    description: "Melanocytic Nevi, commonly known as moles, are benign skin growths caused by a cluster of pigmented cells (melanocytes). Most moles appear during childhood and adolescence. While most moles are completely harmless, changes in a mole's size, shape, or color can be a warning sign of melanoma.",
    risks: [
      "Usually benign, but atypical moles (dysplastic nevi) have a higher risk of turning into melanoma",
      "Increased risk of malignancy if subject to chronic sun exposure or severe sunburns"
    ],
    recommendations: [
      "Monitor moles regularly using the ABCDE guide (Asymmetry, Border, Color, Diameter, Evolving)",
      "Schedule annual skin examinations with a dermatologist, especially if you have many moles",
      "Apply broad-spectrum sunscreen daily and avoid excessive sun exposure"
    ]
  },
  "actinic keratoses": {
    description: "Actinic Keratosis is a rough, scaly patch on the skin that develops from years of sun exposure. It is most commonly found on the sun-exposed areas like face, lips, ears, scalp, neck, or back of the hands. It is classified as a precancerous skin lesion that can lead to Squamous Cell Carcinoma if left untreated.",
    risks: [
      "Precancerous condition: can progress to Squamous Cell Carcinoma (a type of skin cancer) if untreated",
      "Indicator of significant cumulative UV damage to the skin"
    ],
    recommendations: [
      "Medical treatment is highly recommended to prevent progression to cancer",
      "Treatments include cryotherapy, topical prescription creams (like 5-fluorouracil), or photodynamic therapy",
      "Strict sun protection is essential: use SPF 30+ sunscreen, wear hats, and avoid peak sun hours"
    ]
  },
  "basal cell carcinoma": {
    description: "Basal Cell Carcinoma (BCC) is the most common type of skin cancer. It typically develops on sun-exposed areas of the skin, such as the head and neck. It often appears as a slightly shiny, pearly bump, a pink patch, or a sore that doesn't heal. It grows slowly and rarely spreads to other parts of the body.",
    risks: [
      "Locally destructive: can invade surrounding tissue, bone, and nerves if left untreated",
      "High rate of local recurrence if not completely removed"
    ],
    recommendations: [
      "Seek medical treatment promptly; excision is highly successful",
      "Treatments include surgical excision, Mohs surgery, curettage and electrodesiccation, or radiation",
      "Perform monthly skin self-exams and consult a dermatologist for any suspicious new sores or bumps"
    ]
  },
  "vascular lesions": {
    description: "Vascular Lesions are relatively common skin growths containing abnormally dense clusters of blood vessels. Examples include cherry angiomas, hemangiomas, and port-wine stains. Most are congenital or develop with age and are completely benign, though some can bleed if injured.",
    risks: [
      "Almost always benign and do not pose a threat of malignancy",
      "May bleed easily if scratched, bumped, or traumatized"
    ],
    recommendations: [
      "No treatment is needed unless for cosmetic preference or if they bleed frequently",
      "Options for removal include laser therapy, electrocautery, or cryosurgery",
      "Consult a doctor if a vascular spot grows rapidly or changes character"
    ]
  }
};

export const SkinAI: React.FC = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  
  // File Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SkinAIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  
  // Camera/Webcam states
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [startingCamera, setStartingCamera] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(lang === "ar" ? "يرجى اختيار ملف صورة صالح فقط." : "Please select a valid image file only.");
      return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(lang === "ar" ? "حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت." : "Image size is too large. Maximum size is 10MB.");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Webcam Stream Controls
  const startCamera = async (deviceId?: string) => {
    setStartingCamera(true);
    setCameraError(null);
    stopCameraStream(); // Stop any active streams first
    setIsCameraOpen(true);

    // Wait for the render loop to mount the video element in the DOM
    setTimeout(async () => {
      try {
        // 1. Request initial permissions and stream
        const constraints: MediaStreamConstraints = {
          video: deviceId 
            ? { deviceId: { exact: deviceId } } 
            : { facingMode: "environment" } // Prefer back camera on mobile
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // 2. Discover available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        setAvailableCameras(videoDevices);
        
        // Select currently active camera ID
        if (!deviceId && videoDevices.length > 0) {
          // Try to match the active track's settings
          const activeTrack = stream.getVideoTracks()[0];
          const settings = activeTrack?.getSettings();
          if (settings?.deviceId) {
            setActiveCameraId(settings.deviceId);
          } else {
            setActiveCameraId(videoDevices[0].deviceId);
          }
        } else if (deviceId) {
          setActiveCameraId(deviceId);
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        setCameraError(
          lang === "ar" 
            ? "لم يتم العثور على كاميرات متصلة أو تم رفض إذن الوصول للكاميرا." 
            : "Camera not found or camera access permission denied."
        );
      } finally {
        setStartingCamera(false);
      }
    }, 80);
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const handleSwitchCamera = async () => {
    if (availableCameras.length <= 1) return;
    
    // Find index of active camera and select the next one
    const currentIndex = availableCameras.findIndex(c => c.deviceId === activeCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];
    
    if (nextCamera) {
      await startCamera(nextCamera.deviceId);
    }
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    // Create a temporary canvas matching the video stream resolution
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Capture the current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to jpeg blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `captured_lesion_${Date.now()}.jpg`, { type: "image/jpeg" });
        setSelectedFile(file);
        
        // Setup image preview
        const previewUrl = URL.createObjectURL(blob);
        setImagePreview(previewUrl);
        setResult(null);
        setError(null);
        
        // Shut down camera
        handleCloseCamera();
        toast.success(lang === "ar" ? "تم التقاط الصورة بنجاح!" : "Photo captured successfully!");
      }
    }, "image/jpeg", 0.95);
  };

  // API Call Execution
  const handleAnalyze = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await skinService.predictSkinCondition(selectedFile);
      
      // Enrich response details if they are empty or truncated (ends with .. or ...)
      if (response && response.data) {
        const predictedClassLower = response.data.predicted_class.toLowerCase();
        const enrichment = CLINICAL_DISEASE_DETAILS[predictedClassLower] || 
                           Object.entries(CLINICAL_DISEASE_DETAILS).find(([key]) => predictedClassLower.includes(key))?.[1];
        
        if (enrichment) {
          const isDescriptionTruncated = 
            !response.data.description ||
            response.data.description.length < 120 ||
            response.data.description.trim().endsWith("..") || 
            response.data.description.trim().endsWith("...");
            
          if (isDescriptionTruncated) {
            response.data.description = enrichment.description;
          }
          
          if (!response.data.risks || response.data.risks.length === 0) {
            response.data.risks = enrichment.risks;
          }
          
          if (!response.data.recommendations || response.data.recommendations.length === 0) {
            response.data.recommendations = enrichment.recommendations;
          }
        }
      }
      
      setResult(response);
      toast.success(lang === "ar" ? "تم إتمام التحليل بنجاح!" : "Analysis completed successfully!");
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || (lang === "ar" ? "فشل الاتصال بخدمة التحليل الطبية." : "Failed to connect to the medical diagnostic service.");
      setError(errMsg);
      toast.error(lang === "ar" ? "حدث خطأ أثناء معالجة الصورة." : "An error occurred during image processing.");
    } finally {
      setLoading(false);
    }
  };

  // Determine badge color based on predicted class severity
  const getSeverityStyles = (predictedClass: string) => {
    const name = predictedClass.toLowerCase();
    if (name.includes("melanoma") || name.includes("melonoma") || name.includes("carcinoma") || name.includes("malignant")) {
      return {
        bg: "bg-red-500/10 border-red-500/30 text-red-500 dark:text-red-400",
        glow: "shadow-red-500/10",
        label: lang === "ar" ? "خطير / يتطلب استشارة فورية" : "Malignant / Immediate Action Recommended"
      };
    }
    return {
      bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 dark:text-emerald-400",
      glow: "shadow-emerald-500/10",
      label: lang === "ar" ? "حميد / للمتابعة الدورية" : "Benign / Normal Follow-up"
    };
  };

  // Format predicted class name for user
  const formatClassName = (name: string) => {
    if (name.toLowerCase() === "melonoma" || name.toLowerCase() === "melanoma") {
      return lang === "ar" ? "ميلانوما (سرطان الخلايا الصبغية)" : "Melanoma";
    }
    return name;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {lang === "ar" ? "محلل الجلد الذكي بالذكاء الاصطناعي" : "Dermatological AI Analyzer"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {lang === "ar" 
              ? "ارفع صورة واضحة ومقربة للإصابة أو الشامة الجلدية للحصول على تحليل فوري باستخدام خوارزميات التعلم العميق." 
              : "Upload a clear close-up image of a mole or skin lesion for instant deep learning analysis."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Upload Zone */}
        <div className={`space-y-4 ${result ? "lg:col-span-5" : "lg:col-span-12"} transition-all duration-300`}>
          <div className="glass-panel p-6 rounded-2xl border shadow-sm space-y-4 relative overflow-hidden">
            <h3 className="font-bold text-sm text-primary flex items-center gap-1.5 border-b pb-2">
              <Upload className="h-4 w-4" /> {lang === "ar" ? "إدخال صورة الإصابة" : "Lesion Photo Input"}
            </h3>

            {/* Standard Upload & Camera Buttons */}
            {!imagePreview && !isCameraOpen && (
              <div className="space-y-4">
                {/* Drag & Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className={`
                    border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 min-h-[220px]
                    ${isDragOver 
                      ? "border-primary bg-primary/5 scale-[0.99]" 
                      : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/30"}
                  `}
                >
                  <div className="p-4 bg-primary/10 rounded-full text-primary">
                    <ImageIcon className="h-8 w-8 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-semibold text-xs text-foreground">
                      {lang === "ar" ? "اضغط هنا للاختيار أو اسحب الصورة وأفلتها" : "Click to browse or drag and drop image"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {lang === "ar" ? "ملفات PNG, JPG أو JPEG حتى 10 ميجابايت" : "PNG, JPG or JPEG up to 10MB"}
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Direct Webcam Capture Button */}
                <button
                  onClick={() => startCamera()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl text-xs active:scale-95 transition-all border shadow-sm"
                >
                  <Camera className="h-4.5 w-4.5 text-primary" />
                  <span>{lang === "ar" ? "التقاط صورة كاميرا مباشرة" : "Take Live Camera Photo"}</span>
                </button>
              </div>
            )}

            {/* Live Camera Capture Interface */}
            {isCameraOpen && (
              <div className="relative border rounded-xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center min-h-[300px]">
                {startingCamera && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white text-xs bg-black/90 z-10">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                    <span>{lang === "ar" ? "جاري تشغيل الكاميرا..." : "Accessing camera..."}</span>
                  </div>
                )}

                {cameraError ? (
                  <div className="flex flex-col items-center gap-3 text-red-400 p-6 text-center text-xs">
                    <CameraOff className="h-8 w-8" />
                    <p>{cameraError}</p>
                    <button
                      onClick={handleCloseCamera}
                      className="px-4 py-1.5 bg-muted hover:bg-muted/80 text-foreground border rounded-lg font-bold"
                    >
                      {lang === "ar" ? "إغلاق" : "Close"}
                    </button>
                  </div>
                ) : (
                  /* Stream Active View */
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Target Circle Overlaid Guide */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-40 h-40 rounded-full border-4 border-dashed border-sky-400/70 bg-sky-400/5 animate-pulse flex items-center justify-center">
                        <span className="text-[9px] text-sky-200 font-bold bg-slate-900/60 px-2 py-0.5 rounded-full select-none text-center max-w-[120px]">
                          {lang === "ar" ? "ضع الإصابة بالداخل" : "Place spot here"}
                        </span>
                      </div>
                    </div>

                    {/* Close Camera button */}
                    <button
                      onClick={handleCloseCamera}
                      className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors active:scale-95 shadow-md z-20"
                      title={lang === "ar" ? "إغلاق الكاميرا" : "Close Camera"}
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>

                    {/* Camera Control overlays */}
                    <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 px-4 z-20">
                      {availableCameras.length > 1 && (
                        <button
                          onClick={handleSwitchCamera}
                          className="p-2.5 bg-slate-800/80 hover:bg-slate-800 text-white rounded-full border border-slate-700 active:scale-95 transition-all shadow-md"
                          title={lang === "ar" ? "تبديل الكاميرا" : "Switch Camera"}
                        >
                          <FlipHorizontal className="h-4.5 w-4.5" />
                        </button>
                      )}
                      
                      <button
                        onClick={handleCapturePhoto}
                        className="p-4 bg-primary text-primary-foreground hover:bg-primary/95 rounded-full border-4 border-white active:scale-90 transition-all shadow-xl hover:shadow-primary/30"
                        title={lang === "ar" ? "التقاط الصورة" : "Capture Photo"}
                      >
                        <Camera className="h-6 w-6" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Image Selected Preview */}
            {imagePreview && !isCameraOpen && (
              <div className="space-y-4">
                <div className="relative border rounded-xl overflow-hidden bg-muted/30 max-h-[300px] flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Skin Lesion Preview"
                    className="max-h-[300px] object-contain w-full"
                  />
                  {!loading && (
                    <button
                      onClick={handleClear}
                      className="absolute top-3 right-3 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors active:scale-95 shadow-md"
                      title={lang === "ar" ? "حذف الصورة" : "Remove Image"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Selected File Details */}
                <div className="flex items-center gap-2 p-3 bg-muted/30 border rounded-lg text-xs">
                  <FileImage className="h-4.5 w-4.5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-[11px]">{selectedFile?.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) : 0} MB
                    </p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>

                {/* Actions */}
                {!result && (
                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/95 disabled:bg-primary/50 text-primary-foreground font-semibold rounded-xl text-xs active:scale-95 transition-all shadow-md shadow-primary/20"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>{lang === "ar" ? "جاري معالجة وتحليل الأنسجة..." : "Analyzing tissue sample..."}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <span>{lang === "ar" ? "بدء التشخيص الذكي" : "Run AI Diagnostics"}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-start gap-2 text-xs">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{lang === "ar" ? "خطأ في الاتصال:" : "Connection Error:"}</span>
                  <p className="mt-0.5 text-[11px] leading-relaxed">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Diagnosis Report Result */}
        {result && (
          <div className="lg:col-span-7 space-y-6 animate-in fade-in duration-300">
            <div className="glass-panel p-6 rounded-2xl border shadow-sm space-y-5">
              <h3 className="font-bold text-sm text-primary flex items-center gap-1.5 border-b pb-2">
                <ShieldAlert className="h-4.5 w-4.5" /> {lang === "ar" ? "تقرير التشخيص والتحليل الطبي" : "Diagnostic Pathology Report"}
              </h3>

              {/* Main Pathology Result Row */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b">
                {/* Radial Gauge for Confidence */}
                <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      className="stroke-muted-foreground/10"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      className="stroke-primary"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * result.data.confidence) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-black text-foreground">{result.data.confidence.toFixed(1)}%</span>
                    <span className="text-[8px] text-muted-foreground font-bold tracking-wider uppercase">
                      {lang === "ar" ? "اليقين" : "Confidence"}
                    </span>
                  </div>
                </div>

                {/* Classification Details */}
                <div className="flex-1 space-y-1.5 text-center sm:text-left rtl:sm:text-right">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    {lang === "ar" ? "التصنيف المقدر" : "Estimated Classification"}
                  </span>
                  <h4 className="font-black text-xl text-foreground text-left sm:text-left rtl:text-left" dir="ltr">
                    {formatClassName(result.data.predicted_class)}
                  </h4>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getSeverityStyles(result.data.predicted_class).bg}`}>
                      {getSeverityStyles(result.data.predicted_class).label}
                    </span>
                    {result.data.predicted_class_index !== null && result.data.predicted_class_index !== undefined && (
                      <span className="px-2 py-0.5 rounded-full bg-muted border text-muted-foreground text-[10px]">
                        Index: {result.data.predicted_class_index}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description Card */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                  {lang === "ar" ? "الوصف السريري التفصيلي" : "Detailed Clinical Description"}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed p-4 bg-muted/20 border rounded-xl text-left" dir="ltr">
                  {result.data.description}
                </p>
              </div>

              {/* Risks Section */}
              {result.data.risks && result.data.risks.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">
                    {lang === "ar" ? "المخاطر والتنبيهات المترتبة" : "Associated Clinical Risks"}
                  </span>
                  <div className="space-y-2">
                    {result.data.risks.map((risk, index) => (
                      <div key={index} className="flex items-start gap-2.5 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs text-rose-600 dark:text-rose-400 text-left" dir="ltr">
                        <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-rose-500" />
                        <p className="leading-relaxed text-[11px]">{risk}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations Section */}
              {result.data.recommendations && result.data.recommendations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">
                    {lang === "ar" ? "الإجراءات والتوصيات الطبية الموصى بها" : "Clinical Action Recommendations"}
                  </span>
                  <div className="space-y-2">
                    {result.data.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-xs text-blue-600 dark:text-blue-400 text-left" dir="ltr">
                        <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5 text-blue-500" />
                        <p className="leading-relaxed text-[11px]">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Probability Breakdown Section */}
              {result.data.all_probabilities && result.data.all_probabilities.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">
                    {lang === "ar" ? "احتمالات التحليل التفصيلية" : "Pathology Probability Breakdown"}
                  </span>
                  <div className="space-y-2.5 p-4 bg-muted/20 border rounded-xl" dir="ltr">
                    {result.data.all_probabilities.map((prob, idx) => (
                      <div key={idx} className="space-y-1 text-left">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-muted-foreground">{prob.class_name}</span>
                          <span className="text-foreground font-semibold">{prob.confidence.toFixed(2)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              prob.confidence > 50 
                                ? "bg-primary" 
                                : prob.confidence > 10 
                                  ? "bg-sky-400" 
                                  : "bg-muted-foreground/30"
                            }`}
                            style={{ width: `${prob.confidence}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clinical Action Recommendation footer */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleClear}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border hover:bg-muted font-bold rounded-xl text-xs active:scale-95 transition-all"
                >
                  <RefreshCw className="h-4 w-4" /> {lang === "ar" ? "اختبار صورة أخرى" : "Test Another Image"}
                </button>
                <button
                  onClick={() => navigate("/patient/doctors")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs active:scale-95 transition-all shadow-md shadow-sky-500/15"
                >
                  <CalendarCheck className="h-4 w-4" /> {lang === "ar" ? "حجز استشارة طبيب جلدية" : "Book Dermatologist Consult"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
