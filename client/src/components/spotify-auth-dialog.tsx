import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SpotifyAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: (spotifyData: any) => void;
}

export function SpotifyAuthDialog({ open, onOpenChange, onAuthSuccess }: SpotifyAuthDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleSpotifyConnect = async () => {
    setIsConnecting(true);
    
    try {
      // Get Spotify auth URL for guest users
      const response = await fetch('/api/spotify/guest-auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to get Spotify auth URL');
      }
      
      const data = await response.json();
      
      if (data.authUrl) {
        // Store callback info for when user returns
        sessionStorage.setItem('spotifyAuthInProgress', 'true');
        
        // Open Spotify auth in new window
        const authWindow = window.open(
          data.authUrl, 
          'spotify-auth', 
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );
        
        if (authWindow) {
          // Poll for auth completion
          const pollForAuth = setInterval(async () => {
            try {
              if (authWindow.closed) {
                clearInterval(pollForAuth);
                setIsConnecting(false);
                
                // Check if auth was successful
                const authResult = sessionStorage.getItem('spotifyAuthSuccess');
                if (authResult) {
                  const spotifyData = JSON.parse(authResult);
                  sessionStorage.removeItem('spotifyAuthSuccess');
                  sessionStorage.removeItem('spotifyAuthInProgress');
                  onAuthSuccess(spotifyData);
                  onOpenChange(false);
                  toast({
                    title: "Connected to Spotify!",
                    description: "You can now export your playlist directly to Spotify.",
                  });
                } else {
                  toast({
                    title: "Authentication Cancelled",
                    description: "Spotify connection was not completed.",
                    variant: "destructive",
                  });
                }
              }
            } catch (error) {
              console.error('Error polling for auth:', error);
              clearInterval(pollForAuth);
              setIsConnecting(false);
            }
          }, 1000);
          
          toast({
            title: "Spotify Login Opened",
            description: "Complete the login in the popup window to connect your account.",
            duration: 5000,
          });
        } else {
          throw new Error('Popup was blocked');
        }
      } else {
        throw new Error('No auth URL received');
      }
    } catch (error) {
      console.error('Error connecting to Spotify:', error);
      setIsConnecting(false);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Spotify. Please check that popups are enabled and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-green-600" />
            Connect to Spotify
          </DialogTitle>
          <DialogDescription>
            To export your cosmic playlist, connect your Spotify account. This is quick, secure, and free!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-green-800">What you'll get:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>✨ Direct playlist export to your Spotify account</li>
              <li>🎵 All 7 songs added instantly</li>
              <li>🔒 Secure connection - we never store your credentials</li>
              <li>📱 Works with free Spotify accounts</li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleSpotifyConnect}
              disabled={isConnecting}
              className="bg-green-600 hover:bg-green-700 w-full"
              data-testid="button-connect-spotify"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Spotify Account
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isConnecting}
              data-testid="button-cancel-spotify"
            >
              Maybe Later
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            By connecting, you agree to Spotify's terms of service. 
            We only request permission to create and modify playlists.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}