import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Music, Star, Crown } from "lucide-react";
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

  const generatePlaylist = useMutation({
    mutationFn: async (data: BirthData) => {
      // Rate limiting disabled for testing
      // if (!canGenerate) {
      //   throw new Error('You can only generate one playlist per week. Upgrade to Premium for unlimited playlists!');
      // }
      
      setIsGenerating(true);
      // Parse the birth info string
      const birthInfoParts = data.birthInfo.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+(am|pm)\s+(.+)$/i);
      
      if (!birthInfoParts) {
        throw new Error('Invalid birth info format. Please use: mm/dd/yyyy 00:00 am/pm City, Country');
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
      
      const response = await fetch('/api/generate-guest-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ birthDate, birthTime, birthLocation }),
      });
      if (!response.ok) {
        throw new Error('Failed to generate playlist');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setIsGenerating(false);
      // Store the generated playlist data in localStorage for the results page
      localStorage.setItem('guestPlaylist', JSON.stringify(data));
      // Rate limiting disabled for testing
      // localStorage.setItem('lastPlaylistGenerated', new Date().toISOString());
      // setCanGenerate(false);
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

  const onSubmit = (data: BirthData) => {
    generatePlaylist.mutate(data);
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

          {/* Birth Data Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-center">Enter Your Birth Information</CardTitle>
              <CardDescription className="text-center">
                We need your birth details to calculate your cosmic playlist
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="birthInfo">Birth Information</Label>
                    <Input
                      id="birthInfo"
                      type="text"
                      placeholder="3/15/1990 2:30 pm New York, USA"
                      data-testid="input-birth-info"
                      {...form.register("birthInfo")}
                      className="text-center"
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
                      <Link href="/upgrade">
                        <Button 
                          size="lg" 
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 w-full md:w-auto px-8"
                          data-testid="button-upgrade-from-limit"
                        >
                          <Crown className="w-5 h-5 mr-2" />
                          Upgrade for Unlimited Playlists
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
                Unlock unlimited playlists, detailed birth chart readings, AI chat guidance, mood tracking, and more with our premium service.
              </p>
              <Link href="/upgrade">
                <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" data-testid="button-learn-premium">
                  Learn About Premium
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}