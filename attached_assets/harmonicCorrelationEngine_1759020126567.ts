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
  planetaryResonance?: PlanetaryHarmonicAnalysis; // NEW: Planetary frequency analysis
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

      // Try full harmonic analysis with fallback system
      const audioAnalysis = await harmonicAnalysisService.analyzeSpotifyPreview(
        track.previewUrl || '',
        { id: track.id, name: track.name, artist: track.artist },
        {
          spotifyService: options?.spotifyService,
          accessToken: options?.accessToken
        }
      );

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
      insights.push("The stars whisper of your affinity for flowing, harmonious energies - let consonant musical intervals carry your spirit");
    } else {
      insights.push("Your celestial blueprint pulses with dynamic tension - complex rhythms and bold dissonance shall awaken your cosmic nature");
    }

    if (chartHarmonics.dominantHarmonics.includes(3)) {
      insights.push("The sacred ratio of perfect fifths (3:2) dances in harmony with your trine aspects, creating bridges between worlds");
    }

    if (chartHarmonics.dominantHarmonics.length > 5) {
      insights.push("Your chart reveals complex harmonic structures - seek music that layers multiple frequencies like your multifaceted cosmic signature");
    }

    return insights;
  }

  // Helper methods...

  private getAspectWeight(aspect: string): number {
    const weights: Record<string, number> = {
      'conjunction': 1.0,
      'opposition': 1.0,
      'trine': 0.9,
      'square': 0.9,
      'sextile': 0.7,
      'quincunx': 0.5
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
    const strength = matchStrength > 0.8 ? 'strong' : matchStrength > 0.6 ? 'moderate' : 'subtle';
    return `${aspectHarmonic.aspect} aspect resonates with ${musicHarmonic.harmonic}${this.getOrdinalSuffix(musicHarmonic.harmonic)} harmonic (${strength} ${aspectHarmonic.ratioString} correlation)`;
  }

  private getOrdinalSuffix(num: number): string {
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return 'th';
    if (lastDigit === 1) return 'st';
    if (lastDigit === 2) return 'nd';
    if (lastDigit === 3) return 'rd';
    return 'th';
  }

  private calculateChartResonance(chartHarmonics: ChartHarmonic, musicHarmonics: HarmonicAnalysisResult, correlations: HarmonicCorrelation[]): TrackCorrelation['chartResonance'] {
    // Simplified calculation - could be enhanced
    const aspectAlignment = correlations.length > 0 ? correlations[0].matchStrength : 0;
    const elementalAlignment = 0.5; // Placeholder - would calculate based on frequency distribution
    const energyAlignment = correlations.filter(c => c.aspectMatch.energy === 'flowing').length > 
                          correlations.filter(c => c.aspectMatch.energy === 'tense').length ? 0.8 : 0.6;

    return { elementalAlignment, aspectAlignment, energyAlignment };
  }

  private extractMusicalFeatures(harmonicAnalysis: HarmonicAnalysisResult): TrackCorrelation['musicalFeatures'] {
    return {
      key: harmonicAnalysis.musicalKey,
      tempo: harmonicAnalysis.tempo,
      brightness: harmonicAnalysis.spectralCentroid / 5000, // Normalize roughly
      energy: harmonicAnalysis.rms,
      harmonicComplexity: harmonicAnalysis.harmonics.filter(h => h.amplitude > 0.2).length
    };
  }

  /**
   * Enhance overall score using planetary resonance data
   */
  private enhanceScoreWithPlanetaryResonance(
    baseScore: number,
    planetaryResonance: PlanetaryHarmonicAnalysis
  ): number {
    // Add planetary alignment bonus (up to 20% improvement)
    const planetaryBonus = planetaryResonance.cosmicAlignment * 0.2;
    
    // Bonus for strong individual planetary resonances
    const strongPlanetaryResonances = planetaryResonance.planetaryResonances.filter(r => r.resonanceStrength > 0.6).length;
    const strengthBonus = Math.min(strongPlanetaryResonances * 0.05, 0.15);
    
    // Factor in confidence level
    const confidenceFactor = planetaryResonance.confidenceLevel;
    
    const enhancedScore = baseScore + (planetaryBonus + strengthBonus) * confidenceFactor;
    
    return Math.min(enhancedScore, 1.0);
  }

  private generateRecommendationReason(
    dominantCorrelations: HarmonicCorrelation[],
    chartResonance: any,
    musicalFeatures: any,
    chartHarmonics: ChartHarmonic,
    analysisType?: string,
    planetaryResonance?: PlanetaryHarmonicAnalysis
  ): string {
    // Add analysis type context to mystical language
    let analysisPrefix = '';
    if (analysisType === 'audio_features') {
      analysisPrefix = 'Through cosmic vibration patterns, ';
    } else if (analysisType === 'simulated') {
      analysisPrefix = 'By channeling universal harmonies, ';
    } else if (analysisType === 'full_audio') {
      analysisPrefix = 'Through direct sonic divination, ';
    }

    // Priority 1: Planetary resonance insights
    if (planetaryResonance && planetaryResonance.dominantPlanet && planetaryResonance.cosmicAlignment > 0.5) {
      const planet = planetaryResonance.dominantPlanet;
      const alignment = (planetaryResonance.cosmicAlignment * 100).toFixed(0);
      return `${analysisPrefix}this track resonates with ${planet}'s orbital frequency (${alignment}% cosmic alignment), amplifying ${planet.toLowerCase()} energy through literal planetary harmonics in the music.`;
    }

    // Priority 2: Astrological harmonic correlations
    if (dominantCorrelations.length > 0) {
      const topCorrelation = dominantCorrelations[0];
      return `${analysisPrefix}this track's ${topCorrelation.aspectMatch.musicalInterval} intervals echo your ${topCorrelation.aspectMatch.aspect} aspects, creating harmonic resonance with your astrological pattern.`;
    }

    // Priority 3: General energy alignment
    if (chartResonance.energyAlignment > 0.7) {
      return `${analysisPrefix}the energy signature of this music aligns well with your chart's elemental balance.`;
    }

    return `${analysisPrefix}this track is selected for its complementary harmonic qualities that balance your astrological influences.`;
  }

  private generateTrackInsights(correlations: HarmonicCorrelation[], chartHarmonics: ChartHarmonic, musicHarmonics: HarmonicAnalysisResult): string[] {
    const insights: string[] = [];
    const analysisType = musicHarmonics.analysisType;
    const confidence = musicHarmonics.confidence;

    // Add analysis type context
    if (analysisType === 'audio_features') {
      insights.push(`Sonic essence channeled through celestial frequency mapping (confidence: ${Math.round(confidence * 100)}%)`);
    } else if (analysisType === 'simulated') {
      insights.push(`Harmonic patterns divined through astrological resonance (confidence: ${Math.round(confidence * 100)}%)`);
    } else if (analysisType === 'full_audio') {
      insights.push(`Direct audio harmonic analysis reveals cosmic alignments (confidence: ${Math.round(confidence * 100)}%)`);
    }

    if (correlations.length === 0) {
      if (analysisType === 'audio_features') {
        insights.push("The vibrational essence of this track dances in contrast to your chart's natural harmonies, offering cosmic expansion through musical diversity.");
      } else {
        insights.push("This track offers contrasting energy patterns - it may introduce new harmonic perspectives to your cosmic blueprint.");
      }
    } else {
      const strongest = correlations[0];
      insights.push(strongest.explanation);
      
      if (correlations.length > 2) {
        if (analysisType === 'audio_features') {
          insights.push(`The universe reveals ${correlations.length} vibrational resonances between this track's energetic signature and your celestial patterns.`);
        } else {
          insights.push(`Found ${correlations.length} harmonic correlations with your chart.`);
        }
      }
    }

    // Add musical feature insights for audio features analysis
    if (analysisType === 'audio_features' && musicHarmonics.musicalKey && musicHarmonics.tempo) {
      insights.push(`The cosmic key of ${musicHarmonics.musicalKey} at ${Math.round(musicHarmonics.tempo)} BPM creates a rhythmic foundation that mirrors the pulse of your planetary influences.`);
    }

    return insights;
  }

  private generatePlaylistInsights(trackCorrelations: TrackCorrelation[], chartHarmonics: ChartHarmonic): string[] {
    const insights: string[] = [];
    const avgScore = trackCorrelations.reduce((sum, t) => sum + t.overallScore, 0) / trackCorrelations.length;

    if (avgScore > 0.7) {
      insights.push("This playlist shows strong harmonic alignment with your astrological chart.");
    } else if (avgScore > 0.5) {
      insights.push("This playlist offers moderate harmonic resonance with balanced contrasting elements.");
    } else {
      insights.push("This playlist provides diverse harmonic experiences that complement your chart's patterns.");
    }

    return insights;
  }

  private extractHarmonicThemes(trackCorrelations: TrackCorrelation[]): PlaylistCorrelation['harmonicThemes'] {
    const aspectCounts: Record<string, number> = {};
    const intervalCounts: Record<string, number> = {};
    
    for (const track of trackCorrelations) {
      for (const correlation of track.correlations) {
        const aspect = correlation.aspectMatch.aspect;
        const interval = correlation.aspectMatch.musicalInterval;
        
        aspectCounts[aspect] = (aspectCounts[aspect] || 0) + 1;
        intervalCounts[interval] = (intervalCounts[interval] || 0) + 1;
      }
    }

    const dominantAspects = Object.entries(aspectCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([aspect]) => aspect);

    const dominantIntervals = Object.entries(intervalCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([interval]) => interval);

    const avgEnergyAlignment = trackCorrelations.reduce((sum, t) => sum + t.chartResonance.energyAlignment, 0) / trackCorrelations.length;
    const energyProfile = avgEnergyAlignment > 0.7 ? 'harmonious' : avgEnergyAlignment > 0.4 ? 'balanced' : 'dynamic';

    return {
      dominantAspects,
      dominantIntervals,
      energyProfile
    };
  }
}

export const harmonicCorrelationEngine = new HarmonicCorrelationEngine();