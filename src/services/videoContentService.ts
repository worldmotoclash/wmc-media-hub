import { toast } from 'sonner';

// Salesforce video content data structure
export interface SalesforceVideo {
  Id: string;
  Name: string;
  ri__Content_URL__c?: string;
  ri__Thumbnail_URL__c?: string;
  ri__Status__c?: string;
  ri__Duration__c?: string;
  ri__Upload_Date__c?: string;
  ri__Views__c?: number;
  ri__Description__c?: string;
  ri__File_Size__c?: number;
  ri__Content_Type__c?: string;
  ri__Tags__c?: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

// Playlist data structure
export interface SalesforcePlaylist {
  Id: string;
  Name: string;
  ri__Description__c?: string;
  ri__Video_Count__c?: number;
  ri__Status__c?: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

// UI-friendly video interface
export interface VideoContent {
  id: string;
  title: string;
  thumbnail: string;
  status: 'Draft' | 'Synced' | 'Error' | 'Processing';
  duration: string;
  uploadedAt: string;
  views: number;
  videoSrc?: string;
  description?: string;
  fileSize?: number;
  contentType?: string;
  tags?: string[];
  playlistPosition?: number; // Order position in playlist (1-based)
  junctionId?: string; // Junction record ID for playlist-video relationship
}

// API configuration
const API_CONFIG = {
  baseUrl: 'https://api.realintelligence.com/api',
  orgId: '00D5e000000HEcP',
  sandbox: 'False',
  // Add default playlist ID for testing
  defaultPlaylistId: 'a2H5e000002JD7g'
};

// Fetch video content from Salesforce
export const fetchVideoContent = async (playlistId?: string, searchQuery?: string): Promise<VideoContent[]> => {
  try {
    const params = new URLSearchParams({
      orgId: API_CONFIG.orgId,
      sandbox: API_CONFIG.sandbox
    });

    // Always include a playlist ID - use default if none provided
    const targetPlaylistId = playlistId || API_CONFIG.defaultPlaylistId;
    params.append('playlistId', targetPlaylistId);

    if (searchQuery) {
      params.append('search', searchQuery);
    }

    const url = `${API_CONFIG.baseUrl}/wmc-content-playlist.py?${params.toString()}`;
    console.log('Fetching video content from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/xml, */*',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    let data: SalesforceVideo[];

    if (contentType?.includes('xml')) {
      // Parse XML response
      const text = await response.text();
      console.log('Raw XML response:', text);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const videoElements = xmlDoc.getElementsByTagName('content');
      
      data = Array.from(videoElements).map((video, index) => ({
        Id: video.getElementsByTagName('contentid')[0]?.textContent || '',
        Name: video.getElementsByTagName('contentname')[0]?.textContent || video.getElementsByTagName('name')[0]?.textContent || '',
        ri__Content_URL__c: video.getElementsByTagName('contenturl')[0]?.textContent || '',
        ri__Thumbnail_URL__c: '', // Not provided in API
        ri__Status__c: video.getElementsByTagName('approved')[0]?.textContent || '',
        ri__Duration__c: video.getElementsByTagName('lengthinseconds')[0]?.textContent || '',
        ri__Upload_Date__c: '', // Not provided in API
        ri__Views__c: 0, // Not provided in API
        ri__Description__c: '', // Not provided in API
        ri__File_Size__c: 0, // Not provided in API
        ri__Content_Type__c: video.getElementsByTagName('contenttype')[0]?.textContent || '',
        ri__Tags__c: '', // Not provided in API
        CreatedDate: '',
        LastModifiedDate: '',
        playlistPosition: parseFloat(video.getElementsByTagName('playlistorder')[0]?.textContent || '') || (index + 1),
        junctionId: video.getElementsByTagName('id')[0]?.textContent || `fallback_${index}`
      }));
      
      // Sort by playlist order to ensure correct sequence
      data.sort((a, b) => ((a as any).playlistPosition || 0) - ((b as any).playlistPosition || 0));
    } else {
      // Assume JSON response
      data = await response.json();
      
      // For JSON response, ensure junction IDs are available
      data = data.map((video: any, index: number) => ({
        ...video,
        playlistPosition: video.playlistPosition || (index + 1),
        junctionId: video.junctionId || video.ri1__Content_to_Playlist__c || `playlist_${targetPlaylistId}_content_${video.Id || index}`
      }));
    }

    // Transform Salesforce data to UI format
    return data.map(transformVideoData);

  } catch (error) {
    console.error('Error fetching video content:', error);
    toast.error('Failed to load video content. Using demo data.');
    
    // Return mock data for development/testing
    return [
      {
        id: 'demo-1',
        title: 'World Moto Clash - Demo Video 1',
        thumbnail: '/lovable-uploads/wmc-sizzle-thumbnail.png',
        status: 'Synced',
        duration: '2:45',
        uploadedAt: '2 days ago',
        views: 124,
        videoSrc: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        description: 'Demo video content from Salesforce',
        fileSize: 1024000,
        contentType: 'video/mp4',
        tags: ['demo', 'motorsport'],
        junctionId: 'demo-junction-1'
      },
      {
        id: 'demo-2',
        title: 'World Moto Clash - Demo Video 2',
        thumbnail: '/lovable-uploads/sponsor-primier-thumbnail.png',
        status: 'Processing',
        duration: '1:32',
        uploadedAt: '1 hour ago',
        views: 45,
        videoSrc: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
        description: 'Another demo video',
        fileSize: 2048000,
        contentType: 'video/mp4',
        tags: ['demo', 'business'],
        junctionId: 'demo-junction-2'
      }
    ];
  }
};

// Fetch playlist data from Salesforce
export const fetchPlaylistData = async (): Promise<SalesforcePlaylist[]> => {
  try {
    const params = new URLSearchParams({
      orgId: API_CONFIG.orgId,
      approved: 'yes',
      sandbox: API_CONFIG.sandbox
    });

    const url = `${API_CONFIG.baseUrl}/wmc-playlists.py?${params.toString()}`;
    console.log('Fetching playlist data from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/xml, */*',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('Playlist API Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log('Playlist API Content-Type:', contentType);
    
    let data: SalesforcePlaylist[];

    if (contentType?.includes('xml')) {
      // Parse XML response
      const text = await response.text();
      console.log('Raw playlist XML response:', text);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const playlistElements = xmlDoc.getElementsByTagName('content');
      console.log('Found playlist elements:', playlistElements.length);
      
      data = Array.from(playlistElements).map(playlist => ({
        Id: playlist.getElementsByTagName('id')[0]?.textContent || '',
        Name: playlist.getElementsByTagName('name')[0]?.textContent || '',
        ri__Description__c: `${playlist.getElementsByTagName('playlistypye')[0]?.textContent || ''} playlist`,
        ri__Video_Count__c: parseInt(playlist.getElementsByTagName('numberinplaylist')[0]?.textContent || '0'),
        ri__Status__c: 'Active',
        CreatedDate: new Date().toISOString(),
        LastModifiedDate: new Date().toISOString()
      }));
    } else {
      // Assume JSON response
      data = await response.json();
      console.log('Playlist JSON response data:', data);
    }

    console.log('Parsed playlist data:', data);
    return data;

  } catch (error) {
    console.error('Error fetching playlist data:', error);
    toast.error('Failed to load playlist data. Using demo data.');
    
    // Return mock playlists for development/testing
    return [
      {
        Id: API_CONFIG.defaultPlaylistId,
        Name: 'World Moto Clash - Main Playlist',
        ri__Description__c: 'Primary video content for World Moto Clash investor presentations',
        ri__Video_Count__c: 8,
        ri__Status__c: 'Active',
        CreatedDate: '2024-01-15T10:00:00Z',
        LastModifiedDate: '2024-01-20T15:30:00Z'
      },
      {
        Id: 'demo-playlist-2',
        Name: 'Sponsor Content',
        ri__Description__c: 'Content related to our sponsors and partnerships',
        ri__Video_Count__c: 5,
        ri__Status__c: 'Active',
        CreatedDate: '2024-01-10T09:00:00Z',
        LastModifiedDate: '2024-01-18T12:00:00Z'
      },
      {
        Id: 'demo-playlist-3',
        Name: 'Race Highlights',
        ri__Description__c: 'Best moments from recent races',
        ri__Video_Count__c: 12,
        ri__Status__c: 'Draft',
        CreatedDate: '2024-01-05T14:00:00Z',
        LastModifiedDate: '2024-01-15T16:45:00Z'
      }
    ];
  }
};

// Transform Salesforce video data to UI format
const transformVideoData = (salesforceVideo: SalesforceVideo): VideoContent => {
  // Map Salesforce status to UI status
  const mapStatus = (sfStatus?: string): VideoContent['status'] => {
    if (!sfStatus) return 'Draft';
    
    const approvedValue = parseFloat(sfStatus);
    
    // Map approval values to status
    if (approvedValue >= 1000) {
      return 'Synced'; // High approval rating = published/synced
    } else if (approvedValue >= 1) {
      return 'Processing'; // Some approval = processing
    } else {
      return 'Draft'; // Low or no approval = draft
    }
  };

  // Format duration from seconds to MM:SS format
  const formatDuration = (duration?: string): string => {
    if (!duration) return '0:00';
    
    const seconds = parseInt(duration);
    if (isNaN(seconds)) return duration;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format upload date to relative time
  const formatUploadDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    
    const uploadDate = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - uploadDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    
    return uploadDate.toLocaleDateString();
  };

  // Parse tags from comma-separated string
  const parseTags = (tagsString?: string): string[] => {
    if (!tagsString) return [];
    return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  };

  // Helper function to extract YouTube video ID from URL
  const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // Helper function to generate YouTube thumbnail URL
  const generateYouTubeThumbnail = (videoUrl: string): string | null => {
    const videoId = extractYouTubeId(videoUrl);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
    return null;
  };

  // Generate appropriate thumbnail
  const getThumbnail = (): string => {
    // First priority: Salesforce provided thumbnail
    if (salesforceVideo.ri__Thumbnail_URL__c) {
      return salesforceVideo.ri__Thumbnail_URL__c;
    }
    
    // Second priority: Generate YouTube thumbnail if it's a YouTube video
    if (salesforceVideo.ri__Content_Type__c === 'Youtube' && salesforceVideo.ri__Content_URL__c) {
      const youtubeThumbnail = generateYouTubeThumbnail(salesforceVideo.ri__Content_URL__c);
      if (youtubeThumbnail) {
        return youtubeThumbnail;
      }
    }
    
    // Fallback to content type specific placeholders
    return salesforceVideo.ri__Content_Type__c === 'Youtube' 
      ? '/lovable-uploads/wmc-sizzle-thumbnail.png' 
      : '/lovable-uploads/sponsor-primier-thumbnail.png';
  };

  return {
    id: salesforceVideo.Id,
    title: salesforceVideo.Name || 'Untitled Video',
    thumbnail: getThumbnail(),
    status: mapStatus(salesforceVideo.ri__Status__c),
    duration: formatDuration(salesforceVideo.ri__Duration__c),
    uploadedAt: formatUploadDate(salesforceVideo.ri__Upload_Date__c || salesforceVideo.CreatedDate),
    views: salesforceVideo.ri__Views__c || 0,
    videoSrc: salesforceVideo.ri__Content_URL__c,
    description: salesforceVideo.ri__Description__c || `${salesforceVideo.ri__Content_Type__c} content: ${salesforceVideo.Name}`,
    fileSize: salesforceVideo.ri__File_Size__c,
    contentType: salesforceVideo.ri__Content_Type__c,
    tags: parseTags(salesforceVideo.ri__Tags__c),
    playlistPosition: (salesforceVideo as any).playlistPosition,
    junctionId: (salesforceVideo as any).junctionId
  };
};

// Search videos by query
export const searchVideoContent = async (searchQuery: string): Promise<VideoContent[]> => {
  return fetchVideoContent(undefined, searchQuery);
};

// Get videos by playlist
export const getVideosByPlaylist = async (playlistId: string): Promise<VideoContent[]> => {
  return fetchVideoContent(playlistId);
};

// Update playlist video order using Real Intelligence update-engine.php
export const updatePlaylistOrder = async (
  playlistId: string, 
  videoOrders: { id: string; position: number; junctionId: string }[]
): Promise<boolean> => {
  console.log('🔄 Starting playlist order update...');
  console.log('Playlist ID:', playlistId);
  console.log('Video orders:', videoOrders);
  
  try {
    let successCount = 0;
    let failureCount = 0;
    
    // Process each video order update sequentially
    for (const videoOrder of videoOrders) {
      try {
        if (!videoOrder.junctionId) {
          throw new Error(`Missing junction ID for video ${videoOrder.id}`);
        }
        await updateSingleVideoOrder(videoOrder.id, videoOrder.position, videoOrder.junctionId);
        successCount++;
        console.log(`✅ Updated video ${videoOrder.id} to position ${videoOrder.position}`);
      } catch (error) {
        failureCount++;
        console.error(`❌ Failed to update video ${videoOrder.id}:`, error);
      }
    }
    
    console.log(`📊 Update summary: ${successCount} successful, ${failureCount} failed`);
    
    if (successCount > 0) {
      toast.success(`Updated ${successCount} video positions successfully`);
    }
    
    if (failureCount > 0) {
      toast.error(`Failed to update ${failureCount} video positions`);
    }
    
    // Return success if at least some updates succeeded
    return successCount > 0;
    
  } catch (error) {
    console.error('❌ Critical error in playlist order update:', error);
    toast.error('Failed to update playlist order');
    return false;
  }
};

// Helper function to update a single video's order using iframe submission
const updateSingleVideoOrder = async (
  videoId: string, 
  newPosition: number, 
  junctionId: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Updating single video order: ${videoId} to position ${newPosition} with junction ID: ${junctionId}`);
    
    if (!junctionId) {
      reject(new Error('Junction ID is required for playlist order updates'));
      return;
    }
    
    // Create form with data
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/update-engine-playlistorder.php";
    form.target = `updateFrame_${videoId}_${Date.now()}`;
    form.style.display = 'none';
            
    const fields: Record<string, string> = {
      'sObj': 'ri1__Content_to_Playlist__c',
      'id_ri1__Content_to_Playlist__c': junctionId,
      'number_ri1__Playlist_Order__c': newPosition.toString()
    };

    // Add form fields
    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
      console.log(`📝 Added field: ${name} = ${value}`);
    });

    // Create hidden iframe for silent submission
    const iframe = document.createElement('iframe');
    iframe.name = form.target;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Add to DOM and submit
    document.body.appendChild(form);
    
    // Submit and resolve after a brief delay
    form.submit();
    
    // Clean up form and iframe after submission
    setTimeout(() => {
      if (document.body.contains(form)) {
        document.body.removeChild(form);
      }
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
    
    console.log(`✅ Submitted order update for video ${videoId} to position ${newPosition}`);
    resolve();
  });
};
