import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarDays, ChefHat, Clock3, PackageCheck, X } from "lucide-react";
import { io } from "socket.io-client";
import { BACKEND_BASE_URL } from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";

const iconsByType = {
  reservation: CalendarDays,
  attendance: Clock3,
  delivery: PackageCheck,
  kitchen: ChefHat,
};

function playNotificationSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const context = new AudioContextClass();
    const now = context.currentTime;
    [784, 1046.5].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.11;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (index ? 0.24 : 0.13));
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + (index ? 0.25 : 0.14));
    });
    window.setTimeout(() => context.close(), 600);
  } catch (error) {
    console.warn("Notification sound could not be played:", error);
  }
}

export default function RealtimeNotificationCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [permission, setPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported",
  );
  const timeoutIds = useRef(new Map());
  const navigateRef = useRef(navigate);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token || !user?.user_id) return undefined;
    const activeTimeouts = timeoutIds.current;

    const socket = io(BACKEND_BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("notification", (notification) => {
      if (!notification?.id || !notification.title || !notification.message) return;

      setNotifications((current) => [notification, ...current].slice(0, 4));
      playNotificationSound();

      if ("Notification" in window && Notification.permission === "granted") {
        try {
          const desktopNotification = new Notification(notification.title, {
            body: notification.message,
            icon: "/images/adminlogo.png",
            tag: notification.id,
          });
          desktopNotification.onclick = () => {
            window.focus();
            if (notification.link) navigateRef.current(notification.link);
            desktopNotification.close();
          };
        } catch (error) {
          console.warn("Desktop notification could not be displayed:", error);
        }
      }

      const timeoutId = window.setTimeout(() => {
        setNotifications((current) => current.filter((item) => item.id !== notification.id));
        timeoutIds.current.delete(notification.id);
      }, 8000);
      activeTimeouts.set(notification.id, timeoutId);
    });

    socket.on("connect_error", (error) => {
      console.error("Realtime notifications could not connect:", error.message);
    });

    return () => {
      socket.disconnect();
      activeTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      activeTimeouts.clear();
    };
  }, [user?.user_id]);

  const dismiss = (id) => {
    const timeoutId = timeoutIds.current.get(id);
    if (timeoutId) window.clearTimeout(timeoutId);
    timeoutIds.current.delete(id);
    setNotifications((current) => current.filter((item) => item.id !== id));
  };

  const pauseDismissal = (id) => {
    const timeoutId = timeoutIds.current.get(id);
    if (timeoutId) window.clearTimeout(timeoutId);
    timeoutIds.current.delete(id);
  };

  const resumeDismissal = (id) => {
    if (timeoutIds.current.has(id)) return;
    timeoutIds.current.set(id, window.setTimeout(() => {
      setNotifications((current) => current.filter((item) => item.id !== id));
      timeoutIds.current.delete(id);
    }, 8000));
  };

  const enableDesktopNotifications = async () => {
    if (!("Notification" in window)) return;
    setPermission(await Notification.requestPermission());
  };

  const openNotification = (notification) => {
    dismiss(notification.id);
    if (notification.link) navigateRef.current(notification.link);
  };

  return (
    <>
      {permission === "default" && user?.user_id && (
        <div className="pointer-events-auto fixed bottom-4 left-4 z-[99998] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-[#e4e9e2] bg-white p-3 shadow-lg sm:bottom-6 sm:left-6">
          <Bell size={18} className="shrink-0 text-[#176638]" />
          <p className="text-xs text-[#344035]">Enable desktop notifications?</p>
          <button type="button" onClick={enableDesktopNotifications} className="shrink-0 rounded-lg bg-[#176638] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#10532d]">
            Enable
          </button>
          <button type="button" onClick={() => setPermission("dismissed")} aria-label="Dismiss desktop notification prompt" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#89938c] hover:bg-slate-100">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[99999] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:bottom-6 sm:right-6">
        {notifications.map((notification) => {
          const Icon = iconsByType[notification.type] || Bell;
          return (
            <article
              key={notification.id}
              role="status"
              onMouseEnter={() => pauseDismissal(notification.id)}
              onMouseLeave={() => resumeDismissal(notification.id)}
              className="group pointer-events-auto relative animate-in slide-in-from-right-4 overflow-hidden rounded-2xl border border-[#e4e9e2] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.2)]"
            >
              <button
                type="button"
                onClick={() => openNotification(notification)}
                className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#f8faf7]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf4e7] text-[#176638]">
                  <Icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-extrabold text-[#10221a]">{notification.title}</span>
                    <span className="shrink-0 text-[10px] text-[#89938c]">Just now</span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#66716a]">{notification.message}</span>
                  <span className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-[#176638]">View details</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => dismiss(notification.id)}
                aria-label="Dismiss notification"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-[#89938c] transition hover:bg-slate-100 hover:text-[#344035]"
              >
                <X size={14} />
              </button>
              <div className="h-1 origin-left animate-[notification-progress_8s_linear_forwards] bg-[#28a45b] group-hover:[animation-play-state:paused]" />
            </article>
          );
        })}
      </div>
    </>
  );
}
