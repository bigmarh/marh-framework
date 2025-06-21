import { m, MarhComponent } from '@marh/core';
import { MemoryCrudService } from '../services/memory-crud.service';
import { BaseEntity } from '../services/crud.interface';

// Demo entity for CRUD operations
interface DemoItem extends BaseEntity {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create a demo CRUD service
const demoCrudService = new MemoryCrudService<DemoItem>({
  entityName: 'demo-item',
  cache: true,
  cacheTTL: 2 * 60 * 1000, // 2 minutes
  softDelete: false
});

// Add some initial demo data
demoCrudService.loadData([
  {
    id: '1',
    title: 'Learn CRUD operations',
    description: 'Understand Create, Read, Update, Delete operations',
    category: 'Learning',
    priority: 'high',
    completed: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    title: 'Build user interface',
    description: 'Create a responsive UI for the application',
    category: 'Development',
    priority: 'medium',
    completed: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-03')
  },
  {
    id: '3',
    title: 'Write documentation',
    description: 'Document the CRUD service API and usage',
    category: 'Documentation',
    priority: 'low',
    completed: false,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  }
]);

export const CrudDemo: MarhComponent = {
  oninit() {
    this.items = [];
    this.loading = false;
    this.error = null;
    this.showForm = false;
    this.editingItem = null;
    this.currentPage = 1;
    this.itemsPerPage = 5;
    this.totalPages = 1;
    this.searchQuery = '';
    this.filterCategory = 'all';
    this.sortBy = 'title';
    this.sortDirection = 'asc';
    
    // Form state
    this.form = {
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      completed: false
    };
    
    this.loadItems();
  },

  async loadItems() {
    this.loading = true;
    this.error = null;
    m.redraw();

    try {
      // Build query options
      const queryOptions: any = {
        sort: {
          field: this.sortBy,
          direction: this.sortDirection
        },
        pagination: {
          page: this.currentPage,
          limit: this.itemsPerPage
        }
      };

      // Add filter if specified
      if (this.filterCategory !== 'all') {
        queryOptions.filter = { category: this.filterCategory };
      }

      // Get paginated results
      const result = await demoCrudService.findPaginated(queryOptions);
      
      // Apply search filter if needed
      if (this.searchQuery) {
        result.data = result.data.filter(item => 
          item.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
      }

      this.items = result.data;
      this.totalPages = result.pages;
    } catch (error: any) {
      this.error = error.message;
    } finally {
      this.loading = false;
      m.redraw();
    }
  },

  resetForm() {
    this.form = {
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      completed: false
    };
    this.editingItem = null;
  },

  showAddForm() {
    this.resetForm();
    this.showForm = true;
  },

  showEditForm(item: DemoItem) {
    this.form = {
      title: item.title,
      description: item.description,
      category: item.category,
      priority: item.priority,
      completed: item.completed
    };
    this.editingItem = item;
    this.showForm = true;
  },

  async saveItem() {
    if (!this.form.title.trim()) {
      this.error = 'Title is required';
      return;
    }

    try {
      if (this.editingItem) {
        // Update existing item
        await demoCrudService.update(this.editingItem.id, this.form);
      } else {
        // Create new item
        await demoCrudService.create(this.form);
      }
      
      this.showForm = false;
      this.resetForm();
      await this.loadItems();
    } catch (error: any) {
      this.error = error.message;
    }
  },

  async deleteItem(item: DemoItem) {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }

    try {
      await demoCrudService.delete(item.id);
      await this.loadItems();
    } catch (error: any) {
      this.error = error.message;
    }
  },

  async toggleCompleted(item: DemoItem) {
    try {
      await demoCrudService.update(item.id, {
        completed: !item.completed
      });
      await this.loadItems();
    } catch (error: any) {
      this.error = error.message;
    }
  },

  onSearch(value: string) {
    this.searchQuery = value;
    this.currentPage = 1;
    this.loadItems();
  },

  onFilterChange(category: string) {
    this.filterCategory = category;
    this.currentPage = 1;
    this.loadItems();
  },

  onSort(field: string) {
    if (this.sortBy === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDirection = 'asc';
    }
    this.loadItems();
  },

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadItems();
  },

  view() {
    const stats = demoCrudService.getStats();
    const categories = ['all', 'Learning', 'Development', 'Documentation'];

    return (
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h3 class="text-xl font-semibold text-gray-800">
              CRUD Service Demo
            </h3>
            <p class="text-sm text-gray-600">
              Items: {stats.count} | Memory: {stats.memoryUsage}
            </p>
          </div>
          <button
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onclick={() => this.showAddForm()}
          >
            + Add Item
          </button>
        </div>

        {/* Search and Filter Controls */}
        <div class="flex flex-wrap gap-4 mb-4">
          <div class="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search items..."
              value={this.searchQuery}
              oninput={(e: Event) => this.onSearch((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={this.filterCategory}
            onchange={(e: Event) => this.onFilterChange((e.target as HTMLSelectElement).value)}
            class="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>

        {/* Error Display */}
        {this.error && (
          <div class="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p class="text-red-600 text-sm">{this.error}</p>
            <button
              class="text-red-500 text-xs underline"
              onclick={() => { this.error = null; }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Form Modal */}
        {this.showForm && (
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h4 class="text-lg font-semibold mb-4">
                {this.editingItem ? 'Edit Item' : 'Add New Item'}
              </h4>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={this.form.title}
                    oninput={(e: Event) => { this.form.title = (e.target as HTMLInputElement).value; }}
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter title"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={this.form.description}
                    oninput={(e: Event) => { this.form.description = (e.target as HTMLTextAreaElement).value; }}
                    rows={3}
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter description"
                  />
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={this.form.category}
                      onchange={(e: Event) => { this.form.category = (e.target as HTMLSelectElement).value; }}
                      class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category</option>
                      <option value="Learning">Learning</option>
                      <option value="Development">Development</option>
                      <option value="Documentation">Documentation</option>
                    </select>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={this.form.priority}
                      onchange={(e: Event) => { this.form.priority = (e.target as HTMLSelectElement).value as any; }}
                      class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id="completed"
                    checked={this.form.completed}
                    onchange={(e: Event) => { this.form.completed = (e.target as HTMLInputElement).checked; }}
                    class="mr-2"
                  />
                  <label for="completed" class="text-sm text-gray-700">
                    Mark as completed
                  </label>
                </div>
              </div>
              
              <div class="flex justify-end gap-2 mt-6">
                <button
                  class="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  onclick={() => { this.showForm = false; this.resetForm(); }}
                >
                  Cancel
                </button>
                <button
                  class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  onclick={() => this.saveItem()}
                >
                  {this.editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Items List */}
        {this.loading ? (
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : (
          <>
            {/* Sort Headers */}
            <div class="grid grid-cols-12 gap-2 py-2 border-b font-medium text-gray-700 text-sm">
              <div 
                class="col-span-4 cursor-pointer hover:text-blue-600 flex items-center"
                onclick={() => this.onSort('title')}
              >
                Title {this.sortBy === 'title' && (this.sortDirection === 'asc' ? '↑' : '↓')}
              </div>
              <div 
                class="col-span-3 cursor-pointer hover:text-blue-600 flex items-center"
                onclick={() => this.onSort('category')}
              >
                Category {this.sortBy === 'category' && (this.sortDirection === 'asc' ? '↑' : '↓')}
              </div>
              <div 
                class="col-span-2 cursor-pointer hover:text-blue-600 flex items-center"
                onclick={() => this.onSort('priority')}
              >
                Priority {this.sortBy === 'priority' && (this.sortDirection === 'asc' ? '↑' : '↓')}
              </div>
              <div class="col-span-1 text-center">Status</div>
              <div class="col-span-2 text-center">Actions</div>
            </div>

            {/* Items */}
            {this.items.length === 0 ? (
              <div class="text-center py-8 text-gray-500">
                No items found. {this.searchQuery || this.filterCategory !== 'all' ? 'Try adjusting your filters.' : 'Add your first item!'}
              </div>
            ) : (
              this.items.map(item => (
                <div key={item.id} class="grid grid-cols-12 gap-2 py-3 border-b hover:bg-gray-50 text-sm">
                  <div class="col-span-4">
                    <div class={`font-medium ${item.completed ? 'line-through text-gray-500' : ''}`}>
                      {item.title}
                    </div>
                    <div class="text-gray-600 text-xs mt-1">
                      {item.description}
                    </div>
                  </div>
                  <div class="col-span-3">
                    <span class="inline-block px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                      {item.category}
                    </span>
                  </div>
                  <div class="col-span-2">
                    <span class={`inline-block px-2 py-1 rounded text-xs ${
                      item.priority === 'high' ? 'bg-red-100 text-red-700' :
                      item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                  <div class="col-span-1 text-center">
                    <button
                      class={`w-5 h-5 rounded border-2 ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
                      onclick={() => this.toggleCompleted(item)}
                      title={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {item.completed && (
                        <svg class="w-3 h-3 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  <div class="col-span-2 text-center space-x-2">
                    <button
                      class="text-blue-600 hover:text-blue-800 text-xs"
                      onclick={() => this.showEditForm(item)}
                    >
                      Edit
                    </button>
                    <button
                      class="text-red-600 hover:text-red-800 text-xs"
                      onclick={() => this.deleteItem(item)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Pagination */}
            {this.totalPages > 1 && (
              <div class="flex justify-center items-center mt-4 space-x-2">
                <button
                  class="px-3 py-1 border rounded disabled:opacity-50"
                  disabled={this.currentPage === 1}
                  onclick={() => this.onPageChange(this.currentPage - 1)}
                >
                  Previous
                </button>
                
                {Array.from({ length: this.totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    class={`px-3 py-1 border rounded ${
                      page === this.currentPage ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'
                    }`}
                    onclick={() => this.onPageChange(page)}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  class="px-3 py-1 border rounded disabled:opacity-50"
                  disabled={this.currentPage === this.totalPages}
                  onclick={() => this.onPageChange(this.currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* CRUD Operations Info */}
        <div class="mt-6 text-xs text-gray-500 border-t pt-4">
          <p><strong>CRUD Operations Demonstrated:</strong></p>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li><strong>Create:</strong> Add new items with the "+ Add Item" button</li>
            <li><strong>Read:</strong> View items with pagination, search, and filtering</li>
            <li><strong>Update:</strong> Edit items or toggle completion status</li>
            <li><strong>Delete:</strong> Remove items with confirmation</li>
            <li><strong>Advanced:</strong> Sorting, validation, caching, and memory management</li>
          </ul>
        </div>
      </div>
    );
  }
};