# 🎵 Sonifyr - Cosmic Music Curator

AI-powered personalized music playlists based on your astrological chart and musical taste.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Spotify Developer Account
- OpenAI API key

### 1. Spotify Developer Setup (REQUIRED)

**These redirect URIs are added in the Spotify Developer Dashboard, NOT in your code.**

1. **Go to Spotify Developer Dashboard**
   - Visit: https://developer.spotify.com/dashboard
   - Sign in with your Spotify account

2. **Create a New App**
   - Click "Create app" button
   - Fill in:
     - App name: `Sonifyr` (or your preferred name)
     - App description: `Music playlist generator`
     - Redirect URIs: Leave blank for now (we'll add them in step 4)
   - Check the terms of service box
   - Click "Save"

3. **Get Your Credentials**
   - After creating the app, you'll see your dashboard
   - Copy the **Client ID** (you'll need this for `.env`)
   - Click "View client secret" and copy the **Client Secret** (you'll need this for `.env`)

4. **⭐ ADD REDIRECT URIs (IMPORTANT) ⭐**
   - In your app's dashboard, click "Edit Settings"
   - Scroll down to "Redirect URIs" section
   - **Add your production URI:**
     ```
     https://sonifyr.darkfoliopress.com/api/auth/spotify/callback
     ```
     Click "Add"
   - **Add localhost URI (use HTTPS, not HTTP):**
     ```
     https://localhost:5000/api/auth/spotify/callback
     ```
     Click "Add"
     
     ⚠️ **Important:** Use `https://` (not `http://`) for localhost. Spotify now accepts HTTPS localhost URIs.
   
   - Click "Save" at the bottom
   
   **Why both?**
   - Production URI: `sonifyr.darkfoliopress.com` - For deployment
   - Localhost URI: Development testing - Use HTTPS format

### 2. Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/slaing77/Sonifyr.git
   cd Sonifyr
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   Edit `.env` and add your credentials:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host:port/database

   # Session Secret (generate a random string)
   SESSION_SECRET=your_random_secret_here

   # Spotify (from Step 1 above)
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here

   # OpenAI
   OPENAI_API_KEY=your_openai_api_key

   # Deployment Domain
   REPLIT_DOMAINS=localhost:5000  # For local dev
   # REPLIT_DOMAINS=sonifyr.darkfoliopress.com  # For production
   ```

### 3. Database Setup

```bash
npm run db:push
```

### 4. Run the Application

**Development:**
```bash
npm run dev
```
Visit: http://localhost:5000

**Production:**
```bash
npm run build
npm start
```

## 🔐 Authentication

Sonifyr uses **Spotify OAuth** as the sole authentication method. When users click "Sign in with Spotify," they:
1. Authenticate with their Spotify account
2. Grant permissions for playlist creation and music data access
3. Are redirected back to Sonifyr with their Spotify tokens
4. Can immediately generate personalized playlists

## 📖 Features

- **Astrological Analysis**: Generate playlists based on your birth chart
- **AI-Powered Curation**: Uses OpenAI GPT-4 for intelligent music selection
- **Spotify Integration**: Creates playlists directly in your Spotify account
- **Personalized**: Analyzes your Spotify listening history for better recommendations
- **Weekly Updates**: New cosmic playlists based on current planetary transits

## 🛠️ Development

**Type checking:**
```bash
npm run check
```

**Build:**
```bash
npm run build
```

## 📚 Documentation

- [MIGRATION.md](./MIGRATION.md) - Migration guide for converting from multi-auth to Spotify-only
- [.env.example](./.env.example) - Environment variable reference

## 🔧 Troubleshooting

### "This redirect URI is not secure" Error (Spotify Dashboard)

**✅ SOLUTION: Use HTTPS for localhost!**

If you get "This redirect URI is not secure" when adding `http://localhost:5000/api/auth/spotify/callback`, the solution is simple:

**Use HTTPS instead of HTTP for localhost:**
```
https://localhost:5000/api/auth/spotify/callback
```

Spotify now accepts HTTPS localhost URIs. Add this in your Spotify Developer Dashboard and it will work.

**Why this works:**
- Spotify requires secure (HTTPS) redirect URIs
- They now accept `https://localhost` for development
- This is simpler than alternatives like 127.0.0.1 or production-only testing

**Your browser may show a certificate warning** when accessing `https://localhost:5000` - this is normal for local development and can be bypassed.

### Alternative Solutions (if HTTPS localhost doesn't work):

1. **Try `127.0.0.1` instead of `localhost`:**
   ```
   http://127.0.0.1:5000/api/auth/spotify/callback
   ```
   Some Spotify apps accept this format better.

2. **Use a different port:**
   ```
   http://localhost:3000/api/auth/spotify/callback
   ```
   Then update your app to run on port 3000.

3. **Skip localhost development:**
   - Only add the production URI: `https://sonifyr.darkfoliopress.com/api/auth/spotify/callback`
   - Test authentication directly on your production/staging server
   - This is the most reliable approach for Spotify OAuth

4. **Check Spotify App Settings:**
   - Some Spotify apps may have restricted localhost access
   - This is often related to app quotas or verification status
   - Production HTTPS URIs are always accepted

**Why this happens:**
Spotify has tightened security around redirect URIs. While they traditionally allowed `http://localhost` for development, some apps now require HTTPS even for local development, or may reject localhost entirely depending on your app's settings and quota extension status.

**Recommended approach:**
Use the production URL (`https://sonifyr.darkfoliopress.com/api/auth/spotify/callback`) for all testing. Deploy your changes to production/staging and test there.

### "Spotify OAuth Error" or "Invalid redirect_uri"

This means the redirect URI in your Spotify app doesn't match the one your app is using.

**Fix:**
1. Check your Spotify app's redirect URIs in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Make sure you have **BOTH** URIs added:
   - `http://localhost:5000/api/auth/spotify/callback` (for development)
   - `https://sonifyr.darkfoliopress.com/api/auth/spotify/callback` (for production)
3. Make sure there are no typos or extra slashes
4. Click "Save" in the Spotify dashboard

### "SPOTIFY_CLIENT_ID not found"

Make sure you've:
1. Created a `.env` file (copy from `.env.example`)
2. Added your Spotify credentials from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

## 📝 License

MIT

## 🙏 Support

For issues or questions, please open an issue on GitHub.
