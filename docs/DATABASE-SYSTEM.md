# Database System in MARH Framework

MARH Framework includes a powerful, pluggable database system that provides a unified interface across different storage backends. Whether you're building for desktop, PWA, or web, you can use the same API while the framework handles platform-specific optimizations.

## Key Features

- **🔌 Pluggable Adapters** - Switch between Memory, REST API, SQLite, IndexedDB
- **🌐 Platform Aware** - Automatically selects best adapter for Desktop/PWA/Web  
- **🔒 Type Safe** - Full TypeScript support with generic interfaces
- **🔍 Query Builder** - Fluent API for complex queries and relationships
- **📊 Migrations** - Schema versioning with up/down migrations
- **⚡ Real-time** - Event system for change notifications

## Quick Start

### 1. Basic Usage

```typescript
import { Database, DatabasePresets } from './database';

// Create database (auto-detects best adapter for platform)
const db = Database.memory('my-app');

// Connect and use
await db.connect();
const usersTable = db.table<User>('users');

// CRUD operations
const user = await usersTable.create({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user'
});

const users = await usersTable.findMany({
  filter: { role: 'user' },
  sort: { field: 'name', direction: 'asc' },
  pagination: { page: 1, limit: 10 }
});
```

### 2. Platform-Specific Configuration

```typescript
// Desktop: SQLite (fallback to memory for demo)
const desktopDb = Database.create(DatabasePresets.sqliteDesktop('my-app'));

// PWA: IndexedDB (fallback to memory for demo)  
const pwaDb = Database.create(DatabasePresets.indexedDbPWA('my-app'));

// Web: REST API
const webDb = Database.restAPI('my-app', 'https://api.example.com', {
  'Authorization': 'Bearer your-token'
});
```

### 3. Schema Definition

```typescript
import { Schema } from './database';

const userSchema = Schema.table('users')
  .field('id', Schema.fields.uuid())
  .field('email', Schema.fields.email())
  .field('firstName', Schema.fields.string(50))
  .field('lastName', Schema.fields.string(50))
  .field('role', Schema.fields.enum(['admin', 'user', 'guest'], 'user'))
  .field('isActive', Schema.fields.boolean(true))
  .timestamps()
  .index('idx_users_email', ['email'], true)
  .build();
```

### 4. Migrations

```typescript
import { Migrations, MigrationPatterns } from './database';

const migrations = [
  // Initial schema
  Migrations.createInitial([userSchema, postSchema]),
  
  // Add authentication tables
  MigrationPatterns.addUserAuth(),
  
  // Custom migration
  Migrations.create('add_user_preferences', 'Add user preferences')
    .createTable('user_preferences', {
      fields: {
        id: Schema.fields.uuid(),
        userId: Schema.fields.string(),
        theme: Schema.fields.enum(['light', 'dark'], 'light'),
        ...Schema.fields.timestamps()
      }
    })
    .build()
];

// Run migrations
await db.migrate(migrations);
```

### 5. Advanced Queries

```typescript
// Query builder
const activeUsers = await usersTable.query()
  .where('isActive', '=', true)
  .where('role', 'IN', ['admin', 'user'])
  .where('createdAt', '>', new Date('2024-01-01'))
  .orderBy('lastName', 'asc')
  .limit(50)
  .get();

// Pagination
const result = await usersTable.query()
  .where('role', '=', 'user')
  .paginate(1, 20);

console.log(result.data); // Users for page 1
console.log(result.total); // Total count
console.log(result.pages); // Total pages
```

## Available Adapters

### Memory Adapter
- **Best for:** Development, testing, prototyping
- **Platform:** All (Desktop, PWA, Web)
- **Features:** Fast, simple, data lost on reload

```typescript
const db = Database.memory('my-app');
```

### REST API Adapter
- **Best for:** Production web apps, microservices
- **Platform:** All (Desktop, PWA, Web) 
- **Features:** HTTP-based, scalable, network dependent

```typescript
const db = Database.restAPI('my-app', 'https://api.example.com');
```

### SQLite Adapter (Coming Soon)
- **Best for:** Desktop applications
- **Platform:** Desktop (Electron)
- **Features:** File-based, ACID compliant, SQL queries

### IndexedDB Adapter (Coming Soon)
- **Best for:** PWA applications
- **Platform:** PWA, Web
- **Features:** Browser storage, offline support, large capacity

## Configuration

### Environment Variables

```bash
# Auto-detect best adapter for platform
DATABASE_TYPE=auto

# Or specify manually
DATABASE_TYPE=memory|rest-api|sqlite|indexeddb

# REST API configuration
API_URL=https://api.example.com
API_TOKEN=your-bearer-token

# SQLite configuration (when available)
DB_PATH=./data/app.sqlite
```

### Programmatic Configuration

```typescript
import { DatabaseConfigBuilder } from './database';

const config = DatabaseConfigBuilder.create()
  .type('rest-api')
  .name('my-app')
  .options({
    baseUrl: 'https://api.example.com',
    headers: { 'Authorization': 'Bearer token' },
    timeout: 10000,
    retries: 3
  })
  .autoMigrate(true)
  .debug(true)
  .build();

const db = Database.create(config);
```

## Database Service

The framework includes a pre-configured `DatabaseService` that:

- Auto-detects the best adapter for your platform
- Includes common schemas (users, posts, settings)
- Handles migrations automatically
- Provides convenient table accessors
- Seeds initial development data

```typescript
import { databaseService } from './services/database.service';

// Already initialized - just use it
const users = await databaseService.users.findMany();
const posts = await databaseService.posts.findMany();

// Get database statistics
const stats = await databaseService.getStats();

// Create backup
const backup = await databaseService.backup();
```

## Best Practices

### 1. Schema Design
- Always include `id`, `createdAt`, `updatedAt` fields
- Use indexes for frequently queried fields
- Define relationships between tables
- Use enums for constrained values

### 2. Migrations
- Never modify existing migrations
- Always provide both up and down operations
- Test migrations in development first
- Keep migrations atomic and reversible

### 3. Error Handling
- Wrap database operations in try-catch
- Handle connection errors gracefully
- Provide user-friendly error messages
- Log errors for debugging

### 4. Performance
- Use pagination for large datasets
- Add indexes for query optimization
- Batch operations when possible
- Cache frequently accessed data

### 5. Platform Considerations
- **Desktop:** Use SQLite for local data, REST API for sync
- **PWA:** Use IndexedDB for offline, REST API when online
- **Web:** Use REST API primarily, memory for temporary state

## Examples

See the `DatabaseDemo` component in the templates for a complete working example that demonstrates:

- Creating and managing users and posts
- Real-time CRUD operations
- Platform-aware configuration
- Error handling and validation
- Database statistics and monitoring

## Extending the System

### Creating Custom Adapters

```typescript
import { BaseDatabaseAdapter, BaseDatabase } from './database/adapters/base-adapter';

class CustomAdapter extends BaseDatabaseAdapter {
  constructor() {
    super('custom', ['web']);
  }

  createDatabase(config: DatabaseConfig): IDatabase {
    return new CustomDatabase(config);
  }
}

// Register your adapter
registerDatabaseAdapter(new CustomAdapter());
```

### Adding Custom Fields

```typescript
const customFields = {
  ...Schema.fields,
  slug: (from?: string) => ({
    type: 'string',
    required: true,
    unique: true,
    // Custom validation logic
  }),
  coordinates: () => ({
    type: 'json',
    // Store as { lat: number, lng: number }
  })
};
```

The database system is designed to be simple to use but powerful enough for production applications. It abstracts away platform differences while providing the flexibility to optimize for specific deployment scenarios.