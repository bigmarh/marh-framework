import { Store } from '@marh/core';

/**
 * Base App Store State Interface
 * Shared between desktop and PWA templates
 */
export interface BaseAppState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  isLoading: boolean;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

/**
 * Base App Store - Shared functionality between desktop and PWA
 * 
 * This provides common app-wide state management that works
 * across both desktop and PWA templates.
 */
export abstract class BaseAppStore<T extends BaseAppState = BaseAppState> extends Store<T> {
  /**
   * Get current theme
   */
  get theme(): 'light' | 'dark' {
    return this.state.theme;
  }

  /**
   * Get sidebar state
   */
  get sidebarOpen(): boolean {
    return this.state.sidebarOpen;
  }

  /**
   * Get loading state
   */
  get isLoading(): boolean {
    return this.state.isLoading;
  }

  /**
   * Get all notifications
   */
  get notifications(): Notification[] {
    return this.state.notifications;
  }

  /**
   * Toggle between light and dark theme
   */
  toggleTheme(): void {
    this.setState({
      theme: this.state.theme === 'light' ? 'dark' : 'light'
    } as Partial<T>);
  }

  /**
   * Set specific theme
   */
  setTheme(theme: 'light' | 'dark'): void {
    this.setState({ theme } as Partial<T>);
  }

  /**
   * Toggle sidebar open/closed
   */
  toggleSidebar(): void {
    this.setState({
      sidebarOpen: !this.state.sidebarOpen
    } as Partial<T>);
  }

  /**
   * Set sidebar state
   */
  setSidebarOpen(open: boolean): void {
    this.setState({ sidebarOpen: open } as Partial<T>);
  }

  /**
   * Set global loading state
   */
  setLoading(loading: boolean): void {
    this.setState({ isLoading: loading } as Partial<T>);
  }

  /**
   * Add a notification
   */
  addNotification(message: string, type: Notification['type'] = 'info'): void {
    const notification: Notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date()
    };

    this.setState({
      notifications: [...this.state.notifications, notification]
    } as Partial<T>);

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, 5000);
  }

  /**
   * Remove a notification by ID
   */
  removeNotification(id: string): void {
    this.setState({
      notifications: this.state.notifications.filter(n => n.id !== id)
    } as Partial<T>);
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.setState({ notifications: [] } as Partial<T>);
  }

  /**
   * Get base reset state - override in subclasses to add platform-specific defaults
   */
  protected getBaseResetState(): BaseAppState {
    return {
      theme: 'light',
      sidebarOpen: false,
      isLoading: false,
      notifications: []
    };
  }
}