# MARH Framework Tutorial: Building a Task Management App

In this tutorial, you'll build a complete task management application using MARH Framework. By the end, you'll understand all the core concepts and be ready to build your own applications.

## What We're Building

A task management app with:
- ✅ Create, edit, and delete tasks
- 📋 Organize tasks by categories
- 🎯 Set priorities and due dates
- 📊 Progress tracking and statistics
- 💾 Persistent data storage
- 🎨 Beautiful, responsive UI

## Prerequisites

- Node.js 18+ installed
- Basic knowledge of TypeScript/JavaScript
- Familiarity with web development concepts

## Step 1: Project Setup

### Create the Project

```bash
npx create-marh-app task-manager --template=pwa
cd task-manager
npm install
```

### Start Development Server

```bash
npm run dev
```

Your app should now be running at `http://localhost:5173`

## Step 2: Planning the Data Structure

Let's define our data models first. Create `src/types/index.ts`:

```typescript
export interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'completed';
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  overdue: number;
}
```

## Step 3: Setting Up the Database

Create `src/services/task-db.service.ts`:

```typescript
import { createDatabase } from '@marh/shared/database';
import { ICrudService } from '@marh/shared/services/crud.interface';
import { Task, Category } from '../types';

class TaskDbService implements ICrudService<Task> {
  private db = createDatabase({ 
    type: 'auto',
    name: 'task-manager' 
  });
  
  private taskTable = this.db.table<Task>('tasks');
  private categoryTable = this.db.table<Category>('categories');

  // Task CRUD operations
  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    return await this.taskTable.create({
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async findAll() {
    return await this.taskTable.findAll();
  }

  async findById(id: string) {
    return await this.taskTable.findById(id);
  }

  async update(id: string, data: Partial<Task>) {
    return await this.taskTable.update(id, {
      ...data,
      updatedAt: new Date()
    });
  }

  async delete(id: string) {
    return await this.taskTable.delete(id);
  }

  // Category operations
  async createCategory(data: Omit<Category, 'id' | 'createdAt'>) {
    return await this.categoryTable.create({
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date()
    });
  }

  async findAllCategories() {
    return await this.categoryTable.findAll();
  }

  async deleteCategory(id: string) {
    return await this.categoryTable.delete(id);
  }

  // Custom queries
  async findTasksByCategory(categoryId: string) {
    return await this.taskTable.findWhere({ category: categoryId });
  }

  async findTasksByStatus(status: Task['status']) {
    return await this.taskTable.findWhere({ status });
  }

  async findOverdueTasks() {
    const tasks = await this.taskTable.findAll();
    const now = new Date();
    
    return tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now && 
      task.status !== 'completed'
    );
  }
}

export const taskDbService = new TaskDbService();
```

## Step 4: State Management

Create `src/stores/task.store.ts`:

```typescript
import { Store } from '@marh/core';
import { taskDbService } from '../services/task-db.service';
import { Task, Category, TaskStats } from '../types';

interface TaskState {
  tasks: Task[];
  categories: Category[];
  selectedCategory: string | null;
  selectedTask: Task | null;
  loading: boolean;
  error: string | null;
}

export class TaskStore extends Store<TaskState> {
  constructor() {
    super({
      tasks: [],
      categories: [],
      selectedCategory: null,
      selectedTask: null,
      loading: false,
      error: null
    });
    
    this.loadData();
  }

  async loadData() {
    this.setState({ loading: true, error: null });
    
    try {
      const [tasks, categories] = await Promise.all([
        taskDbService.findAll(),
        taskDbService.findAllCategories()
      ]);
      
      this.setState({ tasks, categories, loading: false });
      
      // Create default categories if none exist
      if (categories.length === 0) {
        await this.createDefaultCategories();
      }
    } catch (error) {
      this.setState({ 
        error: error instanceof Error ? error.message : 'Failed to load data',
        loading: false 
      });
    }
  }

  private async createDefaultCategories() {
    const defaultCategories = [
      { name: 'Work', color: '#3B82F6' },
      { name: 'Personal', color: '#10B981' },
      { name: 'Shopping', color: '#F59E0B' },
      { name: 'Health', color: '#EF4444' }
    ];

    for (const category of defaultCategories) {
      await this.createCategory(category.name, category.color);
    }
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      this.setState({ loading: true, error: null });
      
      const newTask = await taskDbService.create(taskData);
      
      this.setState({
        tasks: [...this.state.tasks, newTask],
        loading: false
      });
      
      return newTask;
    } catch (error) {
      this.setState({ 
        error: error instanceof Error ? error.message : 'Failed to create task',
        loading: false 
      });
      throw error;
    }
  }

  async updateTask(id: string, updates: Partial<Task>) {
    try {
      this.setState({ loading: true, error: null });
      
      const updatedTask = await taskDbService.update(id, updates);
      
      this.setState({
        tasks: this.state.tasks.map(task => 
          task.id === id ? updatedTask : task
        ),
        selectedTask: this.state.selectedTask?.id === id ? updatedTask : this.state.selectedTask,
        loading: false
      });
      
      return updatedTask;
    } catch (error) {
      this.setState({ 
        error: error instanceof Error ? error.message : 'Failed to update task',
        loading: false 
      });
      throw error;
    }
  }

  async deleteTask(id: string) {
    try {
      await taskDbService.delete(id);
      
      this.setState({
        tasks: this.state.tasks.filter(task => task.id !== id),
        selectedTask: this.state.selectedTask?.id === id ? null : this.state.selectedTask
      });
    } catch (error) {
      this.setState({ 
        error: error instanceof Error ? error.message : 'Failed to delete task'
      });
      throw error;
    }
  }

  async createCategory(name: string, color: string) {
    try {
      const newCategory = await taskDbService.createCategory({ name, color });
      
      this.setState({
        categories: [...this.state.categories, newCategory]
      });
      
      return newCategory;
    } catch (error) {
      this.setState({ 
        error: error instanceof Error ? error.message : 'Failed to create category'
      });
      throw error;
    }
  }

  setSelectedCategory(categoryId: string | null) {
    this.setState({ selectedCategory: categoryId });
  }

  setSelectedTask(task: Task | null) {
    this.setState({ selectedTask: task });
  }

  // Computed properties
  get filteredTasks(): Task[] {
    if (!this.state.selectedCategory) {
      return this.state.tasks;
    }
    return this.state.tasks.filter(task => task.category === this.state.selectedCategory);
  }

  get taskStats(): TaskStats {
    const tasks = this.filteredTasks;
    const now = new Date();
    
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      overdue: tasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) < now && 
        t.status !== 'completed'
      ).length
    };
  }

  get tasksByStatus() {
    const tasks = this.filteredTasks;
    
    return {
      todo: tasks.filter(t => t.status === 'todo'),
      inProgress: tasks.filter(t => t.status === 'in-progress'),
      completed: tasks.filter(t => t.status === 'completed')
    };
  }
}

export const taskStore = new TaskStore();
```

## Step 5: Building the UI Components

### Task Card Component

Create `src/components/TaskCard.tsx`:

```tsx
import { m } from '@marh/core';
import { Task } from '../types';
import { taskStore } from '../stores/task.store';

interface TaskCardProps {
  task: Task;
}

export const TaskCard = ({ task }: TaskCardProps) => {
  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800', 
    high: 'bg-red-100 text-red-800'
  };

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800'
  };

  const isOverdue = task.dueDate && 
    new Date(task.dueDate) < new Date() && 
    task.status !== 'completed';

  const handleStatusChange = async (newStatus: Task['status']) => {
    await taskStore.updateTask(task.id, { status: newStatus });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div 
      class={`bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer ${
        isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
      }`}
      onclick={() => taskStore.setSelectedTask(task)}
    >
      <div class="flex items-start justify-between mb-2">
        <h3 class={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
          {task.title}
        </h3>
        
        <div class="flex gap-1">
          <span class={`px-2 py-1 text-xs rounded ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
          <span class={`px-2 py-1 text-xs rounded ${statusColors[task.status]}`}>
            {task.status.replace('-', ' ')}
          </span>
        </div>
      </div>

      {task.description && (
        <p class="text-sm text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      <div class="flex items-center justify-between">
        {task.dueDate && (
          <span class={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            Due: {formatDate(task.dueDate)}
          </span>
        )}
        
        <div class="flex gap-1">
          {task.status !== 'completed' && (
            <button
              onclick={(e) => {
                e.stopPropagation();
                handleStatusChange(task.status === 'todo' ? 'in-progress' : 'completed');
              }}
              class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {task.status === 'todo' ? 'Start' : 'Complete'}
            </button>
          )}
          
          {task.status === 'completed' && (
            <button
              onclick={(e) => {
                e.stopPropagation();
                handleStatusChange('in-progress');
              }}
              class="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

### Task Form Component

Create `src/components/TaskForm.tsx`:

```tsx
import { m, useState } from '@marh/core';
import { Task } from '../types';
import { taskStore } from '../stores/task.store';

interface TaskFormProps {
  task?: Task | null;
  onClose: () => void;
}

export const TaskForm = ({ task, onClose }: TaskFormProps) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    category: task?.category || (taskStore.state.categories[0]?.id || ''),
    priority: task?.priority || 'medium' as Task['priority'],
    status: task?.status || 'todo' as Task['status'],
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined
      };

      if (task) {
        await taskStore.updateTask(task.id, taskData);
      } else {
        await taskStore.createTask(taskData);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onclick={onClose}
            class="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onsubmit={handleSubmit} class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              oninput={(e) => updateFormData('title', (e.target as HTMLInputElement).value)}
              class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter task title"
            />
            {errors.title && (
              <p class="text-red-500 text-xs mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              oninput={(e) => updateFormData('description', (e.target as HTMLTextAreaElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter task description (optional)"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Category *</label>
            <select
              value={formData.category}
              onchange={(e) => updateFormData('category', (e.target as HTMLSelectElement).value)}
              class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a category</option>
              {taskStore.state.categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p class="text-red-500 text-xs mt-1">{errors.category}</p>
            )}
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Priority</label>
              <select
                value={formData.priority}
                onchange={(e) => updateFormData('priority', (e.target as HTMLSelectElement).value)}
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onchange={(e) => updateFormData('status', (e.target as HTMLSelectElement).value)}
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              value={formData.dueDate}
              oninput={(e) => updateFormData('dueDate', (e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={taskStore.state.loading}
              class="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {taskStore.state.loading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
            </button>
            <button
              type="button"
              onclick={onClose}
              class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

### Dashboard Component

Create `src/components/Dashboard.tsx`:

```tsx
import { m } from '@marh/core';
import { taskStore } from '../stores/task.store';

export const Dashboard = () => {
  const stats = taskStore.taskStats;
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h2 class="text-lg font-semibold mb-4">Dashboard</h2>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div class="text-sm text-gray-600">Total Tasks</div>
        </div>
        
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div class="text-sm text-gray-600">Completed</div>
        </div>
        
        <div class="text-center">
          <div class="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          <div class="text-sm text-gray-600">In Progress</div>
        </div>
        
        <div class="text-center">
          <div class="text-2xl font-bold text-red-600">{stats.overdue}</div>
          <div class="text-sm text-gray-600">Overdue</div>
        </div>
      </div>

      <div class="mb-4">
        <div class="flex justify-between text-sm mb-1">
          <span>Completion Rate</span>
          <span>{completionRate}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div 
            class="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={`width: ${completionRate}%`}
          />
        </div>
      </div>

      {stats.overdue > 0 && (
        <div class="bg-red-50 border border-red-200 rounded p-3">
          <div class="text-red-800 text-sm font-medium">
            ⚠️ You have {stats.overdue} overdue task{stats.overdue > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
};
```

## Step 6: Main Application Layout

Update `src/App.tsx`:

```tsx
import { m, useState } from '@marh/core';
import { taskStore } from './stores/task.store';
import { TaskCard } from './components/TaskCard';
import { TaskForm } from './components/TaskForm';
import { Dashboard } from './components/Dashboard';

export const App = () => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'todo' | 'in-progress' | 'completed'>('all');

  const tasksByStatus = taskStore.tasksByStatus;
  const selectedCategory = taskStore.state.categories.find(c => c.id === taskStore.state.selectedCategory);

  const getTasksForTab = () => {
    switch (activeTab) {
      case 'todo': return tasksByStatus.todo;
      case 'in-progress': return tasksByStatus.inProgress;
      case 'completed': return tasksByStatus.completed;
      default: return taskStore.filteredTasks;
    }
  };

  const tasksToShow = getTasksForTab();

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 py-4">
          <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold text-gray-900">Task Manager</h1>
            <button
              onclick={() => setShowTaskForm(true)}
              class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              + New Task
            </button>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar */}
          <div class="lg:col-span-1 space-y-6">
            {/* Dashboard Stats */}
            <Dashboard />

            {/* Category Filter */}
            <div class="bg-white rounded-lg shadow-sm p-4">
              <h3 class="font-medium mb-3">Categories</h3>
              <div class="space-y-2">
                <button
                  onclick={() => taskStore.setSelectedCategory(null)}
                  class={`w-full text-left px-3 py-2 rounded text-sm ${
                    !taskStore.state.selectedCategory 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  All Categories
                </button>
                
                {taskStore.state.categories.map(category => {
                  const taskCount = taskStore.state.tasks.filter(t => t.category === category.id).length;
                  
                  return (
                    <button
                      key={category.id}
                      onclick={() => taskStore.setSelectedCategory(category.id)}
                      class={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center ${
                        taskStore.state.selectedCategory === category.id
                          ? 'bg-blue-100 text-blue-800'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div class="flex items-center gap-2">
                        <div 
                          class="w-3 h-3 rounded-full"
                          style={`background-color: ${category.color}`}
                        />
                        {category.name}
                      </div>
                      <span class="text-xs text-gray-500">{taskCount}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div class="lg:col-span-3">
            {/* Header with tabs */}
            <div class="mb-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">
                  {selectedCategory ? selectedCategory.name : 'All Tasks'}
                </h2>
                <div class="text-sm text-gray-600">
                  {tasksToShow.length} task{tasksToShow.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Status Tabs */}
              <div class="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {(['all', 'todo', 'in-progress', 'completed'] as const).map(tab => (
                  <button
                    key={tab}
                    onclick={() => setActiveTab(tab)}
                    class={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    <span class="ml-1 text-xs">
                      ({tab === 'all' ? taskStore.filteredTasks.length : tasksByStatus[tab as keyof typeof tasksByStatus]?.length || 0})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tasks Grid */}
            {taskStore.state.loading ? (
              <div class="text-center py-8">
                <div class="text-gray-500">Loading tasks...</div>
              </div>
            ) : tasksToShow.length === 0 ? (
              <div class="text-center py-12">
                <div class="text-gray-500 mb-4">
                  No tasks found {activeTab !== 'all' && `in "${activeTab}" status`}
                </div>
                <button
                  onclick={() => setShowTaskForm(true)}
                  class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Create your first task
                </button>
              </div>
            ) : (
              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tasksToShow.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          onClose={() => setShowTaskForm(false)}
        />
      )}

      {/* Task Detail Modal */}
      {taskStore.state.selectedTask && (
        <TaskForm
          task={taskStore.state.selectedTask}
          onClose={() => taskStore.setSelectedTask(null)}
        />
      )}

      {/* Error Display */}
      {taskStore.state.error && (
        <div class="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg">
          {taskStore.state.error}
          <button
            onclick={() => taskStore.setState({ error: null })}
            class="ml-2 text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
```

## Step 7: Testing Your App

Start your development server:

```bash
npm run dev
```

You should now have a fully functional task management app! Try:

1. **Creating tasks** with different priorities and categories
2. **Updating task status** by clicking the action buttons
3. **Filtering by category** using the sidebar
4. **Viewing different status tabs** (All, To Do, In Progress, Completed)
5. **Editing tasks** by clicking on them

## Step 8: Adding Polish and Features

### Add Loading States

Update your components to show loading indicators:

```tsx
// In TaskCard component
{taskStore.state.loading && (
  <div class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
    <div class="text-sm text-gray-600">Updating...</div>
  </div>
)}
```

### Add Keyboard Shortcuts

```tsx
// In App.tsx, add useEffect for keyboard shortcuts
import { useEffect } from '@marh/core';

useEffect(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'n':
          e.preventDefault();
          setShowTaskForm(true);
          break;
        case 'Escape':
          e.preventDefault();
          setShowTaskForm(false);
          taskStore.setSelectedTask(null);
          break;
      }
    }
  };

  document.addEventListener('keydown', handleKeydown);
  return () => document.removeEventListener('keydown', handleKeydown);
}, []);
```

## Step 9: Building for Production

```bash
# Build the app
npm run build

# Preview the production build
npm run preview

# Run tests
npm run test

# Check TypeScript
npm run type-check
```

## What You've Learned

Congratulations! You've built a complete task management application and learned:

✅ **MARH Project Structure** - How to organize a MARH application  
✅ **Database Integration** - Using the database system for persistent storage  
✅ **State Management** - Managing complex application state with stores  
✅ **Component Architecture** - Building reusable, type-safe components  
✅ **JSX in Mithril** - Writing modern JSX with Mithril-specific patterns  
✅ **Form Handling** - Managing forms with validation and error handling  
✅ **TypeScript Integration** - Leveraging full type safety throughout  
✅ **Responsive Design** - Creating mobile-friendly interfaces  

## Next Steps

Take your app further:

🚀 **Add Features:**
- Task search and sorting
- File attachments
- Task comments and collaboration
- Recurring tasks
- Time tracking

🎨 **Improve UX:**
- Drag and drop task reordering
- Dark mode support
- Animations and transitions
- Keyboard navigation

📱 **Go Cross-Platform:**
- Try the desktop template with Electron
- Add PWA features like push notifications
- Implement offline synchronization

🧪 **Add Testing:**
- Write unit tests for your stores
- Add component tests
- Create E2E tests for user workflows

Ready to build more with MARH? Check out the [API Reference](./API-REFERENCE.md) or explore [advanced patterns](./BEST-PRACTICES.md)!