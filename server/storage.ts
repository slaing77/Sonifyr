import { 
  chatSessions, 
  chatMessages, 
  messageFeedback,
  playlists,
  users,
  sharedContent,
  socialInteractions,
  astrologicalCharts,
  songUsage,
  dailyMoods,
  dailyTransits,
  contentFeedback,
  weeklyReflections,
  guestRateLimits,
  type ChatSession, 
  type ChatMessage, 
  type Playlist, 
  type User,
  type SharedContent,
  type SocialInteraction,
  type SongUsage,
  type DailyMood,
  type DailyTransit,
  type ContentFeedback,
  type WeeklyReflection,
  type GuestRateLimit,
  type InsertGuestRateLimit,
  type InsertSongUsage,
  type InsertChatSession, 
  type InsertChatMessage, 
  type InsertPlaylist,
  type InsertSharedContent,
  type InsertSocialInteraction,
  type InsertDailyMood,
  type InsertDailyTransit,
  type InsertContentFeedback,
  type InsertWeeklyReflection,
  type UpsertUser,
  type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";

export interface IStorage {
  // User operations 
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserBirthInfo(userId: string, birthInfo: {birthDate: string, birthTime: string, birthLocation: string}): Promise<User | undefined>;
  deleteUser(userId: string): Promise<void>;
  // Password reset operations
  setPasswordResetToken(email: string, token: string, expiry: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(userId: string): Promise<void>;
  // Guest rate limiting operations
  canGuestGenerate(email: string): Promise<boolean>;
  touchGuestPlaylistGenerated(email: string): Promise<void>;
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
  updateUserSpotify(userId: string, spotifyData: Partial<{
    spotifyId: string;
    spotifyAccessToken: string;
    spotifyRefreshToken: string;
    spotifyTokenExpires: Date;
    musicProfile: any;
    spotifyPlaylistId: string;
  }>): Promise<void>;
  updateUserLastGenerated(userId: string, feature: 'playlist' | 'horoscope' | 'chart' | 'transit'): Promise<void>;
  updateUserLastExported(userId: string): Promise<void>;
  canUserGenerate(userId: string, feature: 'playlist' | 'horoscope' | 'chart' | 'transit'): Promise<boolean>;
  canUserExport(userId: string): Promise<boolean>;
  // Weekly content persistence
  storeWeeklyHoroscope(userId: string, horoscope: any): Promise<void>;
  storeChartReading(userId: string, chartReading: any): Promise<void>;
  storePlaylistData(userId: string, playlistData: any): Promise<void>;
  storeTransitDetails(userId: string, transitDetails: any): Promise<void>;
  getWeeklyHoroscope(userId: string): Promise<any | null>;
  getChartReading(userId: string): Promise<any | null>;
  getPlaylistData(userId: string): Promise<any | null>;
  getTransitDetails(userId: string): Promise<any | null>;

  // Chat Sessions
  getChatSession(sessionId: string): Promise<ChatSession | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(sessionId: string, updates: Partial<InsertChatSession>): Promise<ChatSession | undefined>;

  // Chat Messages
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Playlists
  getPlaylist(sessionId: string): Promise<Playlist | undefined>;
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;

  // Social Sharing
  createSharedContent(content: InsertSharedContent): Promise<SharedContent>;
  getSharedContent(shareId: string): Promise<SharedContent | undefined>;
  updateSharedContentViews(shareId: string): Promise<void>;
  createSocialInteraction(interaction: InsertSocialInteraction): Promise<SocialInteraction>;
  getSocialInteractions(shareId: string, type?: string): Promise<SocialInteraction[]>;

  // Message Feedback
  createMessageFeedback(messageId: number, userId: string, sessionId: string, feedback: 'like' | 'dislike'): Promise<void>;
  getMessageFeedback(userId: string): Promise<any[]>;

  // Chart storage
  saveAstrologicalChart(chartData: any): Promise<void>;
  getAstrologicalChart(userId: string): Promise<any | null>;
  updateAstrologicalChart(userId: string, chartData: any): Promise<void>;
  getAstrologicalChartByBirthData(userId: string, birthDate: string, birthTime: string, birthLocation: string): Promise<any | null>;
  upsertAstrologicalChart(chartData: any): Promise<void>;
  
  // Song Usage Tracking (30-day limits)
  recordSongUsage(usage: InsertSongUsage): Promise<void>;
  getRecentlyUsedSongs(userId: string, daysBack?: number): Promise<string[]>; // Returns Spotify IDs
  isSongRecentlyUsed(userId: string, spotifyId: string, daysBack?: number): Promise<boolean>;
  filterOutRecentlyUsedSongs(userId: string, spotifyIds: string[], daysBack?: number): Promise<string[]>;

  // Mood & Feedback Tracking
  createDailyMood(mood: InsertDailyMood): Promise<DailyMood>;
  getDailyMood(userId: string, date: string): Promise<DailyMood | undefined>;
  getUserDailyMoods(userId: string, startDate?: string, endDate?: string): Promise<DailyMood[]>;
  updateDailyMood(id: number, updates: Partial<InsertDailyMood>): Promise<DailyMood | undefined>;
  
  createContentFeedback(feedback: InsertContentFeedback): Promise<ContentFeedback>;
  getContentFeedback(userId: string, contentType?: string): Promise<ContentFeedback[]>;
  updateContentFeedback(id: number, updates: Partial<InsertContentFeedback>): Promise<ContentFeedback | undefined>;
  
  createWeeklyReflection(reflection: InsertWeeklyReflection): Promise<WeeklyReflection>;
  getWeeklyReflection(userId: string, weekStart: string): Promise<WeeklyReflection | undefined>;
  getUserWeeklyReflections(userId: string): Promise<WeeklyReflection[]>;
  updateWeeklyReflection(id: number, updates: Partial<InsertWeeklyReflection>): Promise<WeeklyReflection | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const userId = this.generateUserId();
    const [user] = await db
      .insert(users)
      .values({ ...userData, id: userId })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  // Password reset methods
  async setPasswordResetToken(email: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({
        resetToken: token,
        resetTokenExpiry: expiry,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.resetToken, token));
    return user;
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserSpotify(id: string, spotifyData: Partial<{
    spotifyId: string;
    spotifyAccessToken: string;
    spotifyRefreshToken: string;
    spotifyTokenExpires: Date;
    musicProfile: any;
    spotifyPlaylistId: string;
  }>): Promise<void> {
    await db
      .update(users)
      .set({
        ...spotifyData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async updateUserBirthInfo(userId: string, birthInfo: {birthDate: string, birthTime: string, birthLocation: string}): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        birthDate: birthInfo.birthDate,
        birthTime: birthInfo.birthTime,
        birthLocation: birthInfo.birthLocation,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated || undefined;
  }

  async getChatSession(sessionId: string): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.sessionId, sessionId));
    return session || undefined;
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const [session] = await db.insert(chatSessions).values(insertSession).returning();
    return session;
  }

  async updateChatSession(sessionId: string, updates: Partial<InsertChatSession>): Promise<ChatSession | undefined> {
    const [updated] = await db
      .update(chatSessions)
      .set(updates)
      .where(eq(chatSessions.sessionId, sessionId))
      .returning();
    return updated || undefined;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessages).values(insertMessage).returning();
    return message;
  }

  async getPlaylist(sessionId: string): Promise<Playlist | undefined> {
    const [playlist] = await db.select().from(playlists).where(eq(playlists.sessionId, sessionId));
    return playlist || undefined;
  }

  async createPlaylist(insertPlaylist: InsertPlaylist): Promise<Playlist> {
    const [playlist] = await db.insert(playlists).values(insertPlaylist).returning();
    return playlist;
  }

  // Social Sharing methods
  async createSharedContent(insertContent: InsertSharedContent): Promise<SharedContent> {
    const [content] = await db.insert(sharedContent).values(insertContent).returning();
    return content;
  }

  async getSharedContent(shareId: string): Promise<SharedContent | undefined> {
    const [content] = await db.select().from(sharedContent).where(eq(sharedContent.shareId, shareId));
    return content || undefined;
  }

  async updateSharedContentViews(shareId: string): Promise<void> {
    await db
      .update(sharedContent)
      .set({ 
        viewCount: sql`${sharedContent.viewCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(sharedContent.shareId, shareId));
  }

  async createSocialInteraction(insertInteraction: InsertSocialInteraction): Promise<SocialInteraction> {
    const [interaction] = await db.insert(socialInteractions).values(insertInteraction).returning();
    return interaction;
  }

  async getSocialInteractions(shareId: string, type?: string): Promise<SocialInteraction[]> {
    if (type) {
      return await db
        .select()
        .from(socialInteractions)
        .where(and(
          eq(socialInteractions.shareId, shareId),
          eq(socialInteractions.interactionType, type)
        ))
        .orderBy(socialInteractions.createdAt);
    } else {
      return await db
        .select()
        .from(socialInteractions)
        .where(eq(socialInteractions.shareId, shareId))
        .orderBy(socialInteractions.createdAt);
    }
  }

  // Weekly limit tracking methods
  async updateUserLastGenerated(userId: string, feature: 'playlist' | 'horoscope' | 'chart' | 'transit'): Promise<void> {
    const fieldMap = {
      playlist: 'lastPlaylistGenerated',
      horoscope: 'lastHoroscopeGenerated', 
      chart: 'lastChartReadingGenerated',
      transit: 'lastTransitDetailsGenerated'
    };

    await db
      .update(users)
      .set({ 
        [fieldMap[feature]]: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateUserLastExported(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        lastPlaylistExported: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async canUserGenerate(userId: string, feature: 'playlist' | 'horoscope' | 'chart' | 'transit'): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return true; // Guest users can always generate

    // Chart readings are static - always allow regeneration (only changes if birth data changes)
    if (feature === 'chart') {
      return true;
    }

    const fieldMap = {
      playlist: user.lastPlaylistGenerated,
      horoscope: user.lastHoroscopeGenerated,
      transit: user.lastTransitDetailsGenerated
    };

    const lastGenerated = fieldMap[feature];
    if (!lastGenerated) return true; // Never generated before

    // Check if a week has passed (7 days = 7 * 24 * 60 * 60 * 1000 ms)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return lastGenerated < oneWeekAgo;
  }

  async canUserExport(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false; // Guest users cannot export

    const lastExported = user.lastPlaylistExported;
    if (!lastExported) return true; // Never exported before

    // Check if a week has passed (7 days = 7 * 24 * 60 * 60 * 1000 ms)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return lastExported < oneWeekAgo;
  }

  // Weekly content persistence methods
  async storeWeeklyHoroscope(userId: string, horoscope: any): Promise<void> {
    await db
      .update(users)
      .set({ 
        currentWeeklyHoroscope: horoscope,
        lastHoroscopeGenerated: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  async storeChartReading(userId: string, chartReading: any): Promise<void> {
    console.log('Storage - Storing chart reading with birth data:', {
      userId,
      hasBirthData: !!chartReading.birthData,
      birthData: chartReading.birthData
    });
    await db
      .update(users)
      .set({ 
        currentChartReading: chartReading,
        lastChartReadingGenerated: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  async storePlaylistData(userId: string, playlistData: any): Promise<void> {
    await db
      .update(users)
      .set({ 
        currentPlaylistData: playlistData,
        lastPlaylistGenerated: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  async getWeeklyHoroscope(userId: string): Promise<any | null> {
    const user = await this.getUser(userId);
    if (!user?.currentWeeklyHoroscope || !user.lastHoroscopeGenerated) return null;
    
    // Check if it's still within the 7-day window
    const now = new Date();
    const generatedDate = new Date(user.lastHoroscopeGenerated);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    if (generatedDate < sevenDaysAgo) {
      return null; // Expired
    }
    
    return user.currentWeeklyHoroscope;
  }

  async getChartReading(userId: string): Promise<any | null> {
    const user = await this.getUser(userId);
    if (!user?.currentChartReading) return null;
    
    // Chart readings are static - no expiration, only change if birth data changes
    return user.currentChartReading;
  }

  async clearChartReading(userId: string): Promise<void> {
    console.log('Storage - Clearing chart reading cache for user:', userId);
    await db
      .update(users)
      .set({ 
        currentChartReading: null,
        lastChartReadingGenerated: null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  async clearTransitDetails(userId: string): Promise<void> {
    console.log('Storage - Clearing transit details cache and generation timer for user:', userId);
    await db
      .update(users)
      .set({ 
        currentTransitDetails: null,
        lastTransitDetailsGenerated: null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  async getPlaylistData(userId: string): Promise<any | null> {
    const user = await this.getUser(userId);
    if (!user?.currentPlaylistData || !user.lastPlaylistGenerated) return null;
    
    // Check if it's still within the 7-day window
    const now = new Date();
    const generatedDate = new Date(user.lastPlaylistGenerated);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    if (generatedDate < sevenDaysAgo) {
      return null; // Expired
    }
    
    return user.currentPlaylistData;
  }

  async storeTransitDetails(userId: string, transitDetails: any): Promise<void> {
    await db
      .update(users)
      .set({ 
        currentTransitDetails: transitDetails,
        lastTransitDetailsGenerated: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  async getTransitDetails(userId: string): Promise<any | null> {
    const user = await this.getUser(userId);
    if (!user?.currentTransitDetails || !user.lastTransitDetailsGenerated) return null;
    
    // Check if it's still within the 7-day window
    const now = new Date();
    const generatedDate = new Date(user.lastTransitDetailsGenerated);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    if (generatedDate < sevenDaysAgo) {
      return null; // Expired
    }
    
    return user.currentTransitDetails;
  }

  // Message Feedback operations
  async createMessageFeedback(messageId: number, userId: string, sessionId: string, feedback: 'like' | 'dislike'): Promise<void> {
    // First, delete any existing feedback for this message by this user
    await db.delete(messageFeedback)
      .where(and(
        eq(messageFeedback.messageId, messageId),
        eq(messageFeedback.userId, userId)
      ));
    
    // Insert new feedback
    await db.insert(messageFeedback).values({
      messageId,
      userId,
      sessionId,
      feedback
    });
  }

  async getMessageFeedback(userId: string): Promise<any[]> {
    return await db.select().from(messageFeedback).where(eq(messageFeedback.userId, userId));
  }

  // Chart storage
  async saveAstrologicalChart(chartData: any): Promise<void> {
    await db.insert(astrologicalCharts).values(chartData);
  }

  async getAstrologicalChart(userId: string): Promise<any | null> {
    const [chart] = await db.select().from(astrologicalCharts).where(eq(astrologicalCharts.userId, userId));
    return chart || null;
  }

  async updateAstrologicalChart(userId: string, chartData: any): Promise<void> {
    await db
      .update(astrologicalCharts)
      .set({ ...chartData, updatedAt: new Date() })
      .where(eq(astrologicalCharts.userId, userId));
  }

  async getAstrologicalChartByBirthData(userId: string, birthDate: string, birthTime: string, birthLocation: string): Promise<any | null> {
    const [chart] = await db
      .select()
      .from(astrologicalCharts)
      .where(
        and(
          eq(astrologicalCharts.userId, userId),
          eq(astrologicalCharts.birthDate, birthDate),
          eq(astrologicalCharts.birthTime, birthTime),
          eq(astrologicalCharts.birthLocation, birthLocation)
        )
      );
    return chart || null;
  }

  async upsertAstrologicalChart(chartData: any): Promise<void> {
    await db
      .insert(astrologicalCharts)
      .values(chartData)
      .onConflictDoUpdate({
        target: [astrologicalCharts.userId, astrologicalCharts.birthDate, astrologicalCharts.birthTime, astrologicalCharts.birthLocation],
        set: {
          ...chartData,
          updatedAt: new Date(),
        },
      });
  }

  // Song Usage Tracking for 30-day limits
  async recordSongUsage(usage: InsertSongUsage): Promise<void> {
    await db
      .insert(songUsage)
      .values(usage);
  }

  async getRecentlyUsedSongs(userId: string, daysBack: number = 30): Promise<string[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const recentUsage = await db
      .select({ spotifyId: songUsage.spotifyId })
      .from(songUsage)
      .where(
        and(
          eq(songUsage.userId, userId),
          sql`${songUsage.usedAt} >= ${cutoffDate}`
        )
      );

    return recentUsage.map(usage => usage.spotifyId);
  }

  async isSongRecentlyUsed(userId: string, spotifyId: string, daysBack: number = 30): Promise<boolean> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const [usage] = await db
      .select()
      .from(songUsage)
      .where(
        and(
          eq(songUsage.userId, userId),
          eq(songUsage.spotifyId, spotifyId),
          sql`${songUsage.usedAt} >= ${cutoffDate}`
        )
      )
      .limit(1);

    return !!usage;
  }

  async filterOutRecentlyUsedSongs(userId: string, spotifyIds: string[], daysBack: number = 30): Promise<string[]> {
    if (spotifyIds.length === 0) return [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const recentlyUsed = await db
      .select({ spotifyId: songUsage.spotifyId })
      .from(songUsage)
      .where(
        and(
          eq(songUsage.userId, userId),
          sql`${songUsage.spotifyId} = ANY(${spotifyIds})`,
          sql`${songUsage.usedAt} >= ${cutoffDate}`
        )
      );

    const recentlyUsedIds = new Set(recentlyUsed.map(usage => usage.spotifyId));
    return spotifyIds.filter(id => !recentlyUsedIds.has(id));
  }

  // Mood & Feedback Tracking - Database methods
  async createDailyMood(moodData: InsertDailyMood): Promise<DailyMood> {
    const [mood] = await db.insert(dailyMoods).values(moodData).returning();
    return mood;
  }

  async getDailyMood(userId: string, date: string): Promise<DailyMood | undefined> {
    const [mood] = await db
      .select()
      .from(dailyMoods)
      .where(and(eq(dailyMoods.userId, userId), eq(dailyMoods.date, date)));
    return mood;
  }

  async getUserDailyMoods(userId: string, startDate?: string, endDate?: string): Promise<DailyMood[]> {
    const conditions = [eq(dailyMoods.userId, userId)];
    
    if (startDate && endDate) {
      conditions.push(
        sql`${dailyMoods.date} >= ${startDate}`,
        sql`${dailyMoods.date} <= ${endDate}`
      );
    }
    
    return await db
      .select()
      .from(dailyMoods)
      .where(and(...conditions))
      .orderBy(sql`${dailyMoods.date} DESC`);
  }

  async updateDailyMood(id: number, updates: Partial<InsertDailyMood>): Promise<DailyMood | undefined> {
    const [mood] = await db
      .update(dailyMoods)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dailyMoods.id, id))
      .returning();
    return mood;
  }

  // Daily Transit Storage Methods
  async createDailyTransit(transitData: InsertDailyTransit): Promise<DailyTransit> {
    const [transit] = await db.insert(dailyTransits).values(transitData).returning();
    return transit;
  }

  async getDailyTransit(userId: string, date: string): Promise<DailyTransit | undefined> {
    const [transit] = await db
      .select()
      .from(dailyTransits)
      .where(and(eq(dailyTransits.userId, userId), eq(dailyTransits.date, date)));
    return transit;
  }

  async getUserDailyTransits(userId: string, startDate?: string, endDate?: string): Promise<DailyTransit[]> {
    const conditions = [eq(dailyTransits.userId, userId)];
    
    if (startDate && endDate) {
      conditions.push(
        sql`${dailyTransits.date} >= ${startDate}`,
        sql`${dailyTransits.date} <= ${endDate}`
      );
    }
    
    return await db
      .select()
      .from(dailyTransits)
      .where(and(...conditions))
      .orderBy(sql`${dailyTransits.date} DESC`);
  }

  async updateDailyTransit(id: number, updates: Partial<InsertDailyTransit>): Promise<DailyTransit | undefined> {
    const [transit] = await db
      .update(dailyTransits)
      .set(updates)
      .where(eq(dailyTransits.id, id))
      .returning();
    return transit;
  }

  async deleteDailyTransit(id: number): Promise<boolean> {
    const result = await db
      .delete(dailyTransits)
      .where(eq(dailyTransits.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async createContentFeedback(feedbackData: InsertContentFeedback): Promise<ContentFeedback> {
    const [feedback] = await db.insert(contentFeedback).values(feedbackData).returning();
    return feedback;
  }

  async getContentFeedback(userId: string, contentType?: string): Promise<ContentFeedback[]> {
    const conditions = [eq(contentFeedback.userId, userId)];
    
    if (contentType) {
      conditions.push(eq(contentFeedback.contentType, contentType));
    }
    
    return await db
      .select()
      .from(contentFeedback)
      .where(and(...conditions))
      .orderBy(sql`${contentFeedback.date} DESC`);
  }

  async updateContentFeedback(id: number, updates: Partial<InsertContentFeedback>): Promise<ContentFeedback | undefined> {
    const [feedback] = await db
      .update(contentFeedback)
      .set(updates)
      .where(eq(contentFeedback.id, id))
      .returning();
    return feedback;
  }

  async createWeeklyReflection(reflectionData: InsertWeeklyReflection): Promise<WeeklyReflection> {
    const [reflection] = await db.insert(weeklyReflections).values(reflectionData).returning();
    return reflection;
  }

  async getWeeklyReflection(userId: string, weekStart: string): Promise<WeeklyReflection | undefined> {
    const [reflection] = await db
      .select()
      .from(weeklyReflections)
      .where(and(eq(weeklyReflections.userId, userId), eq(weeklyReflections.weekStart, weekStart)));
    return reflection;
  }

  async getUserWeeklyReflections(userId: string): Promise<WeeklyReflection[]> {
    return await db
      .select()
      .from(weeklyReflections)
      .where(eq(weeklyReflections.userId, userId))
      .orderBy(sql`${weeklyReflections.weekStart} DESC`);
  }

  async updateWeeklyReflection(id: number, updates: Partial<InsertWeeklyReflection>): Promise<WeeklyReflection | undefined> {
    const [reflection] = await db
      .update(weeklyReflections)
      .set(updates)
      .where(eq(weeklyReflections.id, id))
      .returning();
    return reflection;
  }

  // Guest rate limiting operations
  async canGuestGenerate(email: string): Promise<boolean> {
    try {
      // Try to execute raw SQL since the table might not exist yet
      const result = await db.execute(sql`
        SELECT last_playlist_generated 
        FROM guest_rate_limits 
        WHERE email = ${email}
      `);
      
      if (result.rows.length === 0) {
        return true; // Email not found, can generate
      }
      
      const lastGenerated = result.rows[0]?.last_playlist_generated;
      if (!lastGenerated) {
        return true; // No timestamp, can generate
      }
      
      const lastDate = new Date(lastGenerated as string);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      
      return daysDiff >= 7; // Can generate if 7+ days have passed
    } catch (error) {
      console.log('Guest rate limit check failed, allowing generation:', error);
      return true; // If table doesn't exist or query fails, allow generation
    }
  }

  async touchGuestPlaylistGenerated(email: string): Promise<void> {
    try {
      // Try to upsert using raw SQL
      await db.execute(sql`
        INSERT INTO guest_rate_limits (email, last_playlist_generated, created_at, updated_at)
        VALUES (${email}, NOW(), NOW(), NOW())
        ON CONFLICT (email) 
        DO UPDATE SET 
          last_playlist_generated = NOW(),
          updated_at = NOW()
      `);
    } catch (error) {
      console.log('Failed to update guest rate limit, continuing:', error);
      // If table doesn't exist or query fails, continue silently
    }
  }

}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private chatSessions: Map<string, ChatSession>;
  private chatMessages: Map<string, ChatMessage[]>;
  private playlists: Map<string, Playlist>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.chatSessions = new Map();
    this.chatMessages = new Map();
    this.playlists = new Map();
    this.currentId = 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.username === username) return user;
    }
    return undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const user: User = {
      id: userData.id || `mem_${Date.now()}`,
      email: userData.email || null,
      username: userData.username || null,
      password: userData.password || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      avatarType: userData.avatarType || "default",
      avatarIcon: userData.avatarIcon || null,
      provider: userData.provider || null,
      providerId: userData.providerId || null,
      birthDate: userData.birthDate || null,
      birthTime: userData.birthTime || null,
      birthLocation: userData.birthLocation || null,
      spotifyId: userData.spotifyId || null,
      spotifyAccessToken: userData.spotifyAccessToken || null,
      spotifyRefreshToken: userData.spotifyRefreshToken || null,
      spotifyTokenExpires: userData.spotifyTokenExpires || null,
      musicProfile: userData.musicProfile || null,
      resetToken: userData.resetToken || null,
      resetTokenExpiry: userData.resetTokenExpiry || null,
      lastPlaylistGenerated: userData.lastPlaylistGenerated || null,
      lastPlaylistExported: userData.lastPlaylistExported || null,
      lastHoroscopeGenerated: userData.lastHoroscopeGenerated || null,
      lastChartReadingGenerated: userData.lastChartReadingGenerated || null,
      lastTransitDetailsGenerated: userData.lastTransitDetailsGenerated || null,
      currentWeeklyHoroscope: userData.currentWeeklyHoroscope || null,
      currentChartReading: userData.currentChartReading || null,
      currentPlaylistData: userData.currentPlaylistData || null,
      currentTransitDetails: userData.currentTransitDetails || null,
      spotifyPlaylistId: userData.spotifyPlaylistId || null,
      createdAt: userData.createdAt || new Date(),
      updatedAt: userData.updatedAt || new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    this.users.delete(userId);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user: User = {
      id: userData.id,
      email: userData.email || null,
      username: userData.username || null,
      password: userData.password || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      avatarType: userData.avatarType || "default",
      avatarIcon: userData.avatarIcon || null,
      provider: userData.provider || null,
      providerId: userData.providerId || null,
      birthDate: userData.birthDate || null,
      birthTime: userData.birthTime || null,
      birthLocation: userData.birthLocation || null,
      spotifyId: userData.spotifyId || null,
      spotifyAccessToken: userData.spotifyAccessToken || null,
      spotifyRefreshToken: userData.spotifyRefreshToken || null,
      spotifyTokenExpires: userData.spotifyTokenExpires || null,
      musicProfile: userData.musicProfile || null,
      resetToken: userData.resetToken || null,
      resetTokenExpiry: userData.resetTokenExpiry || null,
      lastPlaylistGenerated: userData.lastPlaylistGenerated || null,
      lastPlaylistExported: userData.lastPlaylistExported || null,
      lastHoroscopeGenerated: userData.lastHoroscopeGenerated || null,
      lastChartReadingGenerated: userData.lastChartReadingGenerated || null,
      lastTransitDetailsGenerated: userData.lastTransitDetailsGenerated || null,
      currentWeeklyHoroscope: userData.currentWeeklyHoroscope || null,
      currentChartReading: userData.currentChartReading || null,
      currentPlaylistData: userData.currentPlaylistData || null,
      currentTransitDetails: userData.currentTransitDetails || null,
      spotifyPlaylistId: userData.spotifyPlaylistId || null,
      createdAt: userData.createdAt || new Date(),
      updatedAt: userData.updatedAt || new Date(),
    };
    this.users.set(userData.id, user);
    return user;
  }

  async updateUserBirthInfo(userId: string, birthInfo: {birthDate: string, birthTime: string, birthLocation: string}): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      birthDate: birthInfo.birthDate,
      birthTime: birthInfo.birthTime,
      birthLocation: birthInfo.birthLocation,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserSpotify(userId: string, spotifyData: Partial<{
    spotifyId: string;
    spotifyAccessToken: string;
    spotifyRefreshToken: string;
    spotifyTokenExpires: Date;
    musicProfile: any;
  }>): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;
    
    const updatedUser = {
      ...user,
      ...spotifyData,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
  }

  async getChatSession(sessionId: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(sessionId);
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = this.currentId++;
    const session: ChatSession = {
      id,
      sessionId: insertSession.sessionId,
      userId: insertSession.userId || null,
      birthDate: insertSession.birthDate || null,
      birthTime: insertSession.birthTime || null,
      birthLocation: insertSession.birthLocation || null,
      createdAt: new Date(),
    };
    this.chatSessions.set(insertSession.sessionId, session);
    return session;
  }

  async updateChatSession(sessionId: string, updates: Partial<InsertChatSession>): Promise<ChatSession | undefined> {
    const session = this.chatSessions.get(sessionId);
    if (!session) return undefined;

    const updatedSession = { ...session, ...updates };
    this.chatSessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.chatMessages.get(sessionId) || [];
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentId++;
    const message: ChatMessage = {
      id,
      sessionId: insertMessage.sessionId,
      userId: insertMessage.userId || null,
      role: insertMessage.role,
      content: insertMessage.content,
      metadata: insertMessage.metadata || null,
      createdAt: new Date(),
    };

    const existing = this.chatMessages.get(insertMessage.sessionId) || [];
    existing.push(message);
    this.chatMessages.set(insertMessage.sessionId, existing);

    return message;
  }

  async getPlaylist(sessionId: string): Promise<Playlist | undefined> {
    return this.playlists.get(sessionId);
  }

  async createPlaylist(insertPlaylist: InsertPlaylist): Promise<Playlist> {
    const id = this.currentId++;
    const playlist: Playlist = {
      id,
      sessionId: insertPlaylist.sessionId,
      userId: insertPlaylist.userId || null,
      name: insertPlaylist.name,
      description: insertPlaylist.description || null,
      songs: insertPlaylist.songs,
      weekStart: insertPlaylist.weekStart,
      weekEnd: insertPlaylist.weekEnd,
      createdAt: new Date(),
    };
    this.playlists.set(insertPlaylist.sessionId, playlist);
    return playlist;
  }

  // Password reset methods (not supported in MemStorage for simplicity)
  async setPasswordResetToken(email: string, token: string, expiry: Date): Promise<void> {
    throw new Error("Password reset not supported in memory storage");
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    return undefined;
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    // No-op for memory storage
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = { ...user, password: hashedPassword, updatedAt: new Date() };
      this.users.set(userId, updatedUser);
    }
  }

  // Social Sharing methods (mock implementation for MemStorage)
  async createSharedContent(insertContent: InsertSharedContent): Promise<SharedContent> {
    throw new Error("Social sharing not supported in memory storage");
  }

  async getSharedContent(shareId: string): Promise<SharedContent | undefined> {
    return undefined;
  }

  async updateSharedContentViews(shareId: string): Promise<void> {
    // No-op for memory storage
  }

  async createSocialInteraction(insertInteraction: InsertSocialInteraction): Promise<SocialInteraction> {
    throw new Error("Social interactions not supported in memory storage");
  }

  async getSocialInteractions(shareId: string, type?: string): Promise<SocialInteraction[]> {
    return [];
  }

  // Weekly content persistence - MemStorage stubs (guest users don't persist)
  async updateUserLastGenerated(userId: string, feature: 'playlist' | 'horoscope' | 'chart' | 'transit'): Promise<void> {}
  async updateUserLastExported(userId: string): Promise<void> {}
  async canUserGenerate(userId: string, feature: 'playlist' | 'horoscope' | 'chart' | 'transit'): Promise<boolean> { return true; }
  async canUserExport(userId: string): Promise<boolean> { return true; }
  async storeWeeklyHoroscope(userId: string, horoscope: any): Promise<void> {}
  async storeChartReading(userId: string, chartReading: any): Promise<void> {}
  async storePlaylistData(userId: string, playlistData: any): Promise<void> {}
  async storeTransitDetails(userId: string, transitDetails: any): Promise<void> {}
  async getWeeklyHoroscope(userId: string): Promise<any | null> { return null; }
  async getChartReading(userId: string): Promise<any | null> { return null; }
  async getPlaylistData(userId: string): Promise<any | null> { return null; }
  async getTransitDetails(userId: string): Promise<any | null> { return null; }

  // Message Feedback (MemStorage stubs - guests don't persist feedback)
  async createMessageFeedback(messageId: number, userId: string, sessionId: string, feedback: 'like' | 'dislike'): Promise<void> {}
  async getMessageFeedback(userId: string): Promise<any[]> { return []; }

  // Chart storage (MemStorage stubs - guests don't persist charts)
  async saveAstrologicalChart(chartData: any): Promise<void> {}
  async getAstrologicalChart(userId: string): Promise<any | null> { return null; }
  async updateAstrologicalChart(userId: string, chartData: any): Promise<void> {}
  async getAstrologicalChartByBirthData(userId: string, birthDate: string, birthTime: string, birthLocation: string): Promise<any | null> { return null; }
  async upsertAstrologicalChart(chartData: any): Promise<void> {}

  // Song Usage Tracking (MemStorage stubs - guests don't persist song usage)
  async recordSongUsage(usage: InsertSongUsage): Promise<void> {}
  async getRecentlyUsedSongs(userId: string, daysBack: number = 30): Promise<string[]> { return []; }
  async isSongRecentlyUsed(userId: string, spotifyId: string, daysBack: number = 30): Promise<boolean> { return false; }
  async filterOutRecentlyUsedSongs(userId: string, spotifyIds: string[], daysBack: number = 30): Promise<string[]> { return spotifyIds; }

  // Mood & Feedback Tracking (MemStorage stubs - guests don't persist mood/feedback)
  async createDailyMood(mood: InsertDailyMood): Promise<DailyMood> { 
    return { 
      id: 1, 
      userId: mood.userId, 
      date: mood.date, 
      mood: mood.mood, 
      energy: mood.energy, 
      emotions: mood.emotions || null, 
      journalEntry: mood.journalEntry || null, 
      moonSign: null,
      moonPhase: null,
      moonIllumination: null,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
  }
  async getDailyMood(userId: string, date: string): Promise<DailyMood | undefined> { return undefined; }
  async getUserDailyMoods(userId: string, startDate?: string, endDate?: string): Promise<DailyMood[]> { return []; }
  async updateDailyMood(id: number, updates: Partial<InsertDailyMood>): Promise<DailyMood | undefined> { return undefined; }
  
  async createContentFeedback(feedback: InsertContentFeedback): Promise<ContentFeedback> {
    return { id: 1, userId: feedback.userId, contentType: feedback.contentType, contentId: feedback.contentId || null, accuracyRating: feedback.accuracyRating || null, resonanceRating: feedback.resonanceRating || null, helpfulnessRating: feedback.helpfulnessRating || null, feedback: feedback.feedback || null, tags: feedback.tags || null, date: feedback.date, createdAt: new Date() };
  }
  async getContentFeedback(userId: string, contentType?: string): Promise<ContentFeedback[]> { return []; }
  async updateContentFeedback(id: number, updates: Partial<InsertContentFeedback>): Promise<ContentFeedback | undefined> { return undefined; }
  
  async createWeeklyReflection(reflection: InsertWeeklyReflection): Promise<WeeklyReflection> {
    return { id: 1, userId: reflection.userId, weekStart: reflection.weekStart, weekEnd: reflection.weekEnd, overallMoodAvg: reflection.overallMoodAvg || null, playlistAccuracy: reflection.playlistAccuracy || null, horoscopeAccuracy: reflection.horoscopeAccuracy || null, chartAccuracy: reflection.chartAccuracy || null, weeklyHighlights: reflection.weeklyHighlights || null, nextWeekIntentions: reflection.nextWeekIntentions || null, createdAt: new Date() };
  }
  async getWeeklyReflection(userId: string, weekStart: string): Promise<WeeklyReflection | undefined> { return undefined; }
  async getUserWeeklyReflections(userId: string): Promise<WeeklyReflection[]> { return []; }
  async updateWeeklyReflection(id: number, updates: Partial<InsertWeeklyReflection>): Promise<WeeklyReflection | undefined> { return undefined; }
  
  // Guest rate limiting operations (MemStorage stubs - guests don't persist rate limits)
  async canGuestGenerate(email: string): Promise<boolean> { return true; }
  async touchGuestPlaylistGenerated(email: string): Promise<void> {}
}

export const storage = new DatabaseStorage();
