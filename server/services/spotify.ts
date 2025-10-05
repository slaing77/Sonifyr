import { URLSearchParams } from 'url';

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string; height?: number; width?: number }>;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height?: number; width?: number }>;
  };
  external_urls: {
    spotify: string;
  };
  preview_url?: string;
  popularity: number;
  audio_features?: {
    danceability: number;
    energy: number;
    key: number;
    loudness: number;
    mode: number;
    speechiness: number;
    acousticness: number;
    instrumentalness: number;
    liveness: number;
    valence: number;
    tempo: number;
  };
}

export interface SpotifyUserProfile {
  recentlyPlayed: SpotifyTrack[];
  topTracks: SpotifyTrack[];
  savedTracks: SpotifyTrack[];
  musicProfile: {
    preferredGenres: string[];
    averageEnergy: number;
    averageValence: number;
    averageTempo: number;
    topArtists: string[];
  };
}

export class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private serviceAccountToken: string | null = null;
  private serviceTokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID!;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
    this.redirectUri = `https://${domain || 'localhost:5000'}/api/spotify/callback`;
    
    console.log("Spotify Service initialized with redirect URI:", this.redirectUri);
    
    // Initialize service account for planetary frequency analysis
    this.initializeServiceAccount();
  }

  /**
   * Initialize Sonifyr service account for universal audio analysis access
   */
  private async initializeServiceAccount(): Promise<void> {
    try {
      await this.refreshServiceAccountToken();
      console.log("🎵 Sonifyr service account initialized for planetary frequency analysis");
    } catch (error) {
      console.error("Failed to initialize Sonifyr service account:", error);
    }
  }

  /**
   * Get or refresh service account token for audio analysis
   */
  private async refreshServiceAccountToken(): Promise<string> {
    // Check if current token is still valid
    if (this.serviceAccountToken && Date.now() < this.serviceTokenExpiry) {
      return this.serviceAccountToken;
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error('Failed to get service account token');
    }

    const data = await response.json();
    this.serviceAccountToken = data.access_token;
    this.serviceTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early
    
    return this.serviceAccountToken!;
  }

  /**
   * Get access token using Sonifyr's stored refresh token for playlist creation
   */
  private async getServiceUserAccessToken(): Promise<string> {
    const refreshToken = process.env.SPOTIFY_SERVICE_REFRESH_TOKEN;
    if (!refreshToken) {
      throw new Error('SPOTIFY_SERVICE_REFRESH_TOKEN not configured. Please set up Sonifyr user refresh token.');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to refresh Sonifyr access token: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Create playlist using Sonifyr's service account
   */
  async createServicePlaylist(name: string, description: string, songs: any[]): Promise<{
    id: string;
    external_urls: { spotify: string };
  }> {
    try {
      console.log('Creating playlist with service account:', { name, description, trackCount: songs.length });
      
      const accessToken = await this.getServiceUserAccessToken();
      
      // Create playlist on Sonifyr's account (use /me endpoint)
      const playlistResponse = await fetch(`https://api.spotify.com/v1/me/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.slice(0, 100), // Spotify has a 100 character limit
          description: description.slice(0, 300), // Keep description under 300 chars
          public: true, // Make playlists public so they can be shared
        }),
      });

      if (!playlistResponse.ok) {
        const errorText = await playlistResponse.text();
        console.error('Spotify service playlist creation failed:', playlistResponse.status, errorText);
        throw new Error(`Failed to create service playlist: ${playlistResponse.status} ${errorText}`);
      }

      const playlist = await playlistResponse.json();
      console.log('Service playlist created:', playlist.id);

      // Search for songs and add tracks to playlist
      if (songs.length > 0) {
        const trackIds: string[] = [];
        
        for (const song of songs) {
          try {
            console.log(`Searching for: ${song.artist} ${song.title}`);
            
            if (!song.artist || !song.title) {
              console.warn(`Invalid song data:`, song);
              continue;
            }
            
            // First try exact search with quotes
            let searchQuery = `track:"${song.title}" artist:"${song.artist}"`;
            let searchResults = await this.searchTracks(accessToken, searchQuery, 10);
            
            // If no exact matches, try partial matching
            if (searchResults.length === 0) {
              searchQuery = `${song.artist} ${song.title}`;
              searchResults = await this.searchTracks(accessToken, searchQuery, 10);
            }
            
            if (searchResults.length > 0) {
              // Find best match: exact title and artist match preferred
              let bestMatch = searchResults[0];
              
              for (const track of searchResults) {
                const titleMatch = track.name.toLowerCase().includes(song.title.toLowerCase());
                const artistMatch = track.artists.some(artist => 
                  artist.name.toLowerCase().includes(song.artist.toLowerCase())
                );
                
                if (titleMatch && artistMatch) {
                  bestMatch = track;
                  break;
                } else if (track.popularity > bestMatch.popularity) {
                  bestMatch = track;
                }
              }
              
              console.log(`Selected track: ${bestMatch.name} by ${bestMatch.artists[0]?.name}`);
              trackIds.push(bestMatch.id);
            }
          } catch (error) {
            console.warn(`Failed to find track: ${song.artist} - ${song.title}`, error);
          }
        }

        // Add tracks to playlist in batches
        if (trackIds.length > 0) {
          const trackUris = trackIds.map(id => `spotify:track:${id}`);
          console.log(`Adding ${trackUris.length} tracks to service playlist`);
          
          for (let i = 0; i < trackUris.length; i += 100) {
            const batch = trackUris.slice(i, i + 100);
            const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                uris: batch,
              }),
            });

            if (!tracksResponse.ok) {
              const errorText = await tracksResponse.text();
              console.error('Failed to add tracks to service playlist:', tracksResponse.status, errorText);
            }
          }
        }
      }

      return {
        id: playlist.id,
        external_urls: playlist.external_urls,
      };
    } catch (error) {
      console.error('Error creating service playlist:', error);
      throw error;
    }
  }

  getAuthUrl(state: string): string {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-read-recently-played',
      'user-top-read',
      'user-library-read',
      'playlist-modify-public',
      'playlist-modify-private'
    ];

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: scopes.join(' '),
      redirect_uri: this.redirectUri,
      state: state,
      // Force Spotify to show login screen instead of auto-login
      show_dialog: 'true'
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(this.redirectUri)}`,
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return await response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    return await response.json();
  }

  async getSpotifyApi(accessToken: string, endpoint: string): Promise<any> {
    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Spotify API error for ${endpoint}:`, response.status, errorText);
      
      if (response.status === 403) {
        // Return null for forbidden endpoints instead of throwing
        console.warn(`Access forbidden to ${endpoint}, skipping...`);
        return null;
      }
      
      throw new Error(`Spotify API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  async getUserProfile(accessToken: string): Promise<SpotifyUser> {
    return await this.getSpotifyApi(accessToken, '/me');
  }

  async getUserMusicProfile(accessToken: string): Promise<SpotifyUserProfile> {
    console.log("Getting user music profile...");
    
    // Try to get recently played tracks (may be restricted)
    const recentlyPlayedResponse = await this.getSpotifyApi(accessToken, '/me/player/recently-played?limit=50');
    const recentlyPlayed = recentlyPlayedResponse?.items?.map((item: any) => item.track) || [];

    // Try to get top tracks (may require additional permissions)
    const topTracksResponse = await this.getSpotifyApi(accessToken, '/me/top/tracks?time_range=medium_term&limit=50');
    const topTracks = topTracksResponse?.items || [];

    // Try to get saved tracks (liked songs)
    const savedTracksResponse = await this.getSpotifyApi(accessToken, '/me/tracks?limit=50');
    const savedTracks = savedTracksResponse?.items?.map((item: any) => item.track) || [];

    // Try to get top artists for genre insights
    const topArtistsResponse = await this.getSpotifyApi(accessToken, '/me/top/artists?time_range=medium_term&limit=20');
    const topArtists = topArtistsResponse?.items || [];

    console.log(`Retrieved: ${recentlyPlayed.length} recent, ${topTracks.length} top tracks, ${savedTracks.length} saved tracks, ${topArtists.length} top artists`);

    // Analyze music preferences
    const allTracks = [...recentlyPlayed, ...topTracks, ...savedTracks];
    const uniqueTracks = allTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id)
    );

    // Note: Audio features API is restricted as of Nov 2024
    // Skip audio feature analysis and use genre-based estimates instead

    // Extract genres from artists
    const genres = topArtists.flatMap((artist: any) => artist.genres || []);
    const uniqueGenres = Array.from(new Set(genres)) as string[];
    const preferredGenres = uniqueGenres.slice(0, 10);

    // Calculate average music characteristics using genre-based estimates
    const estimates = this.getGenreBasedEstimates(preferredGenres as string[]);
    const averageEnergy = estimates.energy;
    const averageValence = estimates.valence;
    const averageTempo = estimates.tempo;
    console.log("Using genre-based estimates:", estimates);

    const profile = {
      recentlyPlayed,
      topTracks,
      savedTracks,
      musicProfile: {
        preferredGenres,
        averageEnergy: isNaN(averageEnergy) ? 0.5 : averageEnergy,
        averageValence: isNaN(averageValence) ? 0.5 : averageValence,
        averageTempo: isNaN(averageTempo) ? 120 : averageTempo,
        topArtists: topArtists.slice(0, 10).map((artist: any) => artist.name),
        totalTracks: uniqueTracks.length,
      }
    };

    console.log("Generated music profile:", {
      genres: profile.musicProfile.preferredGenres.length,
      energy: profile.musicProfile.averageEnergy,
      valence: profile.musicProfile.averageValence,
      tempo: profile.musicProfile.averageTempo,
      artists: profile.musicProfile.topArtists.length,
      totalTracks: profile.musicProfile.totalTracks
    });

    return profile;
  }

  // Estimate audio features based on genres when Spotify API access is restricted
  private getGenreBasedEstimates(genres: string[]): { energy: number; valence: number; tempo: number } {
    const genreProfiles: Record<string, { energy: number; valence: number; tempo: number }> = {
      'trip hop': { energy: 0.4, valence: 0.3, tempo: 90 },
      'downtempo': { energy: 0.3, valence: 0.4, tempo: 85 },
      'art pop': { energy: 0.6, valence: 0.6, tempo: 110 },
      'singer-songwriter': { energy: 0.4, valence: 0.5, tempo: 100 },
      'riot grrrl': { energy: 0.8, valence: 0.4, tempo: 140 },
      'punk': { energy: 0.9, valence: 0.4, tempo: 150 },
      'baroque pop': { energy: 0.5, valence: 0.6, tempo: 105 },
      'nu jazz': { energy: 0.5, valence: 0.7, tempo: 95 },
      'electro swing': { energy: 0.7, valence: 0.8, tempo: 125 },
      'blues rock': { energy: 0.7, valence: 0.5, tempo: 115 },
      'alternative rock': { energy: 0.7, valence: 0.5, tempo: 120 },
      'indie rock': { energy: 0.6, valence: 0.6, tempo: 115 },
      'electronic': { energy: 0.8, valence: 0.7, tempo: 128 },
      'hip hop': { energy: 0.7, valence: 0.6, tempo: 95 },
      'jazz': { energy: 0.5, valence: 0.7, tempo: 110 },
      'classical': { energy: 0.4, valence: 0.6, tempo: 90 },
    };

    let totalEnergy = 0, totalValence = 0, totalTempo = 0, count = 0;

    for (const genre of genres) {
      const profile = genreProfiles[genre.toLowerCase()];
      if (profile) {
        totalEnergy += profile.energy;
        totalValence += profile.valence;
        totalTempo += profile.tempo;
        count++;
      }
    }

    if (count === 0) {
      // Default estimates for unknown genres
      return { energy: 0.5, valence: 0.5, tempo: 110 };
    }

    return {
      energy: totalEnergy / count,
      valence: totalValence / count,
      tempo: totalTempo / count,
    };
  }

  // Add estimated audio features to tracks based on genres
  private estimateAudioFeaturesFromGenres(tracks: any[], genres: string[]) {
    const estimates = this.getGenreBasedEstimates(genres);
    
    tracks.forEach(track => {
      if (!track.audio_features) {
        track.audio_features = {
          energy: estimates.energy + (Math.random() - 0.5) * 0.2, // Add slight variation
          valence: estimates.valence + (Math.random() - 0.5) * 0.2,
          tempo: estimates.tempo + (Math.random() - 0.5) * 20,
        };
      }
    });
  }

  async searchTracks(accessToken: string, query: string, limit: number = 20): Promise<SpotifyTrack[]> {
    const encodedQuery = encodeURIComponent(query);
    const response = await this.getSpotifyApi(accessToken, `/search?q=${encodedQuery}&type=track&limit=${limit}`);
    return response.tracks?.items || [];
  }

  /**
   * Search tracks using Sonifyr service account - enables planetary frequency analysis for all users!
   */
  async searchTracksAsService(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
    const token = await this.refreshServiceAccountToken();
    const encodedQuery = encodeURIComponent(query);
    
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error(`Service search failed: ${response.status} ${response.statusText}`);
      throw new Error('Failed to search tracks with service account');
    }

    const data = await response.json();
    return data.tracks?.items || [];
  }

  /**
   * Get full audio analysis for any track using service account
   * This is the KEY method that enables planetary frequency detection!
   */
  async getAudioAnalysis(trackId: string): Promise<any> {
    const token = await this.refreshServiceAccountToken();
    
    const response = await fetch(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error(`Audio analysis failed for ${trackId}: ${response.status}`);
      return null;
    }

    const analysisData = await response.json();
    console.log(`🎵 Retrieved full audio analysis for track ${trackId} - ${analysisData.segments?.length || 0} segments`);
    return analysisData;
  }

  /**
   * Get audio features for any track using service account
   */
  async getAudioFeatures(trackId: string): Promise<any> {
    const token = await this.refreshServiceAccountToken();
    
    const response = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error(`Audio features failed for ${trackId}: ${response.status}`);
      return null;
    }

    return response.json();
  }

  /**
   * Get Spotify recommendations based on user's liked songs and top artists
   * This provides more personalized recommendations than generic search
   */
  async getPersonalizedRecommendations(accessToken: string, options: {
    seedTracks?: string[]; // Spotify track IDs
    seedArtists?: string[]; // Spotify artist IDs  
    targetEnergy?: number; // 0.0 - 1.0
    targetValence?: number; // 0.0 - 1.0 (happiness)
    targetTempo?: number; // BPM
    limit?: number;
  } = {}): Promise<SpotifyTrack[]> {
    const {
      seedTracks = [],
      seedArtists = [],
      targetEnergy,
      targetValence,
      targetTempo,
      limit = 20
    } = options;

    // Build query parameters
    const params = new URLSearchParams();
    
    // Add seeds (max 5 total)
    const allSeeds = [
      ...seedTracks.slice(0, 3).map(id => `seed_tracks=${id}`),
      ...seedArtists.slice(0, 2).map(id => `seed_artists=${id}`)
    ];
    
    if (allSeeds.length === 0) {
      // No seeds available, return empty array
      return [];
    }
    
    params.append('limit', limit.toString());
    
    // Add target audio features if provided
    if (targetEnergy !== undefined) params.append('target_energy', targetEnergy.toString());
    if (targetValence !== undefined) params.append('target_valence', targetValence.toString());
    if (targetTempo !== undefined) params.append('target_tempo', targetTempo.toString());
    
    const seedParams = allSeeds.join('&');
    // Fix: Don't include leading slash - getSpotifyApi already adds /v1/
    const url = `recommendations?${seedParams}&${params.toString()}`;
    
    console.log('Getting recommendations from:', url);
    const response = await this.getSpotifyApi(accessToken, url);
    return response?.tracks || [];
  }

  /**
   * Get user's top track and artist IDs for use as recommendation seeds
   */
  async getRecommendationSeeds(accessToken: string): Promise<{
    trackIds: string[];
    artistIds: string[];
  }> {
    try {
      // Get user's saved tracks (liked songs) - these are most personal
      const savedTracksResponse = await this.getSpotifyApi(accessToken, '/me/tracks?limit=20');
      const likedTrackIds = savedTracksResponse?.items?.map((item: any) => item.track.id).filter(Boolean) || [];
      
      // Get top artists for genre diversity
      const topArtistsResponse = await this.getSpotifyApi(accessToken, '/me/top/artists?time_range=medium_term&limit=10');
      const topArtistIds = topArtistsResponse?.items?.map((artist: any) => artist.id).filter(Boolean) || [];
      
      console.log(`Found ${likedTrackIds.length} liked tracks and ${topArtistIds.length} top artists for recommendations`);
      
      return {
        trackIds: likedTrackIds,
        artistIds: topArtistIds
      };
    } catch (error) {
      console.error('Error getting recommendation seeds:', error);
      return { trackIds: [], artistIds: [] };
    }
  }

  async createPlaylist(accessToken: string, userId: string, name: string, description: string, songs: any[]): Promise<{
    id: string;
    external_urls: { spotify: string };
  }> {
    console.log('Creating playlist:', { name, description, trackCount: songs.length, userId });
    
    // Create playlist using current user endpoint (more reliable)
    const playlistResponse = await fetch(`https://api.spotify.com/v1/me/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.slice(0, 100), // Spotify has a 100 character limit
        description: description.slice(0, 300), // Keep description under 300 chars
        public: true, // Make playlists public so they can be shared
      }),
    });

    if (!playlistResponse.ok) {
      const errorText = await playlistResponse.text();
      console.error('Spotify playlist creation failed:', playlistResponse.status, errorText);
      throw new Error(`Failed to create playlist: ${playlistResponse.status} ${errorText}`);
    }

    const playlist = await playlistResponse.json();

    // Search for songs and add tracks to playlist
    if (songs.length > 0) {
      const trackIds: string[] = [];
      
      for (const song of songs) {
        try {
          // Enhanced search with exact matching (same algorithm as export)
          console.log(`Searching for: ${song.artist} ${song.title}`);
          
          // Check if song data is valid
          if (!song.artist || !song.title) {
            console.warn(`Invalid song data:`, song);
            continue;
          }
          
          // First try exact search with quotes
          let searchQuery = `track:"${song.title}" artist:"${song.artist}"`;
          let searchResults = await this.searchTracks(accessToken, searchQuery, 10);
          console.log(`Found ${searchResults.length} exact results for: ${song.artist} ${song.title}`);
          
          // If no exact matches, try partial matching
          if (searchResults.length === 0) {
            searchQuery = `${song.artist} ${song.title}`;
            searchResults = await this.searchTracks(accessToken, searchQuery, 10);
            console.log(`Found ${searchResults.length} partial results for: ${song.artist} ${song.title}`);
          }
          
          if (searchResults.length > 0) {
            // Find best match: exact title and artist match preferred
            let bestMatch = searchResults[0];
            
            for (const track of searchResults) {
              const titleMatch = track.name.toLowerCase().includes(song.title.toLowerCase());
              const artistMatch = track.artists.some(artist => 
                artist.name.toLowerCase().includes(song.artist.toLowerCase())
              );
              
              // Prefer exact matches, then high popularity
              if (titleMatch && artistMatch) {
                bestMatch = track;
                break;
              } else if (track.popularity > bestMatch.popularity) {
                bestMatch = track;
              }
            }
            
            console.log(`Selected track: ${bestMatch.name} by ${bestMatch.artists[0].name}`);
            trackIds.push(bestMatch.id);
          } else {
            console.warn(`No tracks found for: ${song.artist} - ${song.title}`);
          }
        } catch (error) {
          console.warn(`Failed to find track: ${song.artist} - ${song.title}`, error);
        }
      }
      
      console.log(`Found ${trackIds.length} tracks out of ${songs.length} songs`);
      
      if (trackIds.length > 0) {
        const trackUris = trackIds.map(id => `spotify:track:${id}`);
        console.log('Adding tracks to playlist:', { playlistId: playlist.id, trackCount: trackUris.length });
        
        const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uris: trackUris,
          }),
        });
        
        if (!tracksResponse.ok) {
          const errorText = await tracksResponse.text();
          console.error('Failed to add tracks to playlist:', tracksResponse.status, errorText);
          // Don't fail the whole operation if tracks can't be added
        } else {
          console.log('Successfully added tracks to playlist');
        }
      }
    }

    return {
      id: playlist.id,
      external_urls: playlist.external_urls,
    };
  }

  // Update existing Spotify playlist
  async updatePlaylist(accessToken: string, playlistId: string, name: string, description: string, songs: any[]): Promise<{ id: string; external_urls: any }> {
    console.log('Updating playlist:', { playlistId, name, description, trackCount: songs.length });
    
    try {
      // Update playlist metadata
      const updateResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.slice(0, 100),
          description: description.slice(0, 300),
          public: true,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update playlist metadata: ${updateResponse.status}`);
      }

      // Clear existing tracks
      const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (playlistResponse.ok) {
        const playlistData = await playlistResponse.json();
        const existingTrackUris = playlistData.tracks.items.map((item: any) => ({ uri: item.track.uri }));
        
        if (existingTrackUris.length > 0) {
          await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tracks: existingTrackUris,
            }),
          });
        }
      }

      // Search for songs and add new tracks to playlist
      if (songs.length > 0) {
        const trackIds: string[] = [];
        
        for (const song of songs) {
          try {
            console.log(`Searching for: ${song.artist} ${song.title}`);
            
            if (!song.artist || !song.title) {
              console.warn(`Invalid song data:`, song);
              continue;
            }
            
            // Use same search logic as createPlaylist
            let searchQuery = `track:"${song.title}" artist:"${song.artist}"`;
            let searchResults = await this.searchTracks(accessToken, searchQuery, 10);
            
            if (searchResults.length === 0) {
              searchQuery = `${song.artist} ${song.title}`;
              searchResults = await this.searchTracks(accessToken, searchQuery, 10);
            }
            
            if (searchResults.length > 0) {
              let bestMatch = searchResults[0];
              
              for (const track of searchResults) {
                const titleMatch = track.name.toLowerCase().includes(song.title.toLowerCase());
                const artistMatch = track.artists.some(artist => 
                  artist.name.toLowerCase().includes(song.artist.toLowerCase())
                );
                
                if (titleMatch && artistMatch) {
                  bestMatch = track;
                  break;
                } else if (track.popularity > bestMatch.popularity) {
                  bestMatch = track;
                }
              }
              
              console.log(`Selected track: ${bestMatch.name} by ${bestMatch.artists[0]?.name}`);
              trackIds.push(bestMatch.id);
            }
          } catch (error) {
            console.warn(`Failed to find track: ${song.artist} - ${song.title}`, error);
          }
        }

        if (trackIds.length > 0) {
          const trackUris = trackIds.map(id => `spotify:track:${id}`);
          console.log(`Adding ${trackUris.length} tracks to playlist`);
          
          for (let i = 0; i < trackUris.length; i += 100) {
            const batch = trackUris.slice(i, i + 100);
            const addResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                uris: batch,
              }),
            });

            if (!addResponse.ok) {
              console.error('Failed to add tracks to playlist');
            }
          }
        }
      }

      // Return playlist data
      const finalResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (finalResponse.ok) {
        const playlistData = await finalResponse.json();
        return {
          id: playlistData.id,
          external_urls: playlistData.external_urls,
        };
      } else {
        throw new Error('Failed to get updated playlist data');
      }
      
    } catch (error) {
      console.error('Error updating playlist:', error);
      throw error;
    }
  }


  /**
   * Batch get audio features for multiple tracks (more efficient)
   */
  async getBatchAudioFeatures(trackIds: string[], accessToken: string): Promise<any[]> {
    try {
      // Spotify allows up to 100 tracks per request
      const chunks = this.chunkArray(trackIds, 100);
      const allFeatures: any[] = [];

      for (const chunk of chunks) {
        const response = await fetch(`https://api.spotify.com/v1/audio-features?ids=${chunk.join(',')}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          allFeatures.push(...(data.audio_features || []));
        }
      }

      return allFeatures.filter(Boolean); // Remove null entries
    } catch (error) {
      console.error('Error getting batch audio features:', error);
      return [];
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export const spotifyService = new SpotifyService();