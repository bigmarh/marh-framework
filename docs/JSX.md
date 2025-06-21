# JSX in MARH Framework

MARH Framework includes full JSX support for Mithril.js applications, providing a modern and familiar syntax for building user interfaces.

## Overview

JSX (JavaScript XML) is a syntax extension that lets you write HTML-like code within JavaScript. In MARH Framework, JSX is compiled to Mithril's virtual DOM functions automatically.

```jsx
// JSX syntax
function MyComponent() {
  return {
    view: () => (
      <div class="container">
        <h1>Hello, MARH!</h1>
        <p>Building with Mithril and JSX</p>
      </div>
    )
  };
}

// Compiles to Mithril hyperscript
function MyComponent() {
  return {
    view: () => m("div", { class: "container" }, [
      m("h1", "Hello, MARH!"),
      m("p", "Building with Mithril and JSX")
    ])
  };
}
```

## Configuration

MARH Framework automatically configures JSX through esbuild in `vite.config.ts`:

```typescript
esbuild: {
  jsx: 'transform',
  jsxFactory: 'm',
  jsxFragment: 'm.fragment'
}
```

This configuration:
- Transforms JSX to Mithril function calls
- Uses `m()` as the JSX factory function
- Uses `m.fragment` for React-style fragments

## Key Differences from React JSX

### 1. Attribute Names
Use HTML attribute names instead of React's camelCase equivalents:

```jsx
// ✅ MARH/Mithril JSX (preferred)
<input class="form-control" for="username" />
<label htmlFor="username">Username</label>

// ⚠️ React-style (works but not idiomatic)
<input className="form-control" htmlFor="username" />
```

### 2. Event Handlers
Use lowercase event names with `on` prefix:

```jsx
// ✅ MARH/Mithril JSX
<button onclick={handleClick}>Click me</button>
<input oninput={handleInput} />
<form onsubmit={handleSubmit}>

// ❌ React-style (won't work)
<button onClick={handleClick}>Click me</button>
<input onInput={handleInput} />
```

### 3. Style Properties
Use kebab-case CSS property names or camelCase DOM properties:

```jsx
// ✅ Preferred: kebab-case CSS names
<div style={{ "background-color": "blue", "font-size": "16px" }}>

// ✅ Also works: camelCase DOM properties
<div style={{ backgroundColor: "blue", fontSize: "16px" }}>
```

## Components in JSX

**Important:** Always import `m` when using JSX, as JSX transforms to `m()` function calls:

```jsx
import { m, MarhComponent } from '@marh/core';
```

### Basic Component
```jsx
import { m, MarhComponent } from '@marh/core';

export const Greeting: MarhComponent<{ name: string }> = {
  view: ({ attrs }) => (
    <div class="greeting">
      <h2>Hello, {attrs.name}!</h2>
    </div>
  )
};

// Usage
<Greeting name="World" />
```

### Component with State
```jsx
import { MarhComponent } from '@marh/core';

export const Counter: MarhComponent = {
  oninit() {
    this.count = 0;
  },
  
  view() {
    return (
      <div class="counter">
        <p>Count: {this.count}</p>
        <button onclick={() => { this.count++; }}>
          Increment
        </button>
      </div>
    );
  }
};
```

### Component with Async Data
```jsx
import { m, MarhComponent, useAsync } from '@marh/core';

export const UserProfile: MarhComponent<{ userId: string }> = {
  view: ({ attrs }) => {
    const { data: user, loading, error } = useAsync(
      () => fetchUser(attrs.userId),
      [attrs.userId]
    );

    if (loading) return <div class="loading">Loading...</div>;
    if (error) return <div class="error">Error: {error.message}</div>;

    return (
      <div class="user-profile">
        <h2>{user?.name}</h2>
        <p>{user?.email}</p>
      </div>
    );
  }
};

// Alternative: Component-based async state (more reliable)
export const UserProfileAlt: MarhComponent<{ userId: string }> = {
  oninit() {
    this.asyncState = {
      user: null,
      loading: false,
      error: null
    };
    this.loadUser();
  },

  async loadUser() {
    try {
      this.asyncState.loading = true;
      m.redraw();
      
      const user = await fetchUser(this.attrs.userId);
      this.asyncState.user = user;
      this.asyncState.loading = false;
      m.redraw();
    } catch (error) {
      this.asyncState.error = error;
      this.asyncState.loading = false;
      m.redraw();
    }
  },

  view() {
    const { user, loading, error } = this.asyncState;
    
    if (loading) return <div class="loading">Loading...</div>;
    if (error) return <div class="error">Error: {error.message}</div>;

    return (
      <div class="user-profile">
        <h2>{user?.name}</h2>
        <p>{user?.email}</p>
      </div>
    );
  }
};
```

## Routing with JSX

```jsx
import { Router } from '@marh/core';
import { Home } from './pages/Home';
import { About } from './pages/About';

Router.setup({
  '/': Home,
  '/about': About,
  '/user/:id': {
    render: ({ id }) => <UserProfile userId={id} />
  }
});
```

## Lists and Iteration

```jsx
const TodoList: MarhComponent<{ todos: Todo[] }> = {
  view: ({ attrs }) => (
    <ul class="todo-list">
      {attrs.todos.map(todo => (
        <li key={todo.id} class={todo.completed ? 'completed' : ''}>
          <input 
            type="checkbox" 
            checked={todo.completed}
            onchange={e => updateTodo(todo.id, { completed: e.target.checked })}
          />
          <span>{todo.text}</span>
        </li>
      ))}
    </ul>
  )
};
```

## Conditional Rendering

```jsx
const UserPanel: MarhComponent<{ user?: User }> = {
  view: ({ attrs }) => (
    <div class="user-panel">
      {attrs.user ? (
        <div class="authenticated">
          <p>Welcome, {attrs.user.name}!</p>
          <button onclick={logout}>Logout</button>
        </div>
      ) : (
        <div class="guest">
          <p>Please log in</p>
          <button onclick={() => Router.navigate('/login')}>
            Login
          </button>
        </div>
      )}
    </div>
  )
};
```

## Forms and Input Handling

```jsx
const ContactForm: MarhComponent = {
  oninit() {
    this.form = {
      name: '',
      email: '',
      message: ''
    };
  },

  handleSubmit(e) {
    e.preventDefault();
    // Handle form submission
    console.log('Form data:', this.form);
  },

  view() {
    return (
      <form class="contact-form" onsubmit={this.handleSubmit.bind(this)}>
        <div class="form-group">
          <label for="name">Name</label>
          <input
            id="name"
            type="text"
            value={this.form.name}
            oninput={e => { this.form.name = e.target.value; }}
            required
          />
        </div>
        
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            value={this.form.email}
            oninput={e => { this.form.email = e.target.value; }}
            required
          />
        </div>
        
        <div class="form-group">
          <label for="message">Message</label>
          <textarea
            id="message"
            value={this.form.message}
            oninput={e => { this.form.message = e.target.value; }}
            required
          />
        </div>
        
        <button type="submit">Send Message</button>
      </form>
    );
  }
};
```

## Platform-Specific JSX

### Desktop (Electron) Features
```jsx
import { platform, getStorage } from '@marh/core';

const DesktopFeatures: MarhComponent = {
  async handleSaveFile() {
    if (platform.isElectron) {
      const storage = getStorage();
      await storage.writeFile('data.json', JSON.stringify(this.data));
    }
  },

  view() {
    return (
      <div class="desktop-features">
        {platform.isElectron && (
          <button onclick={this.handleSaveFile.bind(this)}>
            Save to File
          </button>
        )}
      </div>
    );
  }
};
```

### PWA Features
```jsx
const PWAFeatures: MarhComponent = {
  oninit() {
    this.canInstall = platform.supportsServiceWorker && 'beforeinstallprompt' in window;
  },

  view() {
    return (
      <div class="pwa-features">
        {this.canInstall && (
          <button onclick={this.promptInstall}>
            Install App
          </button>
        )}
        
        {platform.isWeb && (
          <div class="web-storage">
            <p>Using localStorage for data persistence</p>
          </div>
        )}
      </div>
    );
  }
};
```

## Best Practices

### 1. Use Fragments for Multiple Root Elements
```jsx
// ✅ Use fragments when returning multiple elements
const MultiElement: MarhComponent = {
  view: () => (
    <>
      <h1>Title</h1>
      <p>Description</p>
    </>
  )
};
```

### 2. Extract Complex JSX into Functions
```jsx
const Dashboard: MarhComponent = {
  renderStats(stats) {
    return (
      <div class="stats">
        {stats.map(stat => (
          <div key={stat.id} class="stat-card">
            <h3>{stat.label}</h3>
            <p>{stat.value}</p>
          </div>
        ))}
      </div>
    );
  },

  view() {
    return (
      <div class="dashboard">
        <h1>Dashboard</h1>
        {this.renderStats(this.stats)}
      </div>
    );
  }
};
```

### 3. Use TypeScript Props Interface
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onclick?: () => void;
  children: any;
}

const Button: MarhComponent<ButtonProps> = {
  view: ({ attrs, children }) => (
    <button
      class={`btn btn-${attrs.variant || 'primary'}`}
      disabled={attrs.disabled}
      onclick={attrs.onclick}
    >
      {children}
    </button>
  )
};
```

### 4. Handle Arrays and Keys Properly
```jsx
// ✅ Always use keys for list items
const ItemList: MarhComponent<{ items: Item[] }> = {
  view: ({ attrs }) => (
    <div class="item-list">
      {attrs.items.map(item => (
        <div key={item.id} class="item">
          {item.name}
        </div>
      ))}
    </div>
  )
};
```

## Common Patterns

### Modal Component
```jsx
const Modal: MarhComponent<{ isOpen: boolean; onClose: () => void }> = {
  view: ({ attrs, children }) => {
    if (!attrs.isOpen) return null;

    return (
      <div class="modal-overlay" onclick={attrs.onClose}>
        <div class="modal-content" onclick={e => e.stopPropagation()}>
          <button class="modal-close" onclick={attrs.onClose}>
            ×
          </button>
          {children}
        </div>
      </div>
    );
  }
};
```

### Loading Wrapper
```jsx
const LoadingWrapper: MarhComponent<{ loading: boolean }> = {
  view: ({ attrs, children }) => (
    <div class="loading-wrapper">
      {attrs.loading ? (
        <div class="loading-spinner">Loading...</div>
      ) : (
        children
      )}
    </div>
  )
};
```

## Tips for Converting HTML to JSX

1. **Change void elements**: `<input>` → `<input />`
2. **Quote all attributes**: `class=value` → `class="value"`
3. **Use lowercase events**: `onClick` → `onclick`
4. **Use HTML attribute names**: `className` → `class`
5. **Convert inline styles**: `style="color: red"` → `style={{ color: "red" }}`

## Debugging JSX

When JSX doesn't work as expected:

1. **Check the browser console** for compilation errors
2. **Verify attribute names** are lowercase HTML attributes
3. **Check event handler names** are lowercase with `on` prefix
4. **Ensure components return valid vnodes** from view functions
5. **Use browser dev tools** to inspect the generated DOM

## Migration from Hyperscript

Converting from hyperscript to JSX:

```javascript
// Before (hyperscript)
m("div.container", [
  m("h1", "Title"),
  m("p", { class: "description" }, "Content"),
  m("button", { onclick: handler }, "Click me")
])

// After (JSX)
<div class="container">
  <h1>Title</h1>
  <p class="description">Content</p>
  <button onclick={handler}>Click me</button>
</div>
```

JSX in MARH Framework provides a powerful, type-safe way to build Mithril applications with familiar syntax while maintaining all of Mithril's performance benefits.