import passport from "passport";
import { Strategy as SpotifyStrategy } from "passport-spotify";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as UserType } from "@shared/schema";
import connectPg from "connect-pg-simple";

declare global {
  namespace Express {
    interface User extends UserType {}
  }
}

export function setupAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Spotify Strategy (Primary and only authentication method)
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set!");
    throw new Error("Spotify OAuth credentials not configured");
  }

  const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
  // Use HTTPS for all URIs (Spotify requires secure redirect URIs, including localhost)
  const callbackURL = `https://${domain}/api/auth/spotify/callback`;
  
  console.log('Spotify OAuth Callback URL:', callbackURL);
  
  passport.use(
    new SpotifyStrategy(
      {
        clientID: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        callbackURL,
      },
      async (accessToken: string, refreshToken: string, expires_in: number, profile: any, done: any) => {
        try {
          const spotifyId = profile.id;
          const email = profile.emails?.[0]?.value || profile._json?.email;
          
          if (!email) {
            return done(new Error("Unable to get email from Spotify. Please ensure your Spotify account has a verified email address and try again."));
          }

          // Try to find existing user by Spotify ID or email
          let user = await storage.getUserBySpotifyId(spotifyId);
          
          if (!user) {
            user = await storage.getUserByEmail(email);
          }
          
          if (user) {
            // Update existing user with Spotify data
            const tokenExpires = new Date(Date.now() + expires_in * 1000);
            user = await storage.updateUser(user.id, {
              spotifyId,
              spotifyAccessToken: accessToken,
              spotifyRefreshToken: refreshToken,
              spotifyTokenExpires: tokenExpires,
              email,
            });
          } else {
            // Create new user with Spotify data
            const userData = {
              id: `spotify_${spotifyId}`,
              email,
              username: profile.displayName || profile.username || email.split('@')[0],
              firstName: profile.displayName?.split(' ')[0] || "",
              lastName: profile.displayName?.split(' ').slice(1).join(' ') || "",
              profileImageUrl: profile.photos?.[0]?.value || profile._json?.images?.[0]?.url,
              spotifyId,
              spotifyAccessToken: accessToken,
              spotifyRefreshToken: refreshToken,
              spotifyTokenExpires: new Date(Date.now() + expires_in * 1000),
            };
            user = await storage.createUser(userData);
          }
          
          return done(null, user);
        } catch (error) {
          console.error('Spotify authentication error:', error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, (user as UserType).id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error("Deserialize error:", error);
      done(null, false);
    }
  });

  // Spotify OAuth routes
  app.get("/api/auth/spotify", 
    passport.authenticate("spotify", { 
      scope: [
        "user-read-email",
        "user-read-private",
        "user-top-read",
        "playlist-modify-public",
        "playlist-modify-private",
        "user-library-read",
        "user-read-recently-played"
      ]
    } as any)
  );
  
  app.get("/api/auth/spotify/callback", 
    passport.authenticate("spotify", { failureRedirect: "/?error=spotify_auth_failed" }),
    async (req, res) => {
      // Check if user needs to complete profile (birth data)
      const user = req.user as UserType;
      if (!user.birthDate || !user.birthTime || !user.birthLocation) {
        return res.redirect("/?needs_profile=true");
      }
      res.redirect("/");
    }
  );

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json({ ...req.user, password: undefined });
  });

  // Profile completion route for users who need to add birth data
  app.post("/api/auth/complete-profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { birthDate, birthTime, birthLocation } = req.body;
      const userId = (req.user as UserType).id;
      
      const updatedUser = await storage.updateUser(userId, {
        birthDate,
        birthTime,
        birthLocation,
      });
      
      res.json({ user: { ...updatedUser, password: undefined } });
    } catch (error) {
      console.error("Profile completion error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
}

// Middleware to check authentication
export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Middleware to check if user has complete profile
export function requireCompleteProfile(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const user = req.user as UserType;
  if (!user.birthDate || !user.birthTime || !user.birthLocation) {
    return res.status(400).json({ 
      message: "Profile incomplete", 
      needsProfileCompletion: true 
    });
  }
  
  next();
}