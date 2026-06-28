import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doctorService } from "../services/doctorService";
import type { DoctorListItem, DoctorDetails } from "../services/doctorService";
import { bookingService } from "../services/bookingService";
import { chatService } from "../services/chatService";
import { Search, Star, Stethoscope, DollarSign, Calendar, Clock, Loader2, ArrowLeft, Send, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";

export const DoctorDirectory: React.FC = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [doctorDetails, setDoctorDetails] = useState<DoctorDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Booking state
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  const translateDayName = (day: string) => {
    const translations: Record<string, string> = {
      "Sunday": lang === "ar" ? "الأحد" : "Sunday",
      "Monday": lang === "ar" ? "الاثنين" : "Monday",
      "Tuesday": lang === "ar" ? "الثلاثاء" : "Tuesday",
      "Wednesday": lang === "ar" ? "الأربعاء" : "Wednesday",
      "Thursday": lang === "ar" ? "الخميس" : "Thursday",
      "Friday": lang === "ar" ? "الجمعة" : "Friday",
      "Saturday": lang === "ar" ? "السبت" : "Saturday"
    };
    return translations[day] || day;
  };

  const handleDateChange = (dateVal: string) => {
    setBookingDate(dateVal);
    setSelectedSlot("");
    
    if (!dateVal) {
      setSelectedDay("");
      return;
    }
    
    const localDateObj = new Date(dateVal + 'T00:00:00');
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const calculatedDayName = daysOfWeek[localDateObj.getDay()];
    
    setSelectedDay(calculatedDayName);
  };

  // Rating state
  const [userRating, setUserRating] = useState(5);
  const [userReview, setUserReview] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const list = await doctorService.getDoctors();
        const doctorsArray = Array.isArray(list) 
          ? list 
          : (list as any)?.formattedDoctors 
          ? (list as any).formattedDoctors 
          : (list as any)?.doctors 
          ? (list as any).doctors 
          : [];
        setDoctors(doctorsArray);
      } catch (err: any) {
        toast.error("Failed to load doctor directory");
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  const handleSelectDoctor = async (id: string) => {
    setSelectedDoctorId(id);
    setLoadingDetails(true);
    try {
      const details = await doctorService.getDoctorDetails(id);
      setDoctorDetails(details);
      // Reset forms
      setSelectedDay("");
      setSelectedSlot("");
      setBookingDate("");
      setUserRating(5);
      setUserReview("");
    } catch (err: any) {
      toast.error("Failed to load doctor details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorDetails || !selectedDay || !selectedSlot || !bookingDate) {
      toast.error("Please fill in booking details");
      return;
    }

    setBookingLoading(true);
    try {
      await bookingService.createBooking({
        doctorId: doctorDetails._id,
        day: selectedDay,
        slot: selectedSlot,
        date: bookingDate,
      });
      // Automatically initialize the chat room in the background
      try {
        await chatService.createChat(doctorDetails._id);
      } catch (chatErr) {
        console.error("Silent chat room creation failed:", chatErr);
      }
      toast.success("Appointment booked successfully! Waiting for doctor confirmation.");
      setSelectedDoctorId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to book appointment");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorDetails) return;

    setRatingLoading(true);
    try {
      await doctorService.rateDoctor(doctorDetails._id, {
        rating: userRating,
        review: userReview,
      });
      toast.success("Review submitted successfully!");
      // Reload details to show review
      const details = await doctorService.getDoctorDetails(doctorDetails._id);
      setDoctorDetails(details);
      setUserReview("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setRatingLoading(false);
    }
  };

  const [chatLoading, setChatLoading] = useState(false);
  const handleStartChat = async () => {
    if (!doctorDetails) return;
    setChatLoading(true);
    try {
      const room = await chatService.createChat(doctorDetails._id);
      navigate("/chat", { state: { activeChatId: room._id, newRoom: room } });
    } catch (err: any) {
      toast.error(err.message || "Failed to start chat session");
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const doctorList = Array.isArray(doctors) 
    ? doctors 
    : (doctors as any)?.doctors 
    ? (doctors as any).doctors 
    : (doctors as any)?.data 
    ? (doctors as any).data 
    : [];

  const filteredDoctors = doctorList.filter(doc => {
    if (!doc) return false;
    const name = doc.name || "";
    const specialty = doc.doctorProfile?.specialty || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           specialty.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Overview */}
      {!selectedDoctorId ? (
        <>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Doctors Directory</h2>
            <p className="text-sm text-muted-foreground">Search and connect with certified practitioners</p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute inset-y-0 left-3 h-4 w-4 my-auto text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by specialty or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-card border rounded-xl text-xs focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Doctors Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredDoctors.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center col-span-3">No matching doctors found</p>
            ) : (
              filteredDoctors.map((doc) => (
                <div key={doc._id} className="glass-panel p-5 rounded-2xl border flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-3.5">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-base">
                        {doc.image ? <img src={doc.image} alt={doc.name} className="h-full w-full object-cover rounded-full" /> : doc.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm block">{doc.name}</h3>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-1 font-semibold uppercase tracking-wider">
                          <Stethoscope className="h-3.5 w-3.5 text-primary" /> {doc.doctorProfile?.specialty}
                        </span>
                      </div>
                    </div>

                    {/* Bio */}
                    {doc.doctorProfile?.bio && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{doc.doctorProfile.bio}</p>
                    )}

                    {/* Fees & Rating */}
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-muted/50">
                      <span className="flex items-center gap-1 text-slate-350">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        <span className="font-semibold">{doc.doctorProfile?.consultationFee || 120}</span>
                      </span>

                      <span className="flex items-center gap-1 text-yellow-500">
                        <Star className="h-4 w-4 fill-yellow-500" />
                        <span className="font-bold text-slate-350">{doc.doctorProfile?.rating?.toFixed(1) || "New"}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectDoctor(doc._id)}
                    className="w-full mt-5 py-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl text-xs active:scale-95 transition-all shadow"
                  >
                    View Details & Book
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* Detailed View & Booking Wizard */
        <div className="space-y-6">
          <button
            onClick={() => setSelectedDoctorId(null)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Directory
          </button>

          {loadingDetails || !doctorDetails ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Doctor Profile Info */}
              <div className="space-y-6">
                <div className="glass-panel p-6 rounded-2xl border shadow-sm space-y-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-2xl shadow mb-3 border-2 border-primary/20">
                      {doctorDetails.image ? <img src={doctorDetails.image} alt={doctorDetails.name} className="h-full w-full object-cover rounded-full" /> : doctorDetails.name.charAt(0)}
                    </div>
                    <h3 className="font-bold text-base">{doctorDetails.name}</h3>
                    <span className="text-xs text-primary font-semibold uppercase tracking-wider mt-1">{doctorDetails.doctorProfile.specialty}</span>
                    
                    <div className="flex items-center gap-1 text-yellow-500 mt-2">
                      <Star className="h-4 w-4 fill-yellow-500" />
                      <span className="font-bold text-xs">{doctorDetails.doctorProfile.rating?.toFixed(1) || "No ratings"}</span>
                    </div>

                    <button
                      onClick={handleStartChat}
                      disabled={chatLoading}
                      className="mt-4 w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {chatLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5" />
                      )}
                      Start Clinical Chat
                    </button>
                  </div>

                  {doctorDetails.doctorProfile.bio && (
                    <div className="border-t border-muted/50 pt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-2">Professional Bio</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{doctorDetails.doctorProfile.bio}</p>
                    </div>
                  )}

                  <div className="border-t border-muted/50 pt-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-medium">In-Clinic Consultation:</span>
                      <span className="font-bold">${doctorDetails.doctorProfile.consultationFee || 120}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-medium">Video Consultation:</span>
                      <span className="font-bold">${doctorDetails.doctorProfile.feeVideo || 100}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-medium">Home Visit:</span>
                      <span className="font-bold">${doctorDetails.doctorProfile.feeHome || 150}</span>
                    </div>
                  </div>
                </div>

                {/* Rating Form */}
                <div className="glass-panel p-6 rounded-2xl border shadow-sm">
                  <h4 className="font-bold text-xs uppercase tracking-wider mb-3">Submit Review</h4>
                  <form onSubmit={handleAddReview} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Score</label>
                      <select
                        value={userRating}
                        onChange={(e) => setUserRating(Number(e.target.value))}
                        className="w-full bg-background border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      >
                        {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Feedback</label>
                      <textarea
                        rows={2}
                        value={userReview}
                        onChange={(e) => setUserReview(e.target.value)}
                        placeholder="Excellent consultations, highly knowledgeable and empathetic..."
                        className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={ratingLoading}
                      className="flex items-center gap-1 py-1.5 px-4 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:shadow active:scale-95 transition-all disabled:opacity-50"
                    >
                      Submit Review
                    </button>
                  </form>
                </div>
              </div>

              {/* Booking Slot Wizard & Reviews history */}
              <div className="lg:col-span-2 space-y-6">
                {/* Appointment slots */}
                <div className="glass-panel p-6 rounded-2xl border shadow-sm space-y-4">
                  <h3 className="font-bold text-sm flex items-center gap-2 text-primary">
                    <Calendar className="h-5 w-5" /> Schedule Consultation Slot
                  </h3>

                  <form onSubmit={handleBookAppointment} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          {lang === "ar" ? "اختر تاريخ الاستشارة" : "Select Consultation Date"}
                        </label>
                        <input
                          type="date"
                          required
                          value={bookingDate}
                          onChange={(e) => handleDateChange(e.target.value)}
                          className="w-full px-3 py-2 bg-background border rounded-xl text-xs focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          {lang === "ar" ? "يوم الاستشارة" : "Consultation Day"}
                        </label>
                        <div className="w-full px-3 py-2 bg-muted/30 border rounded-xl text-xs text-muted-foreground font-medium flex items-center h-[38px]">
                          {selectedDay ? translateDayName(selectedDay) : (lang === "ar" ? "-- سيتم تحديده تلقائياً --" : "-- Will be set automatically --")}
                        </div>
                      </div>
                    </div>

                    {/* Warning if doctor is not available on selected day */}
                    {(() => {
                      const isAvailableOnDay = doctorDetails.doctorProfile.workingHours?.some((w) => w.day === selectedDay);
                      if (selectedDay && !isAvailableOnDay) {
                        return (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-medium space-y-1">
                            <p>
                              {lang === "ar" 
                                ? `الطبيب غير متاح في يوم ${translateDayName(selectedDay)}.` 
                                : `The doctor is not available on ${translateDayName(selectedDay)}.`}
                            </p>
                            <p className="text-[10px] opacity-90">
                              {lang === "ar" 
                                ? `الأيام المتاحة للطبيب: ${doctorDetails.doctorProfile.workingHours?.map(w => translateDayName(w.day)).join("، ")}` 
                                : `Available working days: ${doctorDetails.doctorProfile.workingHours?.map(w => translateDayName(w.day)).join(", ")}`}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Time slots matching day */}
                    {(() => {
                      const isAvailableOnDay = doctorDetails.doctorProfile.workingHours?.some((w) => w.day === selectedDay);
                      if (selectedDay && isAvailableOnDay) {
                        return (
                          <div className="space-y-2">
                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {lang === "ar" ? "اختر موعد الاستشارة المتاح" : "Select Available Hours Slot"}
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {doctorDetails.doctorProfile.workingHours
                                ?.find((w) => w.day === selectedDay)
                                ?.slots.map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setSelectedSlot(s)}
                                    className={`px-4 py-2 rounded-xl text-xs border font-medium transition-all ${
                                      selectedSlot === s 
                                        ? "bg-primary text-white border-primary shadow" 
                                        : "bg-background border-muted hover:border-slate-500 text-foreground"
                                    }`}
                                  >
                                    {s}
                                  </button>
                                ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={bookingLoading || !selectedSlot}
                        className="inline-flex items-center gap-2 py-2 px-6 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:shadow active:scale-95 transition-all disabled:opacity-50"
                      >
                        {bookingLoading && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                        Confirm Appointment Booking
                      </button>
                    </div>
                  </form>
                </div>

                {/* Historical Reviews */}
                <div className="glass-panel p-6 rounded-2xl border shadow-sm space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider">Patient Feedbacks</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {!doctorDetails.doctorProfile.reviews || doctorDetails.doctorProfile.reviews.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">No reviews submitted yet</p>
                    ) : (
                      doctorDetails.doctorProfile.reviews.map((r) => (
                        <div key={r._id} className="p-3.5 rounded-xl border bg-muted/20 text-xs">
                          <div className="flex justify-between items-start">
                            <span className="font-semibold block">{r.userId?.name || "Patient"}</span>
                            
                            <span className="flex items-center gap-0.5 text-yellow-500">
                              <Star className="h-3.5 w-3.5 fill-yellow-500" />
                              <span className="font-bold text-slate-350">{r.rating}</span>
                            </span>
                          </div>
                          {r.review && (
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{r.review}</p>
                          )}
                          <span className="text-[9px] text-muted-foreground/50 block mt-2">{new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};
