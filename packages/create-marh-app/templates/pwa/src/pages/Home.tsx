import { m, useAsync, platform, getStorage, MarhComponent } from '@marh/core';
import { counterStore } from '../stores/counter.store';
import { appStore } from '../stores/app.store';
import { StoreCounter } from '../../shared/src/components/StoreCounter';
import { NotificationList } from '../../shared/src/components/NotificationList';
import { CacheDemo } from '../../shared/src/components/CacheDemo';
import { CrudDemo } from '../../shared/src/components/CrudDemo';
import { DatabaseDemo } from '../../shared/src/components/DatabaseDemo';

interface User {
  id: number;
  name: string;
  email: string;
}

interface StoredData {
  timestamp: string;
  message: string;
  counter: number;
}

const fetchUsers = async (): Promise<User[]> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  return [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
  ];
};

let storedData: StoredData | null = null;

const loadStoredData = async () => {
  const storage = getStorage();
  const stored = await storage.get<StoredData>('demo-data');
  if (stored) {
    storedData = stored;
    m.redraw();
  }
};

const saveData = async () => {
  const storage = getStorage();
  const data: StoredData = { 
    timestamp: new Date().toISOString(),
    message: 'Hello from MARH PWA!',
    counter: (storedData?.counter || 0) + 1
  };
  await storage.set('demo-data', data);
  storedData = data;
  m.redraw();
};

const clearData = async () => {
  const storage = getStorage();
  await storage.remove('demo-data');
  storedData = null;
  m.redraw();
};

// PWA-specific settings component
const PWASettings: MarhComponent = {
  view() {
    return (
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-semibold text-gray-800 mb-4">
          PWA Settings & Status
        </h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-gray-700">Theme:</span>
            <button
              class={`px-3 py-1 rounded transition-colors ${
                appStore.theme === 'light' 
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                  : 'bg-gray-800 text-white hover:bg-gray-900'
              }`}
              onclick={() => appStore.toggleTheme()}
            >
              {appStore.theme === 'light' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-700">Connection:</span>
            <span class={`px-2 py-1 rounded text-sm ${
              appStore.isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {appStore.isOnline ? '🟢 Online' : '🔴 Offline'}
            </span>
          </div>
          {appStore.canInstall && (
            <div class="flex items-center justify-between">
              <span class="text-gray-700">Install PWA:</span>
              <button
                class="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
                onclick={() => appStore.promptInstall()}
              >
                📱 Install App
              </button>
            </div>
          )}
          <div class="flex space-x-2">
            <button
              class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              onclick={() => appStore.addNotification('PWA is working!', 'success')}
            >
              Test Notification
            </button>
            <button
              class="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
              onclick={() => appStore.addNotification('Offline ready!', 'info')}
            >
              Offline Test
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export const Home: MarhComponent = {
  oninit() {
    // Load stored data
    loadStoredData();
  },

  view() {
    const { data: users, loading, error } = useAsync(fetchUsers);

    return (
      <div class="min-h-screen bg-gray-100 py-12 px-4">
        <div class="max-w-4xl mx-auto space-y-8">
          <h1 class="text-4xl font-bold text-gray-900 text-center">
            Welcome to MARH PWA Framework
          </h1>
          
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-semibold text-gray-800 mb-4">
              Platform Information
            </h2>
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <p><strong>Platform:</strong> {platform.platform}</p>
                <p><strong>Is Electron:</strong> {platform.isElectron ? 'Yes' : 'No'}</p>
                <p><strong>Is Mobile:</strong> {platform.isMobile ? 'Yes' : 'No'}</p>
                <p><strong>Is Desktop:</strong> {platform.isDesktop ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p><strong>Is Web:</strong> {platform.isWeb ? 'Yes' : 'No'}</p>
                <p><strong>Service Worker Support:</strong> {platform.supportsServiceWorker ? 'Yes' : 'No'}</p>
                <p><strong>User Agent:</strong> {platform.userAgent.substring(0, 50)}...</p>
              </div>
            </div>
          </div>

          {/* Store Examples - Global State Management */}
          <div class="grid gap-6 md:grid-cols-2">
            <StoreCounter />
            <PWASettings />
          </div>

          {/* Show notifications using shared component */}
          <NotificationList appStore={appStore} />

          {/* Cache Service Demo */}
          <CacheDemo />

          {/* CRUD Service Demo */}
          <CrudDemo />

          {/* Database System Demo */}
          <DatabaseDemo />

          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-semibold text-gray-800 mb-4">
              Cross-Platform Storage Demo (Local State)
            </h2>
            <div class="space-y-4">
              <div class="flex gap-2">
                <button
                  class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  onclick={() => saveData()}
                >
                  Save Data
                </button>
                <button
                  class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  onclick={() => clearData()}
                >
                  Clear Data
                </button>
              </div>
              
              {storedData && (
                <div class="bg-gray-50 p-4 rounded border">
                  <h4 class="font-semibold">Stored Data:</h4>
                  <pre class="text-sm text-gray-600 mt-2">{JSON.stringify(storedData, null, 2)}</pre>
                </div>
              )}
              
              {!storedData && (
                <p class="text-gray-600">No data stored yet. Click "Save Data" to test storage.</p>
              )}
            </div>
          </div>
          
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-semibold text-gray-800 mb-4">
              PWA Features
            </h2>
            <ul class="space-y-2 text-gray-600">
              <li>✅ Progressive Web App with service worker</li>
              <li>✅ Offline support and caching</li>
              <li>✅ Installable on mobile and desktop</li>
              <li>✅ Cross-platform storage abstraction</li>
              <li>✅ Platform detection and adaptation</li>
              <li>✅ Responsive design with TailwindCSS</li>
              <li>✅ JSX with proper Mithril syntax</li>
            </ul>
          </div>

          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-semibold text-gray-800 mb-4">
              Users List (useAsync Hook & JSX Lists)
            </h2>
            
            {loading && (
              <div class="flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span class="ml-2 text-gray-600">Loading users...</span>
              </div>
            )}
            
            {error && (
              <div class="bg-red-50 border border-red-200 rounded-md p-4">
                <p class="text-red-600">Error: {error.message}</p>
              </div>
            )}
            
            {users && !loading && (
              <>
                <p class="text-gray-600 mb-4">
                  Demonstrating JSX list rendering with proper keys and Mithril syntax:
                </p>
                <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {users.map(user => (
                    <div key={user.id} class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h3 class="font-semibold text-gray-900">{user.name}</h3>
                      <p class="text-gray-600 text-sm">{user.email}</p>
                      <div class="mt-2">
                        <span class="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          PWA User #{user.id}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div class="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-green-900 mb-2">
              PWA Installation
            </h3>
            <p class="text-green-700">
              This app can be installed on your device! Look for the install prompt 
              or use your browser's "Add to Home Screen" or "Install App" option.
            </p>
          </div>

          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">
              JSX Best Practices in PWA
            </h3>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>• Use <code class="bg-gray-200 px-1 rounded">class</code> instead of <code class="bg-gray-200 px-1 rounded">className</code></li>
              <li>• Use lowercase event handlers: <code class="bg-gray-200 px-1 rounded">onclick</code></li>
              <li>• Always provide <code class="bg-gray-200 px-1 rounded">key</code> props for list items</li>
              <li>• Use fragments <code class="bg-gray-200 px-1 rounded">&lt;&gt;...&lt;/&gt;</code> for multiple elements</li>
              <li>• Works seamlessly with service workers and offline functionality</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
};