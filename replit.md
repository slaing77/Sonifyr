# Cosmic Music Curator - AI-Powered Chat Application

## Overview

This full-stack web application provides personalized weekly music playlists based on astrological transits and planetary influences. It features an AI-powered chat interface offering cosmic music recommendations, daily horoscopes, and astrology insights. The project aims to provide a unique blend of astrology and music curation, leveraging AI for a personalized user experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, built with Vite.
- **UI/UX**: Shadcn/UI (on Radix UI) for components, Tailwind CSS for styling with cosmic themes.
- **Routing**: Wouter.
- **State Management**: TanStack Query for server state.
- **Form Handling**: React Hook Form with Zod validation.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript (ES modules).
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations, used for session, message, and playlist persistence.
- **AI Integration**: OpenAI GPT-4o for chat and content generation.
- **Music Integration**: Spotify Web API for music data and playlist creation.

### Database Design
Utilizes PostgreSQL with Drizzle ORM, featuring:
- `users`: Complete user profiles with authentication data, birth information, and Spotify integration
- `chat_sessions`: Stores session metadata and user birth information.
- `chat_messages`: Stores conversation history.
- `playlists`: Stores generated playlists including song data in JSON format.
- `astrological_charts`: Detailed birth chart data and interpretations
Tables have proper relations and automatic timestamps with comprehensive user management.

### Core Features
- **AI Chat System**: Integrates OpenAI GPT-4o for context-aware conversations, cosmic music curation, and astrological insights, supporting real-time streaming.
- **Astrological Services**: Calculates sun signs, provides simplified weekly transit generation, and tracks planetary positions to inform music recommendations. Also offers comprehensive birth chart analysis, including aspects, element balance, and professional interpretations. Fixed Swiss Ephemeris file issues for reliable birth chart generation.
- **Music Playlist Generation**: AI-generated weekly playlists with daily song recommendations, enriched by Spotify Web API for track searching and direct playlist creation in Spotify. Every playlist includes personalized references to the user's Sun sign, Moon sign, and Rising sign, making each recommendation feel uniquely tailored to their astrological profile.
- **Chat Interface**: Real-time messaging with quick actions for horoscopes, new playlists, and transit details, featuring responsive design and message formatting.
- **Multi-Authentication System**: Complete email/password, Google OAuth, and Discord OAuth authentication with mandatory birth data collection for personalized astrological services. Replaced Replit Auth with custom implementation including user registration, login, session management, and profile completion flow.
- **Weekly Limits System**: Intentional usage patterns limit playlist, horoscope, chart readings, and transit details to once per week per user, tracked via database timestamps. Guest users have unlimited access.
- **Spotify Export & Sharing**: Robust Spotify API integration for creating actual playlists, with enhanced search for accurate track matching. Social sharing functionality includes Twitter, Facebook, and email options. Fixed playlist export consistency issues to ensure exported Spotify playlists contain exactly the same songs shown in chat interface.
- **Interactive Cosmic Animations**: Engaging loading states and micro-interactions throughout the interface, showing users the AI is actively "consulting the stars" with cosmic-themed messages and visual feedback.
- **Enhanced Astrological Accuracy**: Improved AstrologyService calculations with proper AM/PM time parsing, enhanced moon sign algorithm using lunar progression, and location-specific rising sign calculations for accurate birth chart analysis.
- **Comprehensive Mood Tracking System**: Daily mood and energy tracking with emotional tags and journal entries. Features dedicated analytics dashboard with trends, streaks, and historical data visualization accessible through header navigation. Includes tabbed interface for mood tracking, feedback, and history viewing.
- **PDF Export & Persistent Sharing**: Client-side PDF generation for chat sessions with live links back to conversations. Solves social media content disappearing when app goes idle. Email sharing options include both automatic email client opening and clipboard copying with PDF instructions.

## External Dependencies

- **OpenAI**: GPT-4o model for AI chat and content generation.
- **Spotify Web API**: Music data, track searching, and direct playlist creation.
- **TanStack Query**: Client-side data fetching and caching.
- **Drizzle ORM**: Database operations and migrations.
- **Zod**: Runtime schema validation.
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first styling framework.
- **Lucide React**: Icon library.
- **React Hook Form**: Form handling and validation.