
/**
 * Utility functions for message submission
 */

interface MessageSubmissionParams {
  contactId: string;
  subject: string;
  message: string;
  recipientName: string;
}

// Submit message using iframe method
export const submitMessageViaIframe = async (params: MessageSubmissionParams): Promise<boolean> => {
  const { contactId, subject, message, recipientName } = params;
  
  try {
    console.log('Message submission initiated via iframe');
    console.log('Using member ID:', contactId);
    console.log('Message:', message);
    console.log('Subject:', subject);
    
    // Create a hidden iframe for submission
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // Wait for iframe to load
    await new Promise(resolve => {
      iframe.onload = resolve;
      iframe.src = 'about:blank';
    });
    
    // Get the iframe document
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!iframeDoc) {
      throw new Error('Cannot access iframe document');
    }
    
    // Create a form element
    const form = iframeDoc.createElement('form');
    form.method = 'POST';
    form.action = 'https://realintelligence.com/customers/expos/00D5e000000HEcP/submit-investor-task.php';
    
    // Add form fields with EXACT parameter names - matching case sensitivity
    const fields = [
      { name: 'ContactId', value: contactId },
      { name: 'Question', value: subject || 'Investor Question' },
      { name: 'relatedtoId', value: '0015e000006AFg7' },
      { name: 'Comments', value: message }
    ];
    
    // Log the exact values being submitted
    console.log('Form submission data:', Object.fromEntries(fields.map(f => [f.name, f.value])));
    
    // Add fields to form
    fields.forEach(field => {
      const input = iframeDoc.createElement('input');
      input.type = 'hidden';
      input.name = field.name;
      input.value = field.value;
      form.appendChild(input);
    });
    
    // Add form to iframe document
    iframeDoc.body.appendChild(form);
    
    // Submit the form
    console.log('Submitting form now...');
    form.submit();
    
    // Return true after submission
    return true;
  } catch (error) {
    console.error('Error in iframe submission:', error);
    return false;
  }
};

// Fallback submission method using direct URL
export const submitViaDirectUrl = (params: MessageSubmissionParams): boolean => {
  try {
    const { contactId, subject, message } = params;
    const encodedSubject = encodeURIComponent(subject || 'Investor Question');
    const encodedMessage = encodeURIComponent(message);
    
    const url = `https://realintelligence.com/customers/expos/00D5e000000HEcP/submit-investor-task.php?ContactId=${contactId}&Question=${encodedSubject}&relatedtoId=0015e000006AFg7&Comments=${encodedMessage}`;
    
    console.log('Direct URL submission:', url);
    
    // Create a hidden iframe for the URL submission
    const fallbackIframe = document.createElement('iframe');
    fallbackIframe.style.display = 'none';
    document.body.appendChild(fallbackIframe);
    
    // Wait for iframe to load
    const iframePromise = new Promise<void>(resolve => {
      fallbackIframe.onload = () => resolve();
      fallbackIframe.src = url;
    });
    
    // Set a timeout for the iframe load
    iframePromise.then(() => {
      console.log('Fallback iframe loaded successfully');
      
      // Remove iframe after a delay
      setTimeout(() => {
        document.body.removeChild(fallbackIframe);
        console.log('Fallback iframe removed');
      }, 5000);
    });
    
    return true;
  } catch (err) {
    console.error('Error with direct URL submission:', err);
    return false;
  }
};
