"use client";
import { useEffect } from "react";

export default function PWASetup() {
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Request notification permission after a short delay
    const timer = setTimeout(async () => {
      if ("Notification" in window && Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm === "granted" && "serviceWorker" in navigator) {
          // Subscribe to push (VAPID would be needed for real push, this sets up the infrastructure)
          const reg = await navigator.serviceWorker.ready;
          if (reg.pushManager) {
            reg.pushManager.getSubscription().catch(() => {});
          }
        }
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
