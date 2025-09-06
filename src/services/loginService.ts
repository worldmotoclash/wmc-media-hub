import { User } from '@/contexts/UserContext';
import { toast } from 'sonner';

// Cache duration in milliseconds (24 hours)
const IP_CACHE_DURATION = 24 * 60 * 60 * 1000;

// Function to get the user's current IP address with multiple fallback services
export const getCurrentIpAddress = async (): Promise<string> => {
  const ipServices = [
    'https://api.ipify.org?format=json',
    'https://ipinfo.io/json',
    'https://api.my-ip.io/ip.json',
    'https://httpbin.org/ip'
  ];

  for (let i = 0; i < ipServices.length; i++) {
    try {
      console.log(`Attempting to get IP from service ${i + 1}: ${ipServices[i]}`);
      const response = await fetch(ipServices[i]);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      let ip = '';
      
      // Handle different response formats
      if (data.ip) {
        ip = data.ip;
      } else if (data.origin) {
        ip = data.origin; // httpbin format
      } else if (typeof data === 'string') {
        ip = data;
      }
      
      // Normalize IP (trim whitespace)
      ip = ip.trim();
      
      console.log(`Successfully got IP from service ${i + 1}: "${ip}"`);
      
      if (ip && ip.length > 0) {
        return ip;
      }
    } catch (error) {
      console.error(`Error fetching IP from service ${i + 1} (${ipServices[i]}):`, error);
      if (i === ipServices.length - 1) {
        console.error('All IP services failed');
        return '';
      }
    }
  }
  
  return '';
};

// Function to get location information from IP address with caching
interface IPLocation {
  country: string;
  city: string;
  timestamp: number;
}

export const getIPLocation = async (ip: string): Promise<{country: string, city: string}> => {
  try {
    // Check if we have cached data
    const cachedData = localStorage.getItem(`ip_location_${ip}`);
    
    if (cachedData) {
      const parsedData: IPLocation = JSON.parse(cachedData);
      const now = new Date().getTime();
      
      // If cache isn't expired, use it
      if (now - parsedData.timestamp < IP_CACHE_DURATION) {
        console.log('Using cached IP location data');
        return {
          country: parsedData.country,
          city: parsedData.city
        };
      }
    }
    
    // Fetch new data from a secure HTTPS API
    console.log('Fetching IP location data from API');
    // Using ipapi.co which supports HTTPS
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch IP location data');
    }
    
    const data = await response.json();
    
    // Cache the result
    const locationData: IPLocation = {
      country: data.country_name || 'Unknown',
      city: data.city || 'Unknown',
      timestamp: new Date().getTime()
    };
    
    localStorage.setItem(`ip_location_${ip}`, JSON.stringify(locationData));
    
    return {
      country: locationData.country,
      city: locationData.city
    };
  } catch (error) {
    console.error('Error fetching IP location:', error);
    
    // Fallback to another API if first one fails
    try {
      console.log('Attempting fallback geolocation API');
      const fallbackResponse = await fetch(`https://ipinfo.io/${ip}/json`);
      
      if (!fallbackResponse.ok) {
        throw new Error('Fallback API also failed');
      }
      
      const fallbackData = await fallbackResponse.json();
      
      const locationData: IPLocation = {
        country: fallbackData.country ? (fallbackData.country_name || fallbackData.country) : 'Unknown',
        city: fallbackData.city || 'Unknown',
        timestamp: new Date().getTime()
      };
      
      localStorage.setItem(`ip_location_${ip}`, JSON.stringify(locationData));
      
      return {
        country: locationData.country,
        city: locationData.city
      };
    } catch (fallbackError) {
      console.error('Fallback geolocation also failed:', fallbackError);
      return {
        country: 'Unknown',
        city: 'Unknown'
      };
    }
  }
};

// Fetch investor data from the API
export const fetchInvestorData = async () => {
  const apiUrl = `https://api.realintelligence.com/api/specific-investor-list.py?orgId=00D5e000000HEcP&campaignId=7014V000002lcY2&sandbox=False`;
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error('Failed to fetch investor data');
  }
  
  const contentType = response.headers.get('content-type');
  let data;

  if (contentType?.includes('xml')) {
    // Parse XML response
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    const memberElements = xmlDoc.getElementsByTagName('member');
    
    return Array.from(memberElements).map(member => ({
      id: member.getElementsByTagName('id')[0]?.textContent || '',
      email: member.getElementsByTagName('email')[0]?.textContent || '',
      ripassword: member.getElementsByTagName('ripassword')[0]?.textContent || '',
      name: member.getElementsByTagName('name')[0]?.textContent || '',
      status: member.getElementsByTagName('status')[0]?.textContent || '',
      phone: member.getElementsByTagName('phone')[0]?.textContent || '',
      mobile: member.getElementsByTagName('mobile')[0]?.textContent || '',
      mailingstreet: member.getElementsByTagName('mailingstreet')[0]?.textContent || '',
      ipaddress: member.getElementsByTagName('ipaddress')[0]?.textContent || ''
    }));
  } else {
    // Assume JSON response
    return await response.json();
  }
};

// Send a verification email when IP doesn't match
export const sendVerificationEmail = async (contactId: string, ipInfo?: {ip: string, country: string, city: string}): Promise<boolean> => {
  try {
    console.log('Sending verification email for contact ID:', contactId);
    
    // Use a simple image request for tracking instead of iframe
    const img = new Image();
    const verificationEndpoint = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/update-engine-contact.php";
    
    // Create URL with parameters
    const params = new URLSearchParams({
      'sObj': 'Contact',
      'id_Contact': contactId,
      'text_IP_Verification_Required__c': 'Yes'
    });
    
    // Add location information if available
    if (ipInfo) {
      params.append('text_New_Login_IP__c', ipInfo.ip);
      params.append('text_New_Login_Country__c', ipInfo.country);
      params.append('text_New_Login_City__c', ipInfo.city);
    }
    
    img.src = `${verificationEndpoint}?${params.toString()}`;
    
    return true;
  } catch (error) {
    console.error('Verification email error:', error);
    return false;
  }
};

// Track login activity using iframe method (same as working trackDocumentClick)
export const trackLogin = async (contactId: string, action: string = 'Login'): Promise<void> => {
  console.log(`[trackLogin] ===== IFRAME METHOD START =====`);
  console.log(`[trackLogin] Action: ${action} for contact ID: ${contactId}`);
  
  try {
    // Pre-fetch IP and location data
    const currentIp = await getCurrentIpAddress();
    const locationData = await getIPLocation(currentIp);
    
    console.log(`[trackLogin] IP data fetched: ${currentIp}, Location: ${locationData.city}, ${locationData.country}`);
    
    // Use iframe method (same as working trackDocumentClick)
    const trackingIframe = document.createElement('iframe');
    trackingIframe.style.display = 'none';
    
    trackingIframe.onload = () => {
      try {
        console.log(`[trackLogin] Iframe loaded, creating form...`);
        
        const iframeDoc = trackingIframe.contentDocument || trackingIframe.contentWindow?.document;
        if (!iframeDoc) {
          console.log(`[trackLogin] ERROR: Could not access iframe document`);
          return;
        }

        console.log(`[trackLogin] Creating form fields...`);
        
        const form = iframeDoc.createElement('form');
        form.method = 'POST';
        form.action = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php";
          
        const fields: Record<string, string> = {
          'sObj': 'ri__Portal__c',
          'string_ri__Contact__c': contactId,
          'text_ri__Login_URL__c': 'https://invest.worldmotoclash.com',
          'text_ri__Action__c': action,
          'text_ri__IP_Address__c': currentIp,
          'text_ri__Login_Country__c': locationData.country,
          'text_ri__Login_City__c': locationData.city,
        };

        Object.entries(fields).forEach(([name, value]) => {
          const input = iframeDoc.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
          console.log(`[trackLogin] Added field: ${name} = ${value}`);
        });

        iframeDoc.body.appendChild(form);
        console.log(`[trackLogin] Submitting form for: ${action}`);
        form.submit();
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown iframe error';
        console.log(`[trackLogin] Error during form creation/submission: ${errorMessage}`);
      }
    };
    
    document.body.appendChild(trackingIframe);
    trackingIframe.src = 'about:blank';
    
    console.log(`[trackLogin] Iframe created and added to document`);
    
    // Remove iframe after sufficient time for request to complete
    setTimeout(() => {
      if (document.body.contains(trackingIframe)) {
        document.body.removeChild(trackingIframe);
        console.log(`[trackLogin] ===== IFRAME REMOVED =====`);
      }
    }, 5000);
    
  } catch (error) {
    console.error('[trackLogin] ===== ERROR OCCURRED =====', error);
  }
};

// Track document clicks using iframe method (same as test page)
export const trackDocumentClick = async (
  contactId: string,
  documentUrl: string,
  actionType: string,
  documentTitle?: string
): Promise<void> => {
  console.log(`[trackDocumentClick] ===== IFRAME METHOD START =====`);
  console.log(`[trackDocumentClick] Action: ${actionType}`);
  console.log(`[trackDocumentClick] Title: ${documentTitle || 'N/A'}`);
  console.log(`[trackDocumentClick] URL: ${documentUrl}`);
  console.log(`[trackDocumentClick] Contact ID: ${contactId}`);

  try {
    // Get IP and location data
    const currentIp = await getCurrentIpAddress();
    const locationData = await getIPLocation(currentIp);
    
    console.log(`[trackDocumentClick] Got IP: ${currentIp}, Location: ${locationData.city}, ${locationData.country}`);
    
    // Use iframe method (same as working test)
    const trackingIframe = document.createElement('iframe');
    trackingIframe.style.display = 'none';
    
    trackingIframe.onload = () => {
      try {
        console.log(`[trackDocumentClick] Iframe loaded, creating form...`);
        
        const iframeDoc = trackingIframe.contentDocument || trackingIframe.contentWindow?.document;
        if (!iframeDoc) {
          console.log(`[trackDocumentClick] ERROR: Could not access iframe document`);
          return;
        }

        console.log(`[trackDocumentClick] Creating form fields...`);
        
        const form = iframeDoc.createElement('form');
        form.method = 'POST';
        form.action = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php";
          
        const fields: Record<string, string> = {
          'sObj': 'ri__Portal__c',
          'string_ri__Contact__c': contactId,
          'text_ri__Login_URL__c': documentUrl,
          'text_ri__Action__c': actionType,
          'text_ri__IP_Address__c': currentIp,
          'text_ri__Login_Country__c': locationData.country,
          'text_ri__Login_City__c': locationData.city,
        };

        // Add document title if provided
        if (documentTitle) {
          fields['text_Document_Title__c'] = documentTitle;
        }

        Object.entries(fields).forEach(([name, value]) => {
          const input = iframeDoc.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
          console.log(`[trackDocumentClick] Added field: ${name} = ${value}`);
        });

        iframeDoc.body.appendChild(form);
        console.log(`[trackDocumentClick] Submitting form for: ${actionType}`);
        form.submit();
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown iframe error';
        console.log(`[trackDocumentClick] Error during form creation/submission: ${errorMessage}`);
      }
    };
    
    document.body.appendChild(trackingIframe);
    trackingIframe.src = 'about:blank';
    
    console.log(`[trackDocumentClick] Iframe created and added to document`);
    
    // Remove iframe after sufficient time for request to complete
    setTimeout(() => {
      if (document.body.contains(trackingIframe)) {
        document.body.removeChild(trackingIframe);
        console.log(`[trackDocumentClick] ===== IFRAME REMOVED =====`);
      }
    }, 5000);
    
  } catch(error) {
    console.error(`[trackDocumentClick] ===== ERROR OCCURRED =====`, error);
  }
};

// Authenticate user
export const authenticateUser = async (email: string, password: string, isGoogleAuth: boolean = false): Promise<User | null> => {
  try {
    const data = await fetchInvestorData();
    
    console.log('Parsed investor data:', data);
    
    // Find the investor by email (case-insensitive comparison)
    const investor = data.find((inv: any) => 
      inv.email && inv.email.toLowerCase() === email.toLowerCase()
    );
    
    console.log('Found investor:', investor);
    
    if (investor) {
      // For Google Auth, we skip password check
      const isValidPassword = isGoogleAuth || (investor.ripassword && password === investor.ripassword.toString());
      
      if (isValidPassword) {
        // If the investor has an IP address set, validate it
        if (investor.ipaddress && investor.ipaddress.trim() !== '') {
          const storedIp = investor.ipaddress.trim(); // Normalize stored IP
          console.log(`IP validation required. Stored IP (normalized): "${storedIp}"`);
          
          // Get the user's current IP address
          const currentIp = await getCurrentIpAddress();
          console.log(`User's current IP (normalized): "${currentIp}"`);
          
          // Debug the comparison
          console.log(`IP comparison: "${currentIp}" === "${storedIp}" = ${currentIp === storedIp}`);
          console.log(`Current IP length: ${currentIp.length}, Stored IP length: ${storedIp.length}`);
          
          // If we couldn't get the current IP, log it but don't block access
          if (!currentIp || currentIp.length === 0) {
            console.warn('Could not determine current IP address - allowing access');
          } else if (currentIp !== storedIp) {
            console.log('IP mismatch detected. Sending verification email.');
            
            // Get location information for the new IP
            const locationData = await getIPLocation(currentIp);
            
            // Send verification email with location data
            await sendVerificationEmail(investor.id, {
              ip: currentIp,
              country: locationData.country,
              city: locationData.city
            });
            
            // Also track the IP mismatch event
            await trackLogin(investor.id, isGoogleAuth ? "Google Auth IP Mismatch" : "IP Address Mismatch");
            
            toast.error(`Access denied: Your IP address has changed. A verification email has been sent to confirm your identity. Location detected: ${locationData.city}, ${locationData.country}`);
            return null;
          } else {
            console.log('IP addresses match - access granted');
          }
        } else {
          console.log('No stored IP address for this user - skipping IP validation');
        }
        
        // Set ndaSigned based on investor status
        const isQualifiedOrSecured = investor.status === "Qualified Investor" || investor.status === "Secured Investor";
        
        // Return user data
        const userData: User = {
          id: investor.id,
          name: investor.name,
          email: investor.email,
          status: investor.status,
          phone: investor.phone,
          mobile: investor.mobile,
          mailingstreet: investor.mailingstreet,
          ipaddress: investor.ipaddress,
          ndaSigned: isQualifiedOrSecured // Set ndaSigned based on investor status
        };
        
        // Track the successful login
        await trackLogin(investor.id, isGoogleAuth ? "Google Auth Login" : "Login");
        
        return userData;
      } else {
        toast.error('Invalid password. Please try again.');
        return null;
      }
    } else {
      toast.error('Email not found. Please check your credentials.');
      return null;
    }
  } catch (error) {
    console.error('Login error:', error);
    toast.error('An error occurred during login. Please try again.');
    return null;
  }
};
