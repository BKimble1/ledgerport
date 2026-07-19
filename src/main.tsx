import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Offline support: register the service worker only in production, top-level
// (not inside embedded previews), on secure origins that actually serve sw.js.
if (
  import.meta.env.PROD &&
  "serviceWorker" in navigator &&
  window.self === window.top &&
  (location.protocol === "https:" || location.hostname === "localhost")
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* single-file or unsupported host — the app works fine without it */
    });
  });
}
