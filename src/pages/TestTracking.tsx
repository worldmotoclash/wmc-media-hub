import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TestTracking: React.FC = () => {
  const [formData, setFormData] = useState({
    sObj: 'ri__Portal__c',
    string_ri__Contact__c: '0035e000003cugh',
    text_ri__Login_URL__c: 'https://drive.google.com/file/d/1ZDIK7ACuHd8GRvIXtiVBabDx3D3Aski7/preview',
    text_ri__Action__c: 'Video Clicked',
    text_ri__IP_Address__c: '47.208.228.21',
    text_ri__Login_Country__c: 'United States',
    text_ri__Login_City__c: 'Meadow Vista',
    text_ri__Document_Title__c: 'WMC Motorsports Reimagined!'
  });

  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResponse('');
    setLogs([]);

    try {
      addLog('Starting direct fetch request...');
      
      // Create form data exactly like the working code
      const form = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        form.append(key, value);
        addLog(`Added form field: ${key} = ${value}`);
      });

      addLog('Form data prepared, sending request...');

      // Try the exact endpoint from loginService
      const result = await fetch('https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php', {
        method: 'POST',
        body: form,
        mode: 'no-cors' // This is what the working code uses
      });

      addLog(`Response received. Status: ${result.status || 'Unknown (no-cors mode)'}`);
      addLog(`Response type: ${result.type}`);
      
      setResponse(`Request sent successfully. Status: ${result.status || 'Unknown (no-cors mode)'}, Type: ${result.type}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error occurred: ${errorMessage}`);
      setResponse(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIframeSubmit = () => {
    setIsSubmitting(true);
    setResponse('');
    setLogs([]);

    try {
      addLog('Creating iframe for submission...');
      
      // Use the EXACT same approach as loginService.ts
      const trackingIframe = document.createElement('iframe');
      trackingIframe.style.display = 'none';
      
      trackingIframe.onload = () => {
        addLog('Iframe loaded, attempting to create form...');
        
        try {
          const iframeDoc = trackingIframe.contentDocument || trackingIframe.contentWindow?.document;
          if (!iframeDoc) {
            addLog('ERROR: Could not access iframe document (CORS issue)');
            setResponse('Error: Could not access iframe document (CORS restriction)');
            return;
          }

          addLog('Iframe document accessible, creating form...');
          
          const form = iframeDoc.createElement('form');
          form.method = 'POST';
          form.action = 'https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php';
          
          Object.entries(formData).forEach(([name, value]) => {
            const input = iframeDoc.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            form.appendChild(input);
            addLog(`Added hidden input: ${name} = ${value}`);
          });

          iframeDoc.body.appendChild(form);
          addLog('Form created and added to iframe body');
          addLog('Submitting form...');
          
          form.submit();
          setResponse('Form submitted via iframe - check network tab for request');
          
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown iframe error';
          addLog(`Iframe error: ${errorMessage}`);
          setResponse(`Iframe error: ${errorMessage}`);
        }
      };
      
      document.body.appendChild(trackingIframe);
      trackingIframe.src = 'about:blank';
      
      addLog('Iframe added to document with about:blank source');
      
      // Remove iframe after 10 seconds to allow debugging
      setTimeout(() => {
        if (document.body.contains(trackingIframe)) {
          document.body.removeChild(trackingIframe);
          addLog('Iframe removed from document');
        }
        setIsSubmitting(false);
      }, 10000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error creating iframe: ${errorMessage}`);
      setResponse(`Error: ${errorMessage}`);
      setIsSubmitting(false);
    }
  };

  const quickActionTests = [
    { label: 'Test Video Clicked', action: 'Video Clicked' },
    { label: 'Test Document Clicked', action: 'Document Clicked' }
  ];

  const testQuickAction = (action: string) => {
    setFormData(prev => ({ ...prev, text_ri__Action__c: action }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Video Tracking Endpoint Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Form Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="sObj">sObj</Label>
                  <Input
                    id="sObj"
                    name="sObj"
                    value={formData.sObj}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="string_ri__Contact__c">Contact ID</Label>
                  <Input
                    id="string_ri__Contact__c"
                    name="string_ri__Contact__c"
                    value={formData.string_ri__Contact__c}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="text_ri__Login_URL__c">Video URL</Label>
                  <Textarea
                    id="text_ri__Login_URL__c"
                    name="text_ri__Login_URL__c"
                    value={formData.text_ri__Login_URL__c}
                    onChange={handleInputChange}
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="text_ri__Action__c">Action</Label>
                  <Input
                    id="text_ri__Action__c"
                    name="text_ri__Action__c"
                    value={formData.text_ri__Action__c}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="text_ri__IP_Address__c">IP Address</Label>
                  <Input
                    id="text_ri__IP_Address__c"
                    name="text_ri__IP_Address__c"
                    value={formData.text_ri__IP_Address__c}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="text_ri__Login_Country__c">Country</Label>
                  <Input
                    id="text_ri__Login_Country__c"
                    name="text_ri__Login_Country__c"
                    value={formData.text_ri__Login_Country__c}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="text_ri__Login_City__c">City</Label>
                  <Input
                    id="text_ri__Login_City__c"
                    name="text_ri__Login_City__c"
                    value={formData.text_ri__Login_City__c}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="text_ri__Document_Title__c">Document Title</Label>
                  <Input
                    id="text_ri__Document_Title__c"
                    name="text_ri__Document_Title__c"
                    value={formData.text_ri__Document_Title__c}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Testing...' : 'Test Direct Fetch'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleIframeSubmit}
                    disabled={isSubmitting}
                  >
                    Test Iframe Method
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
                <CardTitle>Solution Found! ✅</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="font-semibold text-green-600">✅ Correct Action Values:</Label>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>• <code>Video Clicked</code></li>
                      <li>• <code>Document Clicked</code></li>
                    </ul>
                  </div>
                  
                  <div>
                    <Label className="font-semibold text-red-600">❌ Invalid Action Values:</Label>
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
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>✅ Problem Identified:</strong> SFDC endpoint was rejecting invalid Action values</li>
              <li><strong>✅ Solution Found:</strong> Use "Video Clicked" and "Document Clicked"</li>
              <li><strong>🔄 Next:</strong> Update loginService.ts trackDocumentClick function</li>
              <li><strong>🔄 Next:</strong> Update all components to use correct Action values</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestTracking;
