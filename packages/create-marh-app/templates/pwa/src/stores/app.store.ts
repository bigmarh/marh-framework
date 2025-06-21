import { BaseAppStore, BaseAppState } from '../../shared/src/stores/base-app.store';

/**
 * PWA App Store State Interface
 * Extends the base app state with PWA-specific features
 */
interface PWAAppState extends BaseAppState {
  isOnline: boolean;
  installPrompt: any | null;
}

/**
 * PWA App Store - PWA-specific application state management
 * 
 * This extends the shared BaseAppStore with PWA-specific functionality
 * like online/offline status and install prompt handling.
 */
class PWAAppStore extends BaseAppStore<PWAAppState> {
  constructor() {
    super({
      ...super.prototype.getBaseResetState(),
      isOnline: navigator.onLine,
      installPrompt: null
    } as PWAAppState);

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.setState({ isOnline: true });
      this.addNotification('Connection restored', 'success');
    });

    window.addEventListener('offline', () => {
      this.setState({ isOnline: false });
      this.addNotification('You are now offline', 'warning');
    });

    // Listen for PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.setState({ installPrompt: e });
    });
  }

  /**
   * Get online status
   */
  get isOnline(): boolean {
    return this.state.isOnline;
  }

  /**
   * Get install prompt (if available)
   */
  get canInstall(): boolean {
    return this.state.installPrompt !== null;
  }

  /**
   * Trigger PWA install prompt
   */
  async promptInstall(): Promise<void> {
    if (this.state.installPrompt) {
      const result = await this.state.installPrompt.prompt();
      console.log('Install prompt result:', result);
      this.setState({ installPrompt: null });
    }
  }

  /**
   * Reset app state to defaults
   */
  reset(): void {
    this.setState({
      ...this.getBaseResetState(),
      isOnline: navigator.onLine,
      installPrompt: null
    } as Partial<PWAAppState>);
  }
}

// Export a singleton instance
export const appStore = new PWAAppStore();