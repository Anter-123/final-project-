import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { medicationService } from "../services/medicationService";
import type { Medication } from "../services/medicationService";
import toast from "react-hot-toast";

/**
 * Global Medication Reminder Component
 * Runs inside DashboardLayout for Patient users.
 * Checks medications every 30 seconds and fires:
 *   1. Browser Push Notification (if granted)
 *   2. In-app toast notification
 *   3. Audio alert beep
 * Uses a ±5 minute window so reminders aren't missed if the exact minute is skipped.
 */

const REMINDER_AUDIO_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav";
const CHECK_INTERVAL_MS = 30_000;    // check every 30 seconds
const WINDOW_MINUTES = 5;            // ±5 minute match window
const TOAST_DURATION_MS = 15_000;    // toast stays 15 seconds

// Parse "08:00 AM" or "14:30" style strings → total minutes since midnight
function parseTimeToMinutes(timeStr: string): number | null {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  return hour * 60 + minute;
}

// Get today's date as YYYY-MM-DD
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// Build a unique storage key for already-alerted doses today
function getAlertedStorageKey(): string {
  return `med_alerted_${todayStr()}`;
}

function getAlertedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(getAlertedStorageKey());
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function persistAlerted(key: string): void {
  const set = getAlertedSet();
  set.add(key);
  localStorage.setItem(getAlertedStorageKey(), JSON.stringify([...set]));
}

// Request browser notification permission once safely
async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch (err) {
    console.warn("Could not request notification permission:", err);
    return false;
  }
}

function fireNotification(med: Medication, timeSlot: string): void {
  // 1) Browser Notification
  if ("Notification" in window && Notification.permission === "granted") {
    const n = new Notification("💊 Medication Reminder", {
      body: `Time to take ${med.name} (${med.dosage}) — Scheduled: ${timeSlot}`,
      icon: "/favicon.ico",
      tag: `med-${med._id}-${timeSlot}`, // prevent duplicate notifications
      requireInteraction: true,           // stays until user dismisses
    });
    // Auto-close after 30 seconds
    setTimeout(() => n.close(), 30_000);
  }

  // 2) Audio beep
  try {
    const audio = new Audio(REMINDER_AUDIO_URL);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}

  // 3) In-app toast
  toast(
    `💊 Time to take your medication!\n${med.name} — ${med.dosage}\n⏰ Scheduled: ${timeSlot}`,
    {
      duration: TOAST_DURATION_MS,
      icon: "🔔",
      style: {
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#38bdf8",
        border: "1px solid rgba(56, 189, 248, 0.4)",
        borderRadius: "14px",
        padding: "14px 18px",
        fontWeight: 600,
        fontSize: "13px",
        whiteSpace: "pre-line",
        boxShadow: "0 8px 32px rgba(56, 189, 248, 0.15)",
      },
    }
  );
}

export const MedicationReminder: React.FC = () => {
  const { user } = useAuth();
  const medsRef = useRef<Medication[]>([]);

  // Fetch medications periodically
  const fetchMeds = useCallback(async () => {
    try {
      const data = await medicationService.getMedications();
      medsRef.current = Array.isArray(data) ? data : [];
    } catch (e) {
      console.error("[MedReminder] Failed to fetch medications:", e);
    }
  }, []);

  // Core reminder checker (with background throttling protection & console logs)
  const checkReminders = useCallback(() => {
    const meds = medsRef.current;
    console.log(`[MedReminder] Running schedule tick at ${new Date().toLocaleTimeString()}. Loaded meds count: ${meds.length}`);
    if (meds.length === 0) return;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    meds.forEach((med) => {
      // Check if this medication is already marked as taken today
      if (med.takenToday) {
        console.log(`[MedReminder] Skipped "${med.name}" - Already taken today.`);
        return;
      }

      med.times.forEach((timeSlot) => {
        const schedMinutes = parseTimeToMinutes(timeSlot);
        if (schedMinutes === null) {
          console.warn(`[MedReminder] Failed to parse time slot "${timeSlot}" for medication "${med.name}"`);
          return;
        }

        // Bulletproof Logic: If the scheduled time has arrived or passed today
        if (nowMinutes >= schedMinutes) {
          const alertKey = `${med._id}__${timeSlot}`;
          const alerted = getAlertedSet();

          if (alerted.has(alertKey)) {
            // Already triggered today for this time slot
            return;
          }

          console.log(`[MedReminder] TRIGGERING ALERT for "${med.name}" scheduled at "${timeSlot}" (schedMinutes: ${schedMinutes}, nowMinutes: ${nowMinutes})`);
          
          // Fire!
          persistAlerted(alertKey);
          fireNotification(med, timeSlot);
        } else {
          console.log(`[MedReminder] Medication "${med.name}" scheduled for "${timeSlot}" is in the future.`);
        }
      });
    });
  }, []);

  useEffect(() => {
    // Only run for patient users
    if (!user || user.role !== "User") return;

    // Request notification permission on mount
    ensureNotificationPermission();

    // Initial fetch + check
    fetchMeds().then(() => checkReminders());

    // Periodic fetch + check
    const interval = setInterval(() => {
      fetchMeds().then(() => checkReminders());
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user, fetchMeds, checkReminders]);

  // This component renders nothing — it's a pure side-effect
  return null;
};

export default MedicationReminder;
