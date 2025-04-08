export interface KaspaProvider {
  request: (method: string, args?: any) => Promise<any>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export interface ProviderInfo {
  id: string;
  name: string;
  icon: string;
  methods: string[];
}

export interface Message {
  eventId: string;
  extensionId: string;
  method: string;
  args?: any[];
  error?: any;
}

declare global {
  interface Window {
    kaspaProvider: KaspaProvider;
  }
}
