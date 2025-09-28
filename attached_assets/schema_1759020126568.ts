import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  username: varchar("username").unique(),
  password: varchar("password"), // For email/password auth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  avatarType: varchar("avatar_type").default("default"), // 'default', 'icon', 'upload'
  avatarIcon: varchar("avatar_icon"), // Selected predefined icon name
  provider: varchar("provider").default("local"), // 'local', 'google', 'discord'
  providerId: varchar("provider_id"), // ID from OAuth provider
  birthDate: text("birth_date"),
  birthTime: text("birth_time"),
  birthLocation: text("birth_location"),
  spotifyId: varchar("spotify_id"),
  spotifyAccessToken: varchar("spotify_access_token"),
  spotifyRefreshToken: varchar("spotify_refresh_token"),
  spotifyTokenExpires: timestamp("spotify_token_expires"),
  musicProfile: jsonb("music_profile"),
  // Password reset functionality
  resetToken: varchar("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  // Weekly limit tracking
  lastPlaylistGenerated: timestamp("last_playlist_generated"),
  lastPlaylistExported: timestamp("last_playlist_exported"),
  lastHoroscopeGenerated: timestamp("last_horoscope_generated"), 
  lastChartReadingGenerated: timestamp("last_chart_reading_generated"),
  lastTransitDetailsGenerated: timestamp("last_transit_details_generated"),
  // Weekly content storage  
  currentWeeklyHoroscope: jsonb("current_weekly_horoscope"), // Stored for 7 days
  currentChartReading: jsonb("current_chart_reading"), // Stored until next generation
  currentPlaylistData: jsonb("current_playlist_data"), // Stored until next generation
  currentTransitDetails: jsonb("current_transit_details"), // Stored for 7 days
  // Spotify playlist tracking
  spotifyPlaylistId: varchar("spotify_playlist_id"), // Store the current week's playlist ID
  // Music mode preference for premium users
  musicMode: varchar("music_mode").default("personal"), // 'personal' or 'discovery'
  // Subscription and notification settings
  subscriptionTier: varchar("subscription_tier").default("vibes"), // 'vibes', 'stardust', 'cosmic'
  pushNotificationsEnabled: boolean("push_notifications_enabled").default(false),
  oneSignalPlayerId: varchar("onesignal_player_id"), // OneSignal player ID for targeting
  notificationSubscribedAt: timestamp("notification_subscribed_at"),
  notificationUnsubscribedAt: timestamp("notification_unsubscribed_at"),
  timezone: varchar("timezone"), // User's timezone for notification scheduling
  lastDailySentAt: timestamp("last_daily_sent_at"), // Idempotency tracking for daily notifications
  lastWeeklySentAt: timestamp("last_weekly_sent_at"), // Idempotency tracking for weekly notifications
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  userId: varchar("user_id"), // Link to authenticated user
  birthDate: text("birth_date"),
  birthTime: text("birth_time"),
  birthLocation: text("birth_location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: varchar("user_id"), // Link to authenticated user
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // For playlist data, loading states, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: varchar("user_id"), // Link to authenticated user
  name: text("name").notNull(),
  description: text("description"),
  songs: jsonb("songs").notNull(), // Array of song objects
  weekStart: text("week_start").notNull(),
  weekEnd: text("week_end").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Astrological Chart Storage
export const astrologicalCharts = pgTable("astrological_charts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  birthDate: text("birth_date").notNull(),
  birthTime: text("birth_time").notNull(),
  birthLocation: text("birth_location").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  timezone: text("timezone"),
  // Core chart data
  sunSign: text("sun_sign").notNull(),
  moonSign: text("moon_sign"),
  risingSign: text("rising_sign"),
  // Planetary positions (degrees in zodiac)
  planetaryPositions: jsonb("planetary_positions").notNull(), // { sun: 125.5, moon: 230.2, mercury: 110.1, ... }
  // House positions  
  housePositions: jsonb("house_positions"), // { house1: 85.5, house2: 115.2, ... }
  // Major aspects
  majorAspects: jsonb("major_aspects"), // { conjunction: [...], trine: [...], square: [...] }
  // Chart interpretation
  interpretation: jsonb("interpretation"), // Generated astrological insights
  // Visual chart data
  svgChart: text("svg_chart"), // SVG content for the birth chart visualization
  chartInfo: jsonb("chart_info"), // Metadata about the chart generation
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Daily Transit Tracking
export const dailyTransits = pgTable("daily_transits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  transitData: jsonb("transit_data").notNull(), // Current planetary positions and aspects
  personalizedAspects: jsonb("personalized_aspects"), // How transits affect user's natal chart
  musicRecommendations: jsonb("music_recommendations"), // Daily music suggestions based on transits
  moonPhase: text("moon_phase"), // Moon phase for this date
  moonIllumination: integer("moon_illumination"), // Percentage of moon illuminated (0-100)
  moonSign: text("moon_sign"), // Current astrological sign of the moon
  lunarAspects: jsonb("lunar_aspects"), // Moon aspects to natal chart
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Song Usage Tracking for 30-day limits
export const songUsage = pgTable("song_usage", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  spotifyId: varchar("spotify_id").notNull(), // Spotify track ID
  songTitle: text("song_title").notNull(),
  artistName: text("artist_name").notNull(),
  usedInPlaylistId: integer("used_in_playlist_id"), // Reference to playlist
  usedAt: timestamp("used_at").defaultNow().notNull(),
}, (table) => [
  index("idx_song_usage_user_date").on(table.userId, table.usedAt),
  index("idx_song_usage_spotify_id").on(table.spotifyId),
]);

// Message Feedback for AI Improvement
export const messageFeedback = pgTable("message_feedback", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  userId: varchar("user_id").notNull(),
  sessionId: text("session_id").notNull(),
  feedback: text("feedback").notNull(), // 'like' or 'dislike'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MessageFeedback = typeof messageFeedback.$inferSelect;
export type InsertMessageFeedback = typeof messageFeedback.$inferInsert;

// Social Sharing for Playlists and Conversations
export const sharedContent = pgTable("shared_content", {
  id: serial("id").primaryKey(),
  shareId: varchar("share_id").notNull().unique(), // Public unique identifier (UUID-like)
  userId: varchar("user_id").notNull(), // Owner of the content
  contentType: text("content_type").notNull(), // 'playlist' or 'conversation'
  contentId: text("content_id").notNull(), // ID of playlist or session
  title: text("title").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(true),
  allowComments: boolean("allow_comments").default(false),
  viewCount: integer("view_count").default(0),
  shareCount: integer("share_count").default(0),
  metadata: jsonb("metadata"), // Additional data like playlist songs, conversation snippets
  expiresAt: timestamp("expires_at"), // Optional expiration for temporary shares
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Social Interactions (likes, comments, etc.)
export const socialInteractions = pgTable("social_interactions", {
  id: serial("id").primaryKey(),
  shareId: varchar("share_id").notNull(), // Links to shared_content
  userId: varchar("user_id"), // User performing the interaction (null for anonymous)
  interactionType: text("interaction_type").notNull(), // 'like', 'comment', 'save'
  content: text("content"), // For comments
  metadata: jsonb("metadata"), // Additional interaction data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Daily Mood & Feedback Tracking
export const dailyMoods = pgTable("daily_moods", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  mood: integer("mood").notNull(), // 1-10 scale
  energy: integer("energy").notNull(), // 1-10 scale
  emotions: text("emotions").array(), // Array of emotion tags
  journalEntry: text("journal_entry"), // Daily reflection/synchronicities
  moonPhase: text("moon_phase"), // Moon phase for this date (e.g., "Full Moon", "New Moon")
  moonIllumination: integer("moon_illumination"), // Percentage of moon illuminated (0-100)
  moonSign: text("moon_sign"), // Current astrological sign of the moon
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Content Ratings & Feedback
export const contentFeedback = pgTable("content_feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  contentType: text("content_type").notNull(), // 'playlist', 'horoscope', 'chart_reading', 'transit_details', 'chat_message'
  contentId: varchar("content_id"), // Reference to specific content (message id, session id, etc)
  accuracyRating: integer("accuracy_rating"), // 1-5 scale for accuracy
  resonanceRating: integer("resonance_rating"), // 1-5 scale for personal resonance
  helpfulnessRating: integer("helpfulness_rating"), // 1-5 scale for helpfulness
  feedback: text("feedback"), // Written feedback/notes
  tags: text("tags").array(), // Custom tags (e.g., 'spot-on', 'too-general', 'insightful')
  date: text("date").notNull(), // Date content was generated/consumed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Weekly Reflections
export const weeklyReflections = pgTable("weekly_reflections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  weekStart: text("week_start").notNull(), // YYYY-MM-DD of Monday
  weekEnd: text("week_end").notNull(), // YYYY-MM-DD of Sunday
  overallMoodAvg: integer("overall_mood_avg"), // Calculated from daily moods
  playlistAccuracy: integer("playlist_accuracy"), // 1-5 average rating
  horoscopeAccuracy: integer("horoscope_accuracy"), // 1-5 average rating
  chartAccuracy: integer("chart_accuracy"), // 1-5 average rating
  weeklyHighlights: text("weekly_highlights"), // Key synchronicities/insights
  nextWeekIntentions: text("next_week_intentions"), // What they want to focus on
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const userRelations = relations(users, ({ many, one }) => ({
  chatSessions: many(chatSessions),
  chatMessages: many(chatMessages),
  playlists: many(playlists),
  astrologicalCharts: many(astrologicalCharts),
  dailyTransits: many(dailyTransits),
  sharedContent: many(sharedContent),
  socialInteractions: many(socialInteractions),
  songUsage: many(songUsage),
  dailyMoods: many(dailyMoods),
  contentFeedback: many(contentFeedback),
  weeklyReflections: many(weeklyReflections),
  learningProgress: many(learningProgress),
  learningUserBadges: many(learningUserBadges),
  learningStats: one(learningStats),
  learningQuizResults: many(learningQuizResults),
}));

export const sharedContentRelations = relations(sharedContent, ({ many, one }) => ({
  owner: one(users, {
    fields: [sharedContent.userId],
    references: [users.id],
  }),
  interactions: many(socialInteractions),
}));

export const socialInteractionRelations = relations(socialInteractions, ({ one }) => ({
  sharedContent: one(sharedContent, {
    fields: [socialInteractions.shareId],
    references: [sharedContent.shareId],
  }),
  user: one(users, {
    fields: [socialInteractions.userId],
    references: [users.id],
  }),
}));

export const chatSessionRelations = relations(chatSessions, ({ many, one }) => ({
  messages: many(chatMessages),
  playlists: many(playlists),
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
}));

export const chatMessageRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.sessionId],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const playlistRelations = relations(playlists, ({ one }) => ({
  session: one(chatSessions, {
    fields: [playlists.sessionId],
    references: [chatSessions.sessionId],
  }),
  user: one(users, {
    fields: [playlists.userId],
    references: [users.id],
  }),
}));

// User types
export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertPlaylistSchema = createInsertSchema(playlists).omit({
  id: true,
  createdAt: true,
});

export const insertSharedContentSchema = createInsertSchema(sharedContent).omit({
  id: true,
  viewCount: true,
  shareCount: true,
  createdAt: true,
  updatedAt: true,
});

// Mood & Feedback Relations
export const dailyMoodsRelations = relations(dailyMoods, ({ one }) => ({
  user: one(users, {
    fields: [dailyMoods.userId],
    references: [users.id],
  }),
}));

export const contentFeedbackRelations = relations(contentFeedback, ({ one }) => ({
  user: one(users, {
    fields: [contentFeedback.userId],
    references: [users.id],
  }),
}));

export const weeklyReflectionsRelations = relations(weeklyReflections, ({ one }) => ({
  user: one(users, {
    fields: [weeklyReflections.userId],
    references: [users.id],
  }),
}));

// Schema types
export const insertDailyMoodSchema = createInsertSchema(dailyMoods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentFeedbackSchema = createInsertSchema(contentFeedback).omit({
  id: true,
  createdAt: true,
});

export const insertWeeklyReflectionSchema = createInsertSchema(weeklyReflections).omit({
  id: true,
  createdAt: true,
});

export const insertDailyTransitSchema = createInsertSchema(dailyTransits).omit({
  id: true,
  createdAt: true,
});

export type DailyMood = typeof dailyMoods.$inferSelect;
export type InsertDailyMood = z.infer<typeof insertDailyMoodSchema>;
export type ContentFeedback = typeof contentFeedback.$inferSelect;
export type InsertContentFeedback = z.infer<typeof insertContentFeedbackSchema>;
export type WeeklyReflection = typeof weeklyReflections.$inferSelect;
export type InsertWeeklyReflection = z.infer<typeof insertWeeklyReflectionSchema>;
export type DailyTransit = typeof dailyTransits.$inferSelect;
export type InsertDailyTransit = z.infer<typeof insertDailyTransitSchema>;

export const insertSocialInteractionSchema = createInsertSchema(socialInteractions).omit({
  id: true,
  createdAt: true,
});

export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type Playlist = typeof playlists.$inferSelect;
export type InsertSocialInteraction = z.infer<typeof insertSocialInteractionSchema>;
export type SocialInteraction = typeof socialInteractions.$inferSelect;
export type SharedContent = typeof sharedContent.$inferSelect;
export type InsertSharedContent = z.infer<typeof insertSharedContentSchema>;

// Song Usage types
export const insertSongUsageSchema = createInsertSchema(songUsage).omit({
  id: true,
  usedAt: true,
});
export type SongUsage = typeof songUsage.$inferSelect;
export type InsertSongUsage = z.infer<typeof insertSongUsageSchema>;

// Learning System Tables
export const learningLessons = pgTable("learning_lessons", {
  id: serial("id").primaryKey(),
  track: varchar("track").notNull(), // 'basics', 'planets', 'houses', 'aspects', 'advanced'
  lessonNumber: integer("lesson_number").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  content: jsonb("content").notNull(), // Lesson content with interactive elements
  xpReward: integer("xp_reward").default(10),
  estimatedMinutes: integer("estimated_minutes").default(5),
  prerequisites: text("prerequisites").array(), // Prerequisites
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  requiredLessons: text("required_lessons").array(),
});

export const learningProgress = pgTable("learning_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  status: text("status").notNull(), // 'started', 'completed', 'mastered'
  score: integer("score"), // Quiz score if applicable
  timeSpent: integer("time_spent"), // Minutes spent on lesson
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const learningBadges = pgTable("learning_badges", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon"),
  requirementType: varchar("requirement_type").notNull(),
  requirementValue: integer("requirement_value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  track: text("track"),
  requirements: jsonb("requirements").notNull().default("{}"),
  xpReward: integer("xp_reward").default(50),
  isActive: boolean("is_active").default(true),
});

export const learningUserBadges = pgTable("learning_user_badges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  badgeId: integer("badge_id").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

export const learningStats = pgTable("learning_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  totalXp: integer("total_xp").default(0),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityDate: text("last_activity_date"), // YYYY-MM-DD
  completedLessons: integer("completed_lessons").default(0),
  masteredLessons: integer("mastered_lessons").default(0),
  totalTimeSpent: integer("total_time_spent").default(0), // Minutes
  favoriteTrack: text("favorite_track"), // Track with most engagement
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const learningQuizResults = pgTable("learning_quiz_results", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  score: integer("score").notNull(), // Percentage score
  answers: jsonb("answers").notNull(), // User's answers with correct/incorrect flags
  timeSpent: integer("time_spent"), // Seconds spent on quiz
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Learning Relations
export const learningProgressRelations = relations(learningProgress, ({ one }) => ({
  user: one(users, {
    fields: [learningProgress.userId],
    references: [users.id],
  }),
  lesson: one(learningLessons, {
    fields: [learningProgress.lessonId],
    references: [learningLessons.id],
  }),
}));

export const learningUserBadgesRelations = relations(learningUserBadges, ({ one }) => ({
  user: one(users, {
    fields: [learningUserBadges.userId],
    references: [users.id],
  }),
  badge: one(learningBadges, {
    fields: [learningUserBadges.badgeId],
    references: [learningBadges.id],
  }),
}));

export const learningStatsRelations = relations(learningStats, ({ one }) => ({
  user: one(users, {
    fields: [learningStats.userId],
    references: [users.id],
  }),
}));

export const learningQuizResultsRelations = relations(learningQuizResults, ({ one }) => ({
  user: one(users, {
    fields: [learningQuizResults.userId],
    references: [users.id],
  }),
  lesson: one(learningLessons, {
    fields: [learningQuizResults.lessonId],
    references: [learningLessons.id],
  }),
}));

// Learning Schema Types
export const insertLearningLessonSchema = createInsertSchema(learningLessons).omit({
  id: true,
  createdAt: true,
});

export const insertLearningProgressSchema = createInsertSchema(learningProgress).omit({
  id: true,
  createdAt: true,
});

export const insertLearningBadgeSchema = createInsertSchema(learningBadges).omit({
  id: true,
  createdAt: true,
});

export const insertLearningUserBadgeSchema = createInsertSchema(learningUserBadges).omit({
  id: true,
  earnedAt: true,
});

export const insertLearningStatsSchema = createInsertSchema(learningStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLearningQuizResultSchema = createInsertSchema(learningQuizResults).omit({
  id: true,
  createdAt: true,
});

// Learning Types
export type LearningLesson = typeof learningLessons.$inferSelect;
export type InsertLearningLesson = z.infer<typeof insertLearningLessonSchema>;
export type LearningProgress = typeof learningProgress.$inferSelect;
export type InsertLearningProgress = z.infer<typeof insertLearningProgressSchema>;
export type LearningBadge = typeof learningBadges.$inferSelect;
export type InsertLearningBadge = z.infer<typeof insertLearningBadgeSchema>;
export type LearningUserBadge = typeof learningUserBadges.$inferSelect;
export type InsertLearningUserBadge = z.infer<typeof insertLearningUserBadgeSchema>;

// Harmonic Correlation Types for Enhanced Song Data
export interface HarmonicCorrelationData {
  overallScore: number;           // 0-1, overall harmonic alignment with user's chart
  correlations: Array<{
    aspect: string;               // e.g., "trine", "square", "opposition"
    musicalInterval: string;      // e.g., "Perfect Fifth", "Perfect Fourth"
    harmonicRatio: number;        // e.g., 1.5 (3:2), 1.333 (4:3)
    ratioString: string;          // e.g., "3:2", "4:3"
    matchStrength: number;        // 0-1, strength of this specific correlation
    resonanceType: string;        // "exact", "overtone", "undertone", "composite"
    explanation: string;          // Human-readable explanation
  }>;
  dominantCorrelations: Array<{   // Top 3 strongest correlations
    aspect: string;
    musicalInterval: string;
    matchStrength: number;
    explanation: string;
  }>;
  chartResonance: {
    elementalAlignment: number;   // How well it matches chart's elemental balance
    aspectAlignment: number;      // How well harmonics match aspects
    energyAlignment: number;      // Flowing vs dynamic energy match
  };
  musicalFeatures: {
    key?: string;
    tempo?: number;
    brightness: number;           // Spectral centroid normalized
    energy: number;               // RMS energy normalized
    harmonicComplexity: number;   // Number of significant harmonics
  };
  // NEW: Planetary frequency resonance data
  planetaryResonance?: {
    planetaryResonances: Array<{
      planet: string;
      resonanceStrength: number;
      detectedFrequencies: number[];
      harmonic: number;
      explanation: string;
    }>;
    dominantPlanet: string | null;
    cosmicAlignment: number;
    frequencySpectrum: {
      planetaryFrequencies: number[];
      cosmicRatios: Array<{
        ratio: number;
        planets: string[];
        significance: string;
      }>;
    };
    insights: string[];
    confidenceLevel: number;
  };
  harmonicInsights: string[];     // Human-readable explanations
  recommendationReason: string;   // Why this track resonates with their chart
  analysisTimestamp?: string;     // When the harmonic analysis was performed
  previewUrl?: string;           // Spotify preview URL used for analysis
}

// Enhanced Song Type with Harmonic Data
export interface EnhancedSongData {
  // Standard Spotify data
  id: string;
  name: string;
  artist: string;
  album?: string;
  duration_ms?: number;
  preview_url?: string;
  external_urls?: {
    spotify: string;
  };
  
  // Harmonic correlation data (optional - only present when analysis is performed)
  harmonicCorrelation?: HarmonicCorrelationData;
  
  // Original astrological relevance (if any)
  astrologicalContext?: string;
  
  // Metadata
  addedAt?: string;
  source?: string; // "spotify_recommendation", "astrological_match", "harmonic_correlation"
}
export type LearningStats = typeof learningStats.$inferSelect;
export type InsertLearningStats = z.infer<typeof insertLearningStatsSchema>;
export type LearningQuizResult = typeof learningQuizResults.$inferSelect;
export type InsertLearningQuizResult = z.infer<typeof insertLearningQuizResultSchema>;

// Waitlist table for controlled beta access
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  position: integer("position").notNull(),
  inviteStatus: varchar("invite_status").default("pending"), // 'pending', 'invited', 'accepted'
  inviteToken: varchar("invite_token").unique(),
  invitedAt: timestamp("invited_at"),
  acceptedAt: timestamp("accepted_at"),
  referralCode: varchar("referral_code").unique(),
  referredBy: varchar("referred_by"), // Email of referrer
  referralCount: integer("referral_count").default(0),
  socialShares: integer("social_shares").default(0),
  positionBoost: integer("position_boost").default(0), // Boost from referrals/shares
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Waitlist schemas
export const insertWaitlistSchema = createInsertSchema(waitlist).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  position: true,
  referralCode: true,
  inviteToken: true,
});
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type Waitlist = typeof waitlist.$inferSelect;

// Additional types for the application
export interface Song {
  title: string;
  artist: string;
  day: string;
  dayOfWeek: string;
  astrologicalInfluence: string;
  spotifyId?: string;
  youtubeId?: string;
  appleId?: string;
  deezerId?: string;
}

export interface BirthInfo {
  date: string;
  time: string;
  location: string;
}

export interface PlaylistData {
  name: string;
  description: string;
  songs: Song[];
  weekStart: string;
  weekEnd: string;
  astrologicalSummary: string;
}
