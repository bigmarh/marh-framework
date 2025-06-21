import { m, useAsync, MarhComponent, platform, getStorage } from '@marh/core';
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

const fetchUsers = async (): Promise<User[]> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  return [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
  ];
};

// Desktop-specific settings component
const DesktopSettings: MarhComponent = {
  view() {
    return (
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-semibold text-gray-800 mb-4">
          Desktop Settings (Global Store)
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
            <span class="text-gray-700">Sidebar:</span>
            <button
              class={`px-3 py-1 rounded transition-colors ${
                appStore.sidebarOpen 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
              onclick={() => appStore.toggleSidebar()}
            >
              {appStore.sidebarOpen ? 'Open' : 'Closed'}
            </button>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-700">Platform:</span>
            <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
              🖥️ Electron Desktop
            </span>
          </div>
          <div class="flex space-x-2">
            <button
              class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              onclick={() => appStore.addNotification('Desktop app working!', 'success')}
            >
              Test Notification
            </button>
            <button
              class="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
              onclick={() => appStore.addNotification('File saved locally!', 'info')}
            >
              File Test
            </button>
          </div>
        </div>
      </div>
    );
  }
};


// Example form component
const ContactForm: MarhComponent = {
  oninit() {
    this.form = {
      name: '',
      email: '',
      message: ''
    };
    this.submitted = false;
  },

  handleSubmit(e) {
    e.preventDefault();
    this.submitted = true;
    // Reset form after showing success
    setTimeout(() => {
      this.form = { name: '', email: '', message: '' };
      this.submitted = false;
      m.redraw();
    }, 2000);
  },

  view() {
    return (
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-semibold text-gray-800 mb-4">
          Contact Form (JSX Form Handling)
        </h3>
        
        {this.submitted ? (
          <div class="bg-green-50 border border-green-200 rounded-md p-4">
            <p class="text-green-600">Thank you! Your message has been sent.</p>
          </div>
        ) : (
          <form onsubmit={this.handleSubmit.bind(this)} class="space-y-4">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={this.form.name}
                oninput={e => { this.form.name = e.target.value; }}
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={this.form.email}
                oninput={e => { this.form.email = e.target.value; }}
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label for="message" class="block text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                id="message"
                rows={3}
                value={this.form.message}
                oninput={e => { this.form.message = e.target.value; }}
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <button
              type="submit"
              class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    );
  }
};

export const Home: MarhComponent = {
  view() {
    const { data: users, loading, error } = useAsync(fetchUsers);

    return (
      <div class="min-h-screen bg-gray-100 py-12 px-4">
        <div class="max-w-4xl mx-auto space-y-8">
          <h1 class="text-4xl font-bold text-gray-900 text-center">
            Welcome to MARH Framework
          </h1>
          
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-semibold text-gray-800 mb-4">
              Framework Features
            </h2>
            <ul class="space-y-2 text-gray-600">
              <li>✅ Mithril.js with JSX support</li>
              <li>✅ TypeScript integration</li>
              <li>✅ Async hooks (useAsync)</li>
              <li>✅ Type-safe routing</li>
              <li>✅ IPC communication for Electron</li>
              <li>✅ TailwindCSS styling</li>
              <li>✅ Platform detection ({platform.isElectron ? 'Desktop' : 'Web'})</li>
            </ul>
          </div>

          {/* Store Examples - Global State Management */}
          <div class="grid gap-6 md:grid-cols-2">
            <StoreCounter />
            <DesktopSettings />
          </div>

          {/* Show notifications using shared component */}
          <NotificationList appStore={appStore} />

          {/* Cache Service Demo */}
          <CacheDemo />

          {/* CRUD Service Demo */}
          <CrudDemo />

          {/* Database System Demo */}
          <DatabaseDemo />

          {/* Form Example (Local State) */}
          <ContactForm />

          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-semibold text-gray-800 mb-4">
              Users List (useAsync Hook Demo)
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
                  Demonstrating JSX list rendering with proper keys:
                </p>
                <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {users.map(user => (
                    <div key={user.id} class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h3 class="font-semibold text-gray-900">{user.name}</h3>
                      <p class="text-gray-600 text-sm">{user.email}</p>
                      <div class="mt-2">
                        <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          ID: {user.id}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Platform-specific features */}
          {platform.isElectron && (
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-blue-900 mb-2">
                Desktop Features
              </h3>
              <p class="text-blue-700">
                You're running in Electron! This app has access to desktop-specific features
                like file system operations and native menus.
              </p>
            </div>
          )}

          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">
              JSX Best Practices Demonstrated
            </h3>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>• Use <code class="bg-gray-200 px-1 rounded">class</code> instead of <code class="bg-gray-200 px-1 rounded">className</code></li>
              <li>• Use lowercase event handlers: <code class="bg-gray-200 px-1 rounded">onclick</code>, <code class="bg-gray-200 px-1 rounded">oninput</code></li>
              <li>• Always provide <code class="bg-gray-200 px-1 rounded">key</code> props for list items</li>
              <li>• Use fragments <code class="bg-gray-200 px-1 rounded">&lt;&gt;...&lt;/&gt;</code> for multiple elements</li>
              <li>• Bind event handlers to maintain component context</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
};