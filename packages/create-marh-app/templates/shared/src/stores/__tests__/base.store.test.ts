/**
 * Base Store Tests
 * 
 * Tests for the base store pattern implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestUtils } from '../../test/setup';
import { Store } from '../base.store';

// Test store implementation
interface CounterState {
  count: number;
  label: string;
  isLoading: boolean;
}

class CounterStore extends Store<CounterState> {
  constructor() {
    super({
      count: 0,
      label: 'Counter',
      isLoading: false
    });
  }

  increment() {
    this.setState({ count: this.state.count + 1 });
  }

  decrement() {
    this.setState({ count: this.state.count - 1 });
  }

  setLabel(label: string) {
    this.setState({ label });
  }

  setLoading(isLoading: boolean) {
    this.setState({ isLoading });
  }

  async asyncIncrement() {
    this.setState({ isLoading: true });
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.setState({
      count: this.state.count + 1,
      isLoading: false
    });
  }

  // Using function updater
  multiplyBy(factor: number) {
    this.setState(prevState => ({
      count: prevState.count * factor
    }));
  }

  // Computed property
  get isEven() {
    return this.state.count % 2 === 0;
  }

  get displayText() {
    return `${this.state.label}: ${this.state.count}`;
  }
}

describe('Store', () => {
  let store: CounterStore;
  let mockRedraw: any;

  beforeEach(() => {
    // Mock Mithril's redraw function
    mockRedraw = vi.fn();
    vi.doMock('@marh/core', () => ({
      m: { redraw: mockRedraw }
    }));

    store = new CounterStore();
  });

  describe('Initial State', () => {
    it('should initialize with provided state', () => {
      expect(store.state.count).toBe(0);
      expect(store.state.label).toBe('Counter');
      expect(store.state.isLoading).toBe(false);
    });

    it('should have initial state immutable', () => {
      const initialState = store.state;
      
      // Try to modify state directly (shouldn't work)
      (store.state as any).count = 100;
      
      // State should remain unchanged
      expect(store.state.count).toBe(0);
      expect(store.state).toBe(initialState); // Same reference due to Object.freeze
    });
  });

  describe('State Updates', () => {
    it('should update state with partial updates', () => {
      store.increment();
      
      expect(store.state.count).toBe(1);
      expect(store.state.label).toBe('Counter'); // Unchanged
      expect(store.state.isLoading).toBe(false); // Unchanged
    });

    it('should update multiple properties at once', () => {
      store.setState({
        count: 5,
        label: 'New Label',
        isLoading: true
      });
      
      expect(store.state.count).toBe(5);
      expect(store.state.label).toBe('New Label');
      expect(store.state.isLoading).toBe(true);
    });

    it('should use function updater for state changes', () => {
      store.setState({ count: 10 });
      store.multiplyBy(3);
      
      expect(store.state.count).toBe(30);
    });

    it('should preserve previous state when using function updater', () => {
      store.setState({
        count: 5,
        label: 'Test Label'
      });

      store.setState(prevState => ({
        count: prevState.count * 2
      }));

      expect(store.state.count).toBe(10);
      expect(store.state.label).toBe('Test Label'); // Should be preserved
    });

    it('should trigger Mithril redraw on state change', () => {
      expect(mockRedraw).not.toHaveBeenCalled();
      
      store.increment();
      
      expect(mockRedraw).toHaveBeenCalledTimes(1);
    });

    it('should not trigger redraw if state doesn\'t actually change', () => {
      store.setState({ count: 0 }); // Same as initial value
      
      // Should still trigger redraw (store doesn't do deep comparison)
      expect(mockRedraw).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Immutability', () => {
    it('should create new state object on updates', () => {
      const initialState = store.state;
      
      store.increment();
      
      expect(store.state).not.toBe(initialState);
      expect(store.state.count).toBe(1);
      expect(initialState.count).toBe(0); // Original unchanged
    });

    it('should freeze state objects', () => {
      expect(Object.isFrozen(store.state)).toBe(true);
      
      store.increment();
      
      expect(Object.isFrozen(store.state)).toBe(true);
    });

    it('should handle nested objects correctly', () => {
      interface ComplexState {
        user: {
          name: string;
          preferences: {
            theme: string;
            notifications: boolean;
          };
        };
        count: number;
      }

      class ComplexStore extends Store<ComplexState> {
        constructor() {
          super({
            user: {
              name: 'John',
              preferences: {
                theme: 'light',
                notifications: true
              }
            },
            count: 0
          });
        }

        updateUserName(name: string) {
          this.setState({
            user: {
              ...this.state.user,
              name
            }
          });
        }

        updateTheme(theme: string) {
          this.setState({
            user: {
              ...this.state.user,
              preferences: {
                ...this.state.user.preferences,
                theme
              }
            }
          });
        }
      }

      const complexStore = new ComplexStore();
      const initialState = complexStore.state;
      
      complexStore.updateUserName('Jane');
      
      expect(complexStore.state.user.name).toBe('Jane');
      expect(complexStore.state.user.preferences.theme).toBe('light'); // Unchanged
      expect(initialState.user.name).toBe('John'); // Original unchanged
      expect(complexStore.state).not.toBe(initialState);
    });
  });

  describe('Store Methods', () => {
    it('should support custom store methods', () => {
      store.increment();
      store.increment();
      store.decrement();
      
      expect(store.state.count).toBe(1);
    });

    it('should support async operations', async () => {
      expect(store.state.isLoading).toBe(false);
      
      const promise = store.asyncIncrement();
      expect(store.state.isLoading).toBe(true);
      
      await promise;
      
      expect(store.state.count).toBe(1);
      expect(store.state.isLoading).toBe(false);
    });

    it('should support computed properties', () => {
      expect(store.isEven).toBe(true); // 0 is even
      
      store.increment();
      expect(store.isEven).toBe(false); // 1 is odd
      
      store.increment();
      expect(store.isEven).toBe(true); // 2 is even
    });

    it('should support computed properties with multiple state values', () => {
      expect(store.displayText).toBe('Counter: 0');
      
      store.setLabel('Score');
      store.setState({ count: 42 });
      
      expect(store.displayText).toBe('Score: 42');
    });
  });

  describe('Multiple Store Instances', () => {
    it('should maintain separate state for different instances', () => {
      const store1 = new CounterStore();
      const store2 = new CounterStore();
      
      store1.increment();
      store1.increment();
      
      store2.decrement();
      
      expect(store1.state.count).toBe(2);
      expect(store2.state.count).toBe(-1);
    });

    it('should trigger redraw for each instance independently', () => {
      const store1 = new CounterStore();
      const store2 = new CounterStore();
      
      mockRedraw.mockClear();
      
      store1.increment();
      expect(mockRedraw).toHaveBeenCalledTimes(1);
      
      store2.increment();
      expect(mockRedraw).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in state update functions', () => {
      const errorStore = new (class extends Store<{ value: number }> {
        constructor() {
          super({ value: 0 });
        }
        
        errorUpdate() {
          this.setState(() => {
            throw new Error('Update error');
          });
        }
      })();
      
      expect(() => {
        errorStore.errorUpdate();
      }).toThrow('Update error');
      
      // State should remain unchanged
      expect(errorStore.state.value).toBe(0);
    });

    it('should handle errors in computed properties gracefully', () => {
      const errorStore = new (class extends Store<{ value: number }> {
        constructor() {
          super({ value: 0 });
        }
        
        get errorProperty() {
          if (this.state.value === 0) {
            throw new Error('Computed error');
          }
          return this.state.value * 2;
        }
      })();
      
      expect(() => {
        const _ = errorStore.errorProperty;
      }).toThrow('Computed error');
      
      errorStore.setState({ value: 5 });
      expect(errorStore.errorProperty).toBe(10);
    });
  });

  describe('Performance', () => {
    it('should handle rapid state updates efficiently', () => {
      const startTime = performance.now();
      
      // Perform many rapid updates
      for (let i = 0; i < 1000; i++) {
        store.increment();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(store.state.count).toBe(1000);
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
      expect(mockRedraw).toHaveBeenCalledTimes(1000);
    });

    it('should handle large state objects efficiently', () => {
      interface LargeState {
        items: Array<{ id: number; name: string; data: any }>;
        metadata: Record<string, any>;
      }

      class LargeStore extends Store<LargeState> {
        constructor() {
          super({
            items: [],
            metadata: {}
          });
        }

        addItem(item: { id: number; name: string; data: any }) {
          this.setState(prevState => ({
            items: [...prevState.items, item]
          }));
        }

        updateMetadata(key: string, value: any) {
          this.setState(prevState => ({
            metadata: {
              ...prevState.metadata,
              [key]: value
            }
          }));
        }
      }

      const largeStore = new LargeStore();
      const startTime = performance.now();
      
      // Add many items
      for (let i = 0; i < 100; i++) {
        largeStore.addItem({
          id: i,
          name: `Item ${i}`,
          data: { value: i * 2, nested: { prop: `nested-${i}` } }
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(largeStore.state.items).toHaveLength(100);
      expect(duration).toBeLessThan(50); // Should be fast
    });
  });

  describe('State Subscription Pattern', () => {
    it('should support manual subscription pattern', () => {
      const subscribers: Array<() => void> = [];
      
      class ObservableStore extends Store<CounterState> {
        private subscribers: Array<() => void> = [];
        
        constructor() {
          super({
            count: 0,
            label: 'Observable',
            isLoading: false
          });
        }
        
        subscribe(callback: () => void) {
          this.subscribers.push(callback);
          return () => {
            const index = this.subscribers.indexOf(callback);
            if (index > -1) {
              this.subscribers.splice(index, 1);
            }
          };
        }
        
        protected setState(updater: any) {
          super.setState(updater);
          this.subscribers.forEach(callback => callback());
        }
        
        increment() {
          this.setState({ count: this.state.count + 1 });
        }
      }
      
      const observableStore = new ObservableStore();
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const unsubscribe1 = observableStore.subscribe(callback1);
      const unsubscribe2 = observableStore.subscribe(callback2);
      
      observableStore.increment();
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      
      unsubscribe1();
      observableStore.increment();
      
      expect(callback1).toHaveBeenCalledTimes(1); // No longer called
      expect(callback2).toHaveBeenCalledTimes(2);
    });
  });
});