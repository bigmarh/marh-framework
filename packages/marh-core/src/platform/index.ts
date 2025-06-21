export type Platform = 'desktop' | 'web' | 'mobile';

export interface PlatformInfo {
  platform: Platform;
  isElectron: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isWeb: boolean;
  userAgent: string;
  supportsServiceWorker: boolean;
}

function detectPlatform(): PlatformInfo {
  // Check if running in Node.js environment (server-side)
  if (typeof window === 'undefined') {
    return {
      platform: 'desktop',
      isElectron: false,
      isMobile: false,
      isDesktop: true,
      isWeb: false,
      userAgent: '',
      supportsServiceWorker: false
    };
  }

  const userAgent = window.navigator.userAgent;
  
  // Check if running in Electron
  const isElectron = !!(window as any).electronAPI || 
                    userAgent.includes('Electron') ||
                    !!(process && (process as any).versions && (process as any).versions.electron);

  // Check if mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Check service worker support
  const supportsServiceWorker = 'serviceWorker' in navigator;

  let platform: Platform;
  if (isElectron) {
    platform = 'desktop';
  } else if (isMobile) {
    platform = 'mobile';
  } else {
    platform = 'web';
  }

  return {
    platform,
    isElectron,
    isMobile,
    isDesktop: isElectron || (!isMobile && typeof window !== 'undefined'),
    isWeb: !isElectron,
    userAgent,
    supportsServiceWorker
  };
}

// Cache the platform info since it won't change during runtime
let platformInfo: PlatformInfo | null = null;

export function getPlatform(): PlatformInfo {
  if (!platformInfo) {
    platformInfo = detectPlatform();
  }
  return platformInfo;
}

export function isElectron(): boolean {
  return getPlatform().isElectron;
}

export function isMobile(): boolean {
  return getPlatform().isMobile;
}

export function isDesktop(): boolean {
  return getPlatform().isDesktop;
}

export function isWeb(): boolean {
  return getPlatform().isWeb;
}

export function supportsServiceWorker(): boolean {
  return getPlatform().supportsServiceWorker;
}