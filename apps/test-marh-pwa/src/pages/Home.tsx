import { m, useAsync, getPlatform, getStorage } from '@marh/core';

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

export const Home = {
  oninit() {
    // Load stored data
    loadStoredData();
  },

  view() {
    const { data: users, loading, error } = useAsync(fetchUsers);
    const platform = getPlatform();

    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
            Welcome to MARH PWA Framework
          </h1>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Platform Information
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
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

          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Cross-Platform Storage Demo
            </h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  onclick={() => saveData()}
                >
                  Save Data
                </button>
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  onclick={() => clearData()}
                >
                  Clear Data
                </button>
              </div>
              
              {storedData && (
                <div className="bg-gray-50 p-4 rounded border">
                  <h4 className="font-semibold">Stored Data:</h4>
                  <pre className="text-sm text-gray-600 mt-2">{JSON.stringify(storedData, null, 2)}</pre>
                </div>
              )}
              
              {!storedData && (
                <p className="text-gray-600">No data stored yet. Click "Save Data" to test storage.</p>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              PWA Features
            </h2>
            <ul className="space-y-2 text-gray-600">
              <li>✅ Progressive Web App with service worker</li>
              <li>✅ Offline support and caching</li>
              <li>✅ Installable on mobile and desktop</li>
              <li>✅ Cross-platform storage abstraction</li>
              <li>✅ Platform detection and adaptation</li>
              <li>✅ Responsive design with TailwindCSS</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Users Demo (useAsync Hook)
            </h2>
            
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading users...</span>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-600">Error: {error.message}</p>
              </div>
            )}
            
            {users && !loading && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {users.map(user => (
                  <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-gray-600 text-sm">{user.email}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
};