import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Music, ExternalLink, Crown, Share2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { SpotifyAuthDialog } from "@/components/spotify-auth-dialog";
import { useToast } from "@/hooks/use-toast";
import type { PlaylistData, Song } from "@shared/schema";

export default function PlaylistResult() {
  const [, setLocation] = useLocation();
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showSpotifyDialog, setShowSpotifyDialog] = useState(false);
  const [spotifyAuth, setSpotifyAuth] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadPlaylist = async () => {
      // Check if this is a personalized Spotify flow
      const urlParams = new URLSearchParams(window.location.search);
      const isPersonalized = urlParams.get('personalized') === 'true';
      
      if (isPersonalized) {
        // Fetch playlist from session
        try {
          const response = await fetch('/api/session/playlist');
          if (response.ok) {
            const playlist = await response.json();
            setPlaylistData(playlist);
            updateMetaTags(playlist);
            return;
          }
        } catch (error) {
          console.error('Error fetching session playlist:', error);
        }
      }
      
      // Fallback to localStorage
      const storedData = localStorage.getItem('guestPlaylist');
      if (storedData) {
        const playlist = JSON.parse(storedData);
        setPlaylistData(playlist);
        updateMetaTags(playlist);
      } else {
        // Redirect back to landing if no playlist data
        setLocation('/');
      }
    };
    
    loadPlaylist();
  }, [setLocation]);

  const updateMetaTags = (playlist: PlaylistData) => {
    // Generate unique playlist name and description
    const playlistName = `${playlist.name || 'Cosmic Playlist'}: Your Horoscope. Your Soundtrack`;
    const description = playlist.description || `Discover your personalized cosmic playlist curated by AI and astrology. ${playlist.songs?.length || 7} songs chosen based on planetary influences and astrological insights.`;
    const imageUrl = window.location.origin + '/generated_images/Sonifyr_star_logo_design_85955193.png';
    
    // Create URL with dynamic parameters for social sharing
    const baseUrl = window.location.origin + '/playlist-result';
    const urlParams = new URLSearchParams({
      name: playlist.name || 'Cosmic Playlist',
      description: description
    });
    const playlistUrl = `${baseUrl}?${urlParams.toString()}`;

    // Update page title
    document.title = playlistName + ' - Sonifyr';

    // Remove existing meta tags
    const existingMetas = document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], meta[name="description"]');
    existingMetas.forEach(meta => meta.remove());

    // Add new meta tags
    const metaTags = [
      { property: 'og:title', content: playlistName },
      { property: 'og:description', content: description },
      { property: 'og:image', content: imageUrl },
      { property: 'og:url', content: playlistUrl },
      { property: 'og:type', content: 'music.playlist' },
      { property: 'og:site_name', content: 'Sonifyr' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: playlistName },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: imageUrl },
      { name: 'description', content: description }
    ];

    metaTags.forEach(({ property, name, content }) => {
      const meta = document.createElement('meta');
      if (property) meta.setAttribute('property', property);
      if (name) meta.setAttribute('name', name);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    });
  };

  const handleSpotifyExport = async () => {
    if (!playlistData) return;
    
    // If user already has Spotify auth, export directly
    if (spotifyAuth) {
      await exportToSpotify();
      return;
    }
    
    // Otherwise, show Spotify auth dialog
    setShowSpotifyDialog(true);
  };

  const handleSpotifyAuthSuccess = (authData: any) => {
    setSpotifyAuth(authData);
    // Automatically export after successful auth
    exportToSpotify(authData);
  };

  const exportToSpotify = async (authData = spotifyAuth) => {
    if (!playlistData || !authData) return;
    
    setIsExporting(true);
    try {
      const response = await fetch('/api/guest/export-spotify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistData,
          spotifyAuth: authData
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "🎵 Playlist Exported!",
          description: `"${playlistData.name}" has been added to your Spotify account. Opening in new tab - you can close it and return here.`,
          duration: 6000,
        });
        
        // Open Spotify playlist in new tab
        if (result.spotifyUrl) {
          window.open(result.spotifyUrl, '_blank');
        }
      } else {
        throw new Error(result.message || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export playlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateAnother = () => {
    localStorage.removeItem('guestPlaylist');
    setLocation('/');
  };

  const handleShare = async () => {
    if (!playlistData) return;
    
    toast({
      title: "📸 Creating Share Image...",
      description: "Generating your cosmic playlist image to share",
    });
    
    try {
      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default;
      
      // Find the playlist content to capture
      const element = document.querySelector('.max-w-4xl') as HTMLElement;
      if (!element) {
        throw new Error('Playlist content not found');
      }
      
      // Generate canvas from the playlist content
      const canvas = await html2canvas(element, {
        backgroundColor: '#f8fafc',
        scale: 2, // Higher quality
        logging: false,
      });
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${playlistData.name.replace(/[^a-z0-9]/gi, '_')}_Sonifyr.png`;
      link.click();
      URL.revokeObjectURL(url);
      
      // Also copy share text to clipboard
      const shareText = `🌟 Check out my cosmic playlist "${playlistData.name}" - AI-curated music based on astrological insights! Generated by Sonifyr.\n\n${window.location.origin}`;
      await navigator.clipboard.writeText(shareText);
      
      toast({
        title: "✅ Playlist Image Ready!",
        description: "Image downloaded! Share text copied to clipboard. Paste the text and attach the image to share your cosmic playlist anywhere!",
        duration: 7000,
      });
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Share Error",
        description: "Couldn't generate image. Try taking a screenshot instead!",
        variant: "destructive",
      });
    }
  };

  const fallbackShare = (text: string, url: string) => {
    const fullText = `${text}\n\n${url}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(fullText).then(() => {
      toast({
        title: "📋 Copied to Clipboard!",
        description: "Share text has been copied. Paste it wherever you'd like to share your cosmic playlist.",
        duration: 5000,
      });
    }).catch(() => {
      // Manual copy fallback
      const textArea = document.createElement('textarea');
      textArea.value = fullText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "📋 Ready to Share!",
        description: "Your cosmic playlist share text is ready to copy and paste.",
        duration: 5000,
      });
    });
  };

  if (!playlistData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                <Music className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {playlistData.name}
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              {playlistData.description}
            </p>
          </div>

          {/* Playlist Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                {playlistData.name || 'Your Cosmic Playlist'}
              </CardTitle>
              <CardDescription>
                Week of {playlistData.weekStart} - {playlistData.weekEnd}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {playlistData.songs.map((song: Song, index: number) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{song.title}</h3>
                        <p className="text-gray-600">{song.artist}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Day {index + 1}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-white rounded border-l-4 border-purple-200">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        <strong>🌟 Cosmic Connection:</strong> {song.astrologicalInfluence || 'Selected based on your current planetary transits and birth chart energy'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Astrological Summary */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Your Weekly Cosmic Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {playlistData.astrologicalSummary}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {/* Spotify Button - different behavior based on auto-export status */}
            {(playlistData as any).spotifyPlaylistUrl ? (
              // Quick Cosmic Experience - Auto-exported, show Open in Spotify
              <Button 
                onClick={() => window.open((playlistData as any).spotifyPlaylistUrl, '_blank')}
                data-testid="button-open-spotify"
                className="bg-green-600 hover:bg-green-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Spotify
              </Button>
            ) : (
              // Personalized or failed auto-export - show export button
              <Button 
                onClick={handleSpotifyExport}
                disabled={isExporting}
                data-testid="button-export-spotify"
                className="bg-green-600 hover:bg-green-700"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Export to Spotify
                  </>
                )}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleGenerateAnother}
              data-testid="button-generate-another"
            >
              <Music className="w-4 h-4 mr-2" />
              Generate Another
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleShare}
              data-testid="button-share"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Playlist
            </Button>
          </div>

          {/* Weekly Limit Notice */}
          <Card className="bg-blue-50 border-blue-200 mb-8">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                ⏰ Free Weekly Limit
              </h3>
              <p className="text-blue-700 mb-4">
                We're keeping the cosmos sustainable! Our AI and astrological services have usage limits to ensure quality for everyone. Your next playlist will be ready next week—thank you for your patience! ✨
              </p>
            </CardContent>
          </Card>

          {/* Premium Upgrade CTA */}
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-8 text-center">
              <Crown className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-amber-800 mb-4">
                ✨ Unlock Your Full Cosmic Experience ✨
              </h2>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="text-left">
                  <h4 className="font-semibold text-amber-800 mb-2">Premium Features:</h4>
                  <ul className="space-y-1 text-amber-700">
                    <li>🎵 Unlimited playlist generation</li>
                    <li>💬 AI chat for cosmic guidance</li>
                    <li>📊 Detailed birth chart readings</li>
                    <li>🎯 Mood tracking & analytics</li>
                  </ul>
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-amber-800 mb-2">Plus Get:</h4>
                  <ul className="space-y-1 text-amber-700">
                    <li>🔮 Daily horoscopes</li>
                    <li>🌟 Transit details</li>
                    <li>📤 Direct Spotify export</li>
                    <li>💾 Save & share everything</li>
                  </ul>
                </div>
              </div>
              <div className="space-y-3">
                <Link href="/waitlist">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 w-full md:w-auto px-8"
                    data-testid="button-upgrade-premium"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    Join Wait List
                  </Button>
                </Link>
                <p className="text-sm text-amber-600">
                  Start your cosmic journey with unlimited features
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Spotify Auth Dialog */}
      <SpotifyAuthDialog
        open={showSpotifyDialog}
        onOpenChange={setShowSpotifyDialog}
        onAuthSuccess={handleSpotifyAuthSuccess}
      />
    </div>
  );
}