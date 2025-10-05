import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Music, Star, Heart, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import RotatingHeroText from "@/components/rotating-hero-text";
import AnimatedPage from "@/components/animated-page";

const birthDataSchema = z.object({
  birthInfo: z.string().min(1, "Birth information is required").refine(
    (value) => {
      const pattern = /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}\s+(am|pm)\s+.+,.+$/i;
      return pattern.test(value.trim());
    },
    {
      message: "Please use format: mm/dd/yyyy 00:00 am/pm City, Country (e.g., 3/15/1990 2:30 pm New York, USA)"
    }
  ),
});

type BirthData = z.infer<typeof birthDataSchema>;

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPath, setSelectedPath] = useState<'quick' | 'personalized' | null>(null);

  const form = useForm<BirthData>({
    resolver: zodResolver(birthDataSchema),
    defaultValues: {
      birthInfo: "",
    },
  });

  // Check Spotify connection status for personalized path
  const { data: spotifyStatus, refetch: refetchSpotifyStatus } = useQuery({
    queryKey: ['/api/spotify/status'],
    refetchOnWindowFocus: true,
  });

  // Check for Spotify connection success in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('spotify') === 'connected') {
      refetchSpotifyStatus();
      toast({
        title: "✨ Spotify Connected!",
        description: "Now enter your birth data to generate your personalized playlist",
      });
      setSelectedPath('personalized');
      window.history.replaceState({}, '', '/');
    }
  }, [refetchSpotifyStatus, toast]);

  // Quick path: Spotify's Library + Your Cosmic Blueprint
  const generateQuickPlaylist = useMutation({
    mutationFn: async (birthData: any) => {
      setIsGenerating(true);
      const response = await fetch('/api/generate-guest-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(birthData),
      });
      if (!response.ok) {
        throw new Error('Failed to generate playlist');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setIsGenerating(false);
      localStorage.setItem('guestPlaylist', JSON.stringify(data));
      setLocation('/playlist-result');
    },
    onError: (error: any) => {
      setIsGenerating(false);
      toast({
        title: "Error generating playlist",
        description: error?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Personalized path: Your Music DNA + Your Cosmic Blueprint
  const generatePersonalizedPlaylist = useMutation({
    mutationFn: async (birthData: any) => {
      setIsGenerating(true);
      const response = await fetch('/api/generate-personalized-playlist', {
        method: 'POST',
        body: JSON.stringify(birthData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate personalized playlist');
      }
      
      return await response.json();
    },
    onSuccess: (data: any) => {
      setIsGenerating(false);
      localStorage.setItem('guestPlaylist', JSON.stringify(data.playlist));
      setLocation('/playlist-result?personalized=true');
    },
    onError: (error: any) => {
      setIsGenerating(false);
      toast({
        title: "Error generating personalized playlist",
        description: error?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BirthData) => {
    const birthInfoParts = data.birthInfo.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+(am|pm)\s+(.+)$/i);
    
    if (!birthInfoParts) {
      toast({
        title: "Invalid birth info format",
        description: "Please use format: mm/dd/yyyy 00:00 am/pm City, Country",
        variant: "destructive",
      });
      return;
    }
    
    const [, month, day, year, hour, minute, ampm, location] = birthInfoParts;
    
    // Convert to 24-hour format
    let hour24 = parseInt(hour);
    if (ampm.toLowerCase() === 'pm' && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm.toLowerCase() === 'am' && hour24 === 12) {
      hour24 = 0;
    }
    
    const birthData = {
      birthDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      birthTime: `${hour24.toString().padStart(2, '0')}:${minute}`,
      birthLocation: location.trim()
    };

    if (selectedPath === 'quick') {
      generateQuickPlaylist.mutate(birthData);
    } else {
      generatePersonalizedPlaylist.mutate(birthData);
    }
  };

  const isSpotifyConnected = (spotifyStatus as any)?.connected;

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
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

          {/* Main Content */}
          {!selectedPath ? (
            /* Path Selection */
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-center text-3xl">Choose Your Cosmic Journey</CardTitle>
                <CardDescription className="text-center text-lg">
                  Select how you'd like to generate your personalized playlist
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Option 1: Spotify's Library */}
                  <Card 
                    className="cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all duration-200 border-2"
                    onClick={() => setSelectedPath('quick')}
                    data-testid="card-quick-path"
                  >
                    <CardContent className="p-8 text-center space-y-6">
                      <div className="flex justify-center">
                        <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                          <Star className="h-10 w-10 text-white" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          Spotify's Library + Your Cosmic Blueprint
                        </h3>
                        <p className="text-gray-600">
                          Universal music selection based on your birth chart
                        </p>
                      </div>
                      <Button 
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg py-6"
                        data-testid="button-quick-path"
                      >
                        Continue <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Option 2: Your Music DNA */}
                  <Card 
                    className="cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all duration-200 border-2"
                    onClick={() => {
                      // For now, use the same flow but require Spotify connection
                      setSelectedPath('personalized');
                    }}
                    data-testid="card-personalized-path"
                  >
                    <CardContent className="p-8 text-center space-y-6">
                      <div className="flex justify-center">
                        <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full">
                          <Heart className="h-10 w-10 text-white" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          Your Music DNA + Your Cosmic Blueprint
                        </h3>
                        <p className="text-gray-600">
                          Personalized based on YOUR listening history
                        </p>
                      </div>
                      <Button 
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-lg py-6"
                        data-testid="button-personalized-path"
                      >
                        Connect Spotify <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Birth Data Entry */
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-center text-2xl">
                  {selectedPath === 'quick' 
                    ? '🌟 Spotify\'s Library + Your Cosmic Blueprint' 
                    : '✨ Your Music DNA + Your Cosmic Blueprint'}
                </CardTitle>
                <CardDescription className="text-center text-lg">
                  {selectedPath === 'quick'
                    ? 'Enter your birth details to generate your cosmic playlist'
                    : isSpotifyConnected
                      ? 'Spotify connected! Now enter your birth details'
                      : 'Connect Spotify to access your personalized experience'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Spotify Connection for Personalized Path */}
                {selectedPath === 'personalized' && !isSpotifyConnected && (
                  <div className="mb-6 text-center space-y-4">
                    <div className="p-6 bg-purple-50 border-2 border-purple-200 rounded-lg">
                      <Heart className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-purple-900 mb-2">
                        Connect Your Spotify Account
                      </h3>
                      <p className="text-purple-700 mb-4">
                        We'll analyze your listening history to create a truly personalized cosmic playlist
                      </p>
                      <Button
                        onClick={() => {
                          window.location.href = '/api/spotify/connect';
                        }}
                        className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-lg px-8 py-6"
                        data-testid="button-connect-spotify"
                      >
                        <Music className="w-5 h-5 mr-2" />
                        Connect Spotify
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setSelectedPath(null);
                        form.reset();
                      }}
                      className="text-gray-500"
                      data-testid="button-back"
                    >
                      ← Back to choose journey
                    </Button>
                  </div>
                )}

                {/* Birth Data Form */}
                {(selectedPath === 'quick' || (selectedPath === 'personalized' && isSpotifyConnected)) && (
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {selectedPath === 'personalized' && isSpotifyConnected && (
                      <div className="flex items-center justify-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                        <Music className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-800">
                          ✓ Connected to Spotify as {(spotifyStatus as any)?.user?.display_name || 'User'}
                        </span>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="birthInfo" className="text-lg font-semibold">🌟 Your Birth Information</Label>
                      <Input
                        id="birthInfo"
                        type="text"
                        placeholder="3/15/1990 2:30 pm New York, USA"
                        data-testid="input-birth-info"
                        {...form.register("birthInfo")}
                        className="text-center text-lg py-6"
                      />
                      <p className="text-sm text-gray-500 text-center">
                        Format: mm/dd/yyyy 00:00 am/pm City, Country
                      </p>
                      {form.formState.errors.birthInfo && (
                        <p className="text-sm text-red-500 text-center">{form.formState.errors.birthInfo.message}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <Button 
                        type="submit" 
                        size="lg" 
                        disabled={isGenerating}
                        data-testid="button-generate-playlist"
                        className={selectedPath === 'quick' 
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 w-full text-lg py-6" 
                          : "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 w-full text-lg py-6"}
                      >
                        {isGenerating ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Consulting the Stars...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5 mr-2" />
                            Generate My Cosmic Playlist
                          </>
                        )}
                      </Button>

                      <Button 
                        type="button"
                        variant="ghost" 
                        onClick={() => {
                          setSelectedPath(null);
                          form.reset();
                        }}
                        className="text-gray-500"
                        data-testid="button-back"
                      >
                        ← Back to choose journey
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardContent className="p-6 text-center">
                <Star className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Astrological Analysis</h3>
                <p className="text-sm text-gray-600">
                  We analyze your birth chart and current planetary transits to understand your cosmic energy
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Music className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Curation</h3>
                <p className="text-sm text-gray-600">
                  Advanced AI matches your astrological frequencies with music that resonates
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Sparkles className="h-8 w-8 text-pink-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Weekly Playlists</h3>
                <p className="text-sm text-gray-600">
                  Each song is carefully chosen for a specific day based on that day's planetary alignment
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Waitlist CTA */}
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
            <CardContent className="p-8 text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Loved Sonifyr? 🌟
              </h2>
              <p className="text-xl text-gray-700 mb-2">
                Wait till you see what's orbiting next…
              </p>
              <p className="text-lg text-gray-600 mb-6">
                Sign up to be the first to experience <span className="font-bold text-purple-700">Stardust + Nova</span> — where your stars go supernova.
              </p>
              <Link href="/waitlist">
                <Button 
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-lg px-8 py-6"
                  data-testid="button-waitlist"
                >
                  ✨ Join the waitlist <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </AnimatedPage>
  );
}
