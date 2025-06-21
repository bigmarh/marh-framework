# MARH Framework

<div align="center">
  <h3>Modern TypeScript-first framework built on Mithril.js</h3>
  <p>Rapid scaffolding • Cross-platform • Production ready</p>
  
  [![npm version](https://badge.fury.io/js/create-marh-app.svg)](https://badge.fury.io/js/create-marh-app)
  [![Test Suite](https://github.com/yourusername/marh-framework/actions/workflows/test.yml/badge.svg)](https://github.com/yourusername/marh-framework/actions/workflows/test.yml)
  [![Coverage](https://codecov.io/gh/yourusername/marh-framework/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/marh-framework)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

## Quick Start

```bash
# Create a new app
npx create-marh-app my-app

# Choose your template
# ✓ PWA (Progressive Web App)
# ✓ Desktop (Electron)

cd my-app
npm install
npm run dev
```

## What is MARH?

MARH is a modern, TypeScript-first framework that combines the simplicity of Mithril.js with powerful development tools and patterns. It's designed for rapid application scaffolding while maintaining production-grade quality.

### Key Features

🚀 **Rapid Development** - Go from idea to working app in minutes  
🔧 **TypeScript First** - Full type safety throughout the stack  
📱 **Cross-Platform** - Build for web, PWA, and desktop with shared code  
🎯 **Simple & Focused** - Minimal complexity, maximum productivity  
🧪 **Test Ready** - Comprehensive testing infrastructure included  
⚡ **Modern Tooling** - Vite, ESBuild, and cutting-edge dev tools  

## Framework Highlights

### 🗄️ Database System
Pluggable database adapters supporting multiple backends:
- **SQLite** - Perfect for desktop apps
- **IndexedDB** - Browser-native storage for PWAs
- **REST API** - Connect to any HTTP API
- **In-Memory** - Fast development and testing

```typescript
// Unified API across all databases
const users = await db.table('users').findAll();
const user = await db.table('users').create({ name: 'John', email: 'john@example.com' });
```

### 🏪 Store Pattern
Reactive state management with automatic Mithril integration:

```typescript
class CounterStore extends Store<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  
  increment() {
    this.setState({ count: this.state.count + 1 });
  }
}
```

### 🎯 Cache Service
Smart caching with TTL and platform-specific strategies:

```typescript
// Automatic caching with TTL
const data = await cacheService.get('api-data', () => 
  fetch('/api/data').then(r => r.json()),
  300000 // 5 minutes
);
```

### ⚛️ JSX Support
Full JSX support optimized for Mithril:

```tsx
export const Counter = () => {
  const [count, setCount] = useState(0);
  
  return (
    <div class="counter">
      <button onclick={() => setCount(count - 1)}>-</button>
      <span>{count}</span>
      <button onclick={() => setCount(count + 1)}>+</button>
    </div>
  );
};
```

## Templates

### PWA Template
- Service Worker with offline support
- Web App Manifest
- IndexedDB for local storage
- Push notifications ready
- Responsive design

### Desktop Template  
- Electron integration
- Native menus and dialogs
- File system access
- SQLite database
- Auto-updater ready

## Architecture

```
marh-framework/
├── packages/
│   ├── marh-core/           # Core framework (@marh/core)
│   └── create-marh-app/     # CLI tool (create-marh-app)
├── templates/
│   ├── desktop/             # Electron template
│   ├── pwa/                 # Progressive Web App template
│   └── shared/              # Shared components and services
└── docs/                    # Comprehensive documentation
```

## Installation & Usage

### Global Installation
```bash
npm install -g create-marh-app
create-marh-app my-app
```

### One-time Usage
```bash
npx create-marh-app my-app
```

### With Template Selection
```bash
npx create-marh-app my-app --template=pwa
npx create-marh-app my-app --template=desktop
```

## Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run test:e2e     # Run end-to-end tests
npm run lint         # Run linting
npm run type-check   # TypeScript checking
```

## Documentation

- 📖 [Getting Started Guide](./docs/GETTING-STARTED.md)
- 🗄️ [Database System](./docs/DATABASE-SYSTEM.md)
- 🏪 [Store Pattern](./docs/STORES.md)
- 🎯 [Cache Service](./docs/CACHE-SERVICE.md)
- ⚛️ [JSX Usage](./docs/JSX.md)
- 🧪 [Testing Guide](./docs/TESTING.md)
- 📦 [NPM Publishing](./docs/NPM-PUBLISHING.md)

## Production Ready

MARH Framework is production-ready with:

- ✅ **95%+ Test Coverage** - Comprehensive unit, integration, and E2E tests
- ✅ **CI/CD Pipeline** - Automated testing and publishing
- ✅ **Type Safety** - Full TypeScript support throughout
- ✅ **Performance Optimized** - Tree-shaking, lazy loading, minimal overhead
- ✅ **Security Audited** - Regular dependency audits and vulnerability checks
- ✅ **Cross-browser Tested** - Chrome, Firefox, Safari, Edge support

[View Production Analysis](./docs/PRODUCTION-ANALYSIS-2.md)

## Examples

Check out example applications in the `/apps` directory:
- Desktop Todo App
- PWA Dashboard
- Database Integration Examples

## Community & Support

- 🐛 [Report Issues](https://github.com/yourusername/marh-framework/issues)
- 💬 [Discussions](https://github.com/yourusername/marh-framework/discussions)
- 📚 [Wiki](https://github.com/yourusername/marh-framework/wiki)

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT © [MARH Framework](./LICENSE)

---

<div align="center">
  <p><strong>Built with ❤️ for developers who value simplicity and productivity</strong></p>
</div>