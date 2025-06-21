export interface User {
  id: number;
  name: string;
  email: string;
}


export const usersStore = {
  users:  [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
  ],
  fetchUsers: async () => {
    return usersStore.users;
  }
};