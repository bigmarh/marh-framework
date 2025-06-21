import m from 'mithril';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface AsyncOptions {
  immediate?: boolean;
}

/**
 * useAsync hook for Mithril components
 * Note: This should be called within the component's oninit or view method
 * and the component should store the returned state on itself
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: any[] = [],
  options: AsyncOptions = {}
): AsyncState<T> & { execute: () => Promise<void> } {
  const { immediate = true } = options;
  
  // Create a unique key for this async operation
  const key = `${asyncFn.toString()}_${JSON.stringify(deps)}`;
  
  // Get or create state for this operation
  if (!globalAsyncStates.has(key)) {
    globalAsyncStates.set(key, {
      data: null,
      loading: false,
      error: null,
      initialized: false
    });
  }
  
  const state = globalAsyncStates.get(key)!;

  const execute = async (): Promise<void> => {
    try {
      state.loading = true;
      state.error = null;
      m.redraw();
      
      const result = await asyncFn();
      state.data = result;
      state.loading = false;
      m.redraw();
    } catch (error) {
      state.error = error instanceof Error ? error : new Error(String(error));
      state.loading = false;
      m.redraw();
    }
  };

  // Execute immediately if requested and not already initialized
  if (immediate && !state.initialized) {
    state.initialized = true;
    execute();
  }

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    execute
  };
}

// Global state store for async operations
const globalAsyncStates = new Map<string, AsyncState<any> & { initialized: boolean }>();

/**
 * Helper to create async state that's properly managed by component lifecycle
 */
  export function createAsyncState<T>(
    component: any,
    asyncFn: () => Promise<T>,
    _options: AsyncOptions = {}
  ): AsyncState<T> & { execute: () => Promise<void> } {
  
  // Initialize state on component if not exists
  if (!component.asyncState) {
    component.asyncState = {
      data: null,
      loading: false,
      error: null
    };
  }

  const execute = async (): Promise<void> => {
    try {
      component.asyncState.loading = true;
      component.asyncState.error = null;
      m.redraw();
      
      const result = await asyncFn();
      component.asyncState.data = result;
      component.asyncState.loading = false;
      m.redraw();
    } catch (error) {
      component.asyncState.error = error instanceof Error ? error : new Error(String(error));
      component.asyncState.loading = false;
      m.redraw();
    }
  };

  return {
    ...component.asyncState,
    execute
  };
}

export function useAsyncCallback<T, Args extends any[]>(
  asyncFn: (...args: Args) => Promise<T>
): [(...args: Args) => Promise<void>, AsyncState<T>] {
  const state: AsyncState<T> = {
    data: null,
    loading: false,
    error: null
  };

  const callback = async (...args: Args): Promise<void> => {
    try {
      state.loading = true;
      state.error = null;
      m.redraw();
      
      const result = await asyncFn(...args);
      state.data = result;
      state.loading = false;
      m.redraw();
    } catch (error) {
      state.error = error instanceof Error ? error : new Error(String(error));
      state.loading = false;
      m.redraw();
    }
  };

  return [callback, state];
}