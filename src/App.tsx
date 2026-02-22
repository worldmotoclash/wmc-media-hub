
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { UserProvider } from "./contexts/UserContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { isRacerHostname, RacerRoutes } from "./components/racer/HostnameRouter";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import Index from "./pages/Index";
import MediaHub from "./pages/MediaHub";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import Documents from "./pages/Documents";
import Updates from "./pages/Updates";
import ThankYou from "./pages/ThankYou";
import NotFound from "./pages/NotFound";

import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import InvestmentOpportunity from "./pages/InvestmentOpportunity";
import TestTracking from "./pages/TestTracking";
import TestLoginTracking from "./pages/TestLoginTracking";
import { UnifiedMediaLibrary } from "./components/media/UnifiedMediaLibrary";
import MediaUpload from "./pages/media/MediaUpload";
import Generate from "./pages/media/Generate";
import ModelMarketplace from "./pages/media/ModelMarketplace";
import PlaylistManager from "./pages/media/PlaylistManager";
import SceneDetection from "./pages/media/SceneDetection";
import MediaHubHero from "./components/media/MediaHubHero";
import ActionCards from "./components/media/ActionCards";
import MediaLibrary from "./pages/media/MediaLibrary";
import SocialKit from "./pages/media/SocialKit";
import CharacterLibrary from "./pages/media/CharacterLibrary";
import UserGuide from "./pages/media/UserGuide";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <UserProvider>
          <Toaster />
          <Sonner />
          <PWAInstallPrompt />
          <BrowserRouter>
            <AnimatePresence mode="wait">
              {isRacerHostname() ? (
                <RacerRoutes />
              ) : (
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/hub" element={<MediaHub />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/user-dashboard" element={<UserDashboard />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/updates" element={<Updates />} />
                  
                  <Route path="/investment-opportunity" element={<InvestmentOpportunity />} />
                  <Route path="/test-tracking" element={<TestTracking />} />
                  <Route path="/test-login-tracking" element={<TestLoginTracking />} />
                  <Route path="/thankyou" element={<ThankYou />} />
                  <Route path="/thankyouinvestor" element={<Navigate to="/thankyou" replace />} />
                  <Route path="/admin/media" element={
                    <>
                      <MediaHubHero />
                      <ActionCards />
                    </>
                  } />
                  <Route path="/admin/media/library" element={<UnifiedMediaLibrary />} />
                  <Route path="/admin/media/content" element={<MediaLibrary />} />
                  <Route path="/admin/media/upload" element={<MediaUpload />} />
                  <Route path="/admin/media/models" element={<ModelMarketplace />} />
                  <Route path="/admin/media/generate" element={<Generate />} />
                  <Route path="/admin/media/playlists" element={<PlaylistManager />} />
                  <Route path="/admin/media/scene-detection" element={<SceneDetection />} />
                  <Route path="/admin/media/social-kit" element={<SocialKit />} />
                  <Route path="/admin/media/characters" element={<CharacterLibrary />} />
                  <Route path="/admin/media/user-guide" element={<UserGuide />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/cookie-policy" element={<CookiePolicy />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              )}
            </AnimatePresence>
          </BrowserRouter>
        </UserProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
