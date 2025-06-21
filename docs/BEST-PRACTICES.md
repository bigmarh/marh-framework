# MARH Framework Best Practices

This guide covers best practices, patterns, and conventions for building maintainable and scalable applications with MARH Framework.

## Table of Contents

1. [Project Organization](#project-organization)
2. [Component Design](#component-design)
3. [State Management](#state-management)
4. [Database Usage](#database-usage)
5. [Performance Optimization](#performance-optimization)
6. [Error Handling](#error-handling)
7. [TypeScript Best Practices](#typescript-best-practices)
8. [Testing Strategies](#testing-strategies)
9. [Code Quality](#code-quality)
10. [Security Considerations](#security-considerations)

## Project Organization

### Directory Structure

Follow a consistent directory structure that scales with your application:

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components (Button, Modal, etc.)
│   ├── forms/           # Form-specific components
│   └── layout/          # Layout components (Header, Sidebar, etc.)
├── pages/               # Route-level components
├── stores/              # State management
├── services/            # Business logic and API calls
├── hooks/               # Custom hooks
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── constants/           # Application constants
└── assets/              # Static assets
```

### Naming Conventions

**Components**: Use PascalCase
```tsx
// ✅ Good
export const UserProfile = () => { ... };
export const TaskList = () => { ... };

// ❌ Bad
export const userProfile = () => { ... };
export const task_list = () => { ... };
```

**Files**: Use kebab-case for files, PascalCase for components
```
// ✅ Good
user-profile.component.tsx
task-list.component.tsx
user.store.ts
api.service.ts

// ❌ Bad
UserProfile.tsx
taskList.tsx
userStore.ts
```

**Store and Services**: Use descriptive suffixes
```typescript
// ✅ Good
export class UserStore extends Store { ... }
export class ApiService { ... }
export const authService = new AuthService();

// ❌ Bad
export class User extends Store { ... }
export class Api { ... }
```

## Component Design

### Keep Components Small and Focused

Each component should have a single responsibility:

```tsx
// ✅ Good - Single responsibility
export const UserAvatar = ({ user, size = 'medium' }: UserAvatarProps) => {
  return (
    <img 
      src={user.avatar || '/default-avatar.png'}
      alt={user.name}
      class={`rounded-full ${sizeClasses[size]}`}
    />
  );
};

// ❌ Bad - Multiple responsibilities
export const UserComponent = ({ user }: UserProps) => {
  return (
    <div>
      <img src={user.avatar} /> {/* Avatar display */}
      <form>...</form>          {/* User editing */}
      <div>...</div>            {/* User stats */}
    </div>
  );
};
```

### Use TypeScript Interfaces for Props

Always define clear interfaces for component props:

```tsx
interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  showActions?: boolean;
  className?: string;
}

export const TaskCard = ({ 
  task, 
  onEdit, 
  onDelete, 
  showActions = true,
  className = '' 
}: TaskCardProps) => {
  // Component implementation
};
```

### Composition Over Inheritance

Favor composition patterns for flexibility:

```tsx
// ✅ Good - Composable components
export const Modal = ({ children, onClose, title }: ModalProps) => (
  <div class="modal-overlay">
    <div class="modal-content">
      <ModalHeader title={title} onClose={onClose} />
      <ModalBody>{children}</ModalBody>
    </div>
  </div>
);

// Usage
<Modal title="Edit User" onClose={handleClose}>
  <UserForm user={selectedUser} onSave={handleSave} />
</Modal>
```

### Avoid Inline Event Handlers

Extract event handlers to improve readability and performance:

```tsx
// ✅ Good
export const TaskList = ({ tasks }: TaskListProps) => {
  const handleTaskClick = (task: Task) => {
    taskStore.setSelectedTask(task);
  };

  const handleTaskDelete = async (taskId: string) => {
    await taskStore.deleteTask(taskId);
  };

  return (
    <div>
      {tasks.map(task => (
        <TaskCard 
          key={task.id}
          task={task}
          onClick={handleTaskClick}
          onDelete={handleTaskDelete}
        />
      ))}
    </div>
  );
};

// ❌ Bad
export const TaskList = ({ tasks }: TaskListProps) => {
  return (
    <div>
      {tasks.map(task => (
        <TaskCard 
          key={task.id}
          task={task}
          onClick={() => taskStore.setSelectedTask(task)}
          onDelete={async () => await taskStore.deleteTask(task.id)}
        />
      ))}
    </div>
  );
};
```

## State Management

### Store Organization

Keep stores focused and avoid monolithic state:

```typescript
// ✅ Good - Focused stores
export class UserStore extends Store<UserState> {
  // Only user-related state and actions
}

export class TaskStore extends Store<TaskState> {
  // Only task-related state and actions
}

export class UIStore extends Store<UIState> {
  // Only UI-related state (modals, loading, etc.)
}

// ❌ Bad - Monolithic store
export class AppStore extends Store<{
  users: User[];
  tasks: Task[];
  ui: UIState;
  auth: AuthState;
  // ... everything in one store
}> { }
```

### Computed Properties

Use getters for derived state:

```typescript
export class TaskStore extends Store<TaskState> {
  // ✅ Good - Computed properties
  get activeTasks() {
    return this.state.tasks.filter(task => task.status !== 'completed');
  }

  get tasksByPriority() {
    return {
      high: this.state.tasks.filter(t => t.priority === 'high'),
      medium: this.state.tasks.filter(t => t.priority === 'medium'),
      low: this.state.tasks.filter(t => t.priority === 'low')
    };
  }

  get stats() {
    const tasks = this.state.tasks;
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      completion: tasks.length > 0 ? tasks.filter(t => t.status === 'completed').length / tasks.length : 0
    };
  }
}
```

### Async Actions Pattern

Handle async operations consistently:

```typescript
export class TaskStore extends Store<TaskState> {
  async createTask(taskData: CreateTaskRequest) {
    // Set loading state
    this.setState({ loading: true, error: null });
    
    try {
      // Perform async operation
      const newTask = await taskService.create(taskData);
      
      // Update state on success
      this.setState({
        tasks: [...this.state.tasks, newTask],
        loading: false
      });
      
      return newTask;
    } catch (error) {
      // Handle errors
      this.setState({
        error: error instanceof Error ? error.message : 'Failed to create task',
        loading: false
      });
      throw error;
    }
  }
}
```

### State Normalization

Normalize complex nested data:

```typescript
// ✅ Good - Normalized state
interface TaskState {
  tasks: Record<string, Task>;
  categories: Record<string, Category>;
  taskIds: string[];
  categoryIds: string[];
}

// ❌ Bad - Denormalized state
interface TaskState {
  tasks: Array<Task & { category: Category }>; // Duplicated category data
}
```

## Database Usage

### Service Layer Pattern

Create dedicated services for database operations:

```typescript
// ✅ Good - Dedicated service
export class TaskService {
  private table = db.table<Task>('tasks');

  async create(data: CreateTaskData): Promise<Task> {
    return await this.table.create({
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async findByUser(userId: string): Promise<Task[]> {
    return await this.table.findWhere({ userId });
  }

  async findOverdue(): Promise<Task[]> {
    const tasks = await this.table.findAll();
    const now = new Date();
    
    return tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now && 
      task.status !== 'completed'
    );
  }
}

// ❌ Bad - Direct database access in components
export const TaskList = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  
  useEffect(() => {
    db.table('tasks').findAll().then(setTasks); // Direct access
  }, []);
};
```

### Error Handling

Implement comprehensive error handling:

```typescript
export class TaskService {
  async create(data: CreateTaskData): Promise<Task> {
    try {
      return await this.table.create(data);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new Error(`Invalid task data: ${error.message}`);
      }
      
      if (error instanceof NetworkError) {
        throw new Error('Network error. Please check your connection.');
      }
      
      console.error('Unexpected error creating task:', error);
      throw new Error('Failed to create task. Please try again.');
    }
  }
}
```

### Migration Strategy

Plan for database schema changes:

```typescript
export const migrations = [
  {
    version: 1,
    up: async (db: IDatabase) => {
      await db.table('tasks').createIndex('userId');
      await db.table('tasks').createIndex('createdAt');
    }
  },
  {
    version: 2,
    up: async (db: IDatabase) => {
      await db.table('tasks').addColumn('priority', 'string', 'medium');
    }
  }
];
```

## Performance Optimization

### Memoization

Use memoization for expensive computations:

```typescript
// ✅ Good - Memoized computation
export class TaskStore extends Store<TaskState> {
  private _memoizedStats: { tasks: Task[]; result: TaskStats } | null = null;

  get stats(): TaskStats {
    if (this._memoizedStats?.tasks === this.state.tasks) {
      return this._memoizedStats.result;
    }

    const result = this.computeStats(this.state.tasks);
    this._memoizedStats = { tasks: this.state.tasks, result };
    return result;
  }

  private computeStats(tasks: Task[]): TaskStats {
    // Expensive computation
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      // ... other stats
    };
  }
}
```

### Lazy Loading

Implement lazy loading for large datasets:

```typescript
export class TaskStore extends Store<TaskState> {
  private pageSize = 20;
  private currentPage = 0;

  async loadMoreTasks() {
    this.setState({ loading: true });
    
    try {
      const newTasks = await taskService.findPaginated({
        page: this.currentPage + 1,
        limit: this.pageSize
      });

      this.setState({
        tasks: [...this.state.tasks, ...newTasks],
        loading: false
      });
      
      this.currentPage++;
    } catch (error) {
      this.setState({ loading: false, error: error.message });
    }
  }
}
```

### Virtual Scrolling

For very large lists, consider virtual scrolling:

```tsx
export const VirtualTaskList = ({ tasks }: VirtualTaskListProps) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const itemHeight = 100;
  
  const visibleTasks = tasks.slice(visibleRange.start, visibleRange.end);

  return (
    <div 
      class="virtual-list"
      style={`height: ${tasks.length * itemHeight}px`}
      onscroll={handleScroll}
    >
      <div style={`transform: translateY(${visibleRange.start * itemHeight}px)`}>
        {visibleTasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
};
```

## Error Handling

### Error Boundaries

Implement error boundaries for graceful error handling:

```tsx
export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <TaskList />
</ErrorBoundary>
```

### Global Error Handling

Set up global error handling:

```typescript
// In main.tsx
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Report to error service
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Report to error service
});
```

### User-Friendly Error Messages

Show meaningful error messages to users:

```typescript
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    switch (error.name) {
      case 'NetworkError':
        return 'Network connection error. Please check your internet connection.';
      case 'ValidationError':
        return 'Please check your input and try again.';
      case 'AuthError':
        return 'Please log in again to continue.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }
  
  return 'An unexpected error occurred.';
};
```

## TypeScript Best Practices

### Strict Type Checking

Enable strict TypeScript configuration:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Use Union Types

Prefer union types over enums when appropriate:

```typescript
// ✅ Good - Union types
type TaskStatus = 'todo' | 'in-progress' | 'completed';
type Priority = 'low' | 'medium' | 'high';

// ✅ Also good - When you need runtime values
export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress', 
  COMPLETED: 'completed'
} as const;

type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];
```

### Generic Types

Use generics for reusable types:

```typescript
// ✅ Good - Generic types
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Usage
type TaskResponse = ApiResponse<Task>;
type TaskListResponse = PaginatedResponse<Task>;
```

### Utility Types

Leverage TypeScript utility types:

```typescript
// ✅ Good - Using utility types
interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

type CreateTaskRequest = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateTaskRequest = Partial<Pick<Task, 'title' | 'description' | 'status'>>;
type TaskSummary = Pick<Task, 'id' | 'title' | 'status'>;
```

## Testing Strategies

### Unit Testing

Test business logic and utilities:

```typescript
// task.store.test.ts
describe('TaskStore', () => {
  let store: TaskStore;

  beforeEach(() => {
    store = new TaskStore();
  });

  it('should add a task', async () => {
    const taskData = {
      title: 'Test task',
      status: 'todo' as const,
      category: 'work'
    };

    await store.createTask(taskData);

    expect(store.state.tasks).toHaveLength(1);
    expect(store.state.tasks[0].title).toBe('Test task');
  });

  it('should calculate stats correctly', () => {
    store.setState({
      tasks: [
        { id: '1', status: 'completed' } as Task,
        { id: '2', status: 'todo' } as Task,
        { id: '3', status: 'completed' } as Task
      ]
    });

    const stats = store.stats;
    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(2);
  });
});
```

### Component Testing

Test component behavior:

```typescript
// task-card.test.tsx
describe('TaskCard', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Test task',
    status: 'todo',
    // ... other properties
  };

  it('should render task title', () => {
    const component = mount(<TaskCard task={mockTask} />);
    expect(component.text()).toContain('Test task');
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    const component = mount(<TaskCard task={mockTask} onClick={handleClick} />);
    
    component.find('.task-card').simulate('click');
    expect(handleClick).toHaveBeenCalledWith(mockTask);
  });
});
```

### Integration Testing

Test feature workflows:

```typescript
// task-management.integration.test.ts
describe('Task Management Integration', () => {
  it('should create and update a task', async () => {
    // Create task
    await taskStore.createTask({
      title: 'Integration test task',
      status: 'todo',
      category: 'test'
    });

    expect(taskStore.state.tasks).toHaveLength(1);

    // Update task
    const taskId = taskStore.state.tasks[0].id;
    await taskStore.updateTask(taskId, { status: 'completed' });

    expect(taskStore.state.tasks[0].status).toBe('completed');
  });
});
```

## Code Quality

### ESLint Configuration

Use a comprehensive ESLint configuration:

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error'
  }
};
```

### Code Documentation

Document complex logic and APIs:

```typescript
/**
 * Calculates task completion statistics with performance optimization
 * 
 * @param tasks - Array of tasks to analyze
 * @returns Object containing completion statistics
 * 
 * @example
 * ```typescript
 * const stats = calculateTaskStats(tasks);
 * console.log(`${stats.completionRate}% complete`);
 * ```
 */
export function calculateTaskStats(tasks: Task[]): TaskStats {
  // Implementation
}
```

### Git Hooks

Set up pre-commit hooks:

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

## Security Considerations

### Input Validation

Always validate user input:

```typescript
export class TaskService {
  async createTask(data: CreateTaskRequest): Promise<Task> {
    // Validate input
    if (!data.title?.trim()) {
      throw new ValidationError('Task title is required');
    }

    if (data.title.length > 255) {
      throw new ValidationError('Task title too long');
    }

    // Sanitize input
    const sanitizedData = {
      ...data,
      title: data.title.trim(),
      description: data.description?.trim()
    };

    return await this.table.create(sanitizedData);
  }
}
```

### XSS Prevention

Avoid dangerous HTML rendering:

```tsx
// ✅ Good - Safe text rendering
export const TaskDescription = ({ description }: { description: string }) => {
  return <p>{description}</p>; // Automatically escaped
};

// ❌ Bad - Dangerous HTML
export const TaskDescription = ({ description }: { description: string }) => {
  return <p dangerouslySetInnerHTML={{ __html: description }} />; // XSS risk
};
```

### Data Sanitization

Sanitize data before storage:

```typescript
import DOMPurify from 'dompurify';

export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input.trim());
};

export const validateAndSanitizeTask = (data: any): CreateTaskRequest => {
  return {
    title: sanitizeInput(data.title),
    description: data.description ? sanitizeInput(data.description) : undefined,
    // ... other fields
  };
};
```

## Summary

Following these best practices will help you build maintainable, scalable, and secure MARH applications:

1. **Keep components small and focused**
2. **Use TypeScript effectively for type safety**
3. **Organize state management logically**
4. **Implement proper error handling**
5. **Write comprehensive tests**
6. **Optimize for performance**
7. **Follow security best practices**
8. **Maintain code quality standards**

Remember: These are guidelines, not strict rules. Adapt them to your specific project needs and team preferences.