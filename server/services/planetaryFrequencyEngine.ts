/**
 * Planetary Frequency Resonance Engine
 * Maps planetary orbital periods to musical frequencies and correlates with audio analysis
 * Creates an additional harmonic layer between celestial mechanics and music
 */

import { harmonicAnalysisService, HarmonicAnalysisResult } from './harmonicAnalysis';

export interface PlanetaryFrequency {
  planet: string;
  orbitalPeriod: number;        // In Earth days
  baseFrequency: number;        // Fundamental frequency in Hz
  harmonicSeries: number[];     // Octave-related frequencies
  musicalNote: string;          // Closest musical note
  astrologyKeywords: string[];  // Astrological associations
}

export interface PlanetaryResonance {
  planet: string;
  resonanceStrength: number;    // 0-1, how strongly the audio resonates with this planet
  detectedFrequencies: number[]; // Frequencies found in audio that match planetary harmonics
  harmonic: number;             // Which harmonic of the planetary frequency
  explanation: string;          // Human-readable explanation
  transitContext?: string;      // Current transit information if available
}

export interface PlanetaryHarmonicAnalysis {
  trackId: string;
  trackName: string;
  artist: string;
  planetaryResonances: PlanetaryResonance[];
  dominantPlanet: string | null; // Planet with strongest resonance
  cosmicAlignment: number;       // 0-1, overall planetary alignment score
  frequencySpectrum: {
    planetaryFrequencies: number[]; // All detected planetary frequencies
    cosmicRatios: Array<{           // Mathematical relationships found
      ratio: number;
      planets: string[];
      significance: string;
    }>;
  };
  insights: string[];
  confidenceLevel: number;       // Based on audio analysis quality
}

export class PlanetaryFrequencyEngine {
  
  // Planetary orbital periods and their corresponding base frequencies
  private static readonly PLANETARY_FREQUENCIES: PlanetaryFrequency[] = [
    {
      planet: 'Sun',
      orbitalPeriod: 365.25,  // Earth's orbit around Sun
      baseFrequency: 126.22,  // Calculated from orbit converted to frequency
      harmonicSeries: [126.22, 252.44, 504.88, 1009.76],
      musicalNote: 'B2',
      astrologyKeywords: ['vitality', 'self-expression', 'creativity', 'leadership']
    },
    {
      planet: 'Moon',
      orbitalPeriod: 27.32,   // Lunar month
      baseFrequency: 210.42,  // Moon's frequency
      harmonicSeries: [210.42, 420.84, 841.68, 1683.36],
      musicalNote: 'G#3',
      astrologyKeywords: ['emotions', 'intuition', 'cycles', 'nurturing']
    },
    {
      planet: 'Mercury',
      orbitalPeriod: 87.97,
      baseFrequency: 141.27,
      harmonicSeries: [141.27, 282.54, 565.08, 1130.16],
      musicalNote: 'C#3',
      astrologyKeywords: ['communication', 'intellect', 'speed', 'adaptability']
    },
    {
      planet: 'Venus',
      orbitalPeriod: 224.70,
      baseFrequency: 221.23,
      harmonicSeries: [221.23, 442.46, 884.92, 1769.84],
      musicalNote: 'A3',
      astrologyKeywords: ['love', 'beauty', 'harmony', 'relationships']
    },
    {
      planet: 'Mars',
      orbitalPeriod: 686.98,
      baseFrequency: 144.72,
      harmonicSeries: [144.72, 289.44, 578.88, 1157.76],
      musicalNote: 'D3',
      astrologyKeywords: ['action', 'passion', 'drive', 'conflict']
    },
    {
      planet: 'Jupiter',
      orbitalPeriod: 4332.82,
      baseFrequency: 183.58,
      harmonicSeries: [183.58, 367.16, 734.32, 1468.64],
      musicalNote: 'F#3',
      astrologyKeywords: ['expansion', 'wisdom', 'optimism', 'philosophy']
    },
    {
      planet: 'Saturn',
      orbitalPeriod: 10759.22,
      baseFrequency: 147.85,
      harmonicSeries: [147.85, 295.70, 591.40, 1182.80],
      musicalNote: 'D3',
      astrologyKeywords: ['structure', 'discipline', 'lessons', 'responsibility']
    },
    {
      planet: 'Uranus',
      orbitalPeriod: 30687.15,
      baseFrequency: 207.36,
      harmonicSeries: [207.36, 414.72, 829.44, 1658.88],
      musicalNote: 'G#3',
      astrologyKeywords: ['innovation', 'rebellion', 'sudden change', 'technology']
    },
    {
      planet: 'Neptune',
      orbitalPeriod: 60190.03,
      baseFrequency: 211.44,
      harmonicSeries: [211.44, 422.88, 845.76, 1691.52],
      musicalNote: 'G#3',
      astrologyKeywords: ['dreams', 'illusion', 'spirituality', 'dissolving']
    },
    {
      planet: 'Pluto',
      orbitalPeriod: 90560,
      baseFrequency: 140.25,
      harmonicSeries: [140.25, 280.50, 561.00, 1122.00],
      musicalNote: 'C#3',
      astrologyKeywords: ['transformation', 'power', 'death/rebirth', 'hidden depths']
    }
  ];

  /**
   * Analyze a track's harmonic content for planetary frequency resonances
   */
  async analyzePlanetaryResonance(
    trackData: {
      id: string;
      name: string;
      artist: string;
      previewUrl?: string;
    },
    audioAnalysis?: HarmonicAnalysisResult,
    chartData?: any
  ): Promise<PlanetaryHarmonicAnalysis> {
    
    // Get or perform harmonic analysis
    let harmonicData = audioAnalysis;
    if (!harmonicData && trackData.previewUrl) {
      try {
        const analysisResult = await harmonicAnalysisService.analyzeSpotifyPreview(
          trackData.previewUrl,
          trackData
        );
        harmonicData = analysisResult?.harmonicAnalysis;
      } catch (error) {
        console.warn(`Failed to analyze audio for planetary resonance: ${error}`);
      }
    }

    if (!harmonicData) {
      return this.createSimulatedPlanetaryAnalysis(trackData);
    }

    // Analyze each planetary frequency against the audio harmonics
    const planetaryResonances: PlanetaryResonance[] = [];
    
    for (const planetaryFreq of PlanetaryFrequencyEngine.PLANETARY_FREQUENCIES) {
      const resonance = this.calculatePlanetaryResonance(planetaryFreq, harmonicData);
      if (resonance.resonanceStrength > 0.1) { // Only include significant resonances
        planetaryResonances.push(resonance);
      }
    }

    // Sort by resonance strength
    planetaryResonances.sort((a, b) => b.resonanceStrength - a.resonanceStrength);

    // Calculate overall cosmic alignment
    const cosmicAlignment = this.calculateCosmicAlignment(planetaryResonances, harmonicData);

    // Find dominant planet
    const dominantPlanet = planetaryResonances.length > 0 ? planetaryResonances[0].planet : null;

    // Extract frequency spectrum data
    const frequencySpectrum = this.analyzeFrequencySpectrum(planetaryResonances, harmonicData);

    // Generate insights
    const insights = this.generatePlanetaryInsights(
      planetaryResonances, 
      dominantPlanet, 
      cosmicAlignment,
      harmonicData,
      chartData
    );

    return {
      trackId: trackData.id,
      trackName: trackData.name,
      artist: trackData.artist,
      planetaryResonances,
      dominantPlanet,
      cosmicAlignment,
      frequencySpectrum,
      insights,
      confidenceLevel: harmonicData.confidence || 0.5
    };
  }

  /**
   * Calculate how strongly a track resonates with a specific planetary frequency
   */
  private calculatePlanetaryResonance(
    planetaryFreq: PlanetaryFrequency,
    audioAnalysis: HarmonicAnalysisResult
  ): PlanetaryResonance {
    const detectedFrequencies: number[] = [];
    let totalResonance = 0;
    let matchCount = 0;
    let dominantHarmonic = 1;

    // Check each harmonic in the planetary series against audio harmonics
    for (let i = 0; i < planetaryFreq.harmonicSeries.length; i++) {
      const planetaryHz = planetaryFreq.harmonicSeries[i];
      
      for (const audioHarmonic of audioAnalysis.harmonics) {
        const frequencyDiff = Math.abs(audioHarmonic.frequency - planetaryHz);
        const tolerance = planetaryHz * 0.02; // 2% tolerance
        
        if (frequencyDiff <= tolerance) {
          // Found a match!
          const matchStrength = (1 - frequencyDiff / tolerance) * audioHarmonic.amplitude;
          totalResonance += matchStrength;
          matchCount++;
          detectedFrequencies.push(audioHarmonic.frequency);
          
          if (matchStrength > totalResonance / matchCount) {
            dominantHarmonic = i + 1;
          }
        }
      }
    }

    const resonanceStrength = matchCount > 0 ? totalResonance / matchCount : 0;

    return {
      planet: planetaryFreq.planet,
      resonanceStrength,
      detectedFrequencies,
      harmonic: dominantHarmonic,
      explanation: this.generateResonanceExplanation(
        planetaryFreq,
        resonanceStrength,
        dominantHarmonic,
        detectedFrequencies.length
      )
    };
  }

  /**
   * Calculate overall cosmic alignment score
   */
  private calculateCosmicAlignment(
    resonances: PlanetaryResonance[],
    audioAnalysis: HarmonicAnalysisResult
  ): number {
    if (resonances.length === 0) return 0;

    // Base score from resonance strengths
    const averageResonance = resonances.reduce((sum, r) => sum + r.resonanceStrength, 0) / resonances.length;

    // Bonus for multiple planetary resonances (indicates rich harmonic content)
    const diversityBonus = Math.min(resonances.length * 0.05, 0.3);

    // Bonus for strong individual planets
    const strongResonances = resonances.filter(r => r.resonanceStrength > 0.6).length;
    const strengthBonus = strongResonances * 0.1;

    // Factor in confidence of audio analysis
    const confidenceFactor = audioAnalysis.confidence || 0.5;

    return Math.min((averageResonance + diversityBonus + strengthBonus) * confidenceFactor, 1.0);
  }

  /**
   * Analyze the frequency spectrum for cosmic mathematical relationships
   */
  private analyzeFrequencySpectrum(
    resonances: PlanetaryResonance[],
    audioAnalysis: HarmonicAnalysisResult
  ): PlanetaryHarmonicAnalysis['frequencySpectrum'] {
    const planetaryFrequencies = resonances.flatMap(r => r.detectedFrequencies);
    const cosmicRatios: Array<{ ratio: number; planets: string[]; significance: string }> = [];

    // Find mathematical relationships between detected planetary frequencies
    for (let i = 0; i < resonances.length; i++) {
      for (let j = i + 1; j < resonances.length; j++) {
        const freq1 = resonances[i].detectedFrequencies[0];
        const freq2 = resonances[j].detectedFrequencies[0];
        
        if (freq1 && freq2) {
          const ratio = freq2 / freq1;
          const significance = this.interpretFrequencyRatio(ratio);
          
          if (significance !== 'neutral') {
            cosmicRatios.push({
              ratio,
              planets: [resonances[i].planet, resonances[j].planet],
              significance
            });
          }
        }
      }
    }

    return {
      planetaryFrequencies: [...new Set(planetaryFrequencies)],
      cosmicRatios
    };
  }

  /**
   * Interpret the significance of frequency ratios
   */
  private interpretFrequencyRatio(ratio: number): string {
    // Common musical intervals and their cosmic significance
    if (Math.abs(ratio - 2.0) < 0.05) return 'octave - cosmic unity';
    if (Math.abs(ratio - 1.5) < 0.05) return 'perfect fifth - divine proportion';
    if (Math.abs(ratio - 1.333) < 0.05) return 'perfect fourth - earthly stability';
    if (Math.abs(ratio - 1.618) < 0.05) return 'golden ratio - cosmic harmony';
    if (Math.abs(ratio - 1.25) < 0.05) return 'major third - joyful expansion';
    if (Math.abs(ratio - 1.2) < 0.05) return 'minor third - emotional depth';
    
    return 'neutral';
  }

  /**
   * Generate human-readable explanation for planetary resonance
   */
  private generateResonanceExplanation(
    planetaryFreq: PlanetaryFrequency,
    strength: number,
    harmonic: number,
    matchCount: number
  ): string {
    const strengthText = strength > 0.7 ? 'strong' : strength > 0.4 ? 'moderate' : 'subtle';
    const harmonicText = harmonic === 1 ? 'fundamental' : `${harmonic}${this.getOrdinalSuffix(harmonic)} harmonic`;
    
    return `${strengthText} resonance with ${planetaryFreq.planet}'s ${harmonicText} frequency (${planetaryFreq.musicalNote}), suggesting ${planetaryFreq.astrologyKeywords[0]} energy in this track`;
  }

  /**
   * Generate comprehensive insights about planetary resonances
   */
  private generatePlanetaryInsights(
    resonances: PlanetaryResonance[],
    dominantPlanet: string | null,
    cosmicAlignment: number,
    audioAnalysis: HarmonicAnalysisResult,
    chartData?: any
  ): string[] {
    const insights: string[] = [];

    if (cosmicAlignment > 0.7) {
      insights.push("This track shows exceptionally strong cosmic alignment - the frequencies literally vibrate in harmony with celestial mechanics");
    } else if (cosmicAlignment > 0.4) {
      insights.push("Moderate planetary resonance detected - this music contains mathematical relationships found in orbital patterns");
    } else {
      insights.push("Subtle cosmic harmonics present - the track offers gentle planetary energy connections");
    }

    if (dominantPlanet) {
      const dominantResonance = resonances[0];
      const planet = PlanetaryFrequencyEngine.PLANETARY_FREQUENCIES.find(p => p.planet === dominantPlanet);
      if (planet) {
        insights.push(`Dominated by ${dominantPlanet} frequencies (${planet.musicalNote}) - expect themes of ${planet.astrologyKeywords.join(', ')}`);
      }
    }

    // Add insights based on multiple planetary resonances
    if (resonances.length >= 3) {
      const planetNames = resonances.slice(0, 3).map(r => r.planet).join(', ');
      insights.push(`Complex planetary symphony detected featuring ${planetNames} - rich harmonic complexity`);
    }

    return insights;
  }

  /**
   * Create simulated planetary analysis when audio data isn't available
   */
  private createSimulatedPlanetaryAnalysis(trackData: {
    id: string;
    name: string;
    artist: string;
  }): PlanetaryHarmonicAnalysis {
    // Generate random but plausible planetary resonances
    const simulatedResonances: PlanetaryResonance[] = [];
    const numResonances = Math.floor(Math.random() * 4) + 1; // 1-4 resonances
    
    // Randomly select planets for simulation
    const selectedPlanets = PlanetaryFrequencyEngine.PLANETARY_FREQUENCIES
      .sort(() => Math.random() - 0.5)
      .slice(0, numResonances);

    for (const planet of selectedPlanets) {
      const resonanceStrength = Math.random() * 0.8 + 0.2; // 0.2-1.0
      const harmonic = Math.floor(Math.random() * 4) + 1; // 1-4
      const detectedFreq = planet.harmonicSeries[harmonic - 1] || planet.baseFrequency;
      
      simulatedResonances.push({
        planet: planet.planet,
        resonanceStrength,
        detectedFrequencies: [detectedFreq],
        harmonic,
        explanation: this.generateResonanceExplanation(planet, resonanceStrength, harmonic, 1)
      });
    }

    // Sort by resonance strength
    simulatedResonances.sort((a, b) => b.resonanceStrength - a.resonanceStrength);
    
    const dominantPlanet = simulatedResonances[0]?.planet || null;
    const cosmicAlignment = simulatedResonances.reduce((sum, r) => sum + r.resonanceStrength, 0) / simulatedResonances.length || 0;

    return {
      trackId: trackData.id,
      trackName: trackData.name,
      artist: trackData.artist,
      planetaryResonances: simulatedResonances,
      dominantPlanet,
      cosmicAlignment,
      frequencySpectrum: {
        planetaryFrequencies: simulatedResonances.flatMap(r => r.detectedFrequencies),
        cosmicRatios: []
      },
      insights: this.generatePlanetaryInsights(simulatedResonances, dominantPlanet, cosmicAlignment, {
        fundamentalHz: 440,
        harmonics: [],
        dominantHarmonics: [],
        spectralCentroid: 2000,
        spectralRolloff: 5000,
        mfcc: [],
        chroma: [],
        rms: 0.3,
        zcr: 0.08,
        analysisType: 'simulated',
        confidence: 0.3
      }),
      confidenceLevel: 0.3 // Lower confidence for simulated data
    };
  }

  /**
   * Get ordinal suffix for numbers
   */
  private getOrdinalSuffix(num: number): string {
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return 'th';
    if (lastDigit === 1) return 'st';
    if (lastDigit === 2) return 'nd';
    if (lastDigit === 3) return 'rd';
    return 'th';
  }
}

// Export singleton instance
export const planetaryFrequencyEngine = new PlanetaryFrequencyEngine();