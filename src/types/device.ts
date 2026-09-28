export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'unknown';
export type OSType = 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'unknown';
export type BrowserType = 'chrome' | 'safari' | 'firefox' | 'edge' | 'opera' | 'unknown';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed' | 'reconnecting';

export interface Device {
  id: string;
  name: string; // e.g., "iPhone 15 Pro", "Windows PC"
  type: DeviceType;
  os: OSType;
  browser: BrowserType;
  isSelf: boolean;
  status: ConnectionStatus;
  joinedAt: number;
  ipHash?: string;
}
