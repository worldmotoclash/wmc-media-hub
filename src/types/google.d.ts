
interface GoogleIdentityServicesEvent {
  type: string;
  detail: any;
}

interface GsiButtonConfiguration {
  type: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: string | number;
  local?: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: any) => void;
  callback: (response: TokenResponse) => void;
}

interface GoogleAccountsOauth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: any) => void;
  }) => TokenClient;
}

interface GoogleAccounts {
  id: {
    initialize: (config: object) => void;
    renderButton: (element: HTMLElement, config: GsiButtonConfiguration) => void;
    prompt: () => void;
  };
  oauth2: GoogleAccountsOauth2;
}

interface Window {
  google?: {
    accounts: GoogleAccounts;
  };
}
