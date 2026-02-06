# Spotify-Only OAuth Migration Guide

## Overview

Sonifyr has been converted to use Spotify OAuth as the **primary and only** authentication method. This simplifies the user experience and ensures that all playlists are truly personalized using the user's own Spotify account.

## What Changed

### Removed Authentication Methods
- ❌ **Local (email/password) authentication** - No longer supported
- ❌ **Google OAuth** - No longer supported  
- ❌ **Discord OAuth** - No longer supported
- ❌ **Guest playlist generation** - No longer supported (required Sonifyr service account)

### New Authentication Flow
- ✅ **Spotify OAuth only** - Single sign-in method
- ✅ **Automatic Spotify connection** - No separate "Connect Spotify" step
- ✅ **Personal playlists only** - All playlists use user's own Spotify account

## For Existing Users

### If you had a local/Google/Discord account:
1. Your old account data remains in the database but is no longer accessible via those auth methods
2. To continue using Sonifyr, you must **Sign in with Spotify**
3. This will create a new account linked to your Spotify profile
4. You'll need to re-enter your birth date/time/location information

### Data Migration (Manual)
If you need to preserve data from your old account:
1. Contact support with your old email address
2. We can manually transfer your birth chart data and preferences to your new Spotify-linked account

## For Developers

### Environment Variables

#### Required:
```bash
DATABASE_URL=postgresql://...
SESSION_SECRET=your_secret
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
OPENAI_API_KEY=your_openai_key
REPLIT_DOMAINS=your-domain.com
```

#### No Longer Needed (can be removed):
```bash
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
SPOTIFY_SERVICE_REFRESH_TOKEN  # Service account no longer used
```

### Spotify Developer Dashboard Setup

⚠️ **IMPORTANT**: These redirect URIs are configured in the **Spotify Developer Dashboard**, not in your code or `.env` file.

**Step-by-Step Instructions:**

1. **Go to Spotify Developer Dashboard**
   - URL: https://developer.spotify.com/dashboard
   - Log in with your Spotify account

2. **Create a new app** (or select your existing Sonifyr app)
   - Click "Create app" if creating new
   - Give it a name and description
   - Accept terms and click Save

3. **Open your app's settings**
   - Click on your app name in the dashboard
   - Click "Edit Settings" button (top right)

4. **⭐ Add Redirect URIs ⭐**
   - Scroll down to the "Redirect URIs" section
   - Click in the text field and paste this URI:
     ```
     http://localhost:5000/api/auth/spotify/callback
     ```
   - Click the "Add" button next to the field
   - Now add your production URI:
     ```
     https://sonifyr.darkfoliopress.com/api/auth/spotify/callback
     ```
   - Click "Add" again
   - **You should now see BOTH URIs listed**
   - Scroll to the bottom and click "Save"

5. **Copy your credentials to `.env`**
   - Copy the **Client ID** (shown on main app page)
   - Click "View client secret" and copy the **Client Secret**
   - Add both to your `.env` file:
     ```
     SPOTIFY_CLIENT_ID=your_client_id_here
     SPOTIFY_CLIENT_SECRET=your_client_secret_here
     ```

**Common Mistakes to Avoid:**
- ❌ Don't add `http://` or `https://` to the REPLIT_DOMAINS variable (just the domain)
- ❌ Don't forget the `/api/auth/spotify/callback` path in redirect URIs
- ❌ Don't add redirect URIs to your `.env` file - they go in Spotify Dashboard only
- ✅ Do add the production HTTPS URI - it always works
- ⚠️ Localhost URI may be rejected by Spotify with "not secure" - this is normal

**If Spotify rejects localhost:**
Spotify's security policies may prevent adding `http://localhost` redirect URIs. This is normal. Solutions:
1. Use production URL for all testing (recommended)
2. Try `http://127.0.0.1:5000/api/auth/spotify/callback` instead
3. Only use HTTPS URIs (production/staging servers)

### API Changes

#### Removed Endpoints:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/google*`
- `GET /api/auth/discord*`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/generate-guest-playlist`
- `GET /api/spotify/guest-auth`
- `GET /api/spotify/personalized-auth`
- `GET /api/spotify/auth` (old connect-after-login flow)

#### New/Updated Endpoints:
- `GET /api/auth/spotify` - Initiate Spotify OAuth
- `GET /api/auth/spotify/callback` - OAuth callback
- `POST /api/generate-playlist` - Renamed from `/api/generate-personalized-playlist`
- `GET /api/spotify/status` - Now uses user database tokens instead of session

#### Authentication Flow:
```
1. User clicks "Sign in with Spotify" on landing page
2. → GET /api/auth/spotify
3. → Redirects to Spotify authorization
4. → User approves permissions
5. → GET /api/auth/spotify/callback
6. → User created/updated with Spotify data
7. → Redirected to app (or profile setup if birth data missing)
```

### Database Schema

The schema remains backward compatible, but the following fields are now deprecated:
- `users.password` - No longer used
- `users.provider` - Always 'spotify' for new users
- `users.providerId` - Use `spotifyId` instead
- `users.resetToken` / `users.resetTokenExpiry` - Password reset no longer needed
- `guestRateLimits` table - Guest generation no longer supported

All new users **must** have:
- `spotifyId` (NOT NULL)
- `spotifyAccessToken` (NOT NULL)
- `spotifyRefreshToken` (NOT NULL)
- `email` (NOT NULL)

### Code Changes Summary

**Backend:**
- `server/auth.ts` - Only Spotify strategy configured
- `server/routes.ts` - Removed guest and multi-auth endpoints
- `server/services/spotify.ts` - Removed service account methods
- `server/storage.ts` - Added `getUserBySpotifyId()`

**Frontend:**
- `client/src/pages/landing.tsx` - Single CTA: "Sign in with Spotify"
- `client/src/App.tsx` - Removed login/signup/forgot-password routes
- Deleted: `login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`

## Benefits

1. **Simpler UX** - One authentication method, no separate Spotify connection step
2. **More Secure** - Users' own accounts, no shared service account
3. **Truly Personalized** - All playlists based on user's actual music history
4. **Easier Maintenance** - Less auth code to maintain
5. **Better Token Management** - Tokens stored in database, automatic refresh

## Testing

After deploying these changes:
1. ✅ New users can sign in with Spotify
2. ✅ User data saves correctly (email, displayName, spotifyId, tokens)
3. ✅ Profile setup prompts for birth data if missing
4. ✅ Playlist generation works with user's Spotify tokens
5. ✅ Token refresh works when expired
6. ✅ Session persistence works correctly

## Rollback Plan

If you need to rollback to multi-auth:
1. Revert to the commit before this migration
2. Re-add the removed environment variables
3. Run `npm install` to ensure all dependencies are correct
4. Restart the application

## Support

For questions or issues:
- Create an issue in the GitHub repository
- Contact the development team
