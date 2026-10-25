
// Imported first and for its side effect: attaches the beforeinstallprompt
// listener immediately, since the event fires only once per page load and
// is missed if nothing has subscribed yet (e.g. while the splash screen is
// still showing and the rest of the app hasn't mounted).
import './utils/installPrompt';
import { formatErrorMessage } from './utils/errorFormatter';

const originalAlert = window.alert;
window.alert = (message: any) => {
  const msgStr = String(message).toLowerCase();
  const isError = msgStr.includes('fail') || msgStr.includes('error') || msgStr.includes('denied') || 
                  msgStr.includes('invalid') || msgStr.includes('unauthorized') || msgStr.includes('mismatch');
  
  if (isError) {
    originalAlert(formatErrorMessage(message));
  } else {
    originalAlert(message);
  }
};
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./features/core/components/ErrorBoundary";
import "./styles/index.css";

// Handle global unhandled promise rejections & suppress Vite HMR websocket noise in browser console
if (typeof window !== "undefined") {
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: any[]) => {
    const msg = String(args[0] || "");
    const combined = args.map(a => (a instanceof Error ? a.message : (typeof a === 'object' ? JSON.stringify(a) : String(a)))).join(' ');

    if (
      msg.includes("failed to connect to websocket") ||
      msg.includes("WebSocket") ||
      msg.includes("websocket")
    ) {
      return;
    }

    // Format the error if it hasn't been formatted yet
    if (!combined.includes('What happened:') && (combined.includes('Failed') || combined.includes('Error') || combined.includes('error') || combined.includes('fail') || args.length > 1)) {
       originalError.call(console, formatErrorMessage(combined));
    } else {
       originalError.apply(console, args);
    }
  };

  console.warn = (...args: any[]) => {
    const msg = String(args[0] || "");
    if (
      msg.includes("failed to connect to websocket") ||
      msg.includes("WebSocket") ||
      msg.includes("websocket")
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };

  window.addEventListener("unhandledrejection", (event) => {
    const reasonStr = String(event.reason?.message || event.reason || "");
    if (
      reasonStr.includes("WebSocket") ||
      reasonStr.includes("websocket") ||
      reasonStr.includes("failed to connect to websocket") || reasonStr.includes("auth/invalid-api-key") || reasonStr.includes("auth/admin-restricted-operation")
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

// Register Service Worker for offline asset & catalog caching
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("JIYOO Service Worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("Service Worker registration failed:", err);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
