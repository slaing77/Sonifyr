import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Sparkles, Music, MessageCircle, BarChart3, Calendar, Zap, ArrowLeft, Check } from "lucide-react";
import { Link } from "wouter";

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Link href="/">
              <Button variant="outline" className="mb-6" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full">
                <Crown className="h-16 w-16 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              ✨ Unlock Your Full Cosmic Experience ✨
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Transform your free cosmic playlist experience into a complete astrological journey with unlimited AI guidance, 
              detailed birth chart analysis, and personalized cosmic insights.
            </p>
          </div>

          {/* Free vs Premium Comparison */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Free Version */}
            <Card className="relative border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5 text-blue-500" />
                  Free Version
                </CardTitle>
                <CardDescription>Great for trying out cosmic playlists</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>1 playlist per week</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Basic astrological explanations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>View-only playlists</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Manual song copying</span>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="text-2xl font-bold text-gray-900">Free</div>
                  <p className="text-gray-500 text-sm">Forever</p>
                </div>
              </CardContent>
            </Card>

            {/* Premium Version */}
            <Card className="relative border-amber-300 bg-gradient-to-b from-amber-50 to-orange-50">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Premium Experience
                </CardTitle>
                <CardDescription>Complete cosmic guidance & unlimited features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-semibold">Everything in Free, plus:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span>Unlimited playlist generation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-amber-500" />
                    <span>AI chat for personalized cosmic guidance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-amber-500" />
                    <span>Detailed birth chart analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    <span>Daily horoscopes & transit details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-amber-500" />
                    <span>Direct Spotify playlist export</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Mood tracking & cosmic analytics</span>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="text-2xl font-bold text-amber-800">$19/month</div>
                  <p className="text-amber-600 text-sm">7-day free trial</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Details */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardContent className="p-6 text-center">
                <MessageCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">AI Cosmic Chat</h3>
                <p className="text-gray-600">
                  Have personalized conversations with our AI astrologer. Ask about your chart, 
                  relationships, career insights, and get cosmic guidance anytime.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Birth Chart Analysis</h3>
                <p className="text-gray-600">
                  Get detailed interpretations of your natal chart, including houses, aspects, 
                  and planetary positions with professional-grade insights.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Sparkles className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Mood & Analytics</h3>
                <p className="text-gray-600">
                  Track your daily moods and see how they correlate with planetary transits. 
                  Discover patterns in your cosmic emotional journey.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Testimonials */}
          <Card className="mb-12 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-center mb-8">What Our Users Say</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="mb-4">⭐⭐⭐⭐⭐</div>
                  <p className="text-gray-700 italic mb-4">
                    "The AI chat feature is incredible! It's like having a personal astrologer available 24/7. 
                    The playlist accuracy is spot-on with my current life situations."
                  </p>
                  <p className="font-semibold">— Sarah M.</p>
                </div>
                <div className="text-center">
                  <div className="mb-4">⭐⭐⭐⭐⭐</div>
                  <p className="text-gray-700 italic mb-4">
                    "The birth chart analysis blew my mind. So detailed and accurate! 
                    The mood tracking helped me understand my patterns better."
                  </p>
                  <p className="font-semibold">— Alex R.</p>
                </div>
                <div className="text-center">
                  <div className="mb-4">⭐⭐⭐⭐⭐</div>
                  <p className="text-gray-700 italic mb-4">
                    "Having unlimited playlists is a game-changer. I create new ones for different moods 
                    and occasions. The Spotify export makes it so convenient!"
                  </p>
                  <p className="font-semibold">— Maya L.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <CardContent className="p-12 text-center">
              <Crown className="h-16 w-16 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">Ready to Unlock Your Cosmic Potential?</h2>
              <p className="text-xl mb-8 opacity-90">
                Start your 7-day free trial and experience the full power of cosmic guidance
              </p>
              <div className="space-y-4">
                <Link href="/signup">
                  <Button 
                    size="lg" 
                    className="bg-white text-amber-600 hover:bg-gray-100 text-lg px-8 py-3"
                    data-testid="button-start-trial"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Start Your 7-Day Free Trial
                  </Button>
                </Link>
                <p className="text-sm opacity-80">
                  No credit card required • Cancel anytime • Full access during trial
                </p>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6 text-left">
                  <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                  <p className="text-gray-600">
                    Yes! You can cancel your subscription at any time. You'll continue to have access 
                    until the end of your billing period.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-left">
                  <h3 className="font-semibold mb-2">What happens after the free trial?</h3>
                  <p className="text-gray-600">
                    You'll automatically be charged $19/month unless you cancel. We'll send you a 
                    reminder email before the trial ends.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-left">
                  <h3 className="font-semibold mb-2">Do I need a Spotify account?</h3>
                  <p className="text-gray-600">
                    No, you can view and manually copy all playlists. Spotify export is just a 
                    convenient bonus feature for Premium users.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-left">
                  <h3 className="font-semibold mb-2">How accurate is the astrology?</h3>
                  <p className="text-gray-600">
                    We use Swiss Ephemeris data and professional astrological calculations for 
                    precise chart analysis and transit tracking.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}