# Spotify OAuth Setup Guide

## Where to Add Redirect URIs

**Answer: In the Spotify Developer Dashboard at https://developer.spotify.com/dashboard**

The redirect URIs are **NOT** added to your code or `.env` file. They are configured in your Spotify app's settings on the Spotify Developer website.

## Step-by-Step Visual Guide

### Step 1: Access Spotify Developer Dashboard

```
🌐 https://developer.spotify.com/dashboard
```

![Login to Spotify](https://developer.spotify.com/dashboard)

- Log in with your Spotify account credentials
- If you don't have a Spotify account, create one first at spotify.com

---

### Step 2: Create Your App

Click the **"Create app"** button (green button in the top right)

Fill in the form:
- **App name**: `Sonifyr` (or your preferred name)
- **App description**: `Cosmic music playlist generator`
- **Website**: (optional) Your website URL
- **Redirect URIs**: Leave blank for now (we'll add these next)
- ✅ Check the "I understand and agree..." checkbox
- Click **"Save"**

---

### Step 3: View Your App Credentials

After creating your app, you'll see the app dashboard with:

```
Client ID: abc123def456...
```

Click **"Show client secret"** to reveal:
```
Client Secret: xyz789abc123...
```

**📋 Copy both of these** - you'll need them for your `.env` file.

---

### Step 4: Add Redirect URIs ⭐ IMPORTANT ⭐

This is where you add the URIs mentioned in the question!

1. **Click "Edit Settings"** (button in top right of your app's page)

2. **Scroll down** to find the "Redirect URIs" section

3. **Add the first URI:**
   - Click in the text field
   - Paste: `http://localhost:5000/api/auth/spotify/callback`
   - Click the **"Add"** button next to the field
   - ✅ You should see it appear in the list below

4. **Add the second URI:**
   - Click in the text field again
   - Paste: `https://your-domain.com/api/auth/spotify/callback`
   - **Replace `your-domain.com` with your actual domain**
   - Click the **"Add"** button
   - ✅ You should now see BOTH URIs in the list

5. **Scroll to bottom and click "Save"**

**Your Redirect URIs section should now show:**
```
✅ http://localhost:5000/api/auth/spotify/callback
✅ https://your-domain.com/api/auth/spotify/callback
```

---

### Step 5: Configure Your .env File

Back in your code editor, create/edit the `.env` file:

```env
# From Step 3 above:
SPOTIFY_CLIENT_ID=abc123def456...  # Your actual Client ID
SPOTIFY_CLIENT_SECRET=xyz789abc123...  # Your actual Client Secret

# Your deployment domain (no http://)
REPLIT_DOMAINS=your-domain.com
```

---

## Verification

To verify your setup is correct:

1. ✅ Your Spotify app has BOTH redirect URIs listed
2. ✅ Your `.env` file has `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`
3. ✅ Your `.env` file has `REPLIT_DOMAINS` set to your domain (without http://)

## Testing

**Local Development:**
```bash
npm run dev
```
Visit: http://localhost:5000
Click "Sign in with Spotify" - should redirect to Spotify login

**Production:**
Deploy your app, then visit your production domain and test the Spotify login.

---

## Troubleshooting

### Error: "Invalid redirect_uri"

**Cause**: The redirect URI configured in your Spotify app doesn't match what your application is sending.

**Fix**:
1. Double-check BOTH URIs are added in Spotify Developer Dashboard
2. Make sure there are no typos (especially the `/api/auth/spotify/callback` path)
3. Click "Save" after adding the URIs
4. Clear your browser cache and try again

### Error: "SPOTIFY_CLIENT_ID not found"

**Cause**: Environment variables not loaded.

**Fix**:
1. Make sure you created a `.env` file (copy from `.env.example`)
2. Make sure the `.env` file is in the root directory
3. Restart your development server after editing `.env`

### Spotify login works locally but not in production

**Cause**: You only added the localhost URI.

**Fix**:
1. Go back to Spotify Developer Dashboard
2. Edit Settings
3. Add your production domain URI: `https://your-domain.com/api/auth/spotify/callback`
4. Click Save

---

## Summary

**The redirect URIs are added in the Spotify Developer Dashboard:**
- URL: https://developer.spotify.com/dashboard
- Location: Your App → Edit Settings → Redirect URIs section
- URIs to add:
  - `http://localhost:5000/api/auth/spotify/callback`
  - `https://your-domain.com/api/auth/spotify/callback`

**They are NOT added to:**
- ❌ Your `.env` file
- ❌ Your code
- ❌ Any configuration file

**Need help?** See [README.md](./README.md) for full setup instructions.
