import { m, MarhComponent } from '@marh/core';
import { appStore } from './stores/app.store';
import { counterStore } from './stores/counter.store';

/**
 * App Component - Root component for the PWA application
 * 
 * This component demonstrates:
 * - Store initialization for PWA-specific features
 * - Global state management setup
 * - PWA lifecycle management (online/offline, install prompt)
 * 
 * Store Usage Guidelines:
 * - Use stores for state that needs to be shared across multiple components
 * - Use local component state (this.property) for component-specific state
 * - Stores automatically trigger re-renders when state changes via setState()
 * - PWA stores handle online/offline events and install prompts automatically
 */
export const App: MarhComponent = {
  oninit() {
    // Stores are automatically initialized when imported
    console.log('PWA App initialized');
    console.log('Initial counter value:', counterStore.count);
    console.log('Initial theme:', appStore.theme);
    console.log('Online status:', appStore.isOnline);
    
    // Example: Initialize app settings from localStorage
    // const savedTheme = localStorage.getItem('theme');
    // if (savedTheme) appStore.setTheme(savedTheme);
    
    // PWA-specific initialization
    // The appStore automatically handles:
    // - Online/offline events
    // - Install prompt capture
    // - Service worker registration status
  },

  view() {
    return <div id="app"></div>;
  }
};