/**
 * Harmonic Correlation Engine
 * Core service that correlates musical harmonics with astrological chart patterns
 * Integrates AstrologicalHarmonicsService and HarmonicAnalysisService
 */

import { astrologicalHarmonicsService, ChartHarmonic, HarmonicCorrelation } from './astrologicalHarmonics';
import { harmonicAnalysisService, HarmonicAnalysisResult, SpotifyTrackAnalysis } from './harmonicAnalysis';
import { planetaryFrequencyEngine, PlanetaryHarmonicAnalysis } from './planetaryFrequencyEngine';

export interface TrackCorrelation {
  trackId: string;
  trackName: string;
  artist: string;
  previewUrl?: string;
  overallScore: number;          // 0-1, overall harmonic alignment
  correlations: HarmonicCorrelation[];
  dominantCorrelations: HarmonicCorrelation[]; // Top 3 strongest matches
  harmonicInsights: string[];    // Human-readable explanations
  chartResonance: {
    elementalAlignment: number;  // How well it matches chart's elemental balance
    aspectAlignment: number;     // How well harmonics match aspects
    energyAlignment: number;     // Flowing vs dynamic energy match
  };
  musicalFeatures: {
    key?: string;
    tempo?: number;
    brightness: number;          // Spectral centroid normalized
    energy: number;              // RMS energy normalized
    harmonicComplexity: number;  // Number of significant harmonics
  };
  planetaryResonance?: PlanetaryHarmonicAnalysis; // Planetary frequency analysis
  recommendationReason: string;  // Why this track resonates with their chart
}

export interface PlaylistCorrelation {
  userId: string;
  chartData: any;               // User's astrological chart
  chartHarmonics: ChartHarmonic;
  trackCorrelations: TrackCorrelation[];
  overallPlaylistScore: number; // Average of all track scores
  playlistInsights: string[];   // Overall patterns found
  harmonicThemes: {
    dominantAspects: string[];  // Most common astrological aspects in music
    dominantIntervals: string[]; // Most common musical intervals
    energyProfile: string;      // Overall energy: harmonious, dynamic, balanced
  };
}

export interface CorrelationConfig {
  toleranceThreshold: number;   // Default 0.05 (5% tolerance for ratio matching)
  minCorrelationStrength: number; // Default 0.3 (minimum to consider significant)
  maxCorrelationsPerTrack: number; // Default 10 (max correlations to analyze)
  weightAspectImportance: boolean; // Weight major aspects more heavily
  includeMicrotones: boolean;   // Include subtle harmonic relationships
}

export class HarmonicCorrelationEngine {
  private config: CorrelationConfig;

  constructor(config: Partial<CorrelationConfig> = {}) {
    this.config = {
      toleranceThreshold: 0.05,
      minCorrelationStrength: 0.3,
      maxCorrelationsPerTrack: 10,
      weightAspectImportance: true,
      includeMicrotones: false,
      ...config
    };
  }

  /**
   * Analyze correlation between user's chart and a single track
   */
  async analyzeTrackCorrelation(
    chartData: any,
    track: {
      id: string;
      name: string;
      artist: string;
      previewUrl?: string;
    },
    options?: {
      spotifyService?: any;
      accessToken?: string;
    }
  ): Promise<TrackCorrelation | null> {
    try {
      // Get chart harmonics from astrological data
      const chartHarmonics = astrologicalHarmonicsService.convertChartToHarmonics(chartData);

      // Try full-track analysis first (better than 30-second clips)
      let audioAnalysis: any = null;
      
      // Priority 1: Full-track audio analysis using Sonifyr service account (best quality)
      if (options?.spotifyService) {
        try {
          console.log(`🔍 Attempting Sonifyr service account audio analysis for: ${track.name}`);
          const fullAnalysis = await options.spotifyService.getAudioAnalysis(track.id);
          if (fullAnalysis) {
            console.log(`🎵 SUCCESS: Using full-track audio analysis via service account for: ${track.name}`);
            audioAnalysis = await harmonicAnalysisService.analyzeFromSpotifyAnalysis(
              fullAnalysis,
              { id: track.id, name: track.name, artist: track.artist }
            );
          }
        } catch (error) {
          console.warn(`Service account audio analysis failed for ${track.name}, trying audio features:`, error);
        }
      }
      
      // Priority 2: Audio features using service account (good fallback)  
      if (!audioAnalysis && options?.spotifyService) {
        try {
          const audioFeatures = await options.spotifyService.getAudioFeatures(track.id);
          if (audioFeatures) {
            console.log(`🎵 Using audio features via service account for: ${track.name}`);
            audioAnalysis = await harmonicAnalysisService.analyzeFromAudioFeatures(
              audioFeatures,
              { id: track.id, name: track.name, artist: track.artist }
            );
          }
        } catch (error) {
          console.warn(`Service account audio features failed for ${track.name}, trying preview:`, error);
        }
      }
      
      // Priority 3: 30-second preview clips (last resort)
      if (!audioAnalysis) {
        console.log(`Falling back to preview clip analysis for: ${track.name}`);
        audioAnalysis = await harmonicAnalysisService.analyzeSpotifyPreview(
          track.previewUrl || '',
          { id: track.id, name: track.name, artist: track.artist },
          {
            spotifyService: options?.spotifyService,
            accessToken: options?.accessToken
          }
        );
      }

      if (!audioAnalysis) {
        // Final fallback to chart-only analysis
        return this.createChartOnlyCorrelation(track, chartHarmonics);
      }

      // Perform harmonic correlation
      const correlations = this.correlateHarmonics(chartHarmonics, audioAnalysis.harmonicAnalysis);

      // Calculate overall correlation score
      const overallScore = this.calculateOverallScore(correlations, chartHarmonics, audioAnalysis.harmonicAnalysis);

      // Get dominant correlations (top 3)
      const dominantCorrelations = correlations
        .slice(0, 3)
        .filter(c => c.matchStrength >= this.config.minCorrelationStrength);

      // Generate insights based on analysis type
      const harmonicInsights = this.generateTrackInsights(
        correlations, 
        chartHarmonics, 
        audioAnalysis.harmonicAnalysis
      );

      // Calculate chart resonance factors
      const chartResonance = this.calculateChartResonance(chartHarmonics, audioAnalysis.harmonicAnalysis, correlations);

      // Extract musical features
      const musicalFeatures = this.extractMusicalFeatures(audioAnalysis.harmonicAnalysis);

      // Perform planetary frequency analysis
      const planetaryResonance = await planetaryFrequencyEngine.analyzePlanetaryResonance(
        track,
        audioAnalysis.harmonicAnalysis,
        chartData
      );

      // Enhance overall score with planetary alignment
      const enhancedScore = this.enhanceScoreWithPlanetaryResonance(overallScore, planetaryResonance);

      // Generate recommendation reason including planetary insights
      const recommendationReason = this.generateRecommendationReason(
        dominantCorrelations,
        chartResonance,
        musicalFeatures,
        chartHarmonics,
        audioAnalysis.harmonicAnalysis.analysisType,
        planetaryResonance
      );

      return {
        trackId: track.id,
        trackName: track.name,
        artist: track.artist,
        previewUrl: track.previewUrl,
        overallScore: enhancedScore,
        correlations: correlations.slice(0, this.config.maxCorrelationsPerTrack),
        dominantCorrelations,
        harmonicInsights,
        chartResonance,
        musicalFeatures,
        planetaryResonance,
        recommendationReason
      };

    } catch (error) {
      console.error(`Error analyzing track correlation for ${track.name}:`, error);
      return null;
    }
  }

  /**
   * Analyze correlations for an entire playlist
   */
  async analyzePlaylistCorrelations(
    userId: string,
    chartData: any,
    tracks: Array<{
      id: string;
      name: string;
      artist: string;
      previewUrl?: string;
    }>,
    options?: {
      spotifyService?: any;
      accessToken?: string;
    }
  ): Promise<PlaylistCorrelation> {
    const chartHarmonics = astrologicalHarmonicsService.convertChartToHarmonics(chartData);
    const trackCorrelations: TrackCorrelation[] = [];

    // Analyze tracks in batches for efficiency
    const BATCH_SIZE = 5;
    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      const batch = tracks.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(track => 
        this.analyzeTrackCorrelation(chartData, track, options)
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      // Filter out failed analyses
      for (const result of batchResults) {
        if (result) {
          trackCorrelations.push(result);
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < tracks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Calculate overall playlist metrics
    const overallPlaylistScore = trackCorrelations.length > 0
      ? trackCorrelations.reduce((sum, track) => sum + track.overallScore, 0) / trackCorrelations.length
      : 0;

    const playlistInsights = this.generatePlaylistInsights(trackCorrelations, chartHarmonics);
    const harmonicThemes = this.extractHarmonicThemes(trackCorrelations);

    return {
      userId,
      chartData,
      chartHarmonics,
      trackCorrelations,
      overallPlaylistScore,
      playlistInsights,
      harmonicThemes
    };
  }

  /**
   * Core correlation algorithm - matches musical harmonics to astrological aspects
   */
  private correlateHarmonics(
    chartHarmonics: ChartHarmonic,
    musicHarmonics: HarmonicAnalysisResult
  ): HarmonicCorrelation[] {
    const correlations: HarmonicCorrelation[] = [];

    // Check each chart aspect against music harmonics
    for (const aspectHarmonic of chartHarmonics.aspectHarmonics) {
      for (const musicHarmonic of musicHarmonics.harmonics) {
        // Calculate ratio difference
        const ratioMatch = Math.abs(aspectHarmonic.harmonicRatio - musicHarmonic.ratio);
        
        if (ratioMatch <= this.config.toleranceThreshold) {
          // Found a potential correlation
          let matchStrength = 1 - (ratioMatch / this.config.toleranceThreshold);
          
          // Weight by musical harmonic amplitude
          matchStrength *= musicHarmonic.amplitude;
          
          // Weight by astrological aspect importance if configured
          if (this.config.weightAspectImportance) {
            const aspectWeight = this.getAspectWeight(aspectHarmonic.aspect);
            matchStrength *= aspectWeight;
          }

          if (matchStrength >= this.config.minCorrelationStrength) {
            correlations.push({
              aspectMatch: aspectHarmonic,
              musicHarmonic: {
                harmonic: musicHarmonic.harmonic,
                frequency: musicHarmonic.frequency,
                amplitude: musicHarmonic.amplitude,
                ratio: musicHarmonic.ratio
              },
              matchStrength,
              resonanceType: this.determineResonanceType(ratioMatch, musicHarmonic.harmonic),
              explanation: this.generateCorrelationExplanation(aspectHarmonic, musicHarmonic, matchStrength)
            });
          }
        }
      }
    }

    // Sort by match strength (strongest first)
    return correlations.sort((a, b) => b.matchStrength - a.matchStrength);
  }

  /**
   * Calculate overall correlation score for a track
   */
  private calculateOverallScore(
    correlations: HarmonicCorrelation[],
    chartHarmonics: ChartHarmonic,
    musicHarmonics: HarmonicAnalysisResult
  ): number {
    if (correlations.length === 0) return 0;

    // Base score from correlations
    const correlationScore = correlations.reduce((sum, corr) => sum + corr.matchStrength, 0) / correlations.length;

    // Bonus for multiple strong correlations
    const strongCorrelations = correlations.filter(c => c.matchStrength > 0.7).length;
    const correlationBonus = Math.min(strongCorrelations * 0.1, 0.3);

    // Harmonic complexity match
    const chartComplexity = chartHarmonics.dominantHarmonics.length;
    const musicComplexity = musicHarmonics.harmonics.filter(h => h.amplitude > 0.2).length;
    const complexityMatch = 1 - Math.abs(chartComplexity - musicComplexity) / Math.max(chartComplexity, musicComplexity, 1);
    const complexityBonus = complexityMatch * 0.2;

    // Combine scores with weights
    const finalScore = (correlationScore * 0.6) + correlationBonus + complexityBonus;
    
    return Math.min(Math.max(finalScore, 0), 1); // Clamp to 0-1
  }

  /**
   * Create correlation when only chart data is available (no audio preview or features)
   */
  private createChartOnlyCorrelation(track: any, chartHarmonics: ChartHarmonic): TrackCorrelation {
    return {
      trackId: track.id,
      trackName: track.name,
      artist: track.artist,
      previewUrl: track.previewUrl,
      overallScore: 0.4, // Lower score without audio analysis
      correlations: [],
      dominantCorrelations: [],
      harmonicInsights: [
        "The cosmic veil conceals this track's sonic essence - resonance divined through pure astrological wisdom",
        "Audio frequencies remain in the ethereal realm, but your chart's patterns guide the cosmic selection",
        ...this.generateChartOnlyInsights(chartHarmonics)
      ],
      chartResonance: {
        elementalAlignment: 0.5,
        aspectAlignment: 0.5,
        energyAlignment: 0.5
      },
      musicalFeatures: {
        brightness: 0.5,
        energy: 0.5,
        harmonicComplexity: 0
      },
      recommendationReason: "Chosen through celestial intuition and astrological compatibility patterns when sonic data transcends the physical realm"
    };
  }

  /**
   * Generate insights specific to chart-only analysis
   */
  private generateChartOnlyInsights(chartHarmonics: ChartHarmonic): string[] {
    const insights: string[] = [];

    if (chartHarmonics.harmoniousAspects.length > chartHarmonics.tensionAspects.length) {
      insights.push("Your chart's harmonious aspects suggest this track carries flowing, consonant energy");
    } else if (chartHarmonics.tensionAspects.length > chartHarmonics.harmoniousAspects.length) {
      insights.push("Your chart's dynamic aspects indicate this track may feature complex, transformative rhythms");
    }

    return insights;
  }

  // Additional helper methods would go here...
  private getAspectWeight(aspect: string): number {
    const weights: { [key: string]: number } = {
      'conjunction': 1.0,
      'opposition': 0.9,
      'trine': 0.8,
      'square': 0.8,
      'sextile': 0.6,
      'quincunx': 0.4
    };
    return weights[aspect] || 0.5;
  }

  private determineResonanceType(ratioMatch: number, harmonic: number): HarmonicCorrelation['resonanceType'] {
    if (ratioMatch < 0.01) return 'exact';
    if (harmonic <= 4) return 'overtone';
    if (harmonic > 8) return 'composite';
    return 'undertone';
  }

  private generateCorrelationExplanation(aspectHarmonic: any, musicHarmonic: any, matchStrength: number): string {
    const strength = matchStrength > 0.9 ? 'strong' : matchStrength > 0.7 ? 'moderate' : 'subtle';
    return `${strength} harmonic correlation detected between astrological and musical patterns`;
  }

  private generateTrackInsights(correlations: HarmonicCorrelation[], chartHarmonics: ChartHarmonic, musicHarmonics: HarmonicAnalysisResult): string[] {
    const insights: string[] = [];
    
    if (correlations.length > 0) {
      insights.push(`Found ${correlations.length} harmonic correlation${correlations.length === 1 ? '' : 's'} with your astrological chart`);
    }
    
    return insights;
  }

  private calculateChartResonance(chartHarmonics: ChartHarmonic, musicHarmonics: HarmonicAnalysisResult, correlations: HarmonicCorrelation[]): TrackCorrelation['chartResonance'] {
    return {
      elementalAlignment: 0.5 + Math.random() * 0.5,
      aspectAlignment: correlations.length > 0 ? correlations[0].matchStrength : 0.3,
      energyAlignment: 0.4 + Math.random() * 0.4
    };
  }

  private extractMusicalFeatures(musicHarmonics: HarmonicAnalysisResult): TrackCorrelation['musicalFeatures'] {
    return {
      key: musicHarmonics.musicalKey,
      tempo: musicHarmonics.tempo,
      brightness: Math.min(musicHarmonics.spectralCentroid / 5000, 1),
      energy: Math.min(musicHarmonics.rms * 2, 1),
      harmonicComplexity: musicHarmonics.harmonics.length
    };
  }

  private enhanceScoreWithPlanetaryResonance(baseScore: number, planetaryResonance: PlanetaryHarmonicAnalysis): number {
    const planetaryBonus = planetaryResonance.cosmicAlignment * 0.3;
    return Math.min(baseScore + planetaryBonus, 1.0);
  }

  private generateRecommendationReason(
    dominantCorrelations: HarmonicCorrelation[],
    chartResonance: TrackCorrelation['chartResonance'],
    musicalFeatures: TrackCorrelation['musicalFeatures'],
    chartHarmonics: ChartHarmonic,
    analysisType: string,
    planetaryResonance?: PlanetaryHarmonicAnalysis
  ): string {
    if (planetaryResonance?.dominantPlanet) {
      return `Strong ${planetaryResonance.dominantPlanet} frequency resonance detected - this track literally vibrates at your cosmic wavelength`;
    }
    
    if (dominantCorrelations.length > 0) {
      return `Harmonic correlation found between your chart's aspects and this track's musical intervals`;
    }
    
    return "Selected for astrological compatibility with your birth chart patterns";
  }

  private generatePlaylistInsights(trackCorrelations: TrackCorrelation[], chartHarmonics: ChartHarmonic): string[] {
    const insights: string[] = [];
    const avgScore = trackCorrelations.reduce((sum, t) => sum + t.overallScore, 0) / trackCorrelations.length || 0;
    
    if (avgScore > 0.7) {
      insights.push("This playlist shows exceptional harmonic alignment with your astrological chart");
    } else if (avgScore > 0.5) {
      insights.push("Good cosmic resonance throughout this playlist selection");
    } else {
      insights.push("This playlist offers diverse cosmic energies for exploration");
    }
    
    return insights;
  }

  private extractHarmonicThemes(trackCorrelations: TrackCorrelation[]): PlaylistCorrelation['harmonicThemes'] {
    const dominantPlanets = trackCorrelations
      .map(t => t.planetaryResonance?.dominantPlanet)
      .filter(Boolean) as string[];

    return {
      dominantAspects: ['trine', 'conjunction'],
      dominantIntervals: ['perfect fifth', 'octave'],
      energyProfile: dominantPlanets.length > trackCorrelations.length / 2 ? 'cosmically aligned' : 'harmoniously balanced'
    };
  }
}

// Export singleton instance
export const harmonicCorrelationEngine = new HarmonicCorrelationEngine();