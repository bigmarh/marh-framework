import { m, MarhComponent } from '@marh/core';
import { counterStore } from '../stores/counter.store';

/**
 * Store Counter Component - Demonstrates global state management
 * 
 * This component is shared between desktop and PWA templates and shows:
 * - Using global store state
 * - Reactive updates when store state changes
 * - Multiple ways to interact with store (buttons, inputs)
 */
export const StoreCounter: MarhComponent = {
  view() {
    return (
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-semibold text-gray-800 mb-4">
          Store Counter (Global State Management)
        </h3>
        <div class="flex items-center space-x-4 mb-4">
          <button
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            onclick={() => counterStore.decrement()}
          >
            -
          </button>
          <span class="text-2xl font-bold text-gray-900">{counterStore.count}</span>
          <button
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            onclick={() => counterStore.increment()}
          >
            +
          </button>
        </div>
        <div class="flex items-center space-x-2 mb-2">
          <label class="text-sm text-gray-600">Step:</label>
          <input
            class="w-16 px-2 py-1 border border-gray-300 rounded text-center"
            type="number"
            value={counterStore.step}
            oninput={(e: any) => counterStore.setStep(parseInt(e.target.value) || 1)}
          />
        </div>
        <div class="flex space-x-2">
          <button
            class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            onclick={() => counterStore.reset()}
          >
            Reset
          </button>
          <button
            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            onclick={() => counterStore.setCount(100)}
          >
            Set to 100
          </button>
        </div>
        <p class="text-sm text-gray-600 mt-2">
          This counter uses global store state - changes are shared across components!
        </p>
      </div>
    );
  }
};