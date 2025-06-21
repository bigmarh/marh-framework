import { m, MarhComponent } from '@marh/core';
import { appStore } from './stores/app.store';
import { counterStore } from './stores/counter.store';

/**
 * App Component - Root component for the application
 * 
 * This component demonstrates:
 * - Store initialization (though stores are singletons, they're imported here for clarity)
 * - Global state management setup
 * - Component lifecycle management
 * 
 * Store Usage Guidelines:
 * - Use stores for state that needs to be shared across multiple components
 * - Use local component state (this.property) for component-specific state
 * - Stores automatically trigger re-renders when state changes via setState()
 */
export const App: MarhComponent = {
  oninit() {
    // Stores are automatically initialized when imported
    // This is just for demonstration - you could initialize settings here
    console.log('App initialized');
    console.log('Initial counter value:', counterStore.count);
    console.log('Initial theme:', appStore.theme);
    
    // Example: Initialize app settings from localStorage or API
    // const savedTheme = localStorage.getItem('theme');
    // if (savedTheme) appStore.setTheme(savedTheme);
  },

  view() {
    return <div id="app"></div>;
  }
};