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

// Guest Rate Limits for email-based weekly playlist generation
export const guestRateLimits = pgTable("guest_rate_limits", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  lastPlaylistGenerated: timestamp("last_playlist_generated"),
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
export const userRelations = relations(users, ({ many }) => ({
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

export const insertGuestRateLimitSchema = createInsertSchema(guestRateLimits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
export type GuestRateLimit = typeof guestRateLimits.$inferSelect;
export type InsertGuestRateLimit = z.infer<typeof insertGuestRateLimitSchema>;
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
