import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Music, ExternalLink, Crown, Share2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { PlaylistData, Song } from "@shared/schema";

export default function PlaylistResult() {
  const [, setLocation] = useLocation();
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem('guestPlaylist');
    if (storedData) {
      setPlaylistData(JSON.parse(storedData));
    } else {
      // Redirect back to landing if no playlist data
      setLocation('/');
    }
  }, [setLocation]);

  const handleSpotifyExport = () => {
    setIsExporting(true);
    // For now, just show a message that they need to sign up for export
    setTimeout(() => {
      setIsExporting(false);
      alert("To export playlists to Spotify, please sign up for a free account!");
    }, 1000);
  };

  const handleGenerateAnother = () => {
    localStorage.removeItem('guestPlaylist');
    setLocation('/');
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
              🎵 Your Cosmic Playlist is Ready! 🎵
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
                You can generate one free cosmic playlist per week. Come back next week for a new playlist!
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
                <Link href="/upgrade">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 w-full md:w-auto px-8"
                    data-testid="button-upgrade-premium"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    Upgrade to Premium
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
    </div>
  );
}