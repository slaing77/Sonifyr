import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import RotatingHeroText from "@/components/rotating-hero-text";
import AnimatedPage from "@/components/animated-page";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check if user is authenticated
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Check URL parameters for OAuth status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const needsProfile = params.get('needs_profile');
    
    if (error) {
      toast({
        title: "Authentication Error",
        description: "Failed to connect with Spotify. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/');
    }
    
    if (needsProfile === 'true') {
      toast({
        title: "✨ Welcome to Sonifyr!",
        description: "Please enter your birth information to generate your cosmic playlist",
      });
      // Redirect to profile setup or show birth data form
      setLocation('/profile-setup');
      window.history.replaceState({}, '', '/');
    }
  }, [toast, setLocation]);

  // If already authenticated and has birth data, redirect to main app
  useEffect(() => {
    if (user && user.birthDate && user.birthTime && user.birthLocation) {
      setLocation('/');
    }
  }, [user, setLocation]);

  const handleSpotifyLogin = () => {
    // Redirect to Spotify OAuth
    window.location.href = '/api/auth/spotify';
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                  <Music className="h-12 w-12 text-white" />
                </div>
              </div>
              <h1 className="text-5xl font-bold text-gray-900 mb-4">
                🎵 Sonifyr 🎵
              </h1>
              <p className="text-xl text-blue-600 font-semibold mb-4">
                Turn Planetary data into sound.
              </p>
              <RotatingHeroText />
            </div>

            {/* Main CTA */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-center text-3xl">
                  Your Personalized Cosmic Playlist
                </CardTitle>
                <CardDescription className="text-center text-lg">
                  Connect your Spotify account to generate playlists based on your birth chart and musical taste
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-3 text-gray-700">
                      <span className="text-2xl">🎭</span>
                      <span>Your Birth Chart</span>
                    </div>
                    <div className="text-gray-400 text-2xl">+</div>
                    <div className="flex items-center justify-center space-x-3 text-gray-700">
                      <span className="text-2xl">🎵</span>
                      <span>Your Music DNA</span>
                    </div>
                    <div className="text-gray-400 text-2xl">=</div>
                    <div className="flex items-center justify-center space-x-3 text-gray-700 font-semibold">
                      <span className="text-2xl">✨</span>
                      <span>Your Cosmic Soundtrack</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSpotifyLogin}
                    className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white text-lg py-7 flex items-center justify-center space-x-3"
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <span>Sign in with Spotify</span>
                  </Button>

                  <p className="text-sm text-gray-500 text-center">
                    We'll use your Spotify listening history to create a personalized playlist that resonates with your cosmic energy
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <div className="text-4xl">🌟</div>
                <h3 className="font-semibold">Astrological Insights</h3>
                <p className="text-sm text-gray-600">Based on your unique birth chart</p>
              </div>
              <div className="space-y-2">
                <div className="text-4xl">🎵</div>
                <h3 className="font-semibold">Your Music Taste</h3>
                <p className="text-sm text-gray-600">Curated from your Spotify history</p>
              </div>
              <div className="space-y-2">
                <div className="text-4xl">✨</div>
                <h3 className="font-semibold">Cosmic Playlists</h3>
                <p className="text-sm text-gray-600">Weekly personalized soundtracks</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
