import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { AnimatePresence } from "framer-motion";
import ChatPage from "@/pages/chat";
import Landing from "@/pages/landing";
import PlaylistResult from "@/pages/playlist-result";
import UpgradePage from "@/pages/upgrade";
import WaitlistPage from "@/pages/waitlist";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import ProfileSetupPage from "@/pages/profile-setup";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import FeedbackAnalytics from "@/pages/feedback-analytics";
import { MoodAnalysisPage } from "@/pages/mood-analysis";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Switch key={location}>
        {/* Always accessible routes first */}
        <Route path="/login">
          <LoginPage />
        </Route>
        <Route path="/signup">
          <SignupPage />
        </Route>
        <Route path="/forgot-password">
          <ForgotPasswordPage />
        </Route>
        <Route path="/reset-password">
          <ResetPasswordPage />
        </Route>
        <Route path="/profile-setup">
          <ProfileSetupPage />
        </Route>
        <Route path="/playlist-result">
          <PlaylistResult />
        </Route>
        <Route path="/upgrade">
          <UpgradePage />
        </Route>
        <Route path="/waitlist">
          <WaitlistPage />
        </Route>
        
        {/* User-dependent routes */}
        {user ? (
          <>
            {/* Check if user needs to complete profile */}
            {!user?.birthDate || !user?.birthTime || !user?.birthLocation ? (
              <Route path="/">
                <ProfileSetupPage />
              </Route>
            ) : (
              <>
                <Route path="/">
                  <ChatPage />
                </Route>
                <Route path="/feedback-analytics">
                  <FeedbackAnalytics />
                </Route>
                <Route path="/mood-analysis">
                  <MoodAnalysisPage />
                </Route>
              </>
            )}
          </>
        ) : (
          <>
            {/* Guest routes */}
            <Route path="/">
              <Landing />
            </Route>
            <Route path="/chat">
              <LoginPage />
            </Route>
            <Route path="/playlist-result">
              <PlaylistResult />
            </Route>
            <Route path="/upgrade">
              <UpgradePage />
            </Route>
            <Route path="/waitlist">
              <WaitlistPage />
            </Route>
          </>
        )}
        
        {/* Catch all - must be last */}
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
