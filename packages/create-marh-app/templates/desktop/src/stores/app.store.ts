import { BaseAppStore, BaseAppState } from '../../shared/src/stores/base-app.store';

/**
 * Desktop App Store State Interface
 * Extends the base app state with desktop-specific features
 */
interface DesktopAppState extends BaseAppState {
  // Add desktop-specific state here if needed
  // For example: windowMaximized, menuVisible, etc.
}

/**
 * Desktop App Store - Desktop-specific application state management
 * 
 * This extends the shared BaseAppStore with desktop-specific functionality.
 * Most common app state is handled by the base class.
 */
class DesktopAppStore extends BaseAppStore<DesktopAppState> {
  constructor() {
    super({
      ...super.prototype.getBaseResetState(),
      // Add desktop-specific defaults here
    } as DesktopAppState);
  }

  /**
   * Desktop-specific methods can be added here
   * For example: window management, native menu interactions, etc.
   */

  /**
   * Reset app state to defaults
   */
  reset(): void {
    this.setState({
      ...this.getBaseResetState(),
      // Add desktop-specific reset values here
    } as Partial<DesktopAppState>);
  }
}

// Export a singleton instance
export const appStore = new DesktopAppStore();