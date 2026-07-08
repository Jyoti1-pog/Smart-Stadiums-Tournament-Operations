import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SimProvider } from "./context/SimContext.jsx";
import { I18nProvider } from "./context/I18nContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import FanApp from "./pages/FanApp.jsx";
import OpsDashboard from "./pages/OpsDashboard.jsx";
import Landing from "./pages/Landing.jsx";

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <SimProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/fan/*" element={<FanApp />} />
            <Route path="/ops/*" element={<OpsDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SimProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
