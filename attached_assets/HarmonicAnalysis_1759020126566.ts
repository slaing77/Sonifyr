/**
 * Harmonic Analysis Service
 * Extracts harmonic content from audio using Meyda.js for correlation with astrological aspects
 */

// @ts-ignore - Meyda doesn't have perfect TypeScript definitions
import Meyda from 'meyda';

export interface AudioHarmonic {
  harmonic: number;      // 1st, 2nd, 3rd harmonic, etc.
  frequency: number;     // Actual frequency in Hz
  amplitude: number;     // Relative strength (0-1)
  ratio: number;         // Ratio to fundamental frequency
  ratioString: string;   // "2:1", "3:2", etc.
}

export interface HarmonicAnalysisResult {
  fundamentalHz: number;
  harmonics: AudioHarmonic[];
  dominantHarmonics: number[];
  spectralCentroid: number;    // Brightness measure
  spectralRolloff: number;     // Energy distribution
  mfcc: number[];              // Mel-frequency cepstral coefficients
  chroma: number[];            // Pitch class profile
  rms: number;                 // Root mean square energy
  zcr: number;                 // Zero crossing rate
  musicalKey?: string;
  tempo?: number;
  analysisType: 'full_audio' | 'audio_features' | 'simulated'; // Analysis source
  confidence: number;          // 0-1, confidence in the analysis
}

export interface SpotifyTrackAnalysis {
  previewUrl: string;
  trackId: string;
  name: string;
  artist: string;
  harmonicAnalysis: HarmonicAnalysisResult;
  processingTime: number;
}

export class HarmonicAnalysisService {
  private readonly SAMPLE_RATE = 44100;
  private readonly FRAME_SIZE = 1024;
  private readonly HOP_SIZE = 512;

  /**
   * Analyze harmonic content from a local audio file
   */
  async analyzeLocalFile(filePath: string, filename: string): Promise<HarmonicAnalysisResult | null> {
    try {
      // Load audio file using Node.js file system
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Check if file exists
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      if (!exists) {
        console.warn(`Audio file not found: ${filePath}`);
        return null;
      }

      // For now, we'll simulate the analysis since we need Web Audio API
      // In a real implementation, you'd use a Node.js audio processing library
      // like 'node-web-audio-api' or 'wav-decoder'
      
      console.log(`Analyzing local audio file: ${filename}`);
      
      // Simulate harmonic analysis with realistic but fake data
      const simulatedAnalysis: HarmonicAnalysisResult = {
        fundamentalHz: 220 + Math.random() * 880, // Random fundamental between 220-1100 Hz
        harmonics: this.generateSimulatedHarmonics(),
        dominantHarmonics: [1, 2, 3, 5], // Common strong harmonics
        spectralCentroid: Math.random() * 4000 + 1000, // 1000-5000 Hz
        spectralRolloff: Math.random() * 8000 + 2000,  // 2000-10000 Hz
        mfcc: Array.from({length: 13}, () => Math.random() * 2 - 1), // MFCC coefficients
        chroma: Array.from({length: 12}, () => Math.random()), // Chroma vector
        rms: Math.random() * 0.5 + 0.1, // Energy level
        zcr: Math.random() * 0.1 + 0.05, // Zero crossing rate
        musicalKey: this.estimateMusicalKey(),
        tempo: Math.floor(Math.random() * 60) + 80, // 80-140 BPM
        analysisType: 'simulated',
        confidence: 0.3
      };

      return simulatedAnalysis;
    } catch (error) {
      console.error(`Error analyzing local audio file ${filename}:`, error);
      return null;
    }
  }

  /**
   * Generate simulated harmonic data for demo purposes
   */
  private generateSimulatedHarmonics(): AudioHarmonic[] {
    const harmonics: AudioHarmonic[] = [];
    const fundamentalHz = 220 + Math.random() * 440; // Random fundamental
    
    for (let i = 1; i <= 8; i++) {
      const frequency = fundamentalHz * i;
      const amplitude = Math.max(0.1, 1.0 / i * (0.5 + Math.random() * 0.5)); // Decreasing amplitude with some randomness
      
      harmonics.push({
        harmonic: i,
        frequency,
        amplitude,
        ratio: i,
        ratioString: `${i}:1`
      });
    }
    
    return harmonics;
  }

  /**
   * Estimate musical key from harmonic analysis
   */
  private estimateMusicalKey(): string {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const modes = ['major', 'minor'];
    const key = keys[Math.floor(Math.random() * keys.length)];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    return `${key} ${mode}`;
  }

  /**
   * Create synthetic harmonic analysis from Spotify audio features
   */
  async analyzeFromAudioFeatures(audioFeatures: any, trackData: {
    id: string;
    name: string;
    artist: string;
  }): Promise<SpotifyTrackAnalysis | null> {
    const startTime = Date.now();

    try {
      console.log(`Creating synthetic harmonic analysis for ${trackData.name} from audio features`);
      
      const harmonicAnalysis = this.createSyntheticHarmonics(audioFeatures);
      
      return {
        previewUrl: '', // No preview URL for audio features analysis
        trackId: trackData.id,
        name: trackData.name,
        artist: trackData.artist,
        harmonicAnalysis,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error(`Error creating synthetic analysis for ${trackData.name}:`, error);
      return null;
    }
  }

  /**
   * Generate synthetic harmonics from Spotify audio features
   */
  private createSyntheticHarmonics(audioFeatures: any): HarmonicAnalysisResult {
    // Map audio features to harmonic characteristics
    const energy = audioFeatures.energy || 0.5;
    const valence = audioFeatures.valence || 0.5;
    const danceability = audioFeatures.danceability || 0.5;
    const acousticness = audioFeatures.acousticness || 0.5;
    const instrumentalness = audioFeatures.instrumentalness || 0.1;
    const tempo = audioFeatures.tempo || 120;
    const key = audioFeatures.key || 0; // 0-11 Spotify key notation
    const mode = audioFeatures.mode || 1; // 0=minor, 1=major
    const loudness = audioFeatures.loudness || -10; // dB

    // Generate fundamental frequency from key and energy
    const keyFrequencies = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88]; // C4 to B4
    const fundamentalHz = keyFrequencies[key] * (0.8 + energy * 0.4); // Vary with energy

    // Create harmonics based on audio features
    const harmonics: AudioHarmonic[] = [];
    
    // Fundamental (always present)
    harmonics.push({
      harmonic: 1,
      frequency: fundamentalHz,
      amplitude: 1.0,
      ratio: 1.0,
      ratioString: '1:1'
    });

    // 2nd harmonic (octave) - stronger in energetic tracks
    const secondAmplitude = 0.3 + energy * 0.4;
    harmonics.push({
      harmonic: 2,
      frequency: fundamentalHz * 2,
      amplitude: secondAmplitude,
      ratio: 2.0,
      ratioString: '2:1'
    });

    // 3rd harmonic (perfect fifth) - stronger in major keys and high valence
    const thirdAmplitude = 0.2 + (mode * 0.2) + (valence * 0.3);
    harmonics.push({
      harmonic: 3,
      frequency: fundamentalHz * 3,
      amplitude: thirdAmplitude,
      ratio: 3.0,
      ratioString: '3:1'
    });

    // 4th harmonic (two octaves) - varies with danceability
    const fourthAmplitude = 0.15 + danceability * 0.25;
    harmonics.push({
      harmonic: 4,
      frequency: fundamentalHz * 4,
      amplitude: fourthAmplitude,
      ratio: 4.0,
      ratioString: '4:1'
    });

    // 5th harmonic (major third above second octave) - relates to valence
    const fifthAmplitude = 0.1 + valence * 0.2;
    harmonics.push({
      harmonic: 5,
      frequency: fundamentalHz * 5,
      amplitude: fifthAmplitude,
      ratio: 5.0,
      ratioString: '5:1'
    });

    // Higher harmonics for non-acoustic tracks
    if (acousticness < 0.6) {
      for (let i = 6; i <= 8; i++) {
        const amplitude = Math.max(0.05, (1 - acousticness) * 0.15 * (1 / i));
        harmonics.push({
          harmonic: i,
          frequency: fundamentalHz * i,
          amplitude,
          ratio: i,
          ratioString: `${i}:1`
        });
      }
    }

    // Calculate synthetic spectral features
    const spectralCentroid = fundamentalHz * (1 + energy * 2 + (1 - acousticness)); // Brightness estimate
    const spectralRolloff = spectralCentroid * (1.5 + energy); // Energy distribution estimate
    const rms = Math.sqrt(energy) * (0.1 + Math.pow(10, loudness / 20)); // Energy estimate from loudness
    const zcr = (1 - acousticness) * 0.1; // Zero crossing estimate

    // Create synthetic MFCC and chroma
    const mfcc = this.generateSyntheticMFCC(energy, acousticness, valence);
    const chroma = this.generateSyntheticChroma(key, mode, valence);

    // Determine dominant harmonics based on audio features
    const dominantHarmonics: number[] = [1]; // Fundamental always dominant
    
    if (energy > 0.6) dominantHarmonics.push(2); // Strong energy = strong octave
    if (valence > 0.6 && mode === 1) dominantHarmonics.push(3); // Happy major = strong fifth
    if (danceability > 0.7) dominantHarmonics.push(4); // Danceable = strong rhythmic harmonics
    if (energy > 0.8 && acousticness < 0.3) dominantHarmonics.push(5); // Electric energy

    // Estimate musical key
    const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const musicalKey = `${keyNames[key]} ${mode === 1 ? 'major' : 'minor'}`;

    // Calculate confidence based on feature completeness and source
    let confidence = 0.7; // Base confidence for real Spotify audio features
    if (audioFeatures._source === 'genre_estimate') confidence = 0.4;
    if (audioFeatures._source === 'default_estimate') confidence = 0.3;
    if (audioFeatures._source === 'spotify_api') confidence = 0.7;

    return {
      fundamentalHz,
      harmonics,
      dominantHarmonics,
      spectralCentroid,
      spectralRolloff,
      mfcc,
      chroma,
      rms,
      zcr,
      musicalKey,
      tempo,
      analysisType: 'audio_features',
      confidence
    };
  }

  /**
   * Generate synthetic MFCC coefficients from audio features
   */
  private generateSyntheticMFCC(energy: number, acousticness: number, valence: number): number[] {
    const mfcc: number[] = [];
    
    // MFCC 0 (energy-related)
    mfcc.push((energy - 0.5) * 2);
    
    // MFCC 1-3 (spectral shape, related to acousticness)
    for (let i = 1; i <= 3; i++) {
      mfcc.push((acousticness - 0.5) * (2 / i) + (Math.random() - 0.5) * 0.3);
    }
    
    // MFCC 4-6 (mid-range spectral features, related to valence)
    for (let i = 4; i <= 6; i++) {
      mfcc.push((valence - 0.5) * (1.5 / i) + (Math.random() - 0.5) * 0.4);
    }
    
    // MFCC 7-12 (higher order features, more random but constrained)
    for (let i = 7; i <= 12; i++) {
      mfcc.push((Math.random() - 0.5) * (1 / i));
    }
    
    return mfcc;
  }

  /**
   * Generate synthetic chroma vector from key and mode
   */
  private generateSyntheticChroma(key: number, mode: number, valence: number): number[] {
    const chroma = new Array(12).fill(0);
    
    // Major and minor key profiles
    const majorProfile = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];
    const minorProfile = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0];
    
    const profile = mode === 1 ? majorProfile : minorProfile;
    
    // Apply profile starting from the key
    for (let i = 0; i < 12; i++) {
      const chromaIndex = (i + key) % 12;
      chroma[chromaIndex] = profile[i] * (0.5 + valence * 0.5) + (Math.random() * 0.2);
    }
    
    return chroma;
  }

  /**
   * Analyze harmonic content from a Spotify preview URL with audio features fallback
   */
  async analyzeSpotifyPreview(previewUrl: string, trackData: {
    id: string;
    name: string;
    artist: string;
  }, options?: {
    spotifyService?: any;
    accessToken?: string;
  }): Promise<SpotifyTrackAnalysis | null> {
    const startTime = Date.now();

    try {
      // Try audio preview first if available
      if (previewUrl) {
        try {
          const audioBuffer = await this.fetchAudioBuffer(previewUrl);
          if (audioBuffer) {
            console.log(`Analyzing audio preview for: ${trackData.name}`);
            const harmonicAnalysis = await this.extractHarmonics(audioBuffer);
            harmonicAnalysis.analysisType = 'full_audio';
            harmonicAnalysis.confidence = 0.9;

            return {
              previewUrl,
              trackId: trackData.id,
              name: trackData.name,
              artist: trackData.artist,
              harmonicAnalysis,
              processingTime: Date.now() - startTime
            };
          }
        } catch (error) {
          console.warn(`Preview URL analysis failed for ${trackData.name}:`, error);
        }
      }

      // Fallback to audio features if preview fails or unavailable
      if (options?.spotifyService && options?.accessToken) {
        console.log(`Preview unavailable for ${trackData.name}, trying audio features fallback`);
        
        try {
          const audioFeatures = await options.spotifyService.getTrackAudioFeatures(
            options.accessToken,
            trackData.id,
            { 
              name: trackData.name, 
              artist: trackData.artist,
              genres: [] // Could be enhanced to pass genre info if available
            }
          );

          // Handle null response (403 or other API errors)
          if (audioFeatures) {
            console.log(`Audio features retrieved for ${trackData.name}, source: ${audioFeatures._source}`);
            return await this.analyzeFromAudioFeatures(audioFeatures, trackData);
          } else {
            console.warn(`Audio features returned null for ${trackData.name} - likely API restriction`);
          }
        } catch (error) {
          console.warn(`Audio features analysis failed for ${trackData.name}:`, error);
        }
      }

      // Final fallback - simulated analysis
      console.log(`No audio data available for ${trackData.name}, using simulated analysis`);
      const simulatedAnalysis = this.createSimulatedAnalysis(trackData);
      
      return {
        previewUrl: '',
        trackId: trackData.id,
        name: trackData.name,
        artist: trackData.artist,
        harmonicAnalysis: simulatedAnalysis,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error(`Error analyzing track ${trackData.name}:`, error);
      return null;
    }
  }

  /**
   * Create simulated analysis when no audio data is available
   */
  private createSimulatedAnalysis(trackData: { name: string; artist: string }): HarmonicAnalysisResult {
    const simulatedAnalysis = {
      fundamentalHz: 220 + Math.random() * 880,
      harmonics: this.generateSimulatedHarmonics(),
      dominantHarmonics: [1, 2, 3, 5],
      spectralCentroid: Math.random() * 4000 + 1000,
      spectralRolloff: Math.random() * 8000 + 2000,
      mfcc: Array.from({length: 13}, () => Math.random() * 2 - 1),
      chroma: Array.from({length: 12}, () => Math.random()),
      rms: Math.random() * 0.5 + 0.1,
      zcr: Math.random() * 0.1 + 0.05,
      musicalKey: this.estimateMusicalKey(),
      tempo: Math.floor(Math.random() * 60) + 80,
      analysisType: 'simulated' as const,
      confidence: 0.2,
      _source: 'simulation' // Mark as pure simulation
    };

    return simulatedAnalysis;
  }

  /**
   * Fetch audio buffer from URL (works with Spotify preview URLs)
   */
  private async fetchAudioBuffer(url: string): Promise<ArrayBuffer | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Validate that we got audio data
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Empty audio data received');
      }

      return arrayBuffer;

    } catch (error) {
      console.error('Error fetching audio buffer:', error);
      return null;
    }
  }

  /**
   * Extract harmonic content from audio buffer using Meyda.js
   */
  private async extractHarmonics(audioBuffer: ArrayBuffer): Promise<HarmonicAnalysisResult> {
    return new Promise((resolve, reject) => {
      try {
        // Convert ArrayBuffer to AudioBuffer using Web Audio API
        const audioContext = new AudioContext();
        
        audioContext.decodeAudioData(audioBuffer.slice(0))
          .then((decodedAudio) => {
            // Get the first channel for analysis
            const audioData = decodedAudio.getChannelData(0);
            
            // Configure Meyda for harmonic analysis
            Meyda.bufferSize = this.FRAME_SIZE;
            Meyda.sampleRate = decodedAudio.sampleRate;
            
            // Analyze multiple frames to get average values
            const numFrames = Math.floor((audioData.length - this.FRAME_SIZE) / this.HOP_SIZE);
            const results: any[] = [];
            
            for (let i = 0; i < numFrames; i++) {
              const start = i * this.HOP_SIZE;
              const end = start + this.FRAME_SIZE;
              const frame = audioData.slice(start, end);
              
              // Extract features from this frame
              const features = Meyda.extract([
                'spectralCentroid',
                'spectralRolloff', 
                'mfcc',
                'chroma',
                'rms',
                'zcr',
                'amplitudeSpectrum'
              ], frame);
              
              if (features && features.amplitudeSpectrum) {
                results.push(features);
              }
            }

            if (results.length === 0) {
              throw new Error('No valid frames extracted from audio');
            }

            // Average the results across all frames
            const avgFeatures = this.averageFeatures(results);
            
            // Extract harmonics from spectrum
            const harmonics = this.extractHarmonicsFromSpectrum(
              avgFeatures.amplitudeSpectrum, 
              decodedAudio.sampleRate
            );

            const result: HarmonicAnalysisResult = {
              fundamentalHz: harmonics.length > 0 ? harmonics[0].frequency : 440,
              harmonics,
              dominantHarmonics: this.findDominantHarmonics(harmonics),
              spectralCentroid: avgFeatures.spectralCentroid || 0,
              spectralRolloff: avgFeatures.spectralRolloff || 0,
              mfcc: avgFeatures.mfcc || [],
              chroma: avgFeatures.chroma || [],
              rms: avgFeatures.rms || 0,
              zcr: avgFeatures.zcr || 0,
              musicalKey: this.estimateKey(avgFeatures.chroma || []),
              tempo: this.estimateTempo(audioData, decodedAudio.sampleRate),
              analysisType: 'full_audio',
              confidence: 0.9
            };

            resolve(result);
          })
          .catch(reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Average feature values across multiple frames
   */
  private averageFeatures(results: any[]): any {
    const avgFeatures: any = {};
    const numResults = results.length;

    // Average scalar values
    avgFeatures.spectralCentroid = this.average(results.map(r => r.spectralCentroid).filter(v => v != null));
    avgFeatures.spectralRolloff = this.average(results.map(r => r.spectralRolloff).filter(v => v != null));
    avgFeatures.rms = this.average(results.map(r => r.rms).filter(v => v != null));
    avgFeatures.zcr = this.average(results.map(r => r.zcr).filter(v => v != null));

    // Average array values
    if (results[0].mfcc) {
      avgFeatures.mfcc = this.averageArrays(results.map(r => r.mfcc).filter(v => v != null));
    }
    if (results[0].chroma) {
      avgFeatures.chroma = this.averageArrays(results.map(r => r.chroma).filter(v => v != null));
    }
    if (results[0].amplitudeSpectrum) {
      avgFeatures.amplitudeSpectrum = this.averageArrays(results.map(r => r.amplitudeSpectrum).filter(v => v != null));
    }

    return avgFeatures;
  }

  /**
   * Extract harmonic peaks from amplitude spectrum
   */
  private extractHarmonicsFromSpectrum(spectrum: number[], sampleRate: number): AudioHarmonic[] {
    const harmonics: AudioHarmonic[] = [];
    const binWidth = sampleRate / (spectrum.length * 2); // Frequency per bin
    
    // Find fundamental frequency (strongest peak in lower frequencies)
    let fundamentalBin = 0;
    let maxAmplitude = 0;
    
    // Look for fundamental in range 80Hz - 1000Hz
    const minBin = Math.floor(80 / binWidth);
    const maxBin = Math.floor(1000 / binWidth);
    
    for (let i = minBin; i < Math.min(maxBin, spectrum.length); i++) {
      if (spectrum[i] > maxAmplitude) {
        maxAmplitude = spectrum[i];
        fundamentalBin = i;
      }
    }

    const fundamentalFreq = fundamentalBin * binWidth;
    
    if (fundamentalFreq > 0) {
      // Add fundamental
      harmonics.push({
        harmonic: 1,
        frequency: fundamentalFreq,
        amplitude: 1.0, // Normalize to 1.0
        ratio: 1.0,
        ratioString: '1:1'
      });

      // Look for integer multiples (harmonics)
      for (let harmonic = 2; harmonic <= 16; harmonic++) {
        const expectedFreq = fundamentalFreq * harmonic;
        const expectedBin = Math.round(expectedFreq / binWidth);
        
        if (expectedBin < spectrum.length) {
          // Look for peak in small window around expected frequency
          const windowSize = 3;
          let peakBin = expectedBin;
          let peakAmplitude = spectrum[expectedBin];
          
          for (let offset = -windowSize; offset <= windowSize; offset++) {
            const checkBin = expectedBin + offset;
            if (checkBin >= 0 && checkBin < spectrum.length && spectrum[checkBin] > peakAmplitude) {
              peakAmplitude = spectrum[checkBin];
              peakBin = checkBin;
            }
          }

          // Only include if amplitude is significant
          const relativeAmplitude = peakAmplitude / maxAmplitude;
          if (relativeAmplitude > 0.1) { // At least 10% of fundamental
            const actualFreq = peakBin * binWidth;
            const ratio = actualFreq / fundamentalFreq;
            
            harmonics.push({
              harmonic,
              frequency: actualFreq,
              amplitude: relativeAmplitude,
              ratio,
              ratioString: this.formatRatio(ratio)
            });
          }
        }
      }
    }

    return harmonics;
  }

  /**
   * Find the most prominent harmonics by amplitude
   */
  private findDominantHarmonics(harmonics: AudioHarmonic[]): number[] {
    return harmonics
      .filter(h => h.amplitude > 0.2) // Significant amplitude
      .sort((a, b) => b.amplitude - a.amplitude)
      .slice(0, 5) // Top 5
      .map(h => h.harmonic);
  }

  /**
   * Estimate musical key from chroma features
   */
  private estimateKey(chroma: number[]): string | undefined {
    if (!chroma || chroma.length !== 12) return undefined;

    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let maxCorrelation = 0;
    let estimatedKey = 'C';

    // Major key profiles (simplified)
    const majorProfile = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];

    for (let root = 0; root < 12; root++) {
      let correlation = 0;
      for (let i = 0; i < 12; i++) {
        const keyIndex = (i + root) % 12;
        correlation += chroma[i] * majorProfile[keyIndex];
      }
      
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        estimatedKey = keys[root];
      }
    }

    return estimatedKey;
  }

  /**
   * Simple tempo estimation (placeholder - could be enhanced)
   */
  private estimateTempo(audioData: Float32Array, sampleRate: number): number | undefined {
    // This is a simplified tempo estimation
    // In a real implementation, you might use onset detection or beat tracking
    return undefined; // Placeholder
  }

  /**
   * Helper: Calculate average of array
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Helper: Average multiple arrays element-wise
   */
  private averageArrays(arrays: number[][]): number[] {
    if (arrays.length === 0) return [];
    
    const length = arrays[0].length;
    const result = new Array(length).fill(0);
    
    for (const array of arrays) {
      for (let i = 0; i < length; i++) {
        result[i] += array[i];
      }
    }
    
    for (let i = 0; i < length; i++) {
      result[i] /= arrays.length;
    }
    
    return result;
  }

  /**
   * Helper: Format ratio as simple fraction string
   */
  private formatRatio(ratio: number): string {
    // Common musical ratios
    if (Math.abs(ratio - 1.0) < 0.01) return '1:1';
    if (Math.abs(ratio - 2.0) < 0.01) return '2:1';
    if (Math.abs(ratio - 1.5) < 0.01) return '3:2';
    if (Math.abs(ratio - 1.333) < 0.01) return '4:3';
    if (Math.abs(ratio - 1.667) < 0.01) return '5:3';
    if (Math.abs(ratio - 1.875) < 0.01) return '15:8';
    
    // Generic format
    return `${ratio.toFixed(2)}:1`;
  }

  /**
   * Batch analyze multiple Spotify tracks
   */
  async batchAnalyzeTracks(tracks: Array<{
    previewUrl: string;
    id: string;
    name: string;
    artist: string;
  }>): Promise<SpotifyTrackAnalysis[]> {
    const results: SpotifyTrackAnalysis[] = [];
    
    // Process tracks in parallel (but limit concurrency to avoid overwhelming the API)
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      const batch = tracks.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(track => 
        track.previewUrl ? this.analyzeSpotifyPreview(track.previewUrl, track) : Promise.resolve(null)
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      // Filter out failed analyses
      for (const result of batchResults) {
        if (result) {
          results.push(result);
        }
      }
      
      // Small delay between batches to be respectful
      if (i + BATCH_SIZE < tracks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return results;
  }
}

export const harmonicAnalysisService = new HarmonicAnalysisService();