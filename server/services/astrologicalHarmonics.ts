/**
 * Astrological Harmonics Service
 * Correlates musical harmonics with astrological aspects and chart patterns
 * Uses existing Immanuel library data for authentic astrological correlations
 */

export interface AspectHarmonic {
  aspect: string;          // e.g., "trine", "square", "opposition"
  degrees: number;         // e.g., 120, 90, 180
  harmonicRatio: number;   // e.g., 1.5 (3:2), 1.333 (4:3), 2.0 (2:1)
  ratioString: string;     // e.g., "3:2", "4:3", "2:1"
  musicalInterval: string; // e.g., "Perfect Fifth", "Perfect Fourth", "Octave"
  harmonic: number;        // The harmonic number (2nd, 3rd, 4th, etc.)
  consonance: 'consonant' | 'dissonant' | 'neutral';
  energy: 'flowing' | 'dynamic' | 'stable' | 'tense';
}

export interface ChartHarmonic {
  fundamentalFrequency: number; // Base frequency for calculations
  aspectHarmonics: AspectHarmonic[];
  dominantHarmonics: number[];  // Most prominent harmonic numbers
  harmoniousAspects: string[];  // Flowing aspects (trines, sextiles)
  tensionAspects: string[];     // Dynamic aspects (squares, oppositions)
  elementalTones: {
    fire: number;    // Higher frequencies, energetic
    earth: number;   // Lower frequencies, grounded
    air: number;     // Mid-high frequencies, mental
    water: number;   // Mid-low frequencies, emotional
  };
}

export interface MusicHarmonic {
  fundamentalHz: number;
  harmonics: Array<{
    harmonic: number;      // 2nd, 3rd, 4th harmonic, etc.
    frequency: number;     // Actual frequency in Hz
    amplitude: number;     // Relative strength (0-1)
    ratio: number;         // Ratio to fundamental
    ratioString: string;   // "2:1", "3:2", etc.
  }>;
  dominantHarmonics: number[];
  musicalKey?: string;
  mode?: 'major' | 'minor' | 'modal';
}

export interface HarmonicCorrelation {
  aspectMatch: AspectHarmonic;
  musicHarmonic: {
    harmonic: number;
    frequency: number;
    amplitude: number;
    ratio: number;
  };
  matchStrength: number;     // 0-1, how close the correlation is
  resonanceType: 'exact' | 'overtone' | 'undertone' | 'composite';
  explanation: string;       // Human-readable explanation
}

export class AstrologicalHarmonicsService {
  
  // Map astrological aspects to their harmonic equivalents
  private static readonly ASPECT_HARMONICS: AspectHarmonic[] = [
    {
      aspect: 'conjunction',
      degrees: 0,
      harmonicRatio: 1.0,
      ratioString: '1:1',
      musicalInterval: 'Unison',
      harmonic: 1,
      consonance: 'consonant',
      energy: 'stable'
    },
    {
      aspect: 'sextile',
      degrees: 60,
      harmonicRatio: 1.667, // 5:3
      ratioString: '5:3',
      musicalInterval: 'Major Sixth',
      harmonic: 5,
      consonance: 'consonant',
      energy: 'flowing'
    },
    {
      aspect: 'square',
      degrees: 90,
      harmonicRatio: 1.333, // 4:3
      ratioString: '4:3',
      musicalInterval: 'Perfect Fourth',
      harmonic: 4,
      consonance: 'dissonant',
      energy: 'dynamic'
    },
    {
      aspect: 'trine',
      degrees: 120,
      harmonicRatio: 1.5, // 3:2
      ratioString: '3:2',
      musicalInterval: 'Perfect Fifth',
      harmonic: 3,
      consonance: 'consonant',
      energy: 'flowing'
    },
    {
      aspect: 'opposition',
      degrees: 180,
      harmonicRatio: 2.0, // 2:1
      ratioString: '2:1',
      musicalInterval: 'Octave',
      harmonic: 2,
      consonance: 'neutral',
      energy: 'tense'
    },
    {
      aspect: 'quincunx',
      degrees: 150,
      harmonicRatio: 1.875, // 15:8
      ratioString: '15:8',
      musicalInterval: 'Major Seventh',
      harmonic: 15,
      consonance: 'dissonant',
      energy: 'tense'
    }
  ];

  /**
   * Convert astrological chart data to harmonic profile
   */
  convertChartToHarmonics(chartData: any): ChartHarmonic {
    const aspectHarmonics: AspectHarmonic[] = [];
    const dominantHarmonics: number[] = [];
    const harmoniousAspects: string[] = [];
    const tensionAspects: string[] = [];

    // Process chart aspects
    if (chartData.aspects && Array.isArray(chartData.aspects)) {
      for (const aspect of chartData.aspects) {
        const aspectName = aspect.aspect?.toLowerCase();
        const aspectHarmonic = AstrologicalHarmonicsService.ASPECT_HARMONICS.find(
          ah => ah.aspect === aspectName
        );

        if (aspectHarmonic) {
          aspectHarmonics.push(aspectHarmonic);
          dominantHarmonics.push(aspectHarmonic.harmonic);

          // Classify aspect energy
          if (aspectHarmonic.energy === 'flowing') {
            harmoniousAspects.push(aspectName);
          } else if (aspectHarmonic.energy === 'dynamic' || aspectHarmonic.energy === 'tense') {
            tensionAspects.push(aspectName);
          }
        }
      }
    }

    // Calculate elemental tone frequencies based on element balance
    const elementBalance = chartData.elementBalance || { fire: 0, earth: 0, air: 0, water: 0 };
    const elementalTones = this.calculateElementalTones(elementBalance);

    return {
      fundamentalFrequency: 256, // C4 as base frequency
      aspectHarmonics,
      dominantHarmonics: [...new Set(dominantHarmonics)].sort((a, b) => a - b),
      harmoniousAspects: [...new Set(harmoniousAspects)],
      tensionAspects: [...new Set(tensionAspects)],
      elementalTones
    };
  }

  /**
   * Calculate frequencies for each element based on astrological principles
   */
  private calculateElementalTones(elementBalance: any): ChartHarmonic['elementalTones'] {
    const baseFreq = 256; // C4

    return {
      fire: baseFreq * 2,      // Higher octave - energetic, active
      earth: baseFreq * 0.5,   // Lower octave - grounded, stable  
      air: baseFreq * 1.5,     // Perfect fifth - mental, communicative
      water: baseFreq * 0.75   // Perfect fourth down - emotional, intuitive
    };
  }

  /**
   * Correlate musical harmonics with astrological chart harmonics
   */
  correlateHarmonics(chartHarmonics: ChartHarmonic, musicHarmonics: MusicHarmonic): HarmonicCorrelation[] {
    const correlations: HarmonicCorrelation[] = [];
    const tolerance = 0.05; // 5% tolerance for harmonic matching

    // Check each chart aspect against music harmonics
    for (const aspectHarmonic of chartHarmonics.aspectHarmonics) {
      for (const musicHarmonic of musicHarmonics.harmonics) {
        const ratioMatch = Math.abs(aspectHarmonic.harmonicRatio - musicHarmonic.ratio);
        
        if (ratioMatch <= tolerance) {
          // Found a correlation!
          const matchStrength = 1 - (ratioMatch / tolerance);
          
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

    // Sort by match strength (strongest first)
    return correlations.sort((a, b) => b.matchStrength - a.matchStrength);
  }

  /**
   * Determine the type of harmonic resonance
   */
  private determineResonanceType(ratioMatch: number, harmonic: number): HarmonicCorrelation['resonanceType'] {
    if (ratioMatch < 0.01) return 'exact';
    if (harmonic <= 4) return 'overtone';
    if (harmonic > 8) return 'composite';
    return 'undertone';
  }

  /**
   * Generate human-readable explanation of the correlation
   */
  private generateCorrelationExplanation(
    aspectHarmonic: AspectHarmonic, 
    musicHarmonic: any, 
    matchStrength: number
  ): string {
    const strength = matchStrength > 0.9 ? 'strong' : matchStrength > 0.7 ? 'moderate' : 'subtle';
    
    return `The ${aspectHarmonic.aspect} aspect (${aspectHarmonic.musicalInterval}) creates a ${strength} resonance with the ${musicHarmonic.harmonic}${this.getOrdinalSuffix(musicHarmonic.harmonic)} harmonic in this song. This ${aspectHarmonic.ratioString} ratio embodies ${aspectHarmonic.energy} energy, reflecting the cosmic pattern in musical form.`;
  }

  /**
   * Get ordinal suffix for harmonic numbers (1st, 2nd, 3rd, etc.)
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

  /**
   * Analyze a song's harmonic content and return MusicHarmonic data
   * This method will be implemented with Meyda.js for actual audio analysis
   */
  async analyzeAudioHarmonics(audioBuffer: ArrayBuffer): Promise<MusicHarmonic> {
    // Placeholder - will implement with Meyda.js in next step
    return {
      fundamentalHz: 261.63, // C4
      harmonics: [
        { harmonic: 1, frequency: 261.63, amplitude: 1.0, ratio: 1.0, ratioString: '1:1' },
        { harmonic: 2, frequency: 523.25, amplitude: 0.5, ratio: 2.0, ratioString: '2:1' },
        { harmonic: 3, frequency: 392.44, amplitude: 0.3, ratio: 1.5, ratioString: '3:2' },
        { harmonic: 4, frequency: 349.23, amplitude: 0.2, ratio: 1.333, ratioString: '4:3' }
      ],
      dominantHarmonics: [1, 2, 3],
      musicalKey: 'C',
      mode: 'major'
    };
  }

  /**
   * Get harmonic correlation strength for a song based on chart data
   */
  async getHarmonicCorrelationScore(chartData: any, audioBuffer?: ArrayBuffer): Promise<{
    overallScore: number;
    correlations: HarmonicCorrelation[];
    chartHarmonics: ChartHarmonic;
    musicHarmonics?: MusicHarmonic;
    insights: string[];
  }> {
    const chartHarmonics = this.convertChartToHarmonics(chartData);
    
    if (!audioBuffer) {
      // Return chart-based insights without audio analysis
      return {
        overallScore: 0.5, // Neutral score without audio
        correlations: [],
        chartHarmonics,
        insights: this.generateChartInsights(chartHarmonics)
      };
    }

    const musicHarmonics = await this.analyzeAudioHarmonics(audioBuffer);
    const correlations = this.correlateHarmonics(chartHarmonics, musicHarmonics);
    
    // Calculate overall score based on correlation strength and count
    const overallScore = correlations.length > 0 
      ? correlations.reduce((sum, corr) => sum + corr.matchStrength, 0) / correlations.length 
      : 0;

    return {
      overallScore,
      correlations,
      chartHarmonics,
      musicHarmonics,
      insights: this.generateCorrelationInsights(correlations, chartHarmonics)
    };
  }

  /**
   * Generate insights based on chart harmonic patterns
   */
  private generateChartInsights(chartHarmonics: ChartHarmonic): string[] {
    const insights: string[] = [];

    if (chartHarmonics.harmoniousAspects.length > chartHarmonics.tensionAspects.length) {
      insights.push("Your chart favors harmonious flowing energy - look for songs with consonant intervals and smooth melodic lines.");
    } else if (chartHarmonics.tensionAspects.length > chartHarmonics.harmoniousAspects.length) {
      insights.push("Your chart has dynamic tension - music with complex rhythms and dissonant intervals may resonate strongly.");
    }

    if (chartHarmonics.dominantHarmonics.includes(3)) {
      insights.push("The perfect fifth (3:2 ratio) appears in your chart - music featuring strong fifths will feel especially resonant.");
    }

    if (chartHarmonics.dominantHarmonics.includes(2)) {
      insights.push("Octave relationships (2:1 ratio) are prominent - songs with clear octave intervals reflect your cosmic pattern.");
    }

    return insights;
  }

  /**
   * Generate insights based on actual harmonic correlations
   */
  private generateCorrelationInsights(correlations: HarmonicCorrelation[], chartHarmonics: ChartHarmonic): string[] {
    const insights: string[] = [];

    if (correlations.length === 0) {
      insights.push("This song doesn't show strong harmonic correlations with your chart - it may offer fresh perspectives or new energy patterns.");
    } else {
      const strongMatches = correlations.filter(c => c.matchStrength > 0.8);
      if (strongMatches.length > 0) {
        insights.push(`Found ${strongMatches.length} strong harmonic resonance${strongMatches.length === 1 ? '' : 's'} with your astrological aspects.`);
      }
    }

    return insights;
  }
}

// Export singleton instance
export const astrologicalHarmonicsService = new AstrologicalHarmonicsService();