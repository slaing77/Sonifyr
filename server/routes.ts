import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openAIService } from "./services/openai";
import { astrologyService } from "./services/astrology";
import { spotifyService } from "./services/spotify";
import { 
  insertChatSessionSchema, 
  insertChatMessageSchema, 
  insertPlaylistSchema,
  users,
  chatSessions,
  chatMessages,
  playlists,
  sharedContent,
  socialInteractions,
  dailyMoods
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { setupAuth, requireAuth, requireCompleteProfile } from "./auth";
import { socialService } from "./services/social";
import { pdfService } from "./services/pdf";
import { generatePersonalizedDescription, generateUniquePlaylistName } from "./utils/taglines";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from client/public for social sharing assets
  app.use(express.static('client/public'));
  
  // Auth middleware
  setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ ...req.user, password: undefined });
  });

  // Direct Google OAuth URL (bypasses any Replit interception)
  app.get('/api/auth/google-direct', (req, res) => {
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const callbackURL = domain.includes('localhost') 
      ? `http://${domain}/api/auth/google/callback`
      : `https://${domain}/api/auth/google/callback`;
    
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = encodeURIComponent(callbackURL);
    const scope = encodeURIComponent('profile email');
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&redirect_uri=${redirectUri}&scope=${scope}&client_id=${googleClientId}`;
    
    res.redirect(authUrl);
  });

  // Complete user profile setup
  app.post("/api/auth/complete-profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { firstName, lastName, birthDate, birthTime, birthLocation } = req.body;
      
      if (!birthDate || !birthTime || !birthLocation) {
        return res.status(400).json({ message: "All birth information is required" });
      }

      // Update user with all provided information
      const updateData: any = {
        birthDate,
        birthTime,
        birthLocation,
      };

      // Only update names if provided (for OAuth users who might not have set them)
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;

      const updatedUser = await storage.updateUser(userId, updateData);

      res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      console.error("Error completing profile:", error);
      res.status(500).json({ message: "Failed to complete profile" });
    }
  });

  // Update user profile
  app.put("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { username, birthDate, birthTime, birthLocation } = req.body;
      
      const updateData: any = {};
      
      if (username) updateData.username = username;
      if (birthDate) updateData.birthDate = birthDate;
      if (birthTime) updateData.birthTime = birthTime;
      if (birthLocation) updateData.birthLocation = birthLocation;

      const updatedUser = await storage.updateUser(userId, updateData);
      res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update user avatar
  app.put("/api/user/avatar", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { avatarType, avatarIcon, profileImageUrl } = req.body;
      
      const updateData: any = {
        avatarType: avatarType || 'default',
        avatarIcon: avatarIcon || null,
        profileImageUrl: profileImageUrl || null,
      };

      const updatedUser = await storage.updateUser(userId, updateData);
      res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      console.error("Error updating avatar:", error);
      res.status(500).json({ message: "Failed to update avatar" });
    }
  });

  // Create or get chat session (allow guest users)
  app.post("/api/chat/session", async (req: any, res) => {
    try {
      const { sessionId } = req.body;
      const userId = req.user?.id || null; // Allow guest users
      
      let session = await storage.getChatSession(sessionId);
      
      if (!session) {
        // For authenticated users, load their birth data from profile
        let birthData = { 
          birthDate: null as string | null, 
          birthTime: null as string | null, 
          birthLocation: null as string | null 
        };
        if (userId && userId !== 'guest') {
          const user = await storage.getUser(userId);
          if (user?.birthDate) {
            birthData = {
              birthDate: user.birthDate,
              birthTime: user.birthTime,
              birthLocation: user.birthLocation,
            };
          }
        }

        session = await storage.createChatSession({
          sessionId,
          userId,
          birthDate: birthData.birthDate,
          birthTime: birthData.birthTime,
          birthLocation: birthData.birthLocation,
        });

        // Generate appropriate welcome message based on whether user has birth data
        let welcomeMessage;
        if (birthData.birthDate && birthData.birthTime && birthData.birthLocation) {
          // Get user's name for personalized welcome
          const user = userId !== 'guest' ? await storage.getUser(userId) : null;
          const userName = user?.username || user?.firstName || 'cosmic traveler';
          
          const startDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
          const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
          const sunSign = astrologyService.calculateSunSign(birthData.birthDate);
          
          welcomeMessage = `Welcome ${userName}! Your Weekly Cosmic Playlist is ready! Based on your ${sunSign} sun sign and this week's planetary transits, I've curated 7 new songs that will harmonize with your cosmic energy from ${startDate} - ${endDate}. Just click the button below to generate it. While you're here, explore your birth chart, horoscopes or engage me in sparkling conversation about the astro weather, your cosmic blueprint or this week's playlist. ✨`;
        } else {
          welcomeMessage = await openAIService.generateWelcomeMessage();
        }

        await storage.createChatMessage({
          sessionId,
          userId,
          role: 'assistant',
          content: welcomeMessage,
          metadata: birthData.birthDate ? { type: 'playlist-generated' } : null,
        });
      }

      const messages = await storage.getChatMessages(sessionId);
      
      res.json({ session, messages });
    } catch (error) {
      console.error("Error creating/getting session:", error);
      res.status(500).json({ error: "Failed to create or retrieve session" });
    }
  });

  // Get chat messages (allow guest users)
  app.get("/api/chat/:sessionId/messages", async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id || null;
      
      // For authenticated users, verify session ownership
      // For guest users, allow access to any session (temporary sessions)
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (userId && session.userId && session.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const messages = await storage.getChatMessages(sessionId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error getting messages:", error);
      res.status(500).json({ error: "Failed to retrieve messages" });
    }
  });

  // Send chat message (allow guest users)
  app.post("/api/chat/:sessionId/message", async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const { content } = req.body;
      const userId = req.user?.id || null;

      if (!content?.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      // For authenticated users, verify session ownership
      // For guest users, allow access to any session (temporary sessions)
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (userId && session.userId && session.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Save user message
      await storage.createChatMessage({
        sessionId,
        userId,
        role: 'user',
        content,
        metadata: null,
      });

      // Get session context
      const chatSession = await storage.getChatSession(sessionId);
      const messages = await storage.getChatMessages(sessionId);

      // Check if user is authenticated and has birth data
      const authenticatedUser = userId !== 'guest' ? await storage.getUser(userId) : null;
      let sessionBirthData = chatSession;



      // For authenticated users with birth data, use their stored birth info
      if (authenticatedUser?.birthDate) {
        sessionBirthData = chatSession ? {
          ...chatSession,
          birthDate: authenticatedUser.birthDate,
          birthTime: authenticatedUser.birthTime,
          birthLocation: authenticatedUser.birthLocation,
        } : {
          id: 0,
          sessionId,
          userId,
          birthDate: authenticatedUser.birthDate,
          birthTime: authenticatedUser.birthTime,
          birthLocation: authenticatedUser.birthLocation,
          createdAt: new Date(),
        };
        
        // Update session with user's birth data if not already set
        if (!chatSession?.birthDate) {
          await storage.updateChatSession(sessionId, {
            birthDate: authenticatedUser.birthDate,
            birthTime: authenticatedUser.birthTime,
            birthLocation: authenticatedUser.birthLocation,
          });
        }
      }

      // Enhanced birth information detection and parsing
      const hasBirthInfo = sessionBirthData?.birthDate && sessionBirthData?.birthTime && sessionBirthData?.birthLocation;
      
      // Look for birth info patterns in the message
      const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/;
      const timePattern = /(\d{1,2}:?\d{0,2}\s?(?:am|pm))/i;
      const locationPattern = /([A-Za-z\s,\.]+(?:Canada|USA|US|UK|Australia|[A-Z]{2}))/i;
      
      const dateMatch = content.match(datePattern);
      const timeMatch = content.match(timePattern);
      
      // Look for location at the end of the message or after time
      let locationMatch = null;
      if (timeMatch) {
        const afterTimePattern = new RegExp(timeMatch[0] + '\\s+([A-Za-z\\s,\\.]+)\\s*$', 'i');
        locationMatch = content.match(afterTimePattern);
      }
      if (!locationMatch) {
        locationMatch = content.match(/([A-Za-z][A-Za-z\s,\.]+)$/);
      }

      console.log("Birth info detection:", {
        content,
        dateMatch: dateMatch?.[1],
        timeMatch: timeMatch?.[1], 
        locationMatch: locationMatch?.[1],
        hasBirthInfo
      });

      // If we found potential birth info and user doesn't have complete data
      if ((dateMatch || timeMatch || locationMatch) && !hasBirthInfo) {
        let birthDate = dateMatch ? dateMatch[1] : sessionBirthData?.birthDate;
        let birthTime = timeMatch ? timeMatch[1] : sessionBirthData?.birthTime;
        let birthLocation = locationMatch ? locationMatch[1].trim() : sessionBirthData?.birthLocation;
        
        // Fill in missing data from existing session/user data
        if (!birthDate && sessionBirthData?.birthDate) birthDate = sessionBirthData.birthDate;
        if (!birthTime && sessionBirthData?.birthTime) birthTime = sessionBirthData.birthTime;
        if (!birthLocation && sessionBirthData?.birthLocation) birthLocation = sessionBirthData.birthLocation;

        // Update session with birth info
        await storage.updateChatSession(sessionId, {
          birthDate,
          birthTime,
          birthLocation,
        });

        // Store birth data in user profile if authenticated (even if partial)
        if (userId !== 'guest' && birthDate) {
          await storage.updateUserBirthInfo(userId, {
            birthDate,
            birthTime: birthTime || '',
            birthLocation: birthLocation || '',
          });
        }

        if (birthDate && birthTime && birthLocation) {
          // Get user's music profile and Spotify access token if available
          let musicProfile = null;
          let spotifyAccessToken = null;
          if (userId !== 'guest') {
            const user = await storage.getUser(userId);
            musicProfile = (user as any)?.musicProfile?.musicProfile || null;
            spotifyAccessToken = (user as any)?.spotifyAccessToken || null;
          }

          // Generate playlist using enhanced method with Spotify recommendations
          const playlistData = await openAIService.generatePersonalizedPlaylist({
            date: birthDate,
            time: birthTime,
            location: birthLocation,
          }, userId, spotifyAccessToken, musicProfile);

          // Save playlist
          await storage.createPlaylist({
            sessionId,
            userId,
            name: playlistData.name,
            description: playlistData.description,
            songs: playlistData.songs,
            weekStart: playlistData.weekStart,
            weekEnd: playlistData.weekEnd,
          });

          // Create AI response with playlist
          const responseContent = `✨ **Your Weekly Cosmic Playlist is ready!** ✨

Based on your ${astrologyService.calculateSunSign(birthDate)} sun sign and this week's planetary transits, I've curated 7 songs that will harmonize with your individual cosmic energy from ${playlistData.weekStart} to ${playlistData.weekEnd}.

${playlistData.astrologicalSummary}

Each song is specifically chosen to align with the daily planetary energies you'll experience this week. What do you think of these selections? I'd love to hear your thoughts about the playlist! 

Would you like me to explain the astrological reasoning behind any specific song, or perhaps share your daily horoscope? I'm here to help you understand how the cosmos influences your musical journey.`;

          await storage.createChatMessage({
            sessionId,
            userId,
            role: 'assistant',
            content: responseContent,
            metadata: { type: 'playlist', playlist: playlistData },
          });

          const updatedMessages = await storage.getChatMessages(sessionId);
          return res.json(updatedMessages);
        }
      }

      // Generate AI response
      const aiResponse = await openAIService.processUserMessage(content, {
        session: sessionBirthData || chatSession,
        messagesCount: messages.length,
        hasBirthInfo: hasBirthInfo
      });

      // Save AI response
      await storage.createChatMessage({
        sessionId,
        userId,
        role: 'assistant',
        content: aiResponse,
        metadata: null,
      });

      const updatedMessages = await storage.getChatMessages(sessionId);
      res.json(updatedMessages);

    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Generate new playlist (or show existing weekly playlist)
  app.post("/api/chat/:sessionId/generate-playlist", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = (req.user as any)?.id || 'guest';
      
      const session = await storage.getChatSession(sessionId);

      if (!session?.birthDate || !session?.birthTime || !session?.birthLocation) {
        return res.status(400).json({ error: "Birth information required" });
      }

      let playlistData;
      let isExistingContent = false;

      // Check if user has current weekly playlist (authenticated users only)
      if (userId !== 'guest') {
        playlistData = await storage.getPlaylistData(userId);
        
        console.log('Playlist - Existing content check:', {
          userId,
          hasExistingPlaylist: !!playlistData,
          playlistData: playlistData ? 'exists' : 'null'
        });
        
        if (playlistData) {
          isExistingContent = true;
        } else {
          // Can they generate a new one?
          const canGenerate = await storage.canUserGenerate(userId, 'playlist');
          console.log('Playlist - Generation check:', { userId, canGenerate });
          
          if (!canGenerate) {
            const daysRemaining = await storage.getDaysUntilNextGeneration(userId, 'playlist');
            const cosmicMessage = `✨ Your cosmic energy is recharging! ✨\n\nYour next personalized playlist will be ready in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} when the stars realign.`;
            
            return res.status(429).json({ 
              error: cosmicMessage
            });
          }
        }
      }

      // If no existing playlist found, generate a new one
      if (!playlistData) {
        // Get user's music profile if available
        let musicProfile = null;
        if (userId !== 'guest') {
          const user = await storage.getUser(userId);
          musicProfile = (user as any)?.musicProfile?.musicProfile || null;
        }

        playlistData = await openAIService.generatePlaylist({
          date: session.birthDate,
          time: session.birthTime,
          location: session.birthLocation,
        }, musicProfile);

        await storage.createPlaylist({
          sessionId,
          userId,
          name: playlistData.name,
          description: playlistData.description,
          songs: playlistData.songs,
          weekStart: playlistData.weekStart,
          weekEnd: playlistData.weekEnd,
        });
        
        // Store playlist data for authenticated users  
        if (userId !== 'guest') {
          await storage.storePlaylistData(userId, playlistData);
        }
      }

      // Create a chat message with the playlist
      const responseContent = isExistingContent 
        ? `✨ **Your Weekly Cosmic Playlist** ✨

*Showing your saved weekly cosmic playlist*

Based on your ${astrologyService.calculateSunSign(session.birthDate)} sun sign and this week's planetary transits, here are your 7 songs that harmonize with your individual cosmic energy from ${playlistData.weekStart} to ${playlistData.weekEnd}.

${playlistData.astrologicalSummary}

Each song is specifically chosen to align with the daily planetary energies you'll experience this week. ${userId !== 'guest' ? 'You can export this playlist directly to Spotify!' : 'Sign in to export this playlist to Spotify!'}`
        : `✨ **Your New Weekly Cosmic Playlist is ready!** ✨

Based on your ${astrologyService.calculateSunSign(session.birthDate)} sun sign and this week's planetary transits, I've curated 7 songs that will harmonize with your individual cosmic energy from ${playlistData.weekStart} to ${playlistData.weekEnd}.

${playlistData.astrologicalSummary}

Each song is specifically chosen to align with the daily planetary energies you'll experience this week. ${userId !== 'guest' ? 'You can export this playlist directly to Spotify!' : 'Sign in to export this playlist to Spotify!'}`;

      await storage.createChatMessage({
        sessionId,
        userId,
        role: 'assistant',
        content: responseContent,
        metadata: { 
          type: 'playlist', 
          playlist: playlistData,
          isExistingContent
        },
      });

      const updatedMessages = await storage.getChatMessages(sessionId);
      res.json(updatedMessages);
    } catch (error) {
      console.error("Error generating playlist:", error);
      res.status(500).json({ error: "Failed to generate playlist" });
    }
  });

  // Generate guest playlist without authentication (FREE VERSION ENDPOINT)
  app.post("/api/generate-guest-playlist", async (req, res) => {
    try {
      const { email, newsletterPreference, birthDate, birthTime, birthLocation } = req.body;
      
      if (!email || !birthDate || !birthTime || !birthLocation) {
        return res.status(400).json({ error: "Email and birth information required" });
      }

      // 🧪 TESTING MODE: Temporarily disable guest rate limiting to test planetary frequency detection
      const TESTING_MODE = true;
      if (!TESTING_MODE) {
        const canGenerate = await storage.canGuestGenerate(email);
        if (!canGenerate) {
          return res.status(429).json({ 
            error: "You can only generate one playlist per week. Upgrade to Premium for unlimited playlists!" 
          });
        }
      } else {
        console.log('🧪 TESTING MODE: Bypassing guest rate limiting for planetary frequency testing');
      }

      // Generate playlist using AI service
      const playlistData = await openAIService.generatePlaylist({
        date: birthDate,
        time: birthTime,
        location: birthLocation,
      }, null); // No music profile for guest users

      // Update rate limiting timestamp
      await storage.touchGuestPlaylistGenerated(email);

      // Send welcome email with playlist report
      try {
        const { sendEmail, createWelcomeEmail } = await import('./services/email');
        const emailParams = createWelcomeEmail(email, playlistData, newsletterPreference || 'playlist-only');
        await sendEmail(emailParams);
        console.log(`Welcome email sent to ${email} with preference: ${newsletterPreference}`);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the playlist generation if email fails
      }

      // Return the playlist data directly (no database storage for guests)
      res.json(playlistData);
    } catch (error) {
      console.error("Error generating guest playlist:", error);
      res.status(500).json({ error: "Failed to generate playlist" });
    }
  });

  // Get weekly horoscope with daily breakdowns (NEW ENDPOINT)
  app.post("/api/horoscope/:sessionId/weekly", requireCompleteProfile, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = (req.user as any)?.id;
      
      // First check if user has birth data in their profile
      const user = await storage.getUser(userId);
      let session = await storage.getChatSession(sessionId);
      
      console.log('Horoscope - User birth data:', {
        userId,
        userBirthDate: user?.birthDate,
        userBirthTime: user?.birthTime,
        userBirthLocation: user?.birthLocation,
        sessionBirthDate: session?.birthDate,
        sessionBirthTime: session?.birthTime,
        sessionBirthLocation: session?.birthLocation
      });
      
      // Use birth data from user profile if available
      let birthData = {
        birthDate: user?.birthDate || session?.birthDate,
        birthTime: user?.birthTime || session?.birthTime, 
        birthLocation: user?.birthLocation || session?.birthLocation
      };
      
      // Update session with user's birth data if available
      if (user?.birthDate && !session?.birthDate) {
        await storage.updateChatSession(sessionId, {
          birthDate: user.birthDate,
          birthTime: user.birthTime,
          birthLocation: user.birthLocation,
        });
        session = await storage.getChatSession(sessionId);
        birthData = {
          birthDate: user.birthDate,
          birthTime: user.birthTime,
          birthLocation: user.birthLocation
        };
      }
      
      if (!birthData.birthDate || !birthData.birthTime || !birthData.birthLocation) {
        return res.status(400).json({ error: "Birth information required" });
      }

      let weeklyHoroscope;
      let isExistingContent = false;

      // Check if user has current weekly horoscope
      weeklyHoroscope = await storage.getWeeklyHoroscope(userId);
      
      console.log('Horoscope - Existing content check:', {
        userId,
        hasExistingWeeklyHoroscope: !!weeklyHoroscope,
        weeklyHoroscopeData: weeklyHoroscope ? 'exists' : 'null'
      });
      
      if (weeklyHoroscope) {
        isExistingContent = true;
      } else {
        // Can they generate a new one?
        const canGenerate = await storage.canUserGenerate(userId, 'horoscope');
        console.log('Horoscope - Generation check:', { userId, canGenerate });
      console.log('Horoscope - User last generated:', { 
        lastHoroscopeGenerated: (await storage.getUser(userId))?.lastHoroscopeGenerated 
      });
        if (!canGenerate) {
          return res.status(429).json({ 
            error: "Weekly horoscope limit reached. You can get a new horoscope once per week." 
          });
        }
        
        // Generate new weekly horoscope
        weeklyHoroscope = await openAIService.generateWeeklyHoroscope({
          date: birthData.birthDate,
          time: birthData.birthTime,
          location: birthData.birthLocation,
        });
        
        // Store it for the week
        await storage.storeWeeklyHoroscope(userId, weeklyHoroscope);
      }

      // Format the response content
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const todayHoroscope = weeklyHoroscope.dailyHoroscopes?.find(
        (daily: any) => daily.date === todayStr
      );

      let responseContent = `🌟 **Your Weekly Horoscope** 🌟
${isExistingContent ? '\n*Showing your saved weekly horoscope*\n' : ''}
**Week of ${weeklyHoroscope.weekStart} to ${weeklyHoroscope.weekEnd}**

**Overall Theme:** ${weeklyHoroscope.overallTheme}
**Key Transits:** ${weeklyHoroscope.keyTransits}

`;

      if (todayHoroscope) {
        responseContent += `**Today (${todayHoroscope.day}):** ${todayHoroscope.horoscope}

**This Week's Daily Guidance:**
`;
      }

      // Add all daily horoscopes
      weeklyHoroscope.dailyHoroscopes?.forEach((daily: any) => {
        const isToday = daily.date === todayStr;
        responseContent += `
${isToday ? '🔮 ' : ''}**${daily.day} (${daily.date})**${isToday ? ' - Today' : ''}
*${daily.planetaryFocus}*
${daily.horoscope}
`;
      });

      await storage.createChatMessage({
        sessionId,
        userId,
        role: 'assistant',
        content: responseContent,
        metadata: { 
          type: 'weekly_horoscope', 
          weeklyHoroscope,
          generatedDate: new Date().toISOString().split('T')[0],
          isExistingContent
        },
      });

      const messages = await storage.getChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Error getting weekly horoscope:", error);
      res.status(500).json({ error: "Failed to get weekly horoscope" });
    }
  });
  
  // Keep old endpoint for backwards compatibility
  app.post("/api/chat/:sessionId/horoscope", requireCompleteProfile, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = (req.user as any)?.id;
      
      const session = await storage.getChatSession(sessionId);
      if (!session?.birthDate || !session?.birthTime || !session?.birthLocation) {
        return res.status(400).json({ error: "Birth information required" });
      }

      let weeklyHoroscope;
      let isExistingContent = false;

      // Check if user has current weekly horoscope
      weeklyHoroscope = await storage.getWeeklyHoroscope(userId);
      
      if (weeklyHoroscope) {
        isExistingContent = true;
      } else {
        // Can they generate a new one?
        const canGenerate = await storage.canUserGenerate(userId, 'horoscope');
        if (!canGenerate) {
          return res.status(429).json({ 
            error: "Weekly horoscope limit reached. You can get a new horoscope once per week." 
          });
        }
        
        // Generate new weekly horoscope
        weeklyHoroscope = await openAIService.generateWeeklyHoroscope({
          date: session.birthDate,
          time: session.birthTime,
          location: session.birthLocation,
        });
        
        // Store it for the week
        await storage.storeWeeklyHoroscope(userId, weeklyHoroscope);
      }

      // Format the response content
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const todayHoroscope = weeklyHoroscope.dailyHoroscopes?.find(
        (daily: any) => daily.date === todayStr
      );

      let responseContent = `🌟 **Your Weekly Horoscope** 🌟
${isExistingContent ? '\n*Showing your saved weekly horoscope*\n' : ''}
**Week of ${weeklyHoroscope.weekStart} to ${weeklyHoroscope.weekEnd}**

**Overall Theme:** ${weeklyHoroscope.overallTheme}
**Key Transits:** ${weeklyHoroscope.keyTransits}

`;

      if (todayHoroscope) {
        responseContent += `**Today (${todayHoroscope.day}):** ${todayHoroscope.horoscope}

**This Week's Daily Guidance:**
`;
      }

      // Add all daily horoscopes
      weeklyHoroscope.dailyHoroscopes?.forEach((daily: any) => {
        const isToday = daily.date === todayStr;
        responseContent += `
${isToday ? '🔮 ' : ''}**${daily.day} (${daily.date})**${isToday ? ' - Today' : ''}
*${daily.planetaryFocus}*
${daily.horoscope}
`;
      });

      await storage.createChatMessage({
        sessionId,
        userId,
        role: 'assistant',
        content: responseContent,
        metadata: { 
          type: 'weekly_horoscope', 
          weeklyHoroscope,
          generatedDate: new Date().toISOString().split('T')[0],
          isExistingContent
        },
      });

      const messages = await storage.getChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Error getting horoscope:", error);
      res.status(500).json({ error: "Failed to get weekly horoscope" });
    }
  });

  // Transit details endpoint
  app.post('/api/transit/:sessionId/details', requireCompleteProfile, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = (req.user as any)?.id;
      
      // First check if user has birth data in their profile
      const user = await storage.getUser(userId);
      let session = await storage.getChatSession(sessionId);
      
      // Use birth data from user profile if available
      let birthData = {
        birthDate: user?.birthDate || session?.birthDate,
        birthTime: user?.birthTime || session?.birthTime, 
        birthLocation: user?.birthLocation || session?.birthLocation
      };
      
      // Update session with user's birth data if available
      if (user?.birthDate && !session?.birthDate) {
        await storage.updateChatSession(sessionId, {
          birthDate: user.birthDate,
          birthTime: user.birthTime,
          birthLocation: user.birthLocation,
        });
        session = await storage.getChatSession(sessionId);
        birthData = {
          birthDate: user.birthDate,
          birthTime: user.birthTime,
          birthLocation: user.birthLocation
        };
      }
      
      if (!birthData.birthDate || !birthData.birthTime || !birthData.birthLocation) {
        return res.status(400).json({ error: "Birth information required" });
      }

      let transitDetails;
      let isExistingContent = false;

      // Check if user has current transit details
      transitDetails = await storage.getTransitDetails(userId);
      
      if (transitDetails) {
        isExistingContent = true;
      } else {
        // Can they generate a new one?
        const canGenerate = await storage.canUserGenerate(userId, 'transit');
        
        if (!canGenerate) {
          // If user has used their weekly limit but no stored transit details, clear the timer
          // This handles the case where lastTransitDetailsGenerated exists but currentTransitDetails is missing
          await storage.clearTransitDetails(userId);
        }
        
        // Generate transit details
        const transits = await astrologyService.generateWeeklyTransitsAccurate({
          date: birthData.birthDate!,
          time: birthData.birthTime!,
          location: birthData.birthLocation!
        });

        // Generate AI interpretation
        const transitInterpretation = await openAIService.generateTransitDetails({
          birthData,
          transits
        });

        transitDetails = {
          transits,
          interpretation: transitInterpretation,
          generatedAt: new Date().toISOString()
        };

        // Store it for the week
        await storage.storeTransitDetails(userId, transitDetails);
      }

      // Create a formatted chat message for the transit details
      const formattedDetails = isExistingContent 
        ? `🌌 **Your Weekly Transit Details**\n\n*Showing your saved weekly transit analysis*\n\n${transitDetails.interpretation}`
        : `🌌 **Your Weekly Transit Details**\n\n${transitDetails.interpretation}`;

      await storage.createChatMessage({
        sessionId,
        userId,
        role: 'assistant',
        content: formattedDetails,
        metadata: { feature: 'transit_details' }
      });

      const messages = await storage.getChatMessages(sessionId);
      res.json(messages);

    } catch (error) {
      console.error('Error generating transit details:', error);
      res.status(500).json({ error: 'Failed to generate transit details' });
    }
  });

  // Manual cache clearing endpoint for debugging
  app.post('/api/user/clear-chart-cache', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      await storage.clearChartReading(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing chart cache:', error);
      res.status(500).json({ error: 'Failed to clear chart cache' });
    }
  });

  // Clear transit details cache and reset generation timer
  app.post('/api/user/clear-transit-cache', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      await storage.clearTransitDetails(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing transit cache:', error);
      res.status(500).json({ error: 'Failed to clear transit cache' });
    }
  });

  // Get Big Three calculation endpoint (using Python/Immanuel for accuracy)
  app.get('/api/user/big-three', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const user = await storage.getUser(userId);
      
      if (!user?.birthDate || !user?.birthTime || !user?.birthLocation) {
        return res.json({ 
          sunSign: user?.birthDate ? astrologyService.calculateSunSign(user.birthDate) : '', 
          moonSign: '', 
          risingSign: '',
          northNode: '',
          southNode: ''
        });
      }

      // Use accurate Python-based calculations with Swiss Ephemeris
      const chartData = await astrologyService.calculateBigThreeAccurate({
        date: user.birthDate,
        time: user.birthTime,
        location: user.birthLocation
      });

      res.json(chartData);
    } catch (error) {
      console.error('Error calculating Big Three:', error);
      res.status(500).json({ error: 'Failed to calculate Big Three' });
    }
  });

  // Message feedback endpoint
  app.post('/api/chat/feedback', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { messageId, sessionId, feedback } = req.body;

      if (!messageId || !sessionId || !feedback || !['like', 'dislike'].includes(feedback)) {
        return res.status(400).json({ error: 'Invalid feedback data' });
      }

      await storage.createMessageFeedback(messageId, userId, sessionId, feedback);
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving feedback:', error);
      res.status(500).json({ error: 'Failed to save feedback' });
    }
  });

  // Generate house analysis
  app.post('/api/chart/houses', async (req: any, res: any) => {
    try {
      const { birthDate, birthTime, birthLocation } = req.body;

      if (!birthDate || !birthTime || !birthLocation) {
        return res.status(400).json({
          success: false,
          error: 'Birth date, time, and location are required'
        });
      }

      // Use existing astrology service for house calculations
      const houses = await astrologyService.calculateBigThreeAccurate({
        date: birthDate,
        time: birthTime,
        location: birthLocation
      });

      console.log('Raw houses response:', houses);
      
      // Format houses data for the frontend
      const housesData: Record<string, any> = {};
      
      if (houses) {
        const planetsData = (houses as any).planets || {};
        const housesInfo = (houses as any).houses || {};
        
        console.log('Houses info:', housesInfo);
        console.log('Planets data keys:', Object.keys(planetsData));
        
        // Extract house information for each house (1-12)
        for (let i = 1; i <= 12; i++) {
          const houseKey = `house_${i}`;
          const planetsInHouse = [];
          let houseSign = '';
          
          // Find planets in this house from planets data
          for (const [planetName, planetData] of Object.entries(planetsData)) {
            if (typeof planetData === 'object' && planetData && (planetData as any).house === i) {
              planetsInHouse.push(planetName);
            }
          }
          
          // Try to get house cusp sign from houses info
          const houseInfo = housesInfo[i] || housesInfo[`${i}`] || housesInfo[`house_${i}`];
          if (houseInfo && typeof houseInfo === 'object') {
            houseSign = (houseInfo as any).sign || (houseInfo as any).cusp_sign || '';
          }
          
          // If no sign found, try alternative formats
          if (!houseSign) {
            const altHouseData = planetsData[`House ${i}`] || planetsData[`H${i}`];
            if (altHouseData && typeof altHouseData === 'object') {
              houseSign = (altHouseData as any).sign || '';
            }
          }
          
          housesData[houseKey] = {
            sign: houseSign || `House ${i} Sign`,
            planets: planetsInHouse
          };
        }
      }

      res.json({
        success: true,
        houses: housesData
      });

    } catch (error) {
      console.error('House analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate house analysis'
      });
    }
  });

  // Generate visual birth chart endpoint
  app.post('/api/chart/visual', async (req: any, res: any) => {
    console.log('Visual chart request received:', req.body);
    
    try {
      const { birthDate, birthTime, birthLocation } = req.body;
      const user = (req.user as any);
      
      if (!birthDate || !birthTime || !birthLocation) {
        console.log('Missing required birth data');
        return res.status(400).json({
          error: 'Please provide birth date, time, and location for chart generation'
        });
      }

      // Check for existing chart with same birth data (if user authenticated)
      if (user) {
        try {
          const existingChart = await storage.getAstrologicalChartByBirthData(
            user.id, 
            birthDate, 
            birthTime, 
            birthLocation
          );
          
          if (existingChart && existingChart.svgChart) {
            console.log('Using existing visual chart for user:', user.id);
            return res.json({
              success: true,
              svgChart: existingChart.svgChart,
              chartInfo: existingChart.chartInfo,
              cached: true
            });
          }
        } catch (error) {
          console.log('Could not check for existing chart, generating new one');
        }
      }

      // Generate new chart
      const result = await astrologyService.generateBirthChartSVG({
        date: birthDate,
        time: birthTime,
        location: birthLocation
      }, user?.username || user?.firstName || 'Birth Chart');

      if (!result.success) {
        console.error('Chart generation failed:', result.error);
        return res.status(500).json({ error: result.error });
      }

      // Save to database if user is authenticated and we have chart storage methods
      if (user && result.svgContent) {
        try {
          // Get basic chart data for storage
          const bigThree = await astrologyService.calculateBigThreeAccurate({
            date: birthDate,
            time: birthTime,
            location: birthLocation
          });

          const chartData = {
            userId: user.id,
            birthDate,
            birthTime,
            birthLocation,
            sunSign: bigThree.sunSign,
            moonSign: bigThree.moonSign,
            risingSign: bigThree.risingSign,
            planetaryPositions: (bigThree as any).planets || {},
            housePositions: (bigThree as any).houses || {},
            majorAspects: (bigThree as any).aspects || {},
            interpretation: { basic: 'Generated chart' },
            svgChart: result.svgContent,
            chartInfo: result.chartInfo
          };

          // Only try to save if storage methods exist
          if (storage.upsertAstrologicalChart) {
            await storage.upsertAstrologicalChart(chartData);
            console.log('Saved visual chart to database for user:', user.id);
          }
        } catch (storageError) {
          console.error('Failed to save chart to database:', storageError);
          // Continue anyway - we can still return the generated chart
        }
      }

      res.json({
        success: true,
        svgChart: result.svgContent,
        chartInfo: result.chartInfo,
        cached: false
      });
    } catch (error: any) {
      console.error('Error generating visual chart:', error);
      res.status(500).json({ error: 'Failed to generate visual chart' });
    }
  });

  // Generate chart PDF for download
  app.post('/api/chart/pdf', async (req: any, res) => {
    try {
      const { birthDate, birthTime, birthLocation, userName, includeHouses } = req.body;
      const user = (req.user as any);
      
      if (!birthDate || !birthTime || !birthLocation) {
        return res.status(400).json({
          error: 'Please provide birth date, time, and location for chart PDF generation'
        });
      }

      // Generate comprehensive chart data for PDF
      const chartData = await astrologyService.generateDetailedChartAccurate({
        date: birthDate,
        time: birthTime,
        location: birthLocation
      });

      // Get visual chart SVG if available
      let svgContent;
      try {
        const visualResult = await astrologyService.generateBirthChartSVG({
          date: birthDate,
          time: birthTime,
          location: birthLocation
        }, userName || 'Birth Chart');
        
        if (visualResult.success) {
          svgContent = visualResult.svgContent;
        }
      } catch (error) {
        console.log('Could not generate visual chart for PDF, continuing without it');
      }

      // Generate comprehensive chart PDF
      const pdfBuffer = await pdfService.generateChartPDF({
        userName: userName || 'Birth Chart',
        birthDate,
        birthTime, 
        birthLocation,
        chartData,
        svgContent,
        includeHouses: includeHouses || false
      });
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="birth-chart-${birthDate}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating chart PDF:', error);
      res.status(500).json({ error: 'Failed to generate chart PDF' });
    }
  });

  // Get chart details with weekly persistence
  app.post('/api/chart/:sessionId/detailed', requireCompleteProfile, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = (req.user as any)?.id;
      
      // First check if user has birth data in their profile
      const user = await storage.getUser(userId);
      let session = await storage.getChatSession(sessionId);
      
      console.log('Chart - User birth data:', {
        userId,
        userBirthDate: user?.birthDate,
        userBirthTime: user?.birthTime,
        userBirthLocation: user?.birthLocation,
        sessionBirthDate: session?.birthDate,
        sessionBirthTime: session?.birthTime,
        sessionBirthLocation: session?.birthLocation
      });
      
      // Use birth data from user profile if available
      let birthData = {
        birthDate: user?.birthDate || session?.birthDate,
        birthTime: user?.birthTime || session?.birthTime, 
        birthLocation: user?.birthLocation || session?.birthLocation
      };
      
      // Update session with user's birth data if available
      if (user?.birthDate && !session?.birthDate) {
        await storage.updateChatSession(sessionId, {
          birthDate: user.birthDate,
          birthTime: user.birthTime,
          birthLocation: user.birthLocation,
        });
        session = await storage.getChatSession(sessionId);
        birthData = {
          birthDate: user.birthDate,
          birthTime: user.birthTime,
          birthLocation: user.birthLocation
        };
      }
      
      if (!birthData.birthDate || !birthData.birthTime || !birthData.birthLocation) {
        return res.status(400).json({ error: "Birth information required" });
      }

      let chartReading;
      let isExistingContent = false;

      // Check if user has current chart reading
      chartReading = await storage.getChartReading(userId);
      
      console.log('Chart - Existing content check:', {
        userId,
        hasExistingChartReading: !!chartReading,
        chartReadingData: chartReading ? 'exists' : 'null'
      });
      
      // For now, force regeneration until we fix the cached data structure
      if (chartReading) {
        console.log('Chart - Force clearing cached reading to fix Leo/Scorpio issue');
        await storage.clearChartReading(userId);
        chartReading = null;
      }
      
      // Always regenerate for now to ensure correct birth data
      console.log('Chart - Generating fresh chart reading with current birth data');
      
      // Generate new chart reading
      console.log('Chart - Birth data for astrology service:', {
        date: birthData.birthDate,
        time: birthData.birthTime,
        location: birthData.birthLocation
      });
      
      const chart = await astrologyService.generateDetailedChartAccurate({
        date: birthData.birthDate!,
        time: birthData.birthTime!,
        location: birthData.birthLocation!
      });
      
      console.log('Chart - Calculated signs:', {
        sunSign: chart.sunSign,
        moonSign: chart.moonSign,
        rising: chart.rising
      });

      const detailedReading = await openAIService.generateDetailedChartReading(chart);

      chartReading = {
        chart,
        reading: detailedReading,
        generatedAt: new Date().toISOString(),
        birthData: {
          birthDate: birthData.birthDate,
          birthTime: birthData.birthTime,
          birthLocation: birthData.birthLocation
        }
      };
      
      // Store it for future use  
      await storage.storeChartReading(userId, chartReading);
      isExistingContent = false; // This is fresh content

      // Create a formatted chat message for the chart reading
      const formattedReading = isExistingContent 
        ? `📊 **Your Detailed Birth Chart Reading**\n\n*Showing your saved birth chart analysis*\n\n${chartReading.reading}`
        : `📊 **Your Detailed Birth Chart Reading**\n\n${chartReading.reading}`;

      await storage.createChatMessage({
        sessionId,
        userId,
        role: 'assistant',
        content: formattedReading,
        metadata: { 
          type: 'chart-reading',
          chart: chartReading.chart,
          isExistingContent
        },
      });

      const messages = await storage.getChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Error getting detailed chart:", error);
      res.status(500).json({ error: "Failed to generate detailed chart reading" });
    }
  });

  // Check user generation limits
  app.get('/api/user/generation-status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const canGenerate = {
        playlist: true, // Playlists are always available - just replaced weekly
        horoscope: await storage.canUserGenerate(userId, 'horoscope'),
        chart: await storage.canUserGenerate(userId, 'chart'),
        transit: await storage.canUserGenerate(userId, 'transit')
      };
      
      const canExport = await storage.canUserExport(userId);
      
      // Check if user has existing weekly content
      const hasExistingContent = {
        horoscope: await storage.getWeeklyHoroscope(userId) !== null,
        chart: await storage.getChartReading(userId) !== null,
        playlist: await storage.getPlaylistData(userId) !== null,
        transit: await storage.getTransitDetails(userId) !== null,
      };
      
      // Get user data to show when they last generated each feature
      const user = await storage.getUser(userId);
      const lastGenerated = {
        playlist: user?.lastPlaylistGenerated?.toISOString() || null,
        horoscope: user?.lastHoroscopeGenerated?.toISOString() || null,
        chart: user?.lastChartReadingGenerated?.toISOString() || null,
        transit: user?.lastTransitDetailsGenerated?.toISOString() || null,
      };
      
      const lastExported = user?.lastPlaylistExported?.toISOString() || null;
      
      res.json({ canGenerate, canExport, lastGenerated, lastExported, hasExistingContent });
    } catch (error) {
      console.error("Error checking generation status:", error);
      res.status(500).json({ error: "Failed to check generation status" });
    }
  });

  // Spotify Integration Routes
  
  // Start Spotify authentication
  app.get('/api/spotify/auth', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const authUrl = spotifyService.getAuthUrl(userId);
      console.log("\n=== SPOTIFY AUTH REQUEST ===");
      console.log("User ID:", userId);
      console.log("Full auth URL:", authUrl);
      console.log("Redirect URI that MUST be in your Spotify app settings:");
      console.log(`https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/spotify/callback`);
      console.log("===============================");
      res.json({ authUrl });
    } catch (error) {
      console.error("Error getting Spotify auth URL:", error);
      res.status(500).json({ error: "Failed to get Spotify auth URL" });
    }
  });

  // Guest Spotify authentication (no login required)
  app.get('/api/spotify/guest-auth', async (req, res) => {
    try {
      // Generate a temporary guest ID for the auth state
      const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const authUrl = spotifyService.getAuthUrl(guestId);
      
      console.log("\n=== GUEST SPOTIFY AUTH REQUEST ===");
      console.log("Guest ID:", guestId);
      console.log("Auth URL:", authUrl);
      console.log("===============================");
      
      res.json({ authUrl, guestId });
    } catch (error) {
      console.error("Error getting guest Spotify auth URL:", error);
      res.status(500).json({ error: "Failed to get Spotify auth URL" });
    }
  });

  // Personalized Spotify authentication (with birth data)
  app.get('/api/spotify/personalized-auth', async (req, res) => {
    try {
      const { state } = req.query;
      
      if (!state) {
        return res.status(400).json({ error: "Birth data state required" });
      }
      
      // Parse birth data from state
      let birthData;
      try {
        birthData = JSON.parse(decodeURIComponent(state as string));
      } catch (error) {
        return res.status(400).json({ error: "Invalid birth data state" });
      }
      
      // Validate required fields
      if (!birthData.birthDate || !birthData.birthTime || !birthData.birthLocation || !birthData.email) {
        return res.status(400).json({ error: "Missing required birth data fields" });
      }
      
      // Create state for OAuth that includes birth data
      const oauthState = `personalized_${Date.now()}_${JSON.stringify(birthData)}`;
      const authUrl = spotifyService.getAuthUrl(oauthState);
      
      console.log("\n=== PERSONALIZED SPOTIFY AUTH REQUEST ===");
      console.log("Birth data:", {
        email: birthData.email,
        birthDate: birthData.birthDate,
        birthTime: birthData.birthTime,
        birthLocation: birthData.birthLocation
      });
      console.log("Auth URL:", authUrl);
      console.log("===============================");
      
      // Redirect directly to Spotify (since this is called from window.location.href)
      res.redirect(authUrl);
    } catch (error) {
      console.error("Error getting personalized Spotify auth URL:", error);
      res.status(500).json({ error: "Failed to get Spotify auth URL" });
    }
  });

  // Spotify OAuth callback
  app.get('/api/spotify/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      console.log("\n=== SPOTIFY CALLBACK RECEIVED ===");
      console.log("Code received:", !!code);
      console.log("State:", state);
      console.log("Error:", error || "none");
      console.log("=================================");
      
      if (error) {
        console.error("Spotify OAuth error:", error);
        return res.redirect('/?spotify=error&reason=' + encodeURIComponent(error as string));
      }
      
      if (!code || !state) {
        console.error("Missing parameters in Spotify callback:", { code: !!code, state: !!state });
        return res.status(400).json({ error: "Missing code or state parameter" });
      }

      // Exchange code for tokens
      const tokens = await spotifyService.exchangeCodeForToken(code as string);
      
      // Get user's Spotify profile
      const spotifyUser = await spotifyService.getUserProfile(tokens.access_token);
      
      // Check if this is a personalized auth (contains birth data)
      const isPersonalized = (state as string).startsWith('personalized_');
      
      if (isPersonalized) {
        // Extract birth data from state
        const stateData = (state as string).substring('personalized_'.length);
        const timestampEndIndex = stateData.indexOf('_');
        const birthDataString = stateData.substring(timestampEndIndex + 1);
        
        let birthData;
        try {
          birthData = JSON.parse(birthDataString);
        } catch (error) {
          console.error("Error parsing birth data from state:", error);
          return res.redirect('/?spotify=error&reason=invalid_birth_data');
        }
        
        console.log("\n=== PERSONALIZED PLAYLIST GENERATION ===");
        console.log("Birth data:", {
          email: birthData.email,
          birthDate: birthData.birthDate,
          birthTime: birthData.birthTime,
          birthLocation: birthData.birthLocation
        });
        console.log("Spotify user:", spotifyUser.display_name);
        console.log("===============================");
        
        try {
          // Get user's music profile
          const musicProfile = await spotifyService.getUserMusicProfile(tokens.access_token);
          
          // Generate personalized playlist with Spotify integration
          const playlistData = await openAIService.generatePersonalizedPlaylist({
            date: birthData.birthDate,
            time: birthData.birthTime,
            location: birthData.birthLocation,
          }, 'guest', tokens.access_token, musicProfile);
          
          // Handle email sending if requested (will be handled in the OpenAI service)
          // Newsletter signup is handled in the existing guest playlist route
          
          // Store the generated playlist data in localStorage for the results page
          const resultData = {
            ...playlistData,
            spotifyConnected: true,
            spotifyUser: {
              id: spotifyUser.id,
              display_name: spotifyUser.display_name
            }
          };
          
          // Create a success page that stores data and redirects
          res.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Personalized Cosmic Playlist Ready!</title>
            </head>
            <body>
              <script>
                try {
                  localStorage.setItem('guestPlaylist', ${JSON.stringify(JSON.stringify(resultData))});
                  window.location.href = '/playlist-result?personalized=true';
                } catch (error) {
                  console.error('Error storing playlist data:', error);
                  window.location.href = '/?spotify=error&reason=storage_error';
                }
              </script>
              <h2>🎵 Generating your personalized cosmic playlist...</h2>
              <p>Please wait while we redirect you to your results...</p>
            </body>
            </html>
          `);
          return;
        } catch (error) {
          console.error("Error generating personalized playlist:", error);
          return res.redirect('/?spotify=error&reason=playlist_generation_failed');
        }
      }
      
      // Handle regular authentication flow
      const userId = state as string;
      const isGuest = userId.startsWith('guest_');
      
      if (isGuest) {
        // For guest users, return auth data via a special page that communicates with parent window
        const authData = {
          spotifyId: spotifyUser.id,
          spotifyAccessToken: tokens.access_token,
          spotifyRefreshToken: tokens.refresh_token,
          spotifyTokenExpires: new Date(Date.now() + tokens.expires_in * 1000),
          displayName: spotifyUser.display_name
        };
        
        // Return a page that sends auth data to parent window and closes popup
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Spotify Connected</title>
          </head>
          <body>
            <script>
              try {
                // Send auth data to parent window
                window.opener.sessionStorage.setItem('spotifyAuthSuccess', ${JSON.stringify(JSON.stringify(authData))});
                window.close();
              } catch (error) {
                console.error('Error communicating with parent window:', error);
                document.body.innerHTML = '<h2>✅ Spotify Connected!</h2><p>You can close this window and return to the main page.</p>';
              }
            </script>
            <h2>✅ Spotify Connected!</h2>
            <p>You can close this window and return to the main page.</p>
          </body>
          </html>
        `);
        return;
      }
      
      // For authenticated users, get music profile and save to database
      const musicProfile = await spotifyService.getUserMusicProfile(tokens.access_token);
      
      // Save Spotify data to user
      await storage.updateUserSpotify(userId as string, {
        spotifyId: spotifyUser.id,
        spotifyAccessToken: tokens.access_token,
        spotifyRefreshToken: tokens.refresh_token,
        spotifyTokenExpires: new Date(Date.now() + tokens.expires_in * 1000),
        musicProfile: musicProfile,
      });

      // Redirect back to the app with success
      const redirectUrl = req.get('referer') || '/';
      res.redirect(`${redirectUrl}?spotify=connected`);
    } catch (error) {
      console.error("Error in Spotify callback:", error);
      res.redirect('/?spotify=error');
    }
  });

  // Get user's Spotify connection status
  app.get('/api/spotify/status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      let user = await storage.getUser(userId);
      
      let isConnected = !!(user?.spotifyAccessToken && user?.spotifyTokenExpires && user.spotifyTokenExpires > new Date());
      
      // If token is expired but we have a refresh token, try to refresh it
      if (!isConnected && user?.spotifyRefreshToken && user?.spotifyAccessToken) {
        try {
          console.log("Spotify token expired, attempting refresh for user:", userId);
          const refreshed = await spotifyService.refreshAccessToken(user.spotifyRefreshToken);
          
          await storage.updateUserSpotify(userId, {
            spotifyAccessToken: refreshed.access_token,
            spotifyTokenExpires: new Date(Date.now() + refreshed.expires_in * 1000),
          });
          
          // Update user object and connection status
          user = await storage.getUser(userId);
          isConnected = true;
          console.log("Spotify token successfully refreshed for user:", userId);
        } catch (refreshError) {
          console.error("Failed to refresh Spotify token:", refreshError);
          // Token refresh failed, user needs to reconnect
        }
      }
      
      console.log("Spotify status check:", {
        userId,
        isConnected,
        hasSpotifyId: !!user?.spotifyId,
        hasMusicProfile: !!user?.musicProfile,
        musicProfileStructure: user?.musicProfile ? Object.keys(user.musicProfile) : null
      });
      
      res.json({
        connected: isConnected,
        spotifyId: user?.spotifyId,
        musicProfile: (user as any)?.musicProfile?.musicProfile || null,
      });
    } catch (error) {
      console.error("Error checking Spotify status:", error);
      res.status(500).json({ error: "Failed to check Spotify status" });
    }
  });

  // Refresh user's music profile
  app.post('/api/spotify/refresh-profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.spotifyAccessToken) {
        return res.status(400).json({ error: "Spotify not connected" });
      }

      // Check if token needs refresh
      let accessToken = user.spotifyAccessToken;
      if (user.spotifyTokenExpires && user.spotifyTokenExpires <= new Date()) {
        if (user.spotifyRefreshToken) {
          const refreshed = await spotifyService.refreshAccessToken(user.spotifyRefreshToken);
          accessToken = refreshed.access_token;
          
          await storage.updateUserSpotify(userId, {
            spotifyAccessToken: refreshed.access_token,
            spotifyTokenExpires: new Date(Date.now() + refreshed.expires_in * 1000),
          });
        } else {
          return res.status(400).json({ error: "Spotify token expired. Please reconnect." });
        }
      }

      // Get fresh music profile
      const musicProfile = await spotifyService.getUserMusicProfile(accessToken);
      
      // Update user's music profile
      await storage.updateUserSpotify(userId, {
        musicProfile: musicProfile,
      });

      res.json({
        success: true,
        musicProfile: musicProfile.musicProfile
      });
    } catch (error) {
      console.error("Error refreshing music profile:", error);
      res.status(500).json({ error: "Failed to refresh music profile" });
    }
  });

  // Create real Spotify playlist from AI-generated playlist
  app.post('/api/spotify/create-playlist', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { sessionId, playlistName } = req.body;
      
      // Note: Export/sharing is now unlimited - no weekly limit check needed
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID required" });
      }

      // Get user's Spotify data
      const user = await storage.getUser(userId);
      if (!user?.spotifyAccessToken || !user?.spotifyId) {
        return res.status(400).json({ error: "Spotify not connected" });
      }

      // Check if token needs refresh
      let accessToken = user.spotifyAccessToken;
      if (user.spotifyTokenExpires && user.spotifyTokenExpires <= new Date()) {
        if (user.spotifyRefreshToken) {
          const refreshed = await spotifyService.refreshAccessToken(user.spotifyRefreshToken);
          accessToken = refreshed.access_token;
          
          // Update stored tokens
          await storage.updateUserSpotify(userId, {
            spotifyAccessToken: refreshed.access_token,
            spotifyTokenExpires: new Date(Date.now() + refreshed.expires_in * 1000),
          });
        } else {
          return res.status(400).json({ error: "Spotify token expired. Please reconnect." });
        }
      }

      // Get the AI-generated playlist - prioritize user's stored data for consistency
      let aiPlaylist = await storage.getPlaylistData(userId);
      if (!aiPlaylist) {
        // Fallback to session-based playlist
        const sessionPlaylist = await storage.getPlaylist(sessionId);
        if (!sessionPlaylist) {
          return res.status(404).json({ error: "Playlist not found" });
        }
        aiPlaylist = {
          name: sessionPlaylist.name,
          description: sessionPlaylist.description,
          songs: sessionPlaylist.songs,
          weekStart: sessionPlaylist.weekStart,
          weekEnd: sessionPlaylist.weekEnd,
        };
      }
      
      console.log('Export playlist data:', {
        source: aiPlaylist.name ? 'user-stored' : 'session-based',
        songsCount: (aiPlaylist.songs as any[])?.length,
        firstSong: (aiPlaylist.songs as any[])?.[0]
      });

      // Search for real Spotify tracks using user's music profile
      const trackIds: string[] = [];
      const songs = aiPlaylist.songs as any[];
      
      for (const song of songs) {
        try {
          // Enhanced search with exact matching
          console.log(`Searching for: ${song.artist} ${song.title}`);
          
          // First try exact search with quotes
          let searchQuery = `track:"${song.title}" artist:"${song.artist}"`;
          let searchResults = await spotifyService.searchTracks(accessToken, searchQuery, 10);
          console.log(`Found ${searchResults.length} exact results for: ${song.artist} ${song.title}`);
          
          // If no exact matches, try partial matching
          if (searchResults.length === 0) {
            searchQuery = `${song.artist} ${song.title}`;
            searchResults = await spotifyService.searchTracks(accessToken, searchQuery, 10);
            console.log(`Found ${searchResults.length} partial results for: ${song.artist} ${song.title}`);
          }
          
          if (searchResults.length > 0) {
            // Find best match: exact title and artist match preferred
            let bestMatch = searchResults[0];
            
            for (const track of searchResults) {
              const titleMatch = track.name.toLowerCase().includes(song.title.toLowerCase());
              const artistMatch = track.artists.some(artist => 
                artist.name.toLowerCase().includes(song.artist.toLowerCase())
              );
              
              // Prefer exact matches, then high popularity
              if (titleMatch && artistMatch) {
                bestMatch = track;
                break;
              } else if (track.popularity > bestMatch.popularity) {
                bestMatch = track;
              }
            }
            
            console.log(`Selected track: ${bestMatch.name} by ${bestMatch.artists[0]?.name}`);
            trackIds.push(bestMatch.id);
          } else {
            console.warn(`No tracks found for: ${song.artist} - ${song.title}`);
          }
        } catch (error) {
          console.warn(`Failed to find track: ${song.artist} - ${song.title}`, error);
        }
      }

      console.log(`Found ${trackIds.length} tracks out of ${songs.length} songs`);
      
      // Check if user already has a Spotify playlist for current week
      let spotifyPlaylistId = user.spotifyPlaylistId;
      let spotifyPlaylist;
      
      // Get user's astrological signs from birth data
      let userSunSign, userMoonSign;
      if (user.birthDate && user.birthTime && user.birthLocation) {
        try {
          const birthChart = await astrologyService.calculateBigThreeAccurate({
            date: user.birthDate,
            time: user.birthTime,
            location: user.birthLocation
          });
          userSunSign = (birthChart as any).bigThree?.sunSign;
          userMoonSign = (birthChart as any).bigThree?.moonSign;
        } catch (error) {
          console.error('Error calculating user signs:', error);
        }
      }

      const name = playlistName || generateUniquePlaylistName(userSunSign, userMoonSign);
      
      // Get planetary summary from playlist's astrological insights
      const planetarySummary = (aiPlaylist as any).astrologicalSummary || 
        `embraces this week's celestial energies from ${aiPlaylist.weekStart} to ${aiPlaylist.weekEnd}, blending cosmic influences with melodies that resonate with your personal astrological essence`;
      
      const description = generatePersonalizedDescription(
        userSunSign,
        userMoonSign,
        planetarySummary,
        aiPlaylist.description || `Cosmic playlist for ${aiPlaylist.weekStart} to ${aiPlaylist.weekEnd}`
      );
      
      if (spotifyPlaylistId) {
        // Try to update existing playlist
        try {
          spotifyPlaylist = await spotifyService.updatePlaylist(accessToken, spotifyPlaylistId, name, description, aiPlaylist.songs as any[]);
          console.log('Updated existing Spotify playlist:', spotifyPlaylistId);
        } catch (error) {
          console.log('Failed to update existing playlist, creating new one:', error);
          spotifyPlaylist = await spotifyService.createPlaylist(accessToken, user.spotifyId, name, description, aiPlaylist.songs as any[]);
          
          // Store new playlist ID
          await storage.updateUserSpotify(userId, {
            spotifyPlaylistId: spotifyPlaylist.id
          });
        }
      } else {
        // Create new playlist
        spotifyPlaylist = await spotifyService.createPlaylist(accessToken, user.spotifyId, name, description, aiPlaylist.songs as any[]);
        
        // Store playlist ID for reuse
        await storage.updateUserSpotify(userId, {
          spotifyPlaylistId: spotifyPlaylist.id
        });
      }
      
      // Note: No need to update export timestamp - export is now unlimited
      
      res.json({
        success: true,
        playlistUrl: spotifyPlaylist.external_urls.spotify,
        playlistId: spotifyPlaylist.id,
        tracksAdded: trackIds.length,
        totalSongs: (aiPlaylist.songs as any[]).length,
      });
      
    } catch (error) {
      console.error("Error creating Spotify playlist:", error);
      res.status(500).json({ error: "Failed to create Spotify playlist" });
    }
  });

  // Disconnect Spotify
  app.post('/api/spotify/disconnect', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      await storage.updateUserSpotify(userId, {
        spotifyId: undefined,
        spotifyAccessToken: undefined,
        spotifyRefreshToken: undefined,
        spotifyTokenExpires: undefined,
        musicProfile: undefined,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting Spotify:", error);
      res.status(500).json({ error: "Failed to disconnect Spotify" });
    }
  });

  // Public share page route - serves HTML with Open Graph meta tags
  app.get('/share/:shareId', async (req, res) => {
    try {
      const { shareId } = req.params;
      
      // Get share data from database  
      let shareData;
      try {
        shareData = await storage.getSharedContent(shareId);
      } catch (error) {
        console.error("Error getting shared content:", error);
        shareData = null;
      }
      
      if (!shareData) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Shared Content Not Found - Cosmic Playlist Generator</title>
            <meta name="description" content="The shared cosmic playlist you're looking for could not be found.">
          </head>
          <body>
            <h1>Content Not Found</h1>
            <p>The shared content you're looking for could not be found.</p>
            <a href="/">Return to Cosmic Playlist Generator</a>
          </body>
          </html>
        `);
      }

      const playlist = (shareData.metadata as any)?.playlist;
      const conversation = (shareData.metadata as any)?.conversation;
      const appUrl = `${req.protocol}://${req.get('host')}`;
      
      // Handle conversation shares
      if (conversation) {
        // Fetch the original full conversation messages including user prompts
        let fullMessages = [];
        try {
          const originalMessages = await storage.getChatMessages(shareData.contentId);
          fullMessages = originalMessages
            .filter((msg: any) => msg.content.length > 10) // Include both user and assistant messages
            .filter((msg: any, index: number) => {
              // Skip the first message if it's a welcome message (system generated)
              if (index === 0 && msg.role === 'assistant' && 
                  (msg.content.includes('Welcome') || msg.content.includes('✨'))) {
                return false;
              }
              return true;
            })
            .map((msg: any) => ({
              content: msg.content,
              role: msg.role, // Include role to distinguish user vs assistant
              timestamp: msg.createdAt
            }));
        } catch (error) {
          console.log('Could not fetch original messages, using highlights:', error);
          // Fallback to highlights if original messages not found
          fullMessages = conversation.highlights || [];
        }
        
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${conversation.title} - Cosmic Playlist Generator</title>
            <meta name="description" content="A cosmic conversation with ${conversation.messageCount} messages about astrology and music.">
            
            <!-- Open Graph / Facebook -->
            <meta property="og:type" content="website">
            <meta property="og:url" content="${appUrl}/share/${shareId}">
            <meta property="og:title" content="${conversation.title} - Cosmic Chat">
            <meta property="og:description" content="A cosmic conversation with ${conversation.messageCount} messages about astrology and music.">
            <meta property="og:image" content="${appUrl}/cosmic-playlist-share.svg">
            <meta property="og:site_name" content="Cosmic Playlist Generator">
            
            <!-- Twitter -->
            <meta property="twitter:card" content="summary_large_image">
            <meta property="twitter:url" content="${appUrl}/share/${shareId}">
            <meta property="twitter:title" content="${conversation.title} - Cosmic Chat">
            <meta property="twitter:description" content="A cosmic conversation with ${conversation.messageCount} messages about astrology and music.">
            <meta property="twitter:image" content="${appUrl}/cosmic-playlist-share.svg">
            
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                max-width: 900px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: white;
                line-height: 1.6;
              }
              .container {
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
              }
              .header {
                text-align: center;
                margin-bottom: 40px;
              }
              h1 { margin: 0 0 10px 0; font-size: 2.5rem; }
              .subtitle { opacity: 0.9; margin-bottom: 30px; }
              .message-count { font-size: 1.2rem; margin: 20px 0; opacity: 0.8; }
              .highlights {
                margin: 30px 0;
              }
              .message {
                background: rgba(255,255,255,0.05);
                border-left: 4px solid rgba(255,255,255,0.3);
                padding: 20px;
                margin: 20px 0;
                border-radius: 10px;
                text-align: left;
              }
              .message.user {
                background: rgba(255,255,255,0.1);
                border-left: 4px solid rgba(147, 197, 253, 0.7);
              }
              .message.assistant {
                background: rgba(255,255,255,0.05);
                border-left: 4px solid rgba(167, 243, 208, 0.7);
              }
              .message-header {
                font-size: 0.8rem;
                font-weight: bold;
                margin-bottom: 8px;
                opacity: 0.8;
              }
              .message-content {
                margin-bottom: 10px;
                line-height: 1.5;
              }
              .message-time {
                font-size: 0.9rem;
                opacity: 0.7;
              }
              .cta-section {
                text-align: center;
                margin-top: 40px;
                padding-top: 30px;
                border-top: 1px solid rgba(255,255,255,0.2);
              }
              .cta { 
                display: inline-block;
                background: rgba(255,255,255,0.2);
                padding: 15px 30px;
                border-radius: 50px;
                text-decoration: none;
                color: white;
                margin: 10px;
                transition: all 0.3s;
                font-weight: 500;
              }
              .cta:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-2px);
              }
              .cta.primary {
                background: rgba(255,255,255,0.3);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🌟 ${conversation.title}</h1>
                <p class="subtitle">A cosmic conversation exploring Astrology & You</p>
                <div class="message-count">${fullMessages.filter((m: any) => m.role === 'user').length} questions • ${fullMessages.filter((m: any) => m.role === 'assistant').length} cosmic responses</div>
              </div>
              
              ${fullMessages.length > 0 ? `
                <div class="conversation">
                  <h3 style="margin-bottom: 20px;">✨ Full Conversation</h3>
                  ${fullMessages.map((message: any) => `
                    <div class="message ${message.role}">
                      <div class="message-header">
                        ${message.role === 'user' ? '🌟 You asked:' : '🔮 Cosmic AI responded:'}
                      </div>
                      <div class="message-content">${message.content}</div>
                      <div class="message-time">${new Date(message.timestamp).toLocaleDateString()}</div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              <div class="cta-section">
                <p>Ready to explore your own cosmic journey?</p>
                <a href="${appUrl}" class="cta primary">🌟 Start Your Cosmic Chat</a>
                <a href="${appUrl}" class="cta">🎵 Generate Your Playlist</a>
              </div>
            </div>
          </body>
          </html>
        `;
        return res.send(html);
      }
      
      // Generate rich HTML page with Open Graph meta tags for playlists
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${playlist.name} - Cosmic Playlist Generator</title>
          <meta name="description" content="${playlist.description || `A cosmic playlist for ${playlist.weekStart} to ${playlist.weekEnd} with ${playlist.songCount} carefully curated songs.`}">
          
          <!-- Open Graph / Facebook -->
          <meta property="og:type" content="website">
          <meta property="og:url" content="${appUrl}/share/${shareId}">
          <meta property="og:title" content="${playlist.name} - Cosmic Playlist">
          <meta property="og:description" content="A cosmic playlist for ${playlist.weekStart} to ${playlist.weekEnd} with ${playlist.songCount} carefully curated songs based on astrological transits.">
          <meta property="og:image" content="${appUrl}/cosmic-playlist-share.svg">
          <meta property="og:site_name" content="Cosmic Playlist Generator">
          
          <!-- Twitter -->
          <meta property="twitter:card" content="summary_large_image">
          <meta property="twitter:url" content="${appUrl}/share/${shareId}">
          <meta property="twitter:title" content="${playlist.name} - Cosmic Playlist">
          <meta property="twitter:description" content="A cosmic playlist for ${playlist.weekStart} to ${playlist.weekEnd} with ${playlist.songCount} carefully curated songs.">
          <meta property="twitter:image" content="${appUrl}/cosmic-playlist-share.svg">
          
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              color: white;
            }
            .container {
              background: rgba(255,255,255,0.1);
              backdrop-filter: blur(10px);
              border-radius: 20px;
              padding: 40px;
              text-align: center;
            }
            h1 { margin: 0 0 20px 0; font-size: 2.5rem; }
            .period { opacity: 0.8; margin: 20px 0; }
            .song-count { font-size: 1.5rem; margin: 30px 0; }
            .cta { 
              display: inline-block;
              background: rgba(255,255,255,0.2);
              padding: 15px 30px;
              border-radius: 50px;
              text-decoration: none;
              color: white;
              margin-top: 30px;
              transition: all 0.3s;
            }
            .cta:hover {
              background: rgba(255,255,255,0.3);
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🌟 ${playlist.name}</h1>
            <p class="period">Cosmic period: ${playlist.weekStart} to ${playlist.weekEnd}</p>
            <div class="song-count">${playlist.songCount} cosmic songs</div>
            <p>A personalized weekly playlist created with astrological insights and cosmic energy alignment.</p>
            <a href="${appUrl}" class="cta">🎵 Listen on Cosmic Playlist Generator</a>
          </div>
          
          <script>
            // Auto-redirect to main app after 3 seconds if not a crawler
            if (!navigator.userAgent.includes('bot') && !navigator.userAgent.includes('crawler')) {
              setTimeout(() => {
                window.location.href = '${appUrl}';
              }, 3000);
            }
          </script>
        </body>
        </html>
      `;
      
      res.send(html);
    } catch (error) {
      console.error("Error serving share page:", error);
      res.status(500).send("Error loading shared content");
    }
  });

  // Guest playlist export to Spotify - No authentication required
  app.post('/api/guest/export-spotify', async (req, res) => {
    try {
      const { playlistData, spotifyAuth } = req.body;
      
      if (!playlistData || !spotifyAuth) {
        return res.status(400).json({ 
          error: "Missing required data",
          message: "Playlist data and Spotify authentication are required."
        });
      }
      
      // Verify Spotify token is still valid
      try {
        await spotifyService.getUserProfile(spotifyAuth.spotifyAccessToken);
      } catch (error) {
        return res.status(401).json({
          error: "Spotify token expired",
          message: "Please reconnect to Spotify and try again."
        });
      }
      
      // For guest users, extract sun/moon signs from playlist data if available
      const guestSunSign = (playlistData as any).sunSign;
      const guestMoonSign = (playlistData as any).moonSign;
      const planetarySummary = (playlistData as any).astrologicalSummary || 
        `embraces this week's celestial energies from ${playlistData.weekStart} to ${playlistData.weekEnd}, blending cosmic influences with melodies that resonate with your personal astrological essence`;
      
      const description = generatePersonalizedDescription(
        guestSunSign,
        guestMoonSign,
        planetarySummary,
        playlistData.description || `Cosmic playlist for ${playlistData.weekStart} to ${playlistData.weekEnd}`
      );
      
      // Create playlist on Spotify
      const spotifyPlaylist = await spotifyService.createPlaylist(
        spotifyAuth.spotifyAccessToken,
        spotifyAuth.spotifyId,
        playlistData.name,
        description,
        playlistData.songs
      );
      
      res.json({
        success: true,
        spotifyUrl: spotifyPlaylist.external_urls.spotify,
        playlistId: spotifyPlaylist.id,
        message: "Playlist successfully exported to Spotify!"
      });
      
    } catch (error) {
      console.error("Error exporting guest playlist to Spotify:", error);
      res.status(500).json({ 
        error: "Export failed",
        message: "Failed to export playlist to Spotify. Please try again."
      });
    }
  });

  // Share playlist endpoint - Creates Spotify playlist and returns shareable link
  app.post('/api/share/playlist/:sessionId', requireAuth, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      
      // Get the playlist - prioritize user's stored data for consistency
      let playlist = await storage.getPlaylistData(userId);
      if (!playlist) {
        // Fallback to session-based playlist
        const sessionPlaylist = await storage.getPlaylist(sessionId);
        if (!sessionPlaylist) {
          return res.status(404).json({ error: "Playlist not found" });
        }
        playlist = {
          name: sessionPlaylist.name,
          description: sessionPlaylist.description,
          songs: sessionPlaylist.songs,
          weekStart: sessionPlaylist.weekStart,
          weekEnd: sessionPlaylist.weekEnd,
        };
      }

      // Note: Social sharing is unlimited - no export limit check needed
      // Only playlist generation has weekly limits, not sharing

      // Get user's Spotify credentials
      const user = await storage.getUser(userId);
      if (!user?.spotifyAccessToken) {
        return res.status(400).json({ 
          error: "Spotify not connected",
          message: "Please connect your Spotify account first to share playlists."
        });
      }

      try {
        // Check if user already has a Spotify playlist for current week
        let spotifyPlaylistId = user.spotifyPlaylistId;
        let spotifyPlaylist;
        
        // Get user's astrological signs from birth data
        let userSunSign, userMoonSign;
        if (user.birthDate && user.birthTime && user.birthLocation) {
          try {
            const birthChart = await astrologyService.calculateBigThreeAccurate({
              date: user.birthDate,
              time: user.birthTime,
              location: user.birthLocation
            });
            userSunSign = (birthChart as any).bigThree?.sunSign;
            userMoonSign = (birthChart as any).bigThree?.moonSign;
          } catch (error) {
            console.error('Error calculating user signs:', error);
          }
        }

        // Get planetary summary from playlist's astrological insights  
        const planetarySummary = (playlist as any).astrologicalSummary || 
          `embraces this week's celestial energies from ${playlist.weekStart} to ${playlist.weekEnd}, blending cosmic influences with melodies that resonate with your personal astrological essence`;
        
        const description = generatePersonalizedDescription(
          userSunSign,
          userMoonSign,
          planetarySummary,
          playlist.description || `Cosmic playlist for ${playlist.weekStart} to ${playlist.weekEnd}`
        );
        
        if (spotifyPlaylistId) {
          // Try to update existing playlist
          try {
            spotifyPlaylist = await spotifyService.updatePlaylist(user.spotifyAccessToken, spotifyPlaylistId, playlist.name, description, playlist.songs as any[]);
            console.log('Share - Updated existing Spotify playlist:', spotifyPlaylistId);
          } catch (error) {
            console.log('Share - Failed to update existing playlist, creating new one:', error);
            spotifyPlaylist = await spotifyService.createPlaylist(
              user.spotifyAccessToken,
              user.spotifyId!,
              playlist.name,
              description,
              playlist.songs as any[]
            );
            
            // Store new playlist ID
            await storage.updateUserSpotify(userId, {
              spotifyPlaylistId: spotifyPlaylist.id
            });
          }
        } else {
          // Create new playlist
          spotifyPlaylist = await spotifyService.createPlaylist(
            user.spotifyAccessToken,
            user.spotifyId!,
            playlist.name,
            description,
            playlist.songs as any[]
          );
          
          // Store playlist ID for reuse
          await storage.updateUserSpotify(userId, {
            spotifyPlaylistId: spotifyPlaylist.id
          });
        }

        // No need to update export timestamp - social sharing is unlimited

        // Return the direct Spotify playlist URL for sharing
        const response = {
          spotifyUrl: spotifyPlaylist.external_urls.spotify,
          playlistId: spotifyPlaylist.id,
          socialText: {
            twitter: `🎵 Check out my cosmic playlist "${playlist.name}" on Spotify! AI-curated music based on astrological transits: ${spotifyPlaylist.external_urls.spotify} #CosmicMusic #Astrology #Spotify`,
            facebook: `I just created an amazing cosmic playlist using AI and astrology! "${playlist.name}" is now live on Spotify. Listen here: ${spotifyPlaylist.external_urls.spotify}`,
            general: `🌟 My cosmic playlist "${playlist.name}" - AI-curated music based on astrological insights, now on Spotify: ${spotifyPlaylist.external_urls.spotify}`,
          },
        };
        
        res.json(response);
        
      } catch (spotifyError) {
        console.error("Error creating Spotify playlist:", spotifyError);
        return res.status(500).json({ 
          error: "Failed to create Spotify playlist",
          message: "There was an error creating your playlist on Spotify. Please try again."
        });
      }
    } catch (error) {
      console.error("Error sharing playlist:", error);
      res.status(500).json({ error: "Failed to create share link" });
    }
  });

  // Share conversation endpoint  
  app.post('/api/share/conversation/:sessionId', requireAuth, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      
      // Get the conversation
      const messages = await storage.getChatMessages(sessionId);
      if (!messages || messages.length === 0) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // Prepare conversation data for sharing
      const conversationData = {
        sessionId,
        title: `Cosmic Chat Session`,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt,
          metadata: msg.metadata
        })),
        playlistData: undefined // Extract from messages if needed
      };
      
      // Use the social service to create the shareable content
      const shareData = socialService.generateConversationShare(conversationData, userId);
      // Save to database
      const savedContent = await storage.createSharedContent(shareData);
      
      const shareUrl = `${req.protocol}://${req.hostname}/share/${shareData.shareId}`;
      
      const response = {
        shareId: shareData.shareId,
        shareUrl,
        socialText: {
          twitter: `💫 Check out my cosmic conversation with AI about astrology and music! ${shareUrl} #CosmicChat #Astrology`,
          facebook: `I had an amazing conversation with an AI about cosmic music and astrology. Check it out: ${shareUrl}`,
          general: `🌟 My cosmic conversation about astrology and music: ${shareUrl}`,
        },
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error sharing conversation:", error);
      res.status(500).json({ error: "Failed to create share link" });
    }
  });

  // Download conversation as PDF
  app.get('/api/share/conversation/:sessionId/pdf', requireAuth, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      
      // Get the conversation
      const messages = await storage.getChatMessages(sessionId);
      if (!messages || messages.length === 0) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Check if this user owns this conversation
      const session = await storage.getChatSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const conversationTitle = `Cosmic Chat Session`;
      const shareUrl = `${req.protocol}://${req.hostname}/share/${sessionId}`;
      
      // Generate PDF
      const pdfBuffer = await pdfService.generateConversationPDF(
        conversationTitle,
        messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt.toISOString()
        })),
        shareUrl
      );
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="cosmic-conversation-${sessionId.slice(-8)}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Update user profile (username and birth info)
  app.put('/api/user/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { username, birthDate, birthTime, birthLocation } = req.body;
      
      if (!username || !birthDate || !birthTime || !birthLocation) {
        return res.status(400).json({ error: "All profile fields are required" });
      }
      
      const updatedUser = await storage.updateUser(userId, {
        username,
        birthDate,
        birthTime,
        birthLocation,
      });
      
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.put('/api/user/birth-info', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { birthDate, birthTime, birthLocation } = req.body;
      
      if (!birthDate || !birthTime || !birthLocation) {
        return res.status(400).json({ error: "All birth information fields are required" });
      }
      
      const updatedUser = await storage.updateUser(userId, {
        birthDate,
        birthTime,
        birthLocation,
      });
      
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating birth info:", error);
      res.status(500).json({ error: "Failed to update birth information" });
    }
  });
  
  // Delete user account and all associated data
  app.delete('/api/user/account', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // For simplicity, just delete the user - other records will be handled by the application
      // In production, you might want to soft delete or archive user data
      await storage.deleteUser(userId);
      
      // Clear the session
      req.logout((err: any) => {
        if (err) console.error("Logout error during account deletion:", err);
      });
      
      res.json({ success: true, message: "Account and all associated data have been deleted" });
    } catch (error) {
      console.error("Error deleting user account:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // ===== MOOD & FEEDBACK TRACKING ROUTES =====

  // Create daily mood entry
  app.post('/api/mood/daily', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { date, mood, energy, emotions, journalEntry } = req.body;

      if (!date || mood === undefined || energy === undefined) {
        return res.status(400).json({ error: "Date, mood, and energy are required" });
      }

      // Ensure date is in YYYY-MM-DD format and treat it as a local date
      const normalizedDate = date.split('T')[0]; // Remove any time component

      // Get lunar data for this date
      const { LunarService } = await import('./services/lunar.js');
      const lunarService = new LunarService();
      const lunarData = lunarService.getLunarData(new Date(normalizedDate));

      const moodData = {
        userId,
        date: normalizedDate,
        mood: parseInt(mood),
        energy: parseInt(energy),
        emotions: emotions || null,
        journalEntry: journalEntry || null,
        moonPhase: lunarData.phase,
        lunarInfluence: JSON.stringify(lunarData.lunarInfluence),
        moonIllumination: lunarData.illumination,
        moonSign: lunarData.sign,
        lunarAspects: null // Will be calculated later if needed
      };

      // Check if mood entry already exists for this date
      const existingMood = await storage.getDailyMood(userId, normalizedDate);
      
      if (existingMood) {
        // Update existing entry
        const updatedMood = await storage.updateDailyMood(existingMood.id, moodData);
        res.json(updatedMood);
      } else {
        // Create new entry
        const newMood = await storage.createDailyMood(moodData);
        res.json(newMood);
      }
    } catch (error) {
      console.error('Error saving daily mood:', error);
      res.status(500).json({ error: 'Failed to save daily mood' });
    }
  });

  // Get daily mood entry
  app.get('/api/mood/daily/:date', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { date } = req.params;

      const mood = await storage.getDailyMood(userId, date);
      res.json(mood || null);
    } catch (error) {
      console.error('Error fetching daily mood:', error);
      res.status(500).json({ error: 'Failed to fetch daily mood' });
    }
  });

  // Get user's mood history
  app.get('/api/mood/history', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;

      const moods = await storage.getUserDailyMoods(userId, startDate, endDate);
      res.json(moods);
    } catch (error) {
      console.error('Error fetching mood history:', error);
      res.status(500).json({ error: 'Failed to fetch mood history' });
    }
  });

  // Update mood entry
  app.put('/api/mood/daily/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { journalEntry } = req.body;

      // First verify the mood entry belongs to this user
      const [existingEntry] = await db
        .select()
        .from(dailyMoods)
        .where(and(
          eq(dailyMoods.id, parseInt(id)),
          eq(dailyMoods.userId, userId)
        ));

      if (!existingEntry) {
        return res.status(404).json({ error: 'Mood entry not found or access denied' });
      }

      const updatedMood = await storage.updateDailyMood(parseInt(id), { journalEntry });
      res.json(updatedMood);
    } catch (error) {
      console.error('Error updating mood entry:', error);
      res.status(500).json({ error: 'Failed to update mood entry' });
    }
  });

  // Submit content feedback (for playlists, horoscopes, chart readings)
  app.post('/api/feedback/content', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { 
        contentType, 
        contentId, 
        accuracyRating, 
        resonanceRating, 
        helpfulnessRating, 
        feedback, 
        tags,
        date 
      } = req.body;

      if (!contentType || !date) {
        return res.status(400).json({ error: "Content type and date are required" });
      }

      const feedbackData = {
        userId,
        contentType,
        contentId: contentId || null,
        accuracyRating: accuracyRating || null,
        resonanceRating: resonanceRating || null,
        helpfulnessRating: helpfulnessRating || null,
        feedback: feedback || null,
        tags: tags || null,
        date
      };

      const newFeedback = await storage.createContentFeedback(feedbackData);
      res.json(newFeedback);
    } catch (error) {
      console.error('Error saving content feedback:', error);
      res.status(500).json({ error: 'Failed to save content feedback' });
    }
  });

  // Get content feedback history
  app.get('/api/feedback/content', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { contentType } = req.query;

      const feedback = await storage.getContentFeedback(userId, contentType);
      res.json(feedback);
    } catch (error) {
      console.error('Error fetching content feedback:', error);
      res.status(500).json({ error: 'Failed to fetch content feedback' });
    }
  });

  // Create weekly reflection
  app.post('/api/reflection/weekly', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const {
        weekStart,
        weekEnd,
        overallMoodAvg,
        playlistAccuracy,
        horoscopeAccuracy,
        chartAccuracy,
        weeklyHighlights,
        nextWeekIntentions
      } = req.body;

      if (!weekStart || !weekEnd) {
        return res.status(400).json({ error: "Week start and end dates are required" });
      }

      // Check if reflection already exists for this week
      const existingReflection = await storage.getWeeklyReflection(userId, weekStart);
      
      const reflectionData = {
        userId,
        weekStart,
        weekEnd,
        overallMoodAvg: overallMoodAvg || null,
        playlistAccuracy: playlistAccuracy || null,
        horoscopeAccuracy: horoscopeAccuracy || null,
        chartAccuracy: chartAccuracy || null,
        weeklyHighlights: weeklyHighlights || null,
        nextWeekIntentions: nextWeekIntentions || null
      };

      if (existingReflection) {
        // Update existing reflection
        const updatedReflection = await storage.updateWeeklyReflection(existingReflection.id, reflectionData);
        res.json(updatedReflection);
      } else {
        // Create new reflection
        const newReflection = await storage.createWeeklyReflection(reflectionData);
        res.json(newReflection);
      }
    } catch (error) {
      console.error('Error saving weekly reflection:', error);
      res.status(500).json({ error: 'Failed to save weekly reflection' });
    }
  });

  // Get user's weekly reflections
  app.get('/api/reflection/weekly', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const reflections = await storage.getUserWeeklyReflections(userId);
      res.json(reflections);
    } catch (error) {
      console.error('Error fetching weekly reflections:', error);
      res.status(500).json({ error: 'Failed to fetch weekly reflections' });
    }
  });

  // Get daily transit data for a specific date
  app.get('/api/transit/daily/:date', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { date } = req.params;
      const user = await storage.getUser(userId);

      if (!user || !user.birthDate || !user.birthTime || !user.birthLocation) {
        return res.status(400).json({ error: 'Complete birth information required for transit calculations' });
      }

      const transitData = await astrologyService.generateAndStoreDailyTransit(
        userId,
        { date: user.birthDate, time: user.birthTime, location: user.birthLocation },
        date
      );

      res.json(transitData);
    } catch (error) {
      console.error('Error fetching daily transit:', error);
      res.status(500).json({ error: 'Failed to fetch daily transit' });
    }
  });

  // Get transit history for a date range
  app.get('/api/transit/history', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;

      const transits = await storage.getUserDailyTransits(userId, startDate, endDate);
      res.json(transits);
    } catch (error) {
      console.error('Error fetching transit history:', error);
      res.status(500).json({ error: 'Failed to fetch transit history' });
    }
  });

  // Generate transit data for a specific date (force regeneration)
  app.post('/api/transit/generate', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { date } = req.body;
      const user = await storage.getUser(userId);

      if (!date) {
        return res.status(400).json({ error: 'Date is required' });
      }

      if (!user || !user.birthDate || !user.birthTime || !user.birthLocation) {
        return res.status(400).json({ error: 'Complete birth information required for transit calculations' });
      }

      // Force regeneration by first checking for existing and updating it
      const existingTransit = await storage.getDailyTransit(userId, date);
      const transitData = await astrologyService.calculateDailyTransits(
        { date: user.birthDate, time: user.birthTime, location: user.birthLocation },
        date
      );

      if (existingTransit) {
        // Update existing transit
        const updatedTransit = await storage.updateDailyTransit(existingTransit.id, {
          transitData,
          personalizedAspects: {
            aspects: transitData.significantAspects,
            energyProfile: transitData.energyProfile,
            moodInfluences: transitData.moodInfluences
          },
          musicRecommendations: astrologyService.generateMusicRecommendations(transitData)
        });
        res.json(updatedTransit?.transitData || transitData);
      } else {
        // Create new transit
        const newTransit = await storage.createDailyTransit({
          userId,
          date,
          transitData,
          personalizedAspects: {
            aspects: transitData.significantAspects,
            energyProfile: transitData.energyProfile,
            moodInfluences: transitData.moodInfluences
          },
          musicRecommendations: astrologyService.generateMusicRecommendations(transitData)
        });
        res.json(newTransit.transitData);
      }
    } catch (error) {
      console.error('Error generating transit data:', error);
      res.status(500).json({ error: 'Failed to generate transit data' });
    }
  });

  // Analyze mood-transit correlations
  app.get('/api/analysis/mood-transit-correlation', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      const user = await storage.getUser(userId);

      if (!user || !user.birthDate || !user.birthTime || !user.birthLocation) {
        return res.status(400).json({ error: 'Complete birth information required for transit analysis' });
      }

      // Fetch user's mood and transit data
      const [moods, transits] = await Promise.all([
        storage.getUserDailyMoods(userId, startDate, endDate),
        storage.getUserDailyTransits(userId, startDate, endDate)
      ]);

      // Backfill missing transit data for existing mood entries
      const backfillPromises = [];
      for (const mood of moods) {
        const existingTransit = transits.find(t => t.date === mood.date);
        if (!existingTransit) {
          backfillPromises.push(
            astrologyService.generateAndStoreDailyTransit(
              userId,
              { date: user.birthDate, time: user.birthTime, location: user.birthLocation },
              mood.date
            )
          );
        }
      }

      // Execute backfill operations
      if (backfillPromises.length > 0) {
        console.log(`Backfilling ${backfillPromises.length} missing transit entries for user ${userId}`);
        await Promise.allSettled(backfillPromises);
        
        // Refetch transit data after backfill
        const updatedTransits = await storage.getUserDailyTransits(userId, startDate, endDate);
        
        // Import and use correlation service
        const { correlationService } = await import('./services/correlation');
        const analysis = await correlationService.analyzeMoodTransitCorrelations(moods, updatedTransits);
        res.json(analysis);
      } else {
        // No backfill needed, proceed with existing data
        const { correlationService } = await import('./services/correlation');
        const analysis = await correlationService.analyzeMoodTransitCorrelations(moods, transits);
        res.json(analysis);
      }
    } catch (error) {
      console.error('Error analyzing mood-transit correlations:', error);
      res.status(500).json({ error: 'Failed to analyze correlations' });
    }
  });

  // Backfill transit data for existing mood entries
  app.post('/api/transit/backfill', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || !user.birthDate || !user.birthTime || !user.birthLocation) {
        return res.status(400).json({ error: 'Complete birth information required for transit calculations' });
      }

      // Get all user's mood entries
      const allMoods = await storage.getUserDailyMoods(userId);
      const allTransits = await storage.getUserDailyTransits(userId);

      // Find mood entries without corresponding transit data
      const missingTransitDates = allMoods
        .filter(mood => !allTransits.some(transit => transit.date === mood.date))
        .map(mood => mood.date);

      if (missingTransitDates.length === 0) {
        return res.json({ 
          message: 'All mood entries already have corresponding transit data',
          backfilledCount: 0
        });
      }

      // Generate transit data for missing dates
      const backfillPromises = missingTransitDates.map(date =>
        astrologyService.generateAndStoreDailyTransit(
          userId,
          { date: user.birthDate!, time: user.birthTime!, location: user.birthLocation! },
          date
        )
      );

      console.log(`Starting backfill of ${missingTransitDates.length} transit entries for user ${userId}`);
      const results = await Promise.allSettled(backfillPromises);
      
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failureCount = results.filter(result => result.status === 'rejected').length;

      console.log(`Backfill completed: ${successCount} successful, ${failureCount} failed`);

      res.json({
        message: `Backfill completed successfully`,
        backfilledCount: successCount,
        failedCount: failureCount,
        totalMoods: allMoods.length,
        dates: missingTransitDates
      });
    } catch (error) {
      console.error('Error backfilling transit data:', error);
      res.status(500).json({ error: 'Failed to backfill transit data' });
    }
  });

  // Handle playlist sharing with dynamic meta tags for social media crawlers
  app.get('/playlist-result', async (req, res) => {
    try {
      // Get the base HTML
      const fs = await import('fs/promises');
      const path = await import('path');
      
      let indexPath;
      if (app.get("env") === "development") {
        // In development, we need to get the HTML from Vite
        indexPath = path.resolve(import.meta.dirname, '../client/index.html');
      } else {
        // In production, get from dist
        indexPath = path.resolve(import.meta.dirname, 'public/index.html');
      }
      
      let html = '';
      try {
        html = await fs.readFile(indexPath, 'utf-8');
      } catch (err) {
        // Fallback HTML if file not found
        html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sonifyr - Cosmic Music Curator</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>`;
      }
      
      // Extract playlist data from query params or use defaults
      const playlistName = req.query.name as string || 'Cosmic Playlist: Your Horoscope Your Soundtrack';
      const description = req.query.description as string || 'Discover your personalized cosmic playlist curated by AI and astrology. Songs chosen based on planetary influences and astrological insights.';
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || req.get('host') || 'localhost:5000';
      const baseUrl = domain.includes('localhost') ? `http://${domain}` : `https://${domain}`;
      const imageUrl = `${baseUrl}/generated_images/Sonifyr_star_logo_design_85955193.png`;
      const playlistUrl = `${baseUrl}/playlist-result`;
      
      // Generate dynamic meta tags
      const metaTags = `
    <meta property="og:title" content="${playlistName} - Sonifyr">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${playlistUrl}">
    <meta property="og:type" content="music.playlist">
    <meta property="og:site_name" content="Sonifyr">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${playlistName} - Sonifyr">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">
    <meta name="description" content="${description}">`;
      
      // Update page title
      const updatedTitle = `${playlistName} - Sonifyr`;
      html = html.replace(/<title>[^<]*<\/title>/i, `<title>${updatedTitle}</title>`);
      
      // Inject meta tags into the head section
      html = html.replace(/<\/head>/i, `${metaTags}\n</head>`);
      
      // Set headers for social media crawlers
      res.set({
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      });
      
      console.log(`🌟 Serving playlist-result with dynamic meta tags: "${playlistName}"`);
      res.send(html);
      
    } catch (error) {
      console.error('Error serving playlist result with meta tags:', error);
      // Fallback to normal index.html
      res.redirect('/');
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}