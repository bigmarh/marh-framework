import { m, useAsync, MarhComponent } from '@marh/core';
import { usersStore, User } from '@/stores/users.store';  


export const Users: MarhComponent = {
  view() { 
    const { data: users, loading, error } = useAsync(usersStore.fetchUsers);

    return (
      <div class="min-h-screen bg-gray-100 py-12 px-4">
        <div class="max-w-4xl mx-auto">
          <nav class="flex justify-center space-x-4 mb-8">
            {m(m.route.Link, { href: "/", class: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" }, "Home")}
            {m(m.route.Link, { href: "/users", class: "px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600" }, "Users")}
          </nav>

          <h1 class="text-4xl font-bold text-gray-900 mb-8 text-center">Users Page</h1>
          
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
          
          {users && (
            <div class="bg-white rounded-lg shadow-md p-6">
              <h2 class="text-2xl font-semibold text-gray-800 mb-4">User Directory</h2>
              <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {users.map((user: User) => (
                  <div key={user.id} class="border border-gray-200 rounded-lg p-4">
                    <h3 class="font-semibold text-gray-900">{user.name}</h3>
                    <p class="text-gray-600 text-sm">{user.email}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}