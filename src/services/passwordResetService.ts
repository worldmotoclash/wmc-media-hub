
import { toast } from 'sonner';

// Request password reset using an iframe to bypass CORS restrictions
export const requestPasswordReset = async (contactId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      console.log('Requesting password reset for contact ID:', contactId);
      
      // Create a hidden iframe element
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Define the full endpoint URL for the password reset request
      const updateUrl = 'https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/update-engine-contact.php';
      
      // Wait for iframe to load
      iframe.onload = () => {
        // Get the iframe document
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        
        if (iframeDoc) {
          // Create a form in the iframe
          const form = iframeDoc.createElement('form');
          form.method = 'POST';
          form.action = updateUrl;
          form.enctype = 'multipart/form-data'; // Set the correct form encoding
          
          // Add form fields with the correct field names
          const fields = {
            'id_Contact': contactId,
            'text_Reset_Password__c': 'Yes',
            'sObj': 'Contact'
          };
          
          // Add each field to the form
          Object.entries(fields).forEach(([name, value]) => {
            const input = iframeDoc.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value.toString();
            form.appendChild(input);
          });
          
          // Add form to iframe document and submit it
          iframeDoc.body.appendChild(form);
          console.log('Submitting password reset request via iframe with fields:', fields);
          
          // Track when iframe reloads after form submission
          iframe.onload = () => {
            // Consider the request successful if we get to this point
            console.log('Password reset request completed');
            
            // Remove iframe after processing is complete
            setTimeout(() => {
              document.body.removeChild(iframe);
              console.log('Password reset iframe removed');
              resolve(true);
            }, 1000);
          };
          
          // Submit the form
          form.submit();
        } else {
          console.error('Could not access iframe document');
          document.body.removeChild(iframe);
          resolve(false);
        }
      };
      
      // Set initial source to start the process
      iframe.src = 'about:blank';
      
    } catch (error) {
      console.error('Password reset request error:', error);
      resolve(false);
    }
  });
};

// Set new password using an iframe to bypass CORS restrictions
export const setNewPassword = async (contactId: string, password: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      console.log('Setting new password for contact ID:', contactId);
      
      // Create a hidden iframe element
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Define the full endpoint URL for the password update
      const updateUrl = 'https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/update-engine-contact.php';
      
      // Wait for iframe to load
      iframe.onload = () => {
        // Get the iframe document
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        
        if (iframeDoc) {
          // Create a form in the iframe
          const form = iframeDoc.createElement('form');
          form.method = 'POST';
          form.action = updateUrl;
          form.enctype = 'multipart/form-data'; // Set the correct form encoding
          
          // Add form fields with the correct field names
          const fields = {
            'id_Contact': contactId,
            'text_Reset_Password__c': '', // Clear the reset flag
            'string_ri__Password__c': password,
            'sObj': 'Contact'
          };
          
          // Add each field to the form
          Object.entries(fields).forEach(([name, value]) => {
            const input = iframeDoc.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value.toString();
            form.appendChild(input);
          });
          
          // Add form to iframe document and submit it
          iframeDoc.body.appendChild(form);
          console.log('Submitting password update via iframe with fields:', fields);
          
          // Track when iframe reloads after form submission
          iframe.onload = () => {
            // Consider the request successful if we get to this point
            console.log('Password update completed');
            
            // Remove iframe after processing is complete
            setTimeout(() => {
              document.body.removeChild(iframe);
              console.log('Password update iframe removed');
              resolve(true);
            }, 1000);
          };
          
          // Submit the form
          form.submit();
        } else {
          console.error('Could not access iframe document');
          document.body.removeChild(iframe);
          resolve(false);
        }
      };
      
      // Set initial source to start the process
      iframe.src = 'about:blank';
      
    } catch (error) {
      console.error('Password update error:', error);
      resolve(false);
    }
  });
};
