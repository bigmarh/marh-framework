import { IPC, TypedIPC } from '@marh/core';

export class IPCService {
  static async openFile(): Promise<string | null> {
    const result = await TypedIPC.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.success && result.data && result.data.length > 0) {
      const filePath = result.data[0];
      const fileContent = await TypedIPC.readFile(filePath);
      
      if (fileContent.success && fileContent.data) {
        return fileContent.data;
      }
    }
    return null;
  }

  static async saveFile(content: string): Promise<boolean> {
    const result = await TypedIPC.showSaveDialog({
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.success && result.data) {
      const writeResult = await TypedIPC.writeFile(result.data, content);
      return writeResult.success;
    }
    return false;
  }

  static async getAppVersion(): Promise<string> {
    const result = await IPC.invoke<string>('app:getVersion');
    return result.success ? result.data || '1.0.0' : '1.0.0';
  }

  static async showNotification(title: string, body?: string): Promise<void> {
    await IPC.invoke('notification:show', { title, body });
  }
}