import { useState, useEffect } from "react";

export default function RotatingHeroText() {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  
  // Rotating text variations for CosmicPlaylistGenerator-Free
  const textVariations = [
    {
      title: "AI-curated music to match your weekly planetary transits",
      subtitle: "Get your personalized 7-song weekly playlist based on your birth chart and current planetary movements. Free to try - just enter your birth details below!"
    },
    {
      title: "Your celestial soundtrack awaits",
      subtitle: "Let the cosmos guide your music. Our AI astrologer creates playlists that resonate with your astrological energy and this week's planetary influences."
    },
    {
      title: "Transform planetary energy into music",
      subtitle: "Experience the harmony between astrology and sound. Each song is selected based on your birth chart and current cosmic weather patterns."
    },
    {
      title: "Weekly cosmic playlists, personalized for you",
      subtitle: "Discover how Mercury, Venus, Mars and other planets influence your musical taste. Get fresh weekly recommendations that align with your astrological profile."
    }
  ];

  // Rotate text every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % textVariations.length);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [textVariations.length]);

  const currentText = textVariations[currentTextIndex];

  return (
    <div className="transition-all duration-1000 ease-in-out">
      <p className="text-2xl text-gray-700 mb-6">
        {currentText.title}
      </p>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
        {currentText.subtitle}
      </p>
    </div>
  );
}