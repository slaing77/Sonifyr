import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Music, Star, Crown, Zap, Heart, Check, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import RotatingHeroText from "@/components/rotating-hero-text";

const birthDataSchema = z.object({
  birthInfo: z.string().min(1, "Birth information is required").refine(
    (value) => {
      // Basic validation for format: mm/dd/yyyy time am/pm City, Country
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
  const [canGenerate, setCanGenerate] = useState(true);
  const [lastGeneratedDate, setLastGeneratedDate] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<'quick' | 'personalized' | null>(null);
  
  // Email collection state for Quick path
  const [showEmailCollection, setShowEmailCollection] = useState(false);
  const [quickEmail, setQuickEmail] = useState("");
  const [quickNewsletterPreference, setQuickNewsletterPreference] = useState("playlist-only");

  const form = useForm<BirthData>({
    resolver: zodResolver(birthDataSchema),
    defaultValues: {
      birthInfo: "",
    },
  });

  // Check Spotify connection status
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
        title: "Spotify Connected!",
        description: "You can now generate personalized playlists",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  }, [refetchSpotifyStatus, toast]);

  // Quick cosmic experience (service account only)
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

  // Personalized playlist with stored Spotify tokens
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
      // Store playlist in localStorage for the results page
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
    
    const birthDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const birthTime = `${hour24.toString().padStart(2, '0')}:${minute}`;
    const birthLocation = location.trim();
    
    const parsedData = {
      birthDate,
      birthTime,
      birthLocation
    };

    // Route to appropriate generation method
    if (selectedPath === 'quick') {
      setShowEmailCollection(true);
    } else if (selectedPath === 'personalized') {
      generatePersonalizedPlaylist.mutate(parsedData);
    }
  };

  const isSpotifyConnected = (spotifyStatus as any)?.connected;

  return (
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

          {/* Email Collection Screen */}
          {showEmailCollection && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-center text-2xl">⚡ Quick Cosmic Experience</CardTitle>
                <CardDescription className="text-center text-lg">
                  How would you like to receive your cosmic playlist?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="quick-email" className="text-lg font-semibold">📧 Your Email Address</Label>
                    <Input
                      id="quick-email"
                      type="email"
                      placeholder="your.email@example.com"
                      data-testid="input-quick-email"
                      className="text-center text-lg py-3"
                      value={quickEmail}
                      onChange={(e) => setQuickEmail(e.target.value)}
                    />
                    <p className="text-sm text-gray-500 text-center">
                      We'll send your cosmic playlist here
                    </p>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <Label className="text-base font-medium">Choose your cosmic journey:</Label>
                    <RadioGroup
                      value={quickNewsletterPreference}
                      onValueChange={(value: "newsletter" | "playlist-only") => setQuickNewsletterPreference(value)}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <RadioGroupItem value="playlist-only" id="quick-playlist-only" data-testid="radio-quick-playlist-only" />
                        <Label htmlFor="quick-playlist-only" className="flex-1 cursor-pointer">
                          <div className="font-medium text-gray-700">🎵 Just send me this playlist</div>
                          <div className="text-sm text-gray-600">One-time cosmic playlist delivery</div>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-3 rounded-lg border border-purple-200 bg-purple-50">
                        <RadioGroupItem value="newsletter" id="quick-newsletter" data-testid="radio-quick-newsletter" />
                        <Label htmlFor="quick-newsletter" className="flex-1 cursor-pointer">
                          <div className="font-medium text-purple-800">🌙 Sign me up for weekly cosmic playlists!</div>
                          <div className="text-sm text-purple-600">Your Chart. Your Sound. Your Weekly Sonifyr</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex flex-col gap-4 pt-6">
                    <Button 
                      onClick={() => {
                        if (!quickEmail || !quickEmail.includes('@')) {
                          toast({
                            title: "Valid email required",
                            description: "Please enter a valid email address to receive your playlist",
                            variant: "destructive",
                          });
                          return;
                        }

                        const formData = form.getValues();
                        const birthInfoParts = formData.birthInfo.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+(am|pm)\s+(.+)$/i);
                        if (!birthInfoParts) return;
                        
                        const [, month, day, year, hour, minute, ampm, location] = birthInfoParts;
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
                        
                        generateQuickPlaylist.mutate({
                          ...birthData,
                          email: quickEmail,
                          newsletterPreference: quickNewsletterPreference
                        });
                      }}
                      disabled={isGenerating}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 py-3"
                      data-testid="button-generate-quick-playlist"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Consulting the Stars...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Generate My Quick Cosmic Playlist
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowEmailCollection(false)}
                      className="text-gray-500"
                    >
                      ← Back
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content: Path Selection or Form */}
          {!showEmailCollection && (
            <>
              {!selectedPath ? (
                /* Path Selection Screen */
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="text-center text-2xl">Choose Your Cosmic Journey</CardTitle>
                    <CardDescription className="text-center text-lg">
                      Select how you'd like to generate your personalized playlist
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Quick Cosmic Experience */}
                      <Card 
                        className="cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all duration-200"
                        onClick={() => setSelectedPath('quick')}
                      >
                        <CardContent className="p-6 text-center space-y-4">
                          <div className="flex justify-center">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                              <Zap className="h-8 w-8 text-white" />
                            </div>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900">🌟 Quick Cosmic Experience</h3>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center justify-center space-x-2">
                              <Sparkles className="h-4 w-4" />
                              <span>Instant Planetary Analysis</span>
                            </div>
                            <div className="flex items-center justify-center space-x-2">
                              <Music className="h-4 w-4" />
                              <span>Universal Frequency Detection</span>
                            </div>
                            <div className="flex items-center justify-center space-x-2">
                              <Zap className="h-4 w-4" />
                              <span>No Spotify needed</span>
                            </div>
                            <div className="flex items-center justify-center space-x-2">
                              <Star className="h-4 w-4" />
                              <span>Ready in 30 seconds</span>
                            </div>
                          </div>
                          <Button 
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                            data-testid="button-quick-cosmic"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Choose Quick Experience
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Deeply Personalized Journey */}
                      <Card 
                        className="cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all duration-200"
                        onClick={() => setSelectedPath('personalized')}
                      >
                        <CardContent className="p-6 text-center space-y-4">
                          <div className="flex justify-center">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full">
                              <Heart className="h-8 w-8 text-white" />
                            </div>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900">🎯 Deeply Personalized Journey</h3>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center justify-center space-x-2">
                              <Heart className="h-4 w-4" />
                              <span>Your Music DNA + Cosmic Insights</span>
                            </div>
                            <div className="flex items-center justify-center space-x-2">
                              <Music className="h-4 w-4" />
                              <span>Based on YOUR listening history</span>
                            </div>
                            <div className="flex items-center justify-center space-x-2">
                              <Crown className="h-4 w-4" />
                              <span>Seamless Spotify export</span>
                            </div>
                            <div className="flex items-center justify-center space-x-2">
                              <Sparkles className="h-4 w-4" />
                              <span>Enhanced accuracy & relevance</span>
                            </div>
                          </div>
                          <Button 
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                            data-testid="button-personalized-cosmic"
                          >
                            <Heart className="w-4 h-4 mr-2" />
                            Choose Personalized Journey
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Birth Data Form */
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="text-center">
                      {selectedPath === 'quick' ? '⚡ Quick Cosmic Experience' : '🎯 Personalized Journey'}
                    </CardTitle>
                    <CardDescription className="text-center">
                      {selectedPath === 'quick' 
                        ? 'Enter your birth details to generate your cosmic playlist'
                        : 'Connect Spotify and enter your birth details for the ultimate personalized experience'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Spotify Connection Status for Personalized Path */}
                    {selectedPath === 'personalized' && (
                      <div className="mb-6">
                        {isSpotifyConnected ? (
                          <div className="flex items-center justify-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <Check className="h-5 w-5 text-green-600" />
                            <div className="flex-1">
                              <p className="font-semibold text-green-800">
                                ✓ Spotify Connected
                              </p>
                              <p className="text-sm text-green-600">
                                {(spotifyStatus as any)?.user?.display_name || 'Spotify User'}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Disconnect logic can be added here
                                window.location.href = '/api/spotify/connect';
                              }}
                              className="text-green-700 hover:text-green-800"
                            >
                              Reconnect
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-start space-x-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                              <Heart className="h-5 w-5 text-purple-600 mt-0.5" />
                              <div>
                                <p className="font-semibold text-purple-800 mb-1">
                                  Connect Spotify First
                                </p>
                                <p className="text-sm text-purple-600 mb-3">
                                  To create a truly personalized playlist, we need access to your Spotify listening history and the ability to export directly to your account.
                                </p>
                                <Button
                                  onClick={() => {
                                    window.location.href = '/api/spotify/connect';
                                  }}
                                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                                  data-testid="button-connect-spotify"
                                >
                                  <Music className="w-4 h-4 mr-2" />
                                  Connect Spotify
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="birthInfo" className="text-lg font-semibold">🌟 Your Cosmic Birth Data</Label>
                        <Input
                          id="birthInfo"
                          type="text"
                          placeholder="3/15/1990 2:30 pm New York, USA"
                          data-testid="input-birth-info"
                          {...form.register("birthInfo")}
                          className="text-center text-lg py-3"
                          disabled={selectedPath === 'personalized' && !isSpotifyConnected}
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
                          disabled={isGenerating || (selectedPath === 'personalized' && !isSpotifyConnected)}
                          data-testid="button-generate-playlist"
                          className={selectedPath === 'quick' 
                            ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 w-full" 
                            : "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 w-full"}
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
                        >
                          ← Back to choose experience
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
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
        </div>
      </div>
    </div>
  );
}
