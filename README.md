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
   - Add BOTH of these URIs (click "Add" after each):
     ```
     http://localhost:5000/api/auth/spotify/callback
     https://your-actual-domain.com/api/auth/spotify/callback
     ```
   - **Replace `your-actual-domain.com` with your production domain**
   - Click "Save" at the bottom
   
   **Why both?**
   - `localhost:5000` - For local development
   - `your-domain.com` - For production deployment

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
   # REPLIT_DOMAINS=your-domain.com  # For production
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

### "Spotify OAuth Error" or "Invalid redirect_uri"

This means the redirect URI in your Spotify app doesn't match the one your app is using.

**Fix:**
1. Check your Spotify app's redirect URIs in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Make sure you have **BOTH** URIs added:
   - `http://localhost:5000/api/auth/spotify/callback` (for development)
   - `https://your-domain.com/api/auth/spotify/callback` (for production)
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
