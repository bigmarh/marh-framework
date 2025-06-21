// @ts-ignore - This import will be available when template is used in a project
import { m, MarhComponent } from '@marh/core';
import { cacheService } from '../services/cache.service';

// @ts-ignore - JSX types for template file
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

interface ApiData {
  id: number;
  title: string;
  timestamp: string;
}

/**
 * Cache Demo Component
 * 
 * Demonstrates cache service usage with:
 * - Basic caching with TTL
 * - Cache statistics
 * - Manual invalidation
 * - Loading states
 */
export const CacheDemo: MarhComponent = {
  oninit() {
    this.loading = false;
    this.data = null;
    this.error = null;
  },

  async fetchData(useCache: boolean = true) {
    this.loading = true;
    this.error = null;
    m.redraw();

    try {
      const data = useCache
        ? await cacheService.get<ApiData>(
            'demo-api-data',
            async () => {
              // Simulate API call
              await new Promise(resolve => setTimeout(resolve, 1000));
              return {
                id: Math.floor(Math.random() * 1000),
                title: 'Cached API Response',
                timestamp: new Date().toISOString()
              };
            },
            30000 // 30 second TTL
          )
        : await (async () => {
            // Direct fetch without cache
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
              id: Math.floor(Math.random() * 1000),
              title: 'Fresh API Response',
              timestamp: new Date().toISOString()
            };
          })();

      this.data = data;
    } catch (error: any) {
      this.error = error.message;
    } finally {
      this.loading = false;
      m.redraw();
    }
  },

  view() {
    const stats = cacheService.getStats();

    return (
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-semibold text-gray-800 mb-4">
          Cache Service Demo
        </h3>

        {/* Cache Statistics */}
        <div class="bg-gray-50 rounded p-3 mb-4">
          <h4 class="font-medium text-gray-700 mb-2">Cache Statistics</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span class="text-gray-600">Size:</span>
              <span class="ml-2 font-medium">{stats.size}/{stats.maxSize}</span>
            </div>
            <div>
              <span class="text-gray-600">Hit Rate:</span>
              <span class="ml-2 font-medium">{stats.hitRate}</span>
            </div>
            <div>
              <span class="text-gray-600">Hits:</span>
              <span class="ml-2 font-medium text-green-600">{stats.hits}</span>
            </div>
            <div>
              <span class="text-gray-600">Misses:</span>
              <span class="ml-2 font-medium text-red-600">{stats.misses}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div class="flex flex-wrap gap-2 mb-4">
          <button
            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            onclick={() => this.fetchData(true)}
            disabled={this.loading}
          >
            Fetch (with cache)
          </button>
          <button
            class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            onclick={() => this.fetchData(false)}
            disabled={this.loading}
          >
            Fetch (no cache)
          </button>
          <button
            class="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
            onclick={() => {
              cacheService.invalidate('demo-api-data');
              this.data = null;
              m.redraw();
            }}
          >
            Invalidate Cache
          </button>
          <button
            class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            onclick={() => {
              cacheService.clear();
              this.data = null;
              m.redraw();
            }}
          >
            Clear All Cache
          </button>
        </div>

        {/* Results */}
        {this.loading && (
          <div class="flex items-center justify-center py-4">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span class="ml-2 text-gray-600">Loading...</span>
          </div>
        )}

        {this.error && (
          <div class="bg-red-50 border border-red-200 rounded p-3">
            <p class="text-red-600 text-sm">Error: {this.error}</p>
          </div>
        )}

        {this.data && !this.loading && (
          <div class="bg-gray-50 rounded p-3">
            <h4 class="font-medium text-gray-700 mb-2">Response Data:</h4>
            <pre class="text-xs text-gray-600 overflow-x-auto">
              {JSON.stringify(this.data, null, 2)}
            </pre>
            <p class="text-xs text-gray-500 mt-2">
              {cacheService.has('demo-api-data') ? 
                '✓ This data was served from cache' : 
                '⟳ This data was freshly fetched'}
            </p>
          </div>
        )}

        <div class="mt-4 text-xs text-gray-500">
          <p>• Cached data expires after 30 seconds</p>
          <p>• Hit rate improves with repeated requests</p>
          <p>• Cache persists across component re-renders</p>
        </div>
      </div>
    );
  }
};