# 🎯 Quick Setup Reference for Sonifyr

## Your Production URL
```
https://sonifyr.darkfoliopress.com/
```

## Spotify Redirect URIs (Add to Spotify Dashboard)

Go to: **https://developer.spotify.com/dashboard**

### Add These URIs (in order of importance):

1. **Production (REQUIRED - Always works):**
   ```
   https://sonifyr.darkfoliopress.com/api/auth/spotify/callback
   ```

2. **Development (OPTIONAL - May be rejected by Spotify):**
   ```
   http://localhost:5000/api/auth/spotify/callback
   ```
   
   **If Spotify rejects localhost with "This redirect URI is not secure":**
   - This is normal and expected
   - Try: `http://127.0.0.1:5000/api/auth/spotify/callback` instead
   - OR skip localhost and test with production URL only (recommended)
   
   **Why?** Spotify has security policies that may reject `http://` URIs, even for localhost. The production HTTPS URI always works.

## Environment Variables (.env file)

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Session Secret
SESSION_SECRET=your_random_secret_here

# Spotify Credentials (from Spotify Dashboard)
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# Your Production Domain (no https://)
REPLIT_DOMAINS=sonifyr.darkfoliopress.com

# OpenAI
OPENAI_API_KEY=your_openai_key
```

## Quick Start Commands

```bash
# Install dependencies
npm install

# Setup database
npm run db:push

# Run development server
npm run dev

# Build for production
npm run build

# Run production
npm start
```

## Verification Checklist

- [ ] Spotify app created at https://developer.spotify.com/dashboard
- [ ] Both redirect URIs added in Spotify app settings
- [ ] `.env` file created with all required variables
- [ ] Database connection working
- [ ] Can access http://localhost:5000 in development
- [ ] Can access https://sonifyr.darkfoliopress.com/ in production
- [ ] "Sign in with Spotify" button works

## Need Help?

- Full setup guide: [README.md](./README.md)
- Detailed Spotify setup: [SPOTIFY_SETUP.md](./SPOTIFY_SETUP.md)
- Migration info: [MIGRATION.md](./MIGRATION.md)
