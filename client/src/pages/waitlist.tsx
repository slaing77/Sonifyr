import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Music } from "lucide-react";
import { Link } from "wouter";
import AnimatedPage from "@/components/animated-page";

export default function Waitlist() {
  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative p-4 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full">
                  <Sparkles className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Something Cosmic is Coming
            </h1>
            <p className="text-xl text-gray-600">
              We're crafting an extraordinary experience that bridges the stars and sound
            </p>
          </div>

          {/* Coming Soon Card */}
          <Card className="bg-white/80 backdrop-blur-sm border-purple-200 shadow-xl">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6">
                    <Star className="h-4 w-4 text-purple-600 animate-pulse" />
                    <span className="text-purple-800 font-semibold">Coming Soon</span>
                    <Star className="h-4 w-4 text-purple-600 animate-pulse" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Join the Cosmic Wait List
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Be among the first to unlock unlimited playlists, deeper astrological insights, 
                    and exclusive cosmic features when we launch.
                  </p>
                </div>

                {/* Features Preview */}
                <div className="grid gap-4">
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                    <Music className="h-5 w-5 text-purple-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Unlimited Cosmic Playlists</h3>
                      <p className="text-sm text-gray-600">Generate as many personalized playlists as your heart desires</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                    <Star className="h-5 w-5 text-purple-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Deep Astrological Insights</h3>
                      <p className="text-sm text-gray-600">Comprehensive birth chart readings and daily guidance</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                    <Sparkles className="h-5 w-5 text-purple-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Priority Access & More</h3>
                      <p className="text-sm text-gray-600">Early features, exclusive content, and cosmic secrets</p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="text-center pt-6 border-t">
                  <p className="text-gray-600 mb-4">
                    Stay tuned for updates on our cosmic journey
                  </p>
                  <Link href="/">
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      data-testid="button-back-home"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <p className="text-center text-gray-500 mt-8 text-sm">
            The stars are aligning. Something magical is on the horizon. ✨
          </p>
        </div>
      </div>
      </div>
    </AnimatedPage>
  );
}
