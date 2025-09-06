
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentIpAddress, getIPLocation } from '@/services/loginService';

const TestLoginTracking: React.FC = () => {
  const [formData, setFormData] = useState({
    contactId: '0035e000003cugh',
    action: 'Video Clicked',
    loginUrl: 'https://invest.worldmotoclash.com'
  });

  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLoginTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResponse('');
    setLogs([]);

    try {
      addLog(`[TEST LOGIN] Starting login tracking test...`);
      addLog(`[TEST LOGIN] Contact ID: ${formData.contactId}`);
      addLog(`[TEST LOGIN] Action: ${formData.action}`);
      addLog(`[TEST LOGIN] Login URL: ${formData.loginUrl}`);
      
      // Pre-fetch IP and location data (exactly like the working code)
      addLog(`[TEST LOGIN] Step 1: Fetching IP and location data...`);
      const currentIp = await getCurrentIpAddress();
      const locationData = await getIPLocation(currentIp);
      
      addLog(`[TEST LOGIN] IP data fetched: ${currentIp}, Location: ${locationData.city}, ${locationData.country}`);
      
      // Create iframe for tracking (exactly like the working trackLogin function)
      const trackingIframe = document.createElement('iframe');
      trackingIframe.style.display = 'none';
      
      trackingIframe.onload = () => {
        try {
          addLog(`[TEST LOGIN] Iframe loaded, creating form...`);
          
          const iframeDoc = trackingIframe.contentDocument || trackingIframe.contentWindow?.document;
          if (!iframeDoc) {
            addLog(`[TEST LOGIN] ERROR: Could not access iframe document`);
            setResponse('Error: Could not access iframe document');
            return;
          }

          const form = iframeDoc.createElement('form');
          form.method = 'POST';
          form.action = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php";
            
          const fields: Record<string, string> = {
            'sObj': 'ri__Portal__c',
            'string_ri__Contact__c': formData.contactId,
            'text_ri__Login_URL__c': formData.loginUrl,
            'text_ri__Action__c': formData.action,
            'text_ri__IP_Address__c': currentIp,
            'text_ri__Login_Country__c': locationData.country,
            'text_ri__Login_City__c': locationData.city,
          };

          addLog(`[TEST LOGIN] Creating form fields...`);
          Object.entries(fields).forEach(([name, value]) => {
            const input = iframeDoc.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            form.appendChild(input);
            addLog(`[TEST LOGIN] Added field: ${name} = ${value}`);
          });

          iframeDoc.body.appendChild(form);
          addLog(`[TEST LOGIN] Submitting form for: ${formData.action}`);
          form.submit();
          
          setResponse(`Login tracking request submitted successfully for action: ${formData.action}`);
          
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown iframe error';
          addLog(`[TEST LOGIN] Error during form creation/submission: ${errorMessage}`);
          setResponse(`Error: ${errorMessage}`);
        }
      };
      
      document.body.appendChild(trackingIframe);
      trackingIframe.src = 'about:blank';
      
      addLog(`[TEST LOGIN] Iframe created and added to document`);
      
      // Remove iframe after sufficient time for request to complete (same as working code)
      setTimeout(() => {
        if (document.body.contains(trackingIframe)) {
          document.body.removeChild(trackingIframe);
          addLog(`[TEST LOGIN] Request completed and iframe removed for: ${formData.action}`);
        }
        setIsSubmitting(false);
      }, 5000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`[TEST LOGIN] Error: ${errorMessage}`);
      setResponse(`Error: ${errorMessage}`);
      setIsSubmitting(false);
    }
  };

  const testDirectFetch = async () => {
    setIsSubmitting(true);
    setResponse('');
    setLogs([]);

    try {
      addLog('Testing direct fetch approach...');
      
      const currentIp = await getCurrentIpAddress();
      const locationData = await getIPLocation(currentIp);
      
      const form = new FormData();
      const fields = {
        'sObj': 'ri__Portal__c',
        'string_ri__Contact__c': formData.contactId,
        'text_ri__Login_URL__c': formData.loginUrl,
        'text_ri__Action__c': formData.action,
        'text_ri__IP_Address__c': currentIp,
        'text_ri__Login_Country__c': locationData.country,
        'text_ri__Login_City__c': locationData.city,
      };

      Object.entries(fields).forEach(([key, value]) => {
        form.append(key, value);
        addLog(`Added form field: ${key} = ${value}`);
      });

      const result = await fetch('https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php', {
        method: 'POST',
        body: form,
        mode: 'no-cors'
      });

      addLog(`Response received. Status: ${result.status || 'Unknown (no-cors mode)'}`);
      addLog(`Response type: ${result.type}`);
      
      setResponse(`Direct fetch completed. Status: ${result.status || 'Unknown'}, Type: ${result.type}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Direct fetch error: ${errorMessage}`);
      setResponse(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickActionTests = [
    { label: 'Test Video Clicked', action: 'Video Clicked' },
    { label: 'Test Document Clicked', action: 'Document Clicked' },
    { label: 'Test Login', action: 'Login' },
    { label: 'Test Logout', action: 'Logout' }
  ];

  const testQuickAction = async (action: string) => {
    setFormData(prev => ({ ...prev, action }));
    // Small delay to let state update
    setTimeout(() => {
      const form = document.getElementById('tracking-form') as HTMLFormElement;
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Login Tracking Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Login Tracking Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <form id="tracking-form" onSubmit={handleLoginTracking} className="space-y-4">
                <div>
                  <Label htmlFor="contactId">Contact ID</Label>
                  <Input
                    id="contactId"
                    name="contactId"
                    value={formData.contactId}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="action">Action</Label>
                  <Input
                    id="action"
                    name="action"
                    value={formData.action}
                    onChange={handleInputChange}
                    placeholder="Video Clicked, Document Clicked, Login, etc."
                  />
                </div>
                
                <div>
                  <Label htmlFor="loginUrl">Login URL</Label>
                  <Input
                    id="loginUrl"
                    name="loginUrl"
                    value={formData.loginUrl}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Testing...' : 'Test Login Tracking (Iframe)'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={testDirectFetch}
                    disabled={isSubmitting}
                  >
                    Test Direct Fetch
                  </Button>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t">
                <Label className="font-semibold mb-3 block">Quick Action Tests</Label>
                <div className="grid grid-cols-2 gap-2">
                  {quickActionTests.map((test) => (
                    <Button
                      key={test.action}
                      variant="secondary"
                      size="sm"
                      onClick={() => testQuickAction(test.action)}
                      disabled={isSubmitting}
                    >
                      {test.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Valid Action Values</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="font-semibold text-green-600">✅ Working Values:</Label>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>• <code>Video Clicked</code></li>
                      <li>• <code>Document Clicked</code></li>
                      <li>• <code>Login</code></li>
                      <li>• <code>Logout</code></li>
                    </ul>
                  </div>
                  
                  <div>
                    <Label className="font-semibold text-red-600">❌ Invalid Values:</Label>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>• <code>Video View</code></li>
                      <li>• <code>Document View</code></li>
                    </ul>
                  </div>
                  
                  {response && (
                    <div>
                      <Label className="font-semibold">Response:</Label>
                      <p className="text-sm bg-gray-100 p-2 rounded mt-1">{response}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {logs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Debug Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black text-green-400 p-3 rounded font-mono text-xs max-h-64 overflow-y-auto">
                    {logs.map((log, index) => (
                      <div key={index}>{log}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Solution Found! 🎉</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-green-600 font-medium">
                ✅ The issue was invalid Action values in the SFDC endpoint!
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li><strong>Root Cause:</strong> Salesforce was rejecting requests with "Video View" and "Document View"</li>
                <li><strong>Solution:</strong> Use "Video Clicked" and "Document Clicked" instead</li>
                <li><strong>Test Status:</strong> The iframe method should now work correctly</li>
                <li><strong>Next Step:</strong> Update the main loginService.ts to use correct Action values</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestLoginTracking;
