import type { Device, DeviceType, OSType, BrowserType } from '@/types/device';

export function getLocalDeviceInfo(): Device {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  let type: DeviceType = 'desktop';
  if (/mobile/i.test(ua)) type = 'mobile';
  else if (/ipad|tablet/i.test(ua)) type = 'tablet';

  let os: OSType = 'unknown';
  if (/iphone|ipad|ipod/i.test(ua)) os = 'ios';
  else if (/android/i.test(ua)) os = 'android';
  else if (/win/i.test(ua)) os = 'windows';
  else if (/mac/i.test(ua)) os = 'mac';
  else if (/linux/i.test(ua)) os = 'linux';

  let browser: BrowserType = 'unknown';
  if (/edg/i.test(ua)) browser = 'edge';
  else if (/chrome|crios/i.test(ua)) browser = 'chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'safari';
  else if (/opr|opera/i.test(ua)) browser = 'opera';

  const osFormatted = os.charAt(0).toUpperCase() + os.slice(1);
  const browserFormatted = browser.charAt(0).toUpperCase() + browser.slice(1);
  const name = type === 'mobile'
    ? `${osFormatted} Phone (${browserFormatted})`
    : type === 'tablet'
    ? `${osFormatted} Tablet (${browserFormatted})`
    : `${osFormatted} PC (${browserFormatted})`;

  let id = '';
  // Use sessionStorage first so two tabs in the same browser generate distinct device IDs
  if (typeof sessionStorage !== 'undefined') {
    id = sessionStorage.getItem('droplink_device_id') || '';
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('droplink_device_id', id);
    }
  } else if (typeof localStorage !== 'undefined') {
    id = localStorage.getItem('droplink_device_id') || '';
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('droplink_device_id', id);
    }
  } else {
    id = 'dev_' + Math.random().toString(36).substring(2, 9);
  }

  return {
    id,
    name,
    type,
    os,
    browser,
    isSelf: true,
    status: 'connected',
    joinedAt: Date.now(),
  };
}
