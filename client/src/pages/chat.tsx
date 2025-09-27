import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { isUnauthorizedError } from "@/lib/authUtils";
import ChatMessage from "@/components/chat-message";
import ChatInput from "@/components/chat-input";
import QuickActions from "@/components/quick-actions";
import ShareButton from "@/components/share-button";
import MoodTrackerModal from "@/components/mood-feedback-modal";
import { SiSpotify } from "react-icons/si";
import { SpotifyCardContent } from "@/components/spotify-card-content";
import { UserProfileCard } from "@/components/user-profile-card";
import { StarryNightToggle } from "@/components/starry-night-toggle";
import { AvatarDisplay } from "@/components/avatar-display";
import { GuestExitModal, useGuestExitModal } from "@/components/guest-exit-modal";

import { Music, Sparkles, MoreHorizontal, LogOut, X, BarChart3, MessageSquare, TrendingUp, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random()}`);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showSpotifyCard, setShowSpotifyCard] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [moodModalTab, setMoodModalTab] = useState<'mood' | 'history'>('mood');
  

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isModalOpen, closeModal } = useGuestExitModal();

  // Fetch user's astrological data
  const { data: astrologyData } = useQuery({
    queryKey: ['/api/user/big-three'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/user/big-three');
      return response.json();
    },
    enabled: !!user,
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/chat', sessionId, 'messages'],
    queryFn: async () => {
      // Initialize session first
      await apiRequest('POST', '/api/chat/session', { sessionId });
      const response = await apiRequest('GET', `/api/chat/${sessionId}/messages`);
      return response.json();
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', `/api/chat/${sessionId}/message`, { content });
      return response.json();
    },
    onSuccess: (newMessages) => {
      queryClient.setQueryData(['/api/chat', sessionId, 'messages'], newMessages);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to continue.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  const generatePlaylistMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/chat/${sessionId}/generate-playlist`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', sessionId, 'messages'] });
    }
  });

  const getDailyHoroscopeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/horoscope/${sessionId}/weekly`, {});
      return response.json();
    },
    onSuccess: (newMessages) => {
      queryClient.setQueryData(['/api/chat', sessionId, 'messages'], newMessages);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to access weekly horoscopes.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
        return;
      }
      toast({
        title: "Error",
        description: "Please provide complete birth information including date, time, and location for weekly horoscope.",
        variant: "destructive",
      });
    }
  });

  const detailedChartMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/chart/${sessionId}/detailed`, {});
      return response.json();
    },
    onSuccess: (newMessages) => {
      queryClient.setQueryData(['/api/chat', sessionId, 'messages'], newMessages);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to access detailed chart readings.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
        return;
      }
      toast({
        title: "Error",
        description: "Please provide complete birth information including date, time, and location for detailed chart reading.",
        variant: "destructive",
      });
    }
  });

  const transitDetailsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/transit/${sessionId}/details`, {});
      return response.json();
    },
    onSuccess: (newMessages) => {
      queryClient.setQueryData(['/api/chat', sessionId, 'messages'], newMessages);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to access transit details.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
        return;
      }
      
      // Check if it's a 429 error (weekly limit reached)
      if (error.message.includes("429:") || error.message.includes("Weekly transit details limit reached")) {
        toast({
          title: "Weekly Limit Reached",
          description: "You can only get transit details once per week. Your current transit details are still active.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: "Please provide complete birth information including date, time, and location for transit details.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for Spotify connection status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('spotify') === 'connected') {
      toast({
        title: "Spotify Connected!",
        description: "Your music profile has been analyzed! You can now export personalized playlists directly to your Spotify account.",
        duration: 5000,
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('spotify') === 'error') {
      const reason = urlParams.get('reason');
      toast({
        title: "Spotify Connection Failed",
        description: reason || "Please try connecting your Spotify account again.",
        variant: "destructive",
        duration: 5000,
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Determine session state for dynamic prompts
  const hasPlaylist = messages.some((msg: any) => msg.metadata?.type === 'playlist');
  const hasBirthInfo = messages.length > 1; // Simple heuristic - after welcome message, assume interaction started

  const handleSendMessage = (content: string) => {
    sendMessageMutation.mutate(content);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'Weekly Horoscope':
        getDailyHoroscopeMutation.mutate();
        break;
      case 'Transit Details':
        transitDetailsMutation.mutate();
        break;
      case 'Detailed Birth Chart Reading':
        detailedChartMutation.mutate();
        break;
      case 'Sonifyr':
        generatePlaylistMutation.mutate();
        break;
      case 'Daily Mood Tracker':
        setMoodModalTab('mood');
        setShowMoodModal(true);
        break;
    }
  };

  const handleMoodHistoryClick = () => {
    setMoodModalTab('history');
    setShowMoodModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 cosmic-gradient rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-muted-foreground">Channeling cosmic energies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 cosmic-gradient rounded-full flex items-center justify-center">
                <Music className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Sonifyr</h1>
                <p className="text-xs text-muted-foreground">Turn Planetary data into sound</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* User Profile - First after app logo */}
              {user ? (
                <div 
                  className="flex items-center space-x-2 cursor-pointer hover:bg-white/10 rounded-lg px-2 py-1 transition-colors group relative"
                  onClick={() => setShowProfileCard(true)}
                >
                  <AvatarDisplay
                    avatarType={(user as any)?.avatarType}
                    avatarIcon={(user as any)?.avatarIcon}
                    profileImageUrl={(user as any)?.profileImageUrl}
                    size="md"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {(user as any)?.username || (user as any)?.email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(user as any)?.email}
                    </span>
                    {/* Show sun sign if available */}
                    {astrologyData?.sunSign && (
                      <span className="text-xs text-yellow-400">
                        {astrologyData.sunSign}
                      </span>
                    )}
                  </div>
                  
                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out pointer-events-none z-50 group-hover:translate-y-0 translate-y-2">
                    <div className="relative bg-gradient-to-br from-purple-500/90 to-pink-500/90 backdrop-blur-md text-white text-xs rounded-xl px-4 py-2.5 whitespace-nowrap shadow-xl border border-white/20">
                      <div className="text-center">
                        <div className="font-medium tracking-wide">✨ Vibe Check & Charts ✨</div>
                      </div>
                      {/* Arrow pointing up */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-b-6 border-transparent border-b-purple-500/90" />
                      {/* Soft glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-xl blur-sm -z-10" />
                    </div>
                  </div>
                </div>
              ) : null}
              
              {/* Slide-out Profile Card */}
              {showProfileCard && (
                <div 
                  className="fixed top-16 left-0 right-0 bg-black/75 backdrop-blur-md border-b border-white/20 p-6 shadow-2xl z-50 transform transition-all duration-200 ease-out"
                >
                  {/* Close button */}
                  <button
                    onClick={() => setShowProfileCard(false)}
                    className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  <UserProfileCard />
                </div>
              )}
              
              {/* Spotify Integration - Second after profile */}
              {user && (
                <div className="relative">
                  <div 
                    className="w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-white/10 rounded-lg transition-colors group"
                    onClick={() => setShowSpotifyCard(true)}
                  >
                    <SiSpotify className="w-5 h-5 text-green-500 hover:text-green-400 transition-colors" />
                  </div>
                  
                  {/* Spotify Card Popup */}
                  {showSpotifyCard && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-start pt-20 p-4" onClick={() => setShowSpotifyCard(false)}>
                      <div 
                        className="bg-background border border-border rounded-xl shadow-2xl max-w-md w-full max-h-[70vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="p-4 border-b border-border flex items-center justify-between">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <SiSpotify className="w-5 h-5 text-green-500" />
                            Spotify Integration
                          </h3>
                          <button
                            onClick={() => setShowSpotifyCard(false)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-red-500/10 hover:text-red-500 border border-border hover:border-red-500/20"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-4">
                          <SpotifyCardContent />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mood History Button - Third after Spotify */}
              {user && (
                <div className="relative group">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMoodHistoryClick}
                    className="text-muted-foreground hover:text-foreground hover:bg-white/10 p-2 rounded-lg transition-colors"
                  >
                    <BookOpen className="w-5 h-5" />
                  </Button>
                  
                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out pointer-events-none z-50 group-hover:translate-y-0 translate-y-2">
                    <div className="relative bg-gradient-to-br from-purple-500/90 to-pink-500/90 backdrop-blur-md text-white text-xs rounded-xl px-4 py-2.5 whitespace-nowrap shadow-xl border border-white/20">
                      <div className="text-center">
                        <div className="font-medium tracking-wide">📊 Mood Journal</div>
                      </div>
                      {/* Arrow pointing up */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-b-6 border-transparent border-b-purple-500/90" />
                      {/* Soft glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-xl blur-sm -z-10" />
                    </div>
                  </div>
                </div>
              )}

              {/* Mood-Transit Correlation Button - After Mood Analytics */}
              {user && (
                <div className="relative group">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = '/mood-analysis'}
                    className="text-muted-foreground hover:text-foreground hover:bg-white/10 p-2 rounded-lg transition-colors"
                    data-testid="button-mood-analysis"
                  >
                    <TrendingUp className="w-5 h-5" />
                  </Button>
                  
                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out pointer-events-none z-50 group-hover:translate-y-0 translate-y-2">
                    <div className="relative bg-gradient-to-br from-purple-500/90 to-pink-500/90 backdrop-blur-md text-white text-xs rounded-xl px-4 py-2.5 whitespace-nowrap shadow-xl border border-white/20">
                      <div className="text-center">
                        <div className="font-medium tracking-wide">🌟 Cosmic Mood Analysis</div>
                      </div>
                      {/* Arrow pointing up */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-b-6 border-transparent border-b-purple-500/90" />
                      {/* Soft glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-xl blur-sm -z-10" />
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback Analytics Button - After Cosmic Mood Analysis */}
              {user && (
                <div className="relative group">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = '/feedback-analytics'}
                    className="text-muted-foreground hover:text-foreground hover:bg-white/10 p-2 rounded-lg transition-colors"
                    data-testid="button-feedback-analytics"
                  >
                    <BarChart3 className="w-5 h-5" />
                  </Button>
                  
                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out pointer-events-none z-50 group-hover:translate-y-0 translate-y-2">
                    <div className="relative bg-gradient-to-br from-purple-500/90 to-pink-500/90 backdrop-blur-md text-white text-xs rounded-xl px-4 py-2.5 whitespace-nowrap shadow-xl border border-white/20">
                      <div className="text-center">
                        <div className="font-medium tracking-wide">💬 Accuracy Metrics</div>
                      </div>
                      {/* Arrow pointing up */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-b-6 border-transparent border-b-purple-500/90" />
                      {/* Soft glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-xl blur-sm -z-10" />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Share Button - Fourth after Mood */}
              {(user && messages.length > 0) ? (
                <ShareButton 
                  type="conversation" 
                  sessionId={sessionId} 
                  variant="ghost" 
                  size="sm" 
                />
              ) : null}
              
              {/* Theme Toggle - Fourth after Share Button */}
              <StarryNightToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
              
              {/* Logout Button - Last */}
              {user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await apiRequest('POST', '/api/auth/logout');
                      window.location.href = '/';
                    } catch (error) {
                      console.error('Logout error:', error);
                      window.location.href = '/';
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/login'}
                  className="text-sm"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="max-w-4xl mx-auto px-4 pb-32">
        

        
        {/* Hero Section */}
        <div className="text-center py-12 cosmic-bg rounded-b-3xl mb-8">
          <div className="w-16 h-16 cosmic-gradient rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            AI-curated music to match your individual weekly planetary transits
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Let our AI astrologer create a personalized 7-song weekly playlist based on your birth chart and current planetary movements.
          </p>
        </div>


        {/* Chat Messages */}
        <div className="space-y-6 mb-8">
          {messages.map((message: any) => (
            <ChatMessage 
              key={message.id} 
              message={{...message, sessionId}} 
            />
          ))}
          {(sendMessageMutation.isPending || getDailyHoroscopeMutation.isPending) && (
            <ChatMessage 
              message={{
                role: 'assistant',
                content: 'Channeling cosmic energies...',
                metadata: { type: 'loading' }
              }}
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <QuickActions 
          onAction={handleQuickAction}
          disabled={sendMessageMutation.isPending || getDailyHoroscopeMutation.isPending}
        />
      </main>

      {/* Chat Input */}
      <ChatInput 
        onSendMessage={handleSendMessage}
        disabled={sendMessageMutation.isPending || getDailyHoroscopeMutation.isPending}
        hasPlaylist={hasPlaylist}
        hasBirthInfo={hasBirthInfo}
      />

      {/* Mood Feedback Modal */}
      <MoodTrackerModal 
        isOpen={showMoodModal}
        onClose={() => setShowMoodModal(false)}
        initialTab={moodModalTab}
      />

      {/* Guest Exit Modal */}
      <GuestExitModal 
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}
