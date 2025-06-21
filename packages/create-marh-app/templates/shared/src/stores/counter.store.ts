import { Store } from '@marh/core';

/**
 * Counter Store State Interface
 */
interface CounterState {
  count: number;
  step: number;
}

/**
 * Counter Store - Simple example of reactive state management
 * 
 * This demonstrates:
 * - Extending the base Store class
 * - Managing simple numeric state
 * - Triggering re-renders with setState()
 * - Exposing methods for components to interact with state
 * 
 * This is shared between desktop and PWA templates.
 */
class CounterStore extends Store<CounterState> {
  constructor() {
    super({
      count: 0,
      step: 1
    });
  }

  /**
   * Get the current count value
   */
  get count(): number {
    return this.state.count;
  }

  /**
   * Get the current step value
   */
  get step(): number {
    return this.state.step;
  }

  /**
   * Increment the counter by the current step
   */
  increment(): void {
    this.setState({
      count: this.state.count + this.state.step
    });
  }

  /**
   * Decrement the counter by the current step
   */
  decrement(): void {
    this.setState({
      count: this.state.count - this.state.step
    });
  }

  /**
   * Set a specific count value
   */
  setCount(value: number): void {
    this.setState({ count: value });
  }

  /**
   * Set the step size for increment/decrement
   */
  setStep(value: number): void {
    this.setState({ step: value });
  }

  /**
   * Reset counter to initial state
   */
  reset(): void {
    this.setState({
      count: 0,
      step: 1
    });
  }
}

// Export a singleton instance
export const counterStore = new CounterStore();