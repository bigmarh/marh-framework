import { m, MarhComponent } from '@marh/core';
import { BaseAppStore, Notification } from '../stores/base-app.store';

interface NotificationListProps {
  appStore: BaseAppStore;
}

/**
 * Notification List Component - Displays and manages notifications
 * 
 * This component is shared between desktop and PWA templates and shows:
 * - Rendering lists from store state
 * - Different notification types with styling
 * - Interactive notification management (remove, clear all)
 */
export const NotificationList: MarhComponent<NotificationListProps> = {
  view({ attrs }) {
    const { appStore } = attrs;
    
    if (appStore.notifications.length === 0) {
      return null;
    }

    return (
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">
          Notifications ({appStore.notifications.length})
        </h3>
        <div class="space-y-2">
          {appStore.notifications.map((notification: Notification) => (
            <div
              key={notification.id}
              class={`p-3 rounded border-l-4 ${
                notification.type === 'info' ? 'bg-blue-50 border-blue-500 text-blue-700' :
                notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' :
                notification.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' :
                'bg-red-50 border-red-500 text-red-700'
              }`}
            >
              <div class="flex justify-between items-start">
                <div>
                  <p class="text-sm font-medium">{notification.message}</p>
                  <p class="text-xs opacity-75 mt-1">
                    {notification.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <button
                  class="text-gray-400 hover:text-gray-600 ml-2 text-lg leading-none"
                  onclick={() => appStore.removeNotification(notification.id)}
                  title="Remove notification"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          class="mt-3 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
          onclick={() => appStore.clearNotifications()}
        >
          Clear All
        </button>
      </div>
    );
  }
};