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
                  {lang === "ar" ? "التقاط صورة كاميرا مباشرة" : "Take Live Camera Photo"}
                </button>
              </div>
            )}

            {/* Live Camera Capture Interface */}
            {isCameraOpen && (
              <div className="relative border rounded-xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center min-h-[300px]">
                {startingCamera ? (
                  <div className="flex flex-col items-center gap-2 text-white text-xs">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                    <span>{lang === "ar" ? "جاري تشغيل الكاميرا..." : "Accessing camera..."}</span>
                  </div>
                ) : cameraError ? (
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
                      className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors active:scale-95 shadow-md"
                      title={lang === "ar" ? "إغلاق الكاميرا" : "Close Camera"}
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>

                    {/* Camera Control overlays */}
                    <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 px-4">
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
                        {lang === "ar" ? "جاري معالجة وتحليل الأنسجة..." : "Analyzing tissue sample..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        {lang === "ar" ? "بدء التشخيص الذكي" : "Run AI Diagnostics"}
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
                  <h4 className="font-black text-xl text-foreground">
                    {formatClassName(result.data.predicted_class)}
                  </h4>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getSeverityStyles(result.data.predicted_class).bg}`}>
                      {getSeverityStyles(result.data.predicted_class).label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-muted border text-muted-foreground text-[10px]">
                      Index: {result.data.predicted_class_index}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description Card */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                  {lang === "ar" ? "الوصف السريري التفصيلي" : "Detailed Clinical Description"}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed p-4 bg-muted/20 border rounded-xl">
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
                      <div key={index} className="flex items-start gap-2.5 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-rose-500" />
                        <p className="leading-relaxed text-[11px]">{risk}</p>
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
