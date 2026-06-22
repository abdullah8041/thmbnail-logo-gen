import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles.css";
import IndexPage from "./pages/Index";
import LogosPage from "./pages/Logos";
import NotFoundPage from "./pages/NotFound";
import AuthPage from "./pages/Auth";
import AdminPage from "./pages/Admin";
import PricingPage from "./pages/Pricing";
import { AuthProvider, ProtectedRoute, AdminRoute } from "@/lib/auth";
import { NoCreditsModal } from "@/components/NoCreditsModal";
import { Toaster } from "./components/ui/sonner";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<ProtectedRoute><IndexPage /></ProtectedRoute>} />
            <Route path="/logos" element={<ProtectedRoute><LogosPage /></ProtectedRoute>} />
            <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <NoCreditsModal />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);