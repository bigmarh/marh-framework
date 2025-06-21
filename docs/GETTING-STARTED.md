# Getting Started with MARH Framework

Welcome to MARH! This guide will walk you through creating your first application step by step.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Creating Your First App](#creating-your-first-app)
4. [Understanding the Project Structure](#understanding-the-project-structure)
5. [Your First Component](#your-first-component)
6. [Adding State Management](#adding-state-management)
7. [Working with Data](#working-with-data)
8. [Building and Deployment](#building-and-deployment)
9. [Next Steps](#next-steps)

## Prerequisites

Before you start, make sure you have:

- **Node.js** 18 or higher
- **npm** or **pnpm** (we recommend pnpm)
- Basic knowledge of **TypeScript** and **JavaScript**
- Familiarity with modern web development concepts

## Installation

### Quick Start (Recommended)

```bash
# Create a new MARH app
npx create-marh-app my-first-app

# Navigate to your project
cd my-first-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### Global Installation

```bash
# Install the CLI globally
npm install -g create-marh-app

# Create apps anytime
create-marh-app my-app
```

## Creating Your First App

When you run `create-marh-app`, you'll be prompted to choose a template:

### PWA Template (Recommended for beginners)
```bash
npx create-marh-app my-pwa-app --template=pwa
```

**What you get:**
- Progressive Web App features
- Service Worker for offline support
- IndexedDB database integration
- Responsive design
- Push notification support

### Desktop Template
```bash
npx create-marh-app my-desktop-app --template=desktop
```

**What you get:**
- Electron desktop application
- Native menus and dialogs
- File system access
- SQLite database integration
- Auto-updater support

## Understanding the Project Structure

After creating your app, you'll see this structure:

```
my-first-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── Counter.tsx      # Example counter component
│   ├── pages/              # Application pages/routes
│   │   ├── Home.tsx        # Home page
│   │   └── Users.tsx       # Users page (example)
│   ├── services/           # Business logic and API calls
│   │   └── ipc.service.ts  # Platform-specific services
│   ├── stores/             # State management
│   │   ├── counter.store.ts # Counter state example
│   │   └── users.store.ts   # Users state example
│   ├── hooks/              # Custom hooks
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Application entry point
│   ├── router.ts           # Route definitions
│   └── style.css           # Global styles
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Build tool configuration
└── tailwind.config.js     # Styling configuration
```

## Your First Component

Let's create a simple greeting component to understand MARH's JSX syntax:

### 1. Create the Component

Create `src/components/Greeting.tsx`:

```tsx
import { m } from '@marh/core';

interface GreetingProps {
  name: string;
  age?: number;
}

export const Greeting = ({ name, age }: GreetingProps) => {
  return (
    <div class="greeting">
      <h2>Hello, {name}!</h2>
      {age && <p>You are {age} years old.</p>}
      <button 
        onclick={() => alert(`Nice to meet you, ${name}!`)}
        class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Say Hello
      </button>
    </div>
  );
};
```

### 2. Use the Component

Add it to your `src/pages/Home.tsx`:

```tsx
import { m } from '@marh/core';
import { Greeting } from '../components/Greeting';

export const Home = () => {
  return (
    <div class="container mx-auto p-8">
      <h1 class="text-3xl font-bold mb-8">Welcome to MARH!</h1>
      
      <Greeting name="World" age={2024} />
      <Greeting name="Developer" />
    </div>
  );
};
```

### Key Points About MARH JSX:

- ✅ Use `class` instead of `className`
- ✅ Event handlers are lowercase: `onclick`, `onchange`
- ✅ Always import `m` from `@marh/core`
- ✅ Components are just functions that return JSX
- ✅ TypeScript interfaces for props provide type safety

## Adding State Management

MARH includes a powerful store pattern for state management. Let's create a todo list:

### 1. Create a Todo Store

Create `src/stores/todo.store.ts`:

```typescript
import { Store } from '@marh/core';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

export class TodoStore extends Store<TodoState> {
  constructor() {
    super({
      todos: [],
      filter: 'all'
    });
  }

  addTodo(text: string) {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text: text.trim(),
      completed: false,
      createdAt: new Date()
    };

    this.setState({
      todos: [...this.state.todos, newTodo]
    });
  }

  toggleTodo(id: string) {
    this.setState({
      todos: this.state.todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    });
  }

  deleteTodo(id: string) {
    this.setState({
      todos: this.state.todos.filter(todo => todo.id !== id)
    });
  }

  setFilter(filter: TodoState['filter']) {
    this.setState({ filter });
  }

  get filteredTodos() {
    switch (this.state.filter) {
      case 'active':
        return this.state.todos.filter(todo => !todo.completed);
      case 'completed':
        return this.state.todos.filter(todo => todo.completed);
      default:
        return this.state.todos;
    }
  }

  get stats() {
    const total = this.state.todos.length;
    const completed = this.state.todos.filter(t => t.completed).length;
    const active = total - completed;
    
    return { total, completed, active };
  }
}

// Create a singleton instance
export const todoStore = new TodoStore();
```

### 2. Create Todo Components

Create `src/components/TodoApp.tsx`:

```tsx
import { m, useState } from '@marh/core';
import { todoStore } from '../stores/todo.store';

export const TodoApp = () => {
  const [newTodoText, setNewTodoText] = useState('');
  
  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      todoStore.addTodo(newTodoText);
      setNewTodoText('');
    }
  };

  const stats = todoStore.stats;

  return (
    <div class="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold mb-4">Todo List</h2>
      
      {/* Stats */}
      <div class="mb-4 text-sm text-gray-600">
        Total: {stats.total} | Active: {stats.active} | Completed: {stats.completed}
      </div>

      {/* Add Todo Form */}
      <form onsubmit={handleSubmit} class="mb-4">
        <div class="flex gap-2">
          <input
            type="text"
            value={newTodoText}
            oninput={(e) => setNewTodoText((e.target as HTMLInputElement).value)}
            placeholder="Add a new todo..."
            class="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add
          </button>
        </div>
      </form>

      {/* Filter Buttons */}
      <div class="mb-4 flex gap-2">
        {(['all', 'active', 'completed'] as const).map(filter => (
          <button
            key={filter}
            onclick={() => todoStore.setFilter(filter)}
            class={`px-3 py-1 text-sm rounded ${
              todoStore.state.filter === filter
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Todo List */}
      <div class="space-y-2">
        {todoStore.filteredTodos.map(todo => (
          <div
            key={todo.id}
            class={`flex items-center gap-3 p-2 rounded ${
              todo.completed ? 'bg-gray-50' : 'bg-white'
            }`}
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onchange={() => todoStore.toggleTodo(todo.id)}
              class="w-4 h-4"
            />
            <span
              class={`flex-1 ${
                todo.completed ? 'line-through text-gray-500' : ''
              }`}
            >
              {todo.text}
            </span>
            <button
              onclick={() => todoStore.deleteTodo(todo.id)}
              class="text-red-500 hover:text-red-700 text-sm"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {todoStore.filteredTodos.length === 0 && (
        <p class="text-gray-500 text-center py-4">
          {todoStore.state.filter === 'all' 
            ? 'No todos yet. Add one above!' 
            : `No ${todoStore.state.filter} todos.`}
        </p>
      )}
    </div>
  );
};
```

### 3. Add to Your App

Update `src/pages/Home.tsx`:

```tsx
import { m } from '@marh/core';
import { TodoApp } from '../components/TodoApp';

export const Home = () => {
  return (
    <div class="container mx-auto p-8">
      <h1 class="text-3xl font-bold mb-8 text-center">Welcome to MARH!</h1>
      <TodoApp />
    </div>
  );
};
```

## Working with Data

MARH includes a powerful database system that works across platforms:

### 1. Setting Up Database

The database is automatically configured based on your template:
- **PWA**: Uses IndexedDB for browser storage
- **Desktop**: Uses SQLite for native desktop storage

### 2. Using the Database

Create `src/services/todo-db.service.ts`:

```typescript
import { createDatabase } from '@marh/shared/database';
import { ICrudService } from '@marh/shared/services/crud.interface';

interface TodoEntity {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class TodoDbService implements ICrudService<TodoEntity> {
  private db = createDatabase({ 
    type: 'auto', // Automatically chooses IndexedDB or SQLite
    name: 'todo-app' 
  });
  
  private table = this.db.table<TodoEntity>('todos');

  async create(data: Omit<TodoEntity, 'id' | 'createdAt' | 'updatedAt'>) {
    return await this.table.create({
      ...data,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async findAll() {
    return await this.table.findAll();
  }

  async findById(id: string) {
    return await this.table.findById(id);
  }

  async update(id: string, data: Partial<TodoEntity>) {
    return await this.table.update(id, {
      ...data,
      updatedAt: new Date()
    });
  }

  async delete(id: string) {
    return await this.table.delete(id);
  }

  async findByCompleted(completed: boolean) {
    return await this.table.findWhere({ completed });
  }
}

export const todoDbService = new TodoDbService();
```

### 3. Integrating Database with Store

Update your `todo.store.ts` to persist data:

```typescript
import { Store } from '@marh/core';
import { todoDbService } from '../services/todo-db.service';

// ... previous TodoStore code ...

export class TodoStore extends Store<TodoState> {
  constructor() {
    super({
      todos: [],
      filter: 'all'
    });
    
    // Load todos from database on initialization
    this.loadTodos();
  }

  async loadTodos() {
    try {
      const todos = await todoDbService.findAll();
      this.setState({ todos });
    } catch (error) {
      console.error('Failed to load todos:', error);
    }
  }

  async addTodo(text: string) {
    try {
      const newTodo = await todoDbService.create({
        text: text.trim(),
        completed: false
      });

      this.setState({
        todos: [...this.state.todos, newTodo]
      });
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  }

  async toggleTodo(id: string) {
    try {
      const todo = this.state.todos.find(t => t.id === id);
      if (!todo) return;

      const updatedTodo = await todoDbService.update(id, {
        completed: !todo.completed
      });

      this.setState({
        todos: this.state.todos.map(t =>
          t.id === id ? updatedTodo : t
        )
      });
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  }

  async deleteTodo(id: string) {
    try {
      await todoDbService.delete(id);
      
      this.setState({
        todos: this.state.todos.filter(todo => todo.id !== id)
      });
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  }

  // ... rest of the methods remain the same
}
```

## Building and Deployment

### Development

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Platform-Specific Deployment

#### PWA Deployment
```bash
# Build PWA
npm run build

# Deploy to any static hosting service
# (Vercel, Netlify, GitHub Pages, etc.)
```

#### Desktop App Packaging
```bash
# Build and package Electron app
npm run build:electron

# Platform-specific builds
npm run build:win     # Windows
npm run build:mac     # macOS  
npm run build:linux   # Linux
```

## Next Steps

Congratulations! You've built your first MARH application. Here's what to explore next:

### 📚 Learn More
- [Database System Guide](./DATABASE-SYSTEM.md) - Deep dive into data management
- [Store Pattern Guide](./STORES.md) - Advanced state management
- [Cache Service](./CACHE-SERVICE.md) - Performance optimization
- [Testing Guide](./TESTING.md) - Writing tests for your app

### 🚀 Advanced Features
- **Routing**: Add multiple pages with `m.route`
- **API Integration**: Connect to REST APIs or GraphQL
- **Real-time Updates**: WebSocket integration
- **Push Notifications**: PWA notification system
- **File Handling**: Desktop file system integration

### 🛠️ Development Tools
- **Hot Reload**: Automatic updates during development
- **TypeScript**: Full type safety throughout
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Vitest**: Fast unit testing

### 🌟 Best Practices
1. **Keep components small and focused**
2. **Use stores for shared state**
3. **Leverage TypeScript for type safety**
4. **Write tests for critical functionality**
5. **Follow the single responsibility principle**

### 💡 Pro Tips
- Use the browser dev tools for debugging
- Leverage VS Code extensions for better DX
- Keep your components pure when possible
- Use async/await for database operations
- Cache expensive computations

Ready to build something amazing with MARH? Start with the [tutorial](./TUTORIAL.md) or explore the [API reference](./API-REFERENCE.md)!

## Need Help?

- 📖 [Documentation](../README.md)
- 🐛 [Report Issues](https://github.com/yourusername/marh-framework/issues)
- 💬 [Community Discussions](https://github.com/yourusername/marh-framework/discussions)
- 📚 [Examples Repository](../apps/)