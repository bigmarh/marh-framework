import m from 'mithril';

/**
 * Base Store class for managing global state in MARH applications
 * 
 * This provides a simple reactive state management pattern that integrates
 * seamlessly with Mithril's redraw system.
 * 
 * Usage:
 * 1. Extend this class for your specific stores
 * 2. Use setState() to update state and trigger re-renders
 * 3. Subscribe components to state changes by accessing store properties
 */
export abstract class Store<T = any> {
  protected state: T;

  constructor(initialState: T) {
    this.state = initialState;
  }

  /**
   * Get the current state (read-only)
   */
  public getState(): Readonly<T> {
    return this.state;
  }

  /**
   * Update state and trigger Mithril redraw
   * 
   * @param updates - Partial state updates or updater function
   */
  protected setState(updates: Partial<T> | ((prevState: T) => Partial<T>)): void {
    if (typeof updates === 'function') {
      const updatedState = updates(this.state);
      this.state = { ...this.state, ...updatedState };
    } else {
      this.state = { ...this.state, ...updates };
    }
    
    // Trigger Mithril redraw to update all components
    m.redraw();
  }

  /**
   * Reset state to initial values
   */
  public abstract reset(): void;
}

/**
 * Simple observable store without classes (alternative pattern)
 * 
 * For simpler use cases where you don't need inheritance
 */
export function createStore<T>(initialState: T) {
  let state = initialState;
  
  return {
    get: (): Readonly<T> => state,
    
    set: (updates: Partial<T> | ((prevState: T) => Partial<T>)): void => {
      if (typeof updates === 'function') {
        const updatedState = updates(state);
        state = { ...state, ...updatedState };
      } else {
        state = { ...state, ...updates };
      }
      m.redraw();
    },
    
    reset: (): void => {
      state = initialState;
      m.redraw();
    }
  };
}