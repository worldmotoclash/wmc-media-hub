import { getCurrentIpAddress, getIPLocation } from './loginService';

const W2X_ENGINE_URL = 'https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php';
const MEMBER_API_URL = 'https://api.realintelligence.com/api/specific-wmc-member-email.py';

export interface RacerMember {
  id: string;
  email: string;
  name: string;
  status: string;
  phone?: string;
  mobile?: string;
  mailingstreet?: string;
}

/** Validate racer email against RI API. Returns member data or null. */
export const validateRacerEmail = async (email: string): Promise<RacerMember | null> => {
  const url = `${MEMBER_API_URL}?orgId=00D5e000000HEcP&email=${encodeURIComponent(email)}&sandbox=False`;
  const response = await fetch(url);

  if (!response.ok) throw new Error('Failed to reach member API');

  const contentType = response.headers.get('content-type');

  if (contentType?.includes('xml')) {
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    const member = doc.getElementsByTagName('member')[0];

    if (!member) return null;

    const get = (tag: string) => member.getElementsByTagName(tag)[0]?.textContent || '';

    return {
      id: get('id'),
      email: get('email'),
      name: get('name'),
      status: get('status'),
      phone: get('phone'),
      mobile: get('mobile'),
      mailingstreet: get('mailingstreet'),
    };
  }

  const data = await response.json();
  const item = Array.isArray(data) && data.length > 0 ? data[0] : data;
  if (!item || !item.id) return null;
  return item as RacerMember;
};

/** Submit form data to Salesforce via hidden iframe POST */
export const submitToSalesforce = (fields: Record<string, string>): Promise<void> => {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';

    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) { resolve(); return; }

        const form = doc.createElement('form');
        form.method = 'POST';
        form.action = W2X_ENGINE_URL;

        Object.entries(fields).forEach(([name, value]) => {
          const input = doc.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
        });

        doc.body.appendChild(form);
        form.submit();
      } catch (err) {
        console.error('[racerService] iframe POST error:', err);
      }
    };

    document.body.appendChild(iframe);
    iframe.src = 'about:blank';

    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      resolve();
    }, 5000);
  });
};

/** Track racer login activity to Salesforce */
export const trackRacerLogin = async (contactId: string): Promise<void> => {
  const ip = await getCurrentIpAddress();
  const location = await getIPLocation(ip);

  await submitToSalesforce({
    sObj: 'ri__Portal__c',
    'string_ri__Contact__c': contactId,
    'text_ri__Login_URL__c': window.location.href,
    'text_ri__Action__c': 'Racer Portal Login',
    'text_ri__IP_Address__c': ip,
    'text_ri__Login_Country__c': location.country,
    'text_ri__Login_City__c': location.city,
  });
};

/** Submit racer application step data */
export const submitRacerApplication = async (
  contactId: string,
  stepData: Record<string, string>
): Promise<void> => {
  await submitToSalesforce({
    sObj: 'Contact',
    id_Contact: contactId,
    ...stepData,
  });
};
