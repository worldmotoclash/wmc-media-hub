import { getCurrentIpAddress, getIPLocation } from './loginService';

const W2X_ENGINE_URL = 'https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php';
const UPDATE_ENGINE_URL = 'https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/update-engine-contact.php';
const MEMBER_API_URL = 'https://api.realintelligence.com/api/specific-wmc-member-email.py';

export interface RacerMember {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  status: string;
  title?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  mailingstreet?: string;
  mailingcity?: string;
  mailingstate?: string;
  mailingzip?: string;
  mailingcountry?: string;
  membership?: string;
  membershipdate?: string;
  linkedin?: string;
  youtube?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  instagram?: string;
  birthdate?: string;
  emergencyname?: string;
  emergencyphone?: string;
  experiencelevel?: string;
  heightininches?: string;
  weightinlbs?: string;
  placeofbirth?: string;
}

/** Parse a RacerMember from an XML <member> element */
const parseRacerMemberXml = (member: Element): RacerMember => {
  const get = (tag: string) => member.getElementsByTagName(tag)[0]?.textContent || '';
  const getAny = (...tags: string[]) => {
    for (const tag of tags) {
      const val = get(tag);
      if (val) return val;
    }
    return '';
  };

  return {
    id: get('id'),
    email: get('email'),
    name: get('name'),
    firstName: getAny('firstname', 'firstName', 'FirstName', 'first_name'),
    lastName: getAny('lastname', 'lastName', 'LastName', 'last_name'),
    status: get('status'),
    title: getAny('jobtitle', 'title', 'Title', 'JobTitle'),
    phone: get('phone'),
    mobile: get('mobile'),
    website: get('website'),
    mailingstreet: get('mailingstreet'),
    mailingcity: getAny('MailingCity', 'mailingcity', 'city'),
    mailingstate: getAny('MailingState', 'mailingstate', 'state'),
    mailingzip: getAny('MailingPostalCode', 'mailingpostalcode', 'mailingzip', 'zip'),
    mailingcountry: getAny('MailingCountry', 'mailingcountry', 'country'),
    membership: get('membership'),
    membershipdate: get('membershipdate'),
    linkedin: getAny('rie__LinkedIn__c', 'linkedin', 'LinkedIn'),
    youtube: getAny('Youtube__c', 'youtube', 'YouTube'),
    facebook: getAny('rie__Facebook__c', 'facebook', 'Facebook'),
    twitter: getAny('rie__Twitter__c', 'twitter', 'Twitter'),
    tiktok: getAny('rie__TikTok__c', 'tiktok', 'TikTok'),
    instagram: getAny('instagram', 'Instagram', 'rie__Instagram__c'),
    birthdate: get('birthdate'),
    emergencyname: getAny('emergencyname', 'Emergency_Contact_Name__c'),
    emergencyphone: getAny('emergencyphone', 'Emergency_Contact_Phone__c'),
    experiencelevel: getAny('experiencelevel', 'Experience_Level__c'),
    heightininches: getAny('heightininches', 'Height_In_Inches__c'),
    weightinlbs: getAny('weightinlbs', 'Weight_in_lbs__c'),
    placeofbirth: getAny('placeofbirth', 'Place_of_Birth__c'),
  };
};

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

    return parseRacerMemberXml(member);
  }

  const data = await response.json();
  const item = Array.isArray(data) && data.length > 0 ? data[0] : data;
  if (!item || !item.id) return null;
  return item as RacerMember;
};

/** Submit form data via hidden iframe POST */
const submitViaIframe = (actionUrl: string, fields: Record<string, string>): Promise<void> => {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';

    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) { resolve(); return; }

        const form = doc.createElement('form');
        form.method = 'POST';
        form.action = actionUrl;

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

/** Submit form data to Salesforce via hidden iframe POST */
export const submitToSalesforce = (fields: Record<string, string>): Promise<void> => {
  return submitViaIframe(W2X_ENGINE_URL, fields);
};

/** Update racer profile in Salesforce */
export const updateRacerProfile = async (
  contactId: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    title?: string;
    phone?: string;
    mobile?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    linkedin?: string;
    youtube?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
    instagram?: string;
    dob?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    heightInInches?: string;
    weightInLbs?: string;
    placeOfBirth?: string;
  }
): Promise<void> => {
  const fields: Record<string, string> = {
    sObj: 'Contact',
    id_Contact: contactId,
  };

  if (data.firstName !== undefined) fields['string_FirstName'] = data.firstName;
  if (data.lastName !== undefined) fields['string_LastName'] = data.lastName;
  if (data.email !== undefined) fields['string_Email'] = data.email;
  if (data.title !== undefined) fields['string_Title'] = data.title;
  if (data.phone !== undefined) fields['phone_Phone'] = data.phone;
  if (data.mobile !== undefined) fields['phone_MobilePhone'] = data.mobile;
  if (data.street !== undefined) fields['text_MailingStreet'] = data.street;
  if (data.city !== undefined) fields['text_MailingCity'] = data.city;
  if (data.state !== undefined) fields['text_MailingState'] = data.state;
  if (data.zip !== undefined) fields['text_MailingPostalCode'] = data.zip;
  if (data.country !== undefined) fields['text_MailingCountry'] = data.country;
  if (data.linkedin !== undefined) fields['url_rie__LinkedIn__c'] = data.linkedin;
  if (data.youtube !== undefined) fields['url_Youtube__c'] = data.youtube;
  if (data.facebook !== undefined) fields['url_rie__Facebook__c'] = data.facebook;
  if (data.twitter !== undefined) fields['url_rie__Twitter__c'] = data.twitter;
  if (data.tiktok !== undefined) fields['url_rie__TikTok__c'] = data.tiktok;
  if (data.instagram !== undefined) fields['url_Instagram__c'] = data.instagram;
  if (data.dob !== undefined) fields['date_Birthdate'] = data.dob;
  if (data.emergencyContactName !== undefined) fields['string_Emergency_Contact_Name__c'] = data.emergencyContactName;
  if (data.emergencyContactPhone !== undefined) fields['phone_Emergency_Contact_Phone__c'] = data.emergencyContactPhone;
  if (data.heightInInches !== undefined) fields['string_Height_In_Inches__c'] = data.heightInInches;
  if (data.weightInLbs !== undefined) fields['string_Weight_in_lbs__c'] = data.weightInLbs;
  if (data.placeOfBirth !== undefined) fields['string_Place_of_Birth__c'] = data.placeOfBirth;

  await submitViaIframe(UPDATE_ENGINE_URL, fields);
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
  await submitViaIframe(UPDATE_ENGINE_URL, {
    sObj: 'Contact',
    id_Contact: contactId,
    ...stepData,
  });
};
