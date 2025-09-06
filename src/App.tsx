
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { UserProvider } from "./contexts/UserContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import Documents from "./pages/Documents";
import Updates from "./pages/Updates";
import ThankYou from "./pages/ThankYou";
import NotFound from "./pages/NotFound";
import DashboardComparison from "./components/DashboardComparison";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import InvestmentOpportunity from "./pages/InvestmentOpportunity";
import TestTracking from "./pages/TestTracking";
import TestLoginTracking from "./pages/TestLoginTracking";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <UserProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/reset" element={<ResetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/user-dashboard" element={<UserDashboard />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/updates" element={<Updates />} />
                <Route path="/dashboard-comparison" element={<DashboardComparison />} />
                <Route path="/investment-opportunity" element={<InvestmentOpportunity />} />
                <Route path="/test-tracking" element={<TestTracking />} />
                <Route path="/test-login-tracking" element={<TestLoginTracking />} />
                <Route path="/thankyou" element={<ThankYou />} />
                <Route path="/thankyouinvestor" element={<Navigate to="/thankyou" replace />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/cookie-policy" element={<CookiePolicy />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AnimatePresence>
          </BrowserRouter>
        </UserProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
