// IPC service for Electron communication
declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeListener: (channel: string, callback: (...args: any[]) => void) => void;
    };
  }
}

export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class IPC {
  private static isElectron(): boolean {
    return typeof window !== 'undefined' && window.electronAPI !== undefined;
  }

  static async invoke<T = any>(
    channel: string,
    ...args: any[]
  ): Promise<IPCResponse<T>> {
    if (!this.isElectron()) {
      return {
        success: false,
        error: 'Not running in Electron environment'
      };
    }

    try {
      const result = await window.electronAPI!.invoke(channel, ...args);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  static on(channel: string, callback: (...args: any[]) => void): void {
    if (!this.isElectron()) {
      console.warn('IPC.on: Not running in Electron environment');
      return;
    }

    window.electronAPI!.on(channel, callback);
  }

  static removeListener(channel: string, callback: (...args: any[]) => void): void {
    if (!this.isElectron()) {
      console.warn('IPC.removeListener: Not running in Electron environment');
      return;
    }

    window.electronAPI!.removeListener(channel, callback);
  }
}

// Typed IPC methods for common operations
export namespace TypedIPC {
  export async function readFile(path: string): Promise<IPCResponse<string>> {
    return IPC.invoke<string>('fs:readFile', path);
  }

  export async function writeFile(path: string, content: string): Promise<IPCResponse<void>> {
    return IPC.invoke<void>('fs:writeFile', path, content);
  }

  export async function showOpenDialog(options: any): Promise<IPCResponse<string[]>> {
    return IPC.invoke<string[]>('dialog:showOpenDialog', options);
  }

  export async function showSaveDialog(options: any): Promise<IPCResponse<string>> {
    return IPC.invoke<string>('dialog:showSaveDialog', options);
  }
}