// Master Image service - fetches from Real Intelligence API
export interface MasterImage {
  id: string;
  name: string;
  url: string;
  contentType: string;
  approved: string;
  aiPercentage: number;
}

// API configuration
const API_CONFIG = {
  baseUrl: 'https://api.realintelligence.com/api',
  orgId: '00D5e000000HEcP',
  sandbox: 'False'
};

// Fetch master images from Salesforce via Real Intelligence API
export const fetchMasterImages = async (): Promise<MasterImage[]> => {
  try {
    const params = new URLSearchParams({
      orgId: API_CONFIG.orgId,
      sandbox: API_CONFIG.sandbox
    });

    const url = `${API_CONFIG.baseUrl}/wmc-content-master.py?${params.toString()}`;
    console.log('Fetching master images from:', url);

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json, text/xml, */*',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    let data: MasterImage[] = [];

    if (contentType?.includes('xml')) {
      // Parse XML response
      const text = await response.text();
      console.log('Raw master images XML response:', text);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const contentElements = xmlDoc.getElementsByTagName('content');

      data = Array.from(contentElements).map(content => ({
        id: content.getElementsByTagName('id')[0]?.textContent || '',
        name: content.getElementsByTagName('name')[0]?.textContent || '',
        url: content.getElementsByTagName('url')[0]?.textContent || '',
        contentType: content.getElementsByTagName('contenttype')[0]?.textContent || '',
        approved: content.getElementsByTagName('approved')[0]?.textContent || '',
        aiPercentage: parseFloat(content.getElementsByTagName('aipercentage')[0]?.textContent || '0')
      }));
    } else {
      // Assume JSON response
      const jsonData = await response.json();
      data = jsonData.map((item: any) => ({
        id: item.id || item.Id || '',
        name: item.name || item.Name || '',
        url: item.url || item.ri__Content_URL__c || '',
        contentType: item.contenttype || item.ri__Content_Type__c || '',
        approved: item.approved || item.ri__Status__c || '',
        aiPercentage: parseFloat(item.aipercentage || item.ri__AI_Percentage__c || '0')
      }));
    }

    console.log('Parsed master images:', data);
    return data;

  } catch (error) {
    console.error('Error fetching master images:', error);
    return [];
  }
};
