import { m, useAsync, MarhComponent } from '@marh/core';
import { Counter } from '../components/Counter';
import { usersStore } from '../stores/users.store';

export const Home: MarhComponent = {
  view() {
    const { data: users, loading, error } = useAsync(usersStore.fetchUsers);

    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
            Welcome to MARH Framework
          </h1>
          {m(Counter)}

          <nav class="flex justify-center space-x-4 mb-8">
            {m(m.route.Link, { href: "/users", class: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" }, "Users")}
            {m(m.route.Link, { href: "/home", class: "px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600" }, "Home")}
            {m(m.route.Link, { href: "/", class: "px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600" }, "Root")}
          </nav>

          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Framework Features
            </h2>
            <ul className="space-y-2 text-gray-600">
              <li>✅ Mithril.js with JSX support</li>
              <li>✅ TypeScript integration</li>
              <li>✅ Async hooks (useAsync)</li>
              <li>✅ Type-safe routing</li>
              <li>✅ IPC communication for Electron</li>
              <li>✅ TailwindCSS styling</li>
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