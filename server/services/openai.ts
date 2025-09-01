import OpenAI from "openai";
import type { BirthInfo, PlaylistData } from "@shared/schema";
import { AstrologyService } from "./astrology";
import { spotifyService, type SpotifyTrack } from "./spotify";
import { storage } from "../storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "your-openai-key"
});

export class OpenAIService {
  private astrologyService: AstrologyService;

  constructor() {
    this.astrologyService = new AstrologyService();
  }
  async generateWelcomeMessage(): Promise<string> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a cosmic music curator AI that creates personalized weekly playlists based on individual planetary transits. You're friendly, mystical, and knowledgeable about both astrology and music. Keep responses concise but warm."
        },
        {
          role: "user",
          content: "Generate a welcoming message for users visiting the cosmic music platform. Focus on the astrological insights, horoscopes, and musical journey they can explore. Don't ask for personal information - instead, invite them to explore cosmic themes, ask questions about astrology, or discover how the stars influence music. Be mystical and engaging."
        }
      ],
    });

    return response.choices[0].message.content || "";
  }

  async processUserMessage(message: string, sessionContext: any): Promise<string> {
    // Always get accurate astrological data when user has birth info
    let astrologicalData = '';
    if (sessionContext.hasBirthInfo && sessionContext.session?.birthDate) {
      try {
        const accurateData = await this.astrologyService.calculateBigThreeAccurate({
          date: sessionContext.session.birthDate,
          time: sessionContext.session.birthTime,
          location: sessionContext.session.birthLocation
        });
        
        // Extract asteroid and celestial point data
        const asteroidData = (accurateData as any).planets || {};
        const asteroidInfo = [];
        
        // Major asteroids and points
        if (asteroidData.Chiron) asteroidInfo.push(`- Chiron: ${asteroidData.Chiron.sign} (House ${asteroidData.Chiron.house})`);
        if (asteroidData["True Lilith"]) asteroidInfo.push(`- Lilith: ${asteroidData["True Lilith"].sign} (House ${asteroidData["True Lilith"].house})`);
        if (asteroidData.Ceres) asteroidInfo.push(`- Ceres: ${asteroidData.Ceres.sign} (House ${asteroidData.Ceres.house})`);
        if (asteroidData.Pallas) asteroidInfo.push(`- Pallas: ${asteroidData.Pallas.sign} (House ${asteroidData.Pallas.house})`);
        if (asteroidData.Juno) asteroidInfo.push(`- Juno: ${asteroidData.Juno.sign} (House ${asteroidData.Juno.house})`);
        if (asteroidData.Vesta) asteroidInfo.push(`- Vesta: ${asteroidData.Vesta.sign} (House ${asteroidData.Vesta.house})`);
        if (asteroidData["Part of Fortune"]) asteroidInfo.push(`- Part of Fortune: ${asteroidData["Part of Fortune"].sign} (House ${asteroidData["Part of Fortune"].house})`);
        if (asteroidData.Vertex) asteroidInfo.push(`- Vertex: ${asteroidData.Vertex.sign} (House ${asteroidData.Vertex.house})`);
        
        astrologicalData = `
        
**ACCURATE ASTROLOGICAL DATA (Use this for all astrological references):**
- Sun Sign: ${accurateData.sunSign}
- Moon Sign: ${accurateData.moonSign}  
- Rising Sign: ${accurateData.risingSign}
${(accurateData as any).northNode ? `- North Node: ${(accurateData as any).northNode}` : ''}
${(accurateData as any).southNode ? `- South Node: ${(accurateData as any).southNode}` : ''}

**ASTEROID & CELESTIAL POINTS:**
${asteroidInfo.join('\n')}

IMPORTANT: Always use the above accurate data when discussing their astrological signs and celestial points. Do not calculate independently.`;

        // For asteroid-specific questions, ensure we display the asteroid data
        const isAsteroidQuestion = message.toLowerCase().includes('chiron') || 
                                  message.toLowerCase().includes('lilith') ||
                                  message.toLowerCase().includes('ceres') ||
                                  message.toLowerCase().includes('pallas') ||
                                  message.toLowerCase().includes('juno') ||
                                  message.toLowerCase().includes('vesta') ||
                                  message.toLowerCase().includes('asteroid') ||
                                  message.toLowerCase().includes('part of fortune') ||
                                  message.toLowerCase().includes('vertex');

        // For transit-specific questions, add more detailed transit info
        const isTransitQuestion = message.toLowerCase().includes('transit') || 
                                 message.toLowerCase().includes('planetary') ||
                                 message.toLowerCase().includes('current planet');
        
        if (isTransitQuestion) {
          try {
            const transits = await this.astrologyService.generateWeeklyTransitsAccurate({
              date: sessionContext.session.birthDate,
              time: sessionContext.session.birthTime,
              location: sessionContext.session.birthLocation
            });
            
            astrologicalData += `

**This Week's Major Transits:**
${transits.majorTransits.map((transit: string) => `- ${transit}`).join('\n')}

**Weekly Theme:** ${transits.weeklyTheme}
**Energy Level:** ${transits.energyLevel}
**Favorable Days:** ${transits.favorableDays.join(', ')}
**Challenging Days:** ${transits.challengingDays.join(', ')}

Use this specific information in your response to give personalized transit insights.`;
          } catch (error) {
            console.error('Error getting detailed transit data:', error);
          }
        }
      } catch (error) {
        console.error('Error getting accurate astrological data:', error);
      }
    }

    const systemContent = sessionContext.hasBirthInfo 
      ? `You are a cosmic music curator AI. The user has already provided their birth information and you can create personalized playlists for them. Help them by:
      1. Creating new cosmic playlists when requested - you can absolutely generate playlists based on their astrological profile
      2. Discussing their personalized playlists and what they think of the songs
      3. Explaining the astrological reasoning behind song choices  
      4. Providing daily horoscopes based on their birth data
      5. Answering questions about planetary transits and cosmic influences
      6. Being warm, mystical, and conversational
      
      IMPORTANT: When discussing their Big Three or astrological signs, ONLY use the accurate data from the transitData below. Do not calculate or guess astrological signs independently.
      
      CONVERSATION STYLE: Never start your responses with "Ah" or similar interjections. Begin directly with your main content.
      
      When users ask for playlists, encourage them to use the cosmic playlist generator or offer to create one for them. You have the ability to curate music based on their birth chart and current planetary transits.
      
      Current session context: ${JSON.stringify(sessionContext)}${astrologicalData}`
      : `You are a cosmic music curator AI. Help users by:
      1. Conversationally asking for their birth date, time, and location to create personalized playlists
      2. Explaining how planetary transits influence music curation
      3. Being warm, mystical, and encouraging them to share their birth details naturally
      4. Don't be pushy - let the conversation flow naturally
      
      CONVERSATION STYLE: Never start your responses with "Ah" or similar interjections. Begin directly with your main content.
      
      Current session context: ${JSON.stringify(sessionContext)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: message
        }
      ],
    });

    return response.choices[0].message.content || "";
  }

  /**
   * Enhanced playlist generation using Spotify recommendations and 30-day usage filtering
   */
  async generatePersonalizedPlaylist(birthInfo: BirthInfo, userId: string, accessToken?: string, musicProfile?: any): Promise<PlaylistData> {
    let spotifyRecommendations: SpotifyTrack[] = [];
    let musicContext = '';
    
    // Try to get Spotify recommendations if user is connected
    if (accessToken && musicProfile) {
      try {
        console.log('Getting personalized Spotify recommendations...');
        
        // Get recommendation seeds (liked songs and top artists)
        const seeds = await spotifyService.getRecommendationSeeds(accessToken);
        console.log(`Found ${seeds.trackIds.length} track seeds and ${seeds.artistIds.length} artist seeds`);
        
        if (seeds.trackIds.length > 0 || seeds.artistIds.length > 0) {
          // Get recommendations based on user's taste and astrological energy
          const targetEnergy = this.calculateAstrologicalEnergy(birthInfo);
          const targetValence = this.calculateAstrologicalValence(birthInfo);
          
          spotifyRecommendations = await spotifyService.getPersonalizedRecommendations(accessToken, {
            seedTracks: seeds.trackIds.slice(0, 3),
            seedArtists: seeds.artistIds.slice(0, 2),
            targetEnergy,
            targetValence,
            limit: 50 // Get more options to filter from
          });
          
          console.log(`Got ${spotifyRecommendations.length} Spotify recommendations`);
          
          // Filter out recently used songs (30-day limit)
          if (spotifyRecommendations.length > 0) {
            const spotifyIds = spotifyRecommendations.map(track => track.id);
            const availableSongs = await storage.filterOutRecentlyUsedSongs(userId, spotifyIds, 30);
            spotifyRecommendations = spotifyRecommendations.filter(track => availableSongs.includes(track.id));
            console.log(`${availableSongs.length} songs available after filtering recently used`);
          }
        }
      } catch (error) {
        console.error('Error getting Spotify recommendations:', error);
        // Continue with AI-only generation
      }
    }
    
    // Build context for AI
    if (musicProfile) {
      musicContext = `
      
**User's Spotify Music Profile:**
- Top Artists: ${musicProfile.topArtists?.join(', ') || 'Not available'}
- Preferred Genres: ${musicProfile.preferredGenres?.join(', ') || 'Not available'}
- Music Characteristics:
  - Average Energy Level: ${Math.round((musicProfile.averageEnergy || 0.5) * 100)}%
  - Average Happiness (Valence): ${Math.round((musicProfile.averageValence || 0.5) * 100)}%
  - Average Tempo: ${Math.round(musicProfile.averageTempo || 120)} BPM

Use this music profile to select songs that align with their taste while incorporating astrological influences.`;
    }

    if (spotifyRecommendations.length > 0) {
      const trackList = spotifyRecommendations.slice(0, 20).map(track => 
        `"${track.name}" by ${track.artists[0].name}`
      ).join('\n- ');
      
      musicContext += `

**Available Spotify Recommendations (choose from these):**
- ${trackList}

IMPORTANT: Only select songs from the above Spotify recommendations list. These are personalized based on the user's listening history and haven't been used recently.`;
    }

    // Calculate current week dates
    const today = new Date();
    const weekStart = new Date(today);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    const prompt = `Create a personalized 7-song weekly playlist for someone born on ${birthInfo.date} at ${birthInfo.time} in ${birthInfo.location}.

    Base the selection on current planetary transits and their astrological significance for the week starting ${formatDate(weekStart)} through ${formatDate(weekEnd)}.${musicContext}

    Provide extremely detailed astrological analysis including:
    - Current major planetary transits and their specific degrees
    - How these transits interact with their natal chart placements
    - Weekly themes and energy patterns
    - Specific planetary aspects and their timing
    - Recommended actions and areas of focus
    - Emotional and spiritual guidance

    Respond with a JSON object in this exact format:

    {
      "name": "Playlist name reflecting astrological theme",
      "description": "Brief description of the cosmic influences",
      "astrologicalSummary": "SHORT and sweet weekly overview in TWO parts: 1) A focused paragraph highlighting the strongest cosmic influence this week and what it means for them in accessible, relatable terms. 2) A personalized affirmation or empowering message for navigating the week ahead - something they can carry with them as cosmic guidance. Keep it warm, meaningful, and memorable - like a wise friend offering both insight and encouragement.",
      "weekStart": "${formatDate(weekStart)}",
      "weekEnd": "${formatDate(weekEnd)}",
      "songs": [
        {
          "title": "Song Title",
          "artist": "Artist Name",
          "day": "Monday",
          "dayOfWeek": "MON",
          "astrologicalInfluence": "DETAILED but accessible explanation of specific planetary energies for this day - share which planets are active and what that means in everyday terms, their aspects and how those feel emotionally, houses affected and what life areas they touch, and how this translates to emotional/spiritual themes anyone can relate to. Connect the song choice to specific astrological symbolism but explain the deeper meaning in a warm, teaching way (2-3 sentences minimum)."
        }
      ]
    }

    Include 7 songs, one for each day. Each song's astrological influence should be deeply detailed with specific planetary connections, aspects, and symbolic meanings. ${spotifyRecommendations.length > 0 ? 'ONLY choose songs from the provided Spotify recommendations list.' : 'Choose real, popular songs that match the emotional/energetic qualities of each day\'s planetary influences and align with their music preferences.'}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a wise and warm cosmic guide who bridges the mystical and the practical. You have deep mastery of astrology and music, but you explain complex concepts in an accessible, nurturing way that welcomes beginners while still offering profound insights. Your approach is like a trusted friend who happens to be an expert - you share technical astrological knowledge (degrees, aspects, transits) but always explain what they mean in real, relatable terms. You're encouraging and never condescending, helping people understand how the cosmos speaks to their daily lives. Your explanations feel like gentle teaching moments that honor both the mystery and the practicality of astrology. You seamlessly weave together planetary wisdom and musical energy in ways that feel both magical and grounded."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const playlistData = JSON.parse(response.choices[0].message.content || "{}");
    
    // Enrich songs with Spotify data (preview URLs, ratings, etc.)
    if (accessToken && playlistData.songs && Array.isArray(playlistData.songs)) {
      try {
        console.log('Enriching songs with Spotify data...');
        for (const song of playlistData.songs) {
          if (song.title && song.artist) {
            // Search for the track on Spotify to get preview URL and other data
            const searchQuery = `track:"${song.title}" artist:"${song.artist}"`;
            const searchResults = await spotifyService.searchTracks(accessToken, searchQuery, 1);
            const spotifyTrack = searchResults.length > 0 ? searchResults[0] : null;
            
            if (spotifyTrack) {
              // Add Spotify data to the song
              song.spotifyId = spotifyTrack.id;
              song.previewUrl = spotifyTrack.preview_url;
              song.externalUrl = spotifyTrack.external_urls?.spotify;
              
              // Generate a cosmic rating based on popularity and energy
              const baseRating = Math.min(5, Math.max(1, Math.round(spotifyTrack.popularity / 20))); // Convert 0-100 to 1-5
              const energyBonus = spotifyTrack.audio_features?.energy > 0.7 ? 0.5 : 0;
              song.rating = Math.min(5, Math.max(1, baseRating + energyBonus));
              
              console.log(`Enriched: ${song.title} - Rating: ${song.rating}, Preview: ${!!song.previewUrl}`);
            } else {
              // Fallback rating for songs not found on Spotify
              song.rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars for cosmic quality
            }
          }
        }
      } catch (error) {
        console.error('Error enriching songs with Spotify data:', error);
        // Add fallback ratings even if Spotify enrichment fails
        for (const song of playlistData.songs) {
          if (!song.rating) {
            song.rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars
          }
        }
      }
    } else {
      // Add fallback ratings when no Spotify access
      if (playlistData.songs && Array.isArray(playlistData.songs)) {
        for (const song of playlistData.songs) {
          song.rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars for cosmic quality
        }
      }
    }
    
    // Record song usage for authenticated users
    if (userId && playlistData.songs && Array.isArray(playlistData.songs)) {
      try {
        for (const song of playlistData.songs) {
          if (song.title && song.artist) {
            // Find the Spotify ID if this song came from recommendations
            const spotifyTrack = spotifyRecommendations.find(track => 
              track.name.toLowerCase().includes(song.title.toLowerCase()) &&
              track.artists.some(artist => artist.name.toLowerCase().includes(song.artist.toLowerCase()))
            );
            
            if (spotifyTrack) {
              await storage.recordSongUsage({
                userId,
                spotifyId: spotifyTrack.id,
                songTitle: song.title,
                artistName: song.artist,
                usedInPlaylistId: null // Can be updated later when playlist is created
              });
              console.log(`Recorded usage for: ${song.title} by ${song.artist}`);
            }
          }
        }
      } catch (error) {
        console.error('Error recording song usage:', error);
        // Don't fail the playlist generation for usage tracking errors
      }
    }

    return playlistData;
  }

  /**
   * Calculate astrological energy level for Spotify recommendations
   */
  private calculateAstrologicalEnergy(birthInfo: BirthInfo): number {
    // Simple calculation based on birth time - more energy during day hours
    const hour = parseInt(birthInfo.time.split(':')[0]);
    if (hour >= 6 && hour <= 18) {
      return 0.7; // Higher energy for day births
    }
    return 0.4; // Lower energy for night births
  }

  /**
   * Calculate astrological valence (happiness) for Spotify recommendations
   */
  private calculateAstrologicalValence(birthInfo: BirthInfo): number {
    // Simple calculation - can be enhanced with real astrological data
    return 0.6; // Neutral-positive valence
  }

  // Keep the original method for backward compatibility
  async generatePlaylist(birthInfo: BirthInfo, musicProfile?: any): Promise<PlaylistData> {
    return this.generatePersonalizedPlaylist(birthInfo, '', undefined, musicProfile);
  }

  async generateWeeklyHoroscope(birthInfo: BirthInfo): Promise<any> {
    // Calculate current week dates
    const today = new Date();
    const weekStart = new Date(today);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 6); // 7 days total

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    const prompt = `Create a comprehensive weekly horoscope for someone born on ${birthInfo.date} at ${birthInfo.time} in ${birthInfo.location}.

Generate horoscope content for the week from ${formatDate(weekStart)} to ${formatDate(weekEnd)}, broken down by each individual day.

Respond with a JSON object in this exact format:

{
  "weekStart": "${formatDate(weekStart)}",
  "weekEnd": "${formatDate(weekEnd)}",
  "overallTheme": "Brief summary of the week's astrological theme",
  "keyTransits": "Main planetary movements affecting this person this week",
  "dailyHoroscopes": [
    {
      "date": "${formatDate(weekStart)}",
      "day": "Monday",
      "dayOfWeek": "MON", 
      "planetaryFocus": "Main planetary influence for this day",
      "horoscope": "Detailed daily guidance and insights",
      "energy": "high/medium/low",
      "focus": "career/relationships/health/creativity/etc"
    }
  ]
}

Include all 7 days of the week with personalized guidance for each day based on planetary transits and their birth chart.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert astrologer. Create comprehensive weekly horoscopes with daily breakdowns based on real astrological transits."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  }

  async explainDailyHoroscope(birthInfo: BirthInfo, date?: string): Promise<string> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert astrologer. Provide insightful daily horoscopes based on planetary transits and birth information."
        },
        {
          role: "user",
          content: `Provide a daily horoscope for ${targetDate} for someone born on ${birthInfo.date} at ${birthInfo.time} in ${birthInfo.location}. Focus on the key planetary influences and practical guidance.`
        }
      ],
    });

    return response.choices[0].message.content || "";
  }

  /**
   * Generate detailed transit analysis with weekly breakdown
   */
  async generateTransitDetails({ birthData, transits }: { birthData: any, transits: any }): Promise<string> {
    const prompt = `As a professional astrologer, provide a detailed weekly transit analysis for someone born on ${birthData.birthDate} at ${birthData.birthTime} in ${birthData.birthLocation}.

**Current Transit Data:**
- Major Transits: ${transits.majorTransits.join(', ')}
- Weekly Theme: ${transits.weeklyTheme}
- Energy Level: ${transits.energyLevel}
- Favorable Days: ${transits.favorableDays.join(', ')}
- Challenging Days: ${transits.challengingDays.join(', ')}

Please provide:

1. **Weekly Overview**: A comprehensive interpretation of how these transits affect this person's natal chart
2. **Daily Breakdown**: Specific guidance for each day of the week, including:
   - Key planetary influences
   - Best activities and focus areas
   - Areas to be mindful of
   - Optimal timing for important decisions

3. **Practical Guidance**: 
   - How to work with the current planetary energies
   - Areas of life most highlighted this week
   - Opportunities for growth and manifestation

Format this as a flowing, insightful reading that feels personal and actionable. Include specific astrological details while remaining accessible to someone learning about astrology.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional astrologer with deep knowledge of planetary transits and their personal effects. Provide detailed, practical astrological guidance."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    });

    return response.choices[0].message.content || "";
  }

  /**
   * Generate detailed astrological chart reading
   */
  async generateDetailedChartReading(chart: any): Promise<string> {
    const prompt = `As a professional astrologer, provide a comprehensive chart reading based on the following natal chart data:

**Birth Chart Overview:**
- Sun: ${chart.sunSign}
- Moon: ${chart.moonSign}
- Rising: ${chart.rising}
- Dominant Planet: ${chart.dominantPlanet}
- Chart Pattern: ${chart.chartPattern}

**Element Balance:**
- Fire: ${chart.elementBalance.fire} planets
- Earth: ${chart.elementBalance.earth} planets
- Air: ${chart.elementBalance.air} planets
- Water: ${chart.elementBalance.water} planets

**Modality Balance:**
- Cardinal: ${chart.modalityBalance.cardinal} planets
- Fixed: ${chart.modalityBalance.fixed} planets
- Mutable: ${chart.modalityBalance.mutable} planets

**Major Planetary Aspects:**
${chart.majorAspects.map((aspect: any) => 
  `- ${aspect.planet1} ${aspect.aspect} ${aspect.planet2} (${aspect.strength} aspect): ${aspect.interpretation}`
).join('\n')}

**Life Themes:**
${chart.lifeThemes.map((theme: string) => `- ${theme}`).join('\n')}

Please provide:
1. **Core Personality Analysis** - How the sun, moon, and rising work together
2. **Dominant Planetary Influence** - Deep dive into the dominant planet's impact
3. **Element & Modality Patterns** - What the balance reveals about approach to life
4. **Major Aspect Interpretations** - How the key planetary relationships shape the personality
5. **Life Path & Purpose** - Based on the overall chart patterns and themes
6. **Strengths & Growth Areas** - Natural talents and areas for development

Write in a warm, insightful tone that feels personal and meaningful. Use astrological terminology but explain it clearly. Make it inspiring while being honest about challenges.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 2500,
      });

      return response.choices[0].message.content || "Unable to generate chart reading";
    } catch (error) {
      console.error("Error generating detailed chart reading:", error);
      throw new Error("Failed to generate detailed chart reading");
    }
  }
}

export const openAIService = new OpenAIService();
