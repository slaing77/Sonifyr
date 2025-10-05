import { useState } from "react";
import { Share2, Copy, ExternalLink, Check, Loader2, Sparkles, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface ShareButtonProps {
  type: 'playlist' | 'conversation';
  sessionId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

interface ShareResponse {
  spotifyUrl?: string;
  playlistId?: string;
  shareId?: string;
  shareUrl?: string;
  socialText: {
    twitter: string;
    facebook: string;
    general: string;
  };
}

export default function ShareButton({ type, sessionId, variant = 'outline', size = 'default' }: ShareButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shareData, setShareData] = useState<ShareResponse | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [open, setOpen] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const shareMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/share/${type}/${sessionId}`, {});
      return await response.json() as ShareResponse;
    },
    onSuccess: (data) => {
      setShareData(data);
      setOpen(true);
    },
    onError: (error: any) => {
      if (error.message.includes('401')) {
        toast({
          title: "Sign in required",
          description: "Please sign in to share your cosmic content",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      if (error.message.includes('400') && error.message.includes('Spotify not connected')) {
        toast({
          title: "Spotify not connected",
          description: "Please connect your Spotify account first to share playlists",
          variant: "destructive",
        });
        return;
      }
      if (error.message.includes('429')) {
        toast({
          title: "Weekly limit reached",
          description: "We're keeping the cosmos sustainable! Our sharing services have usage limits to ensure quality for everyone. Thank you for your patience! ✨",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Share failed",
        description: "Unable to create Spotify playlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleShare = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to share your cosmic content",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
    shareMutation.mutate();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(true);
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard",
      });
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the share link",
        variant: "destructive",
      });
    }
  };

  const openSocialShare = (platform: 'x' | 'facebook') => {
    if (!shareData) return;
    
    const shareUrl = shareData.spotifyUrl || shareData.shareUrl || '';
    
    if (platform === 'x') {
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.socialText.twitter)}`;
      window.open(url, '_blank', 'width=600,height=400');
    } else if (platform === 'facebook') {
      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareData.socialText.facebook)}`;
      
      // Try opening popup, with fallback for popup blockers
      try {
        const popup = window.open(url, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
        
        // Check if popup was blocked after a brief moment
        setTimeout(() => {
          if (!popup || popup.closed || typeof popup.closed == 'undefined') {
            // Popup was blocked, fall back to copying link
            handleFacebookPopupBlocked(url);
          }
        }, 100);
      } catch (error) {
        // Error opening popup, fall back to copying link
        handleFacebookPopupBlocked(url);
      }
    }
  };

  const handleFacebookPopupBlocked = async (socialUrl: string) => {
    try {
      // Copy the Facebook sharing URL to clipboard as fallback
      await navigator.clipboard.writeText(socialUrl);
      toast({
        title: "📋 Facebook Link Copied!",
        description: "Popup was blocked. Facebook sharing link copied to clipboard - paste it in a new tab to share.",
        duration: 5000,
      });
    } catch (clipboardError) {
      console.error('Error sharing:', clipboardError);
      // If clipboard also fails, show instructions
      toast({
        title: "Share on Facebook",
        description: "Copy this link to share: " + socialUrl,
        duration: 8000,
      });
    }
  };

  const downloadPDF = async () => {
    if (!user || type !== 'conversation') return;
    
    setIsDownloadingPDF(true);
    try {
      // Import PDF generation function
      const { generateChatPDF } = await import('../utils/pdf-generator');
      const fileName = await generateChatPDF(sessionId, shareData?.socialText?.general || 'Cosmic Chat Session');
      
      toast({
        title: "PDF Downloaded!",
        description: `Your cosmic conversation has been saved as ${fileName}! It includes a live link back to this chat.`,
      });
    } catch (error) {
      console.error('PDF download error:', error);
      toast({
        title: "Download failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleShare}
        disabled={shareMutation.isPending}
        className={`gap-2 group transition-all duration-200 ${shareMutation.isPending ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-300 dark:border-blue-600 animate-pulse' : 'hover:scale-105'}`}
      >
        {shareMutation.isPending ? (
          <>
            <div className="relative">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              <Sparkles className="h-2 w-2 absolute -top-1 -right-1 text-yellow-400 animate-pulse" />
            </div>
            <span className="animate-pulse">Preparing cosmic share...</span>
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4 transition-transform group-hover:scale-110" />
            Share
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share your cosmic {type}
            </DialogTitle>
          </DialogHeader>
          
          {shareData && (
            <div className="space-y-4">
              {/* Spotify URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {shareData.spotifyUrl ? 'Spotify Playlist' : 'Share Link'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={shareData.spotifyUrl || shareData.shareUrl}
                    className="flex-1 px-3 py-2 text-sm border rounded-md bg-gray-50"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(shareData.spotifyUrl || shareData.shareUrl || '')}
                    className="px-3"
                  >
                    {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* PDF Download for conversations */}
              {type === 'conversation' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Download</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadPDF}
                    disabled={isDownloadingPDF}
                    className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700 transition-all duration-200"
                  >
                    {isDownloadingPDF ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" />
                        Download as PDF
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Social sharing buttons */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Share with others</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSocialShare('x')}
                    className="flex-1 gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    X
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSocialShare('facebook')}
                    className="flex-1 gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Facebook
                  </Button>
                </div>
              </div>

              {/* Preview text */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Share preview</label>
                <div className="p-3 text-sm bg-gray-50 rounded-md border">
                  {shareData.socialText.general}
                </div>
              </div>

              {/* Tips */}
              <div className="text-xs text-gray-500 space-y-1">
                {shareData.spotifyUrl ? (
                  <>
                    <p>• Your playlist is now live on Spotify</p>
                    <p>• Anyone with the link can listen on Spotify</p>
                    <p>• Share on social media to let others discover your cosmic music</p>
                  </>
                ) : type === 'conversation' ? (
                  <>
                    <p>• Download PDF to share a persistent version that won't disappear</p>
                    <p>• PDF includes a live link back to continue this conversation</p>
                    <p>• Perfect for social media sharing - your content stays visible</p>
                  </>
                ) : (
                  <>
                    <p>• Anyone with this link can view your shared {type}</p>
                    <p>• The link includes a preview for social media platforms</p>
                    <p>• Your shared content will redirect visitors to the app</p>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}