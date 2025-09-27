import { useState, useEffect } from "react";

export default function RotatingHeroText() {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  
  // Rotating taglines for Sonifyr
  const taglineVariations = [
    "Sonify Your Stars. Stream Your Story.",
    "Your Horoscope. Your Soundtrack.",
    "Astrology That Speaks in Songs.",
    "Let the Planets Pick the Playlist.",
    "Daily Vibes, Written in the Stars.",
    "A New Way to Hear the Universe.",
    "From Transit to Track — Feel the Cosmic Flow.",
    "Music That Moves with Your Moon.",
    "Your Chart. Your Sound. Your Week in Vibes.",
    "Zodiac to Spotify — Instantly."
  ];

  // Rotate taglines every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % taglineVariations.length);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [taglineVariations.length]);

  const currentTagline = taglineVariations[currentTextIndex];

  return (
    <div className="transition-all duration-1000 ease-in-out">
      <p className="text-3xl text-gray-700 mb-6 font-medium">
        {currentTagline}
      </p>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
        Each playlist captures your astrological vibe through moods, rhythms, and harmonies — giving you music that feels like your week ahead.
        It's not just a playlist - It's your horoscope, playing through your headphones.
      </p>
    </div>
  );
}