import { toast } from 'sonner';

// Google VEO API configuration
const GOOGLE_VEO_API_BASE = 'https://aiplatform.googleapis.com/v1';

export interface VeoGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  duration: number; // in seconds
  aspectRatio: '16:9' | '9:16' | '1:1';
  creativity: number; // 0-1
  referenceImage?: string; // base64 or URL
}

export interface VeoGenerationResponse {
  name: string; // Operation name for polling
  metadata?: {
    progressPercent?: number;
    estimatedTimeRemaining?: string;
  };
}

export interface VeoVideoResult {
  videoUri: string;
  duration: number;
  status: 'GENERATING' | 'COMPLETED' | 'FAILED';
  error?: string;
}

export class GoogleVeoService {
  private apiKey: string;
  private projectId: string;
  private location: string;

  constructor(apiKey: string, projectId: string, location = 'us-central1') {
    this.apiKey = apiKey;
    this.projectId = projectId;
    this.location = location;
  }

  /**
   * Generate a video using Google VEO
   */
  async generateVideo(request: VeoGenerationRequest): Promise<VeoGenerationResponse> {
    try {
      console.log('🎬 Starting Google VEO video generation...', request);
      
      const endpoint = `${GOOGLE_VEO_API_BASE}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/veo-001:generateContent`;
      
      const payload = {
        contents: [{
          parts: [{
            text: this.buildPrompt(request)
          }]
        }],
        generationConfig: {
          temperature: request.creativity,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH', 
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      };

      console.log('📤 Sending request to Google VEO API...');
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Google VEO API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log('✅ Google VEO generation started:', result);
      
      toast.success('Video generation started! This may take a few minutes...');
      
      return {
        name: result.name || `veo_generation_${Date.now()}`,
        metadata: result.metadata
      };

    } catch (error) {
      console.error('❌ Google VEO generation failed:', error);
      toast.error(`Failed to start video generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Check the status of a video generation operation
   */
  async checkGenerationStatus(operationName: string): Promise<VeoVideoResult> {
    try {
      const endpoint = `${GOOGLE_VEO_API_BASE}/${operationName}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.done) {
        if (result.error) {
          return {
            videoUri: '',
            duration: 0,
            status: 'FAILED',
            error: result.error.message || 'Generation failed'
          };
        }
        
        return {
          videoUri: result.response?.videoUri || '',
          duration: result.response?.duration || 0,
          status: 'COMPLETED'
        };
      }
      
      return {
        videoUri: '',
        duration: 0,
        status: 'GENERATING'
      };

    } catch (error) {
      console.error('❌ Status check failed:', error);
      return {
        videoUri: '',
        duration: 0,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Status check failed'
      };
    }
  }

  /**
   * Poll generation status until completion
   */
  async waitForGeneration(
    operationName: string, 
    onProgress?: (percent: number) => void
  ): Promise<VeoVideoResult> {
    const maxAttempts = 60; // 10 minutes max (10s intervals)
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          attempts++;
          const status = await this.checkGenerationStatus(operationName);
          
          if (status.status === 'COMPLETED' || status.status === 'FAILED') {
            resolve(status);
            return;
          }
          
          if (attempts >= maxAttempts) {
            reject(new Error('Generation timed out after 10 minutes'));
            return;
          }
          
          // Simulate progress (Google VEO doesn't always provide exact progress)
          const estimatedProgress = Math.min(90, (attempts / maxAttempts) * 100);
          onProgress?.(estimatedProgress);
          
          // Continue polling
          setTimeout(poll, 10000); // Poll every 10 seconds
          
        } catch (error) {
          reject(error);
        }
      };
      
      poll();
    });
  }

  /**
   * Build the prompt for Google VEO
   */
  private buildPrompt(request: VeoGenerationRequest): string {
    let prompt = `Generate a ${request.duration}-second video with ${request.aspectRatio} aspect ratio: ${request.prompt}`;
    
    if (request.negativePrompt) {
      prompt += `\n\nAvoid: ${request.negativePrompt}`;
    }
    
    // Add technical specifications
    prompt += `\n\nTechnical requirements:
- Duration: exactly ${request.duration} seconds
- Aspect ratio: ${request.aspectRatio}
- High quality, smooth motion
- Professional cinematography`;
    
    return prompt;
  }

  /**
   * Validate API credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const endpoint = `${GOOGLE_VEO_API_BASE}/projects/${this.projectId}/locations/${this.location}/publishers/google/models`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Credential validation failed:', error);
      return false;
    }
  }
}

// Export a singleton factory function
export const createGoogleVeoService = (apiKey: string, projectId: string) => {
  return new GoogleVeoService(apiKey, projectId);
};

// Mock service for development/testing
export const createMockVeoService = () => ({
  async generateVideo(request: VeoGenerationRequest): Promise<VeoGenerationResponse> {
    console.log('🎭 Mock VEO generation:', request);
    toast.info('Using mock VEO service for development');
    
    return {
      name: `mock_operation_${Date.now()}`,
      metadata: {
        progressPercent: 0,
        estimatedTimeRemaining: `${request.duration * 20}s`
      }
    };
  },

  async waitForGeneration(operationName: string, onProgress?: (percent: number) => void): Promise<VeoVideoResult> {
    // Simulate generation progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      onProgress?.(i);
    }
    
    // Return mock video URL
    return {
      videoUri: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      duration: 5,
      status: 'COMPLETED'
    };
  },

  async validateCredentials(): Promise<boolean> {
    return true;
  }
});