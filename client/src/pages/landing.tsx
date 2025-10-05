import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Music, Star, Crown, Zap, Heart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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
  // Rate limiting disabled for testing
  const [canGenerate, setCanGenerate] = useState(true);
  const [lastGeneratedDate, setLastGeneratedDate] = useState<string | null>(null);
  
  // Choice screen state
  const [showChoiceScreen, setShowChoiceScreen] = useState(false);
  const [parsedBirthData, setParsedBirthData] = useState<any>(null);
  
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

  // Rate limiting disabled for testing
  // useEffect(() => {
  //   const lastGenerated = localStorage.getItem('lastPlaylistGenerated');
  //   if (lastGenerated) {
  //     const lastDate = new Date(lastGenerated);
  //     const now = new Date();
  //     const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
  //     
  //     if (daysDiff < 7) {
  //       setCanGenerate(false);
  //       setLastGeneratedDate(lastDate.toLocaleDateString());
  //     }
  //   }
  // }, []);

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

  // Personalized cosmic journey (with Spotify OAuth)
  const generatePersonalizedPlaylist = useMutation({
    mutationFn: async (birthData: any) => {
      setIsGenerating(true);
      // First, redirect to Spotify OAuth with birth data in state using base64url encoding
      const stateData = JSON.stringify(birthData);
      const state = btoa(stateData).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      window.location.href = `/api/spotify/personalized-auth?state=${state}`;
      return null; // Won't reach this due to redirect
    },
    onError: (error: any) => {
      setIsGenerating(false);
      toast({
        title: "Error starting personalization",
        description: error?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BirthData) => {
    // Parse and validate birth data first
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
    
    // Store parsed data and show choice screen
    setParsedBirthData({
      birthDate,
      birthTime,
      birthLocation
    });
    setShowChoiceScreen(true);
  };

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

          {/* Choice Screen */}
          {showChoiceScreen && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-center text-2xl">✨ Your Cosmic Profile is Ready ✨</CardTitle>
                <CardDescription className="text-center text-lg">
                  How would you like your planetary frequencies translated into music?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Quick Cosmic Experience */}
                  <Card className="cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all duration-200">
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
                          <span>No signup required</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <Star className="h-4 w-4" />
                          <span>Ready in 30 seconds</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => {
                          setShowEmailCollection(true);
                        }}
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        data-testid="button-quick-cosmic"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Choose Quick Cosmic Experience
                      </Button>
                      <p className="text-xs text-gray-500">Perfect for exploring how planetary frequencies work with music</p>
                    </CardContent>
                  </Card>

                  {/* Deeply Personalized Journey */}
                  <Card className="cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all duration-200">
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
                          <span>Tailored to YOUR listening history</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <Crown className="h-4 w-4" />
                          <span>Connect with Spotify</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <Sparkles className="h-4 w-4" />
                          <span>Enhanced accuracy & relevance</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => {
                          generatePersonalizedPlaylist.mutate(parsedBirthData);
                        }}
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                        data-testid="button-personalized-cosmic"
                      >
                        {isGenerating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Connecting to Spotify...
                          </>
                        ) : (
                          <>
                            <Heart className="w-4 h-4 mr-2" />
                            Connect Spotify for Deep Personalization
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-gray-500">Blend your unique taste with cosmic frequencies</p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6 text-center">
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowChoiceScreen(false)}
                    className="text-gray-500"
                  >
                    ← Back to edit birth info
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email Collection Screen - Only show after Quick Cosmic Experience selection */}
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
                  {/* Email Input */}
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
                  
                  {/* Newsletter Options */}
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

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-4 pt-6">
                    <Button 
                      onClick={() => {
                        console.log('Generate Quick Playlist button clicked', { quickEmail, parsedBirthData });
                        if (!quickEmail || !quickEmail.includes('@')) {
                          toast({
                            title: "Valid email required",
                            description: "Please enter a valid email address to receive your playlist",
                            variant: "destructive",
                          });
                          return;
                        }
                        // Use parsedBirthData if available, otherwise get it from form
                        const birthData = parsedBirthData || (() => {
                          const formData = form.getValues();
                          const birthInfoParts = formData.birthInfo.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+(am|pm)\s+(.+)$/i);
                          if (!birthInfoParts) return null;
                          
                          const [, month, day, year, hour, minute, ampm, location] = birthInfoParts;
                          let hour24 = parseInt(hour);
                          if (ampm.toLowerCase() === 'pm' && hour24 !== 12) {
                            hour24 += 12;
                          } else if (ampm.toLowerCase() === 'am' && hour24 === 12) {
                            hour24 = 0;
                          }
                          
                          return {
                            birthDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
                            birthTime: `${hour24.toString().padStart(2, '0')}:${minute}`,
                            birthLocation: location.trim()
                          };
                        })();
                        
                        if (!birthData) {
                          toast({
                            title: "Birth data required",
                            description: "Please complete the birth information form first",
                            variant: "destructive",
                          });
                          setShowEmailCollection(false);
                          return;
                        }
                        
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
                      ← Back to choose experience type
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Birth Data Form - Always show unless email collection is active */}
          {!showEmailCollection && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-center">Enter Your Birth Information</CardTitle>
                <CardDescription className="text-center">
                  Enter your birth details, then choose your cosmic experience
                </CardDescription>
              </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-6">
                  {/* Birth Information - Top Priority */}
                  <div className="space-y-2">
                    <Label htmlFor="birthInfo" className="text-lg font-semibold">🌟 Your Cosmic Birth Data</Label>
                    <Input
                      id="birthInfo"
                      type="text"
                      placeholder="3/15/1990 2:30 pm New York, USA"
                      data-testid="input-birth-info"
                      {...form.register("birthInfo")}
                      className="text-center text-lg py-3"
                    />
                    <p className="text-sm text-gray-500 text-center">
                      Format: mm/dd/yyyy 00:00 am/pm City, Country
                    </p>
                    {form.formState.errors.birthInfo && (
                      <p className="text-sm text-red-500 text-center">{form.formState.errors.birthInfo.message}</p>
                    )}
                  </div>
                  
                </div>
                
                <div className="text-center">
                  {!canGenerate ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <h3 className="font-semibold text-amber-800 mb-2">Weekly Limit Reached</h3>
                        <p className="text-amber-700 text-sm">
                          You generated your free playlist on {lastGeneratedDate}. 
                          Come back next week for a new one, or upgrade to Premium for unlimited access!
                        </p>
                      </div>
                      <Link href="/waitlist">
                        <Button 
                          size="lg" 
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 w-full md:w-auto px-8"
                          data-testid="button-upgrade-from-limit"
                        >
                          <Crown className="w-5 h-5 mr-2" />
                          Join Wait List
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Button 
                      type="submit" 
                      size="lg" 
                      disabled={isGenerating}
                      data-testid="button-generate-playlist"
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 w-full md:w-auto px-12"
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
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
          )}

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <Sparkles className="h-8 w-8 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">AI-Powered Curation</h3>
                <p className="text-gray-600">
                  Your celestial blueprint guides our AI in creating a personalized playlist that resonates with your cosmic energy.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Star className="h-8 w-8 text-purple-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Weekly Transits</h3>
                <p className="text-gray-600">
                  Each song is selected based on current planetary movements and how they interact with your birth chart.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Music className="h-8 w-8 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Spotify Export</h3>
                <p className="text-gray-600">
                  View your playlist and export it directly to Spotify with detailed astrological explanations.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Premium Teaser */}
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-6 text-center">
              <Crown className="h-8 w-8 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-amber-800">Want More Cosmic Experiences?</h3>
              <p className="text-amber-700 mb-4">
                Join the wait list to unlock more cosmic secrets
              </p>
              <Link href="/waitlist">
                <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" data-testid="button-learn-premium">
                  Join Wait List
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}