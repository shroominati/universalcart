/**
 * Minimal Chrome Extension API type declarations (Manifest V3 promise-based).
 * In production, install @anthropic-ai/chrome-types or @anthropic-ai/chrome-types.
 */

declare namespace chrome {
  namespace storage {
    interface StorageArea {
      get(keys: string | string[] | null, callback: (items: Record<string, any>) => void): void;
      get(keys: string | string[] | null): Promise<Record<string, any>>;
      set(items: Record<string, any>, callback?: () => void): void;
      set(items: Record<string, any>): Promise<void>;
      remove(keys: string | string[], callback?: () => void): void;
    }
    const local: StorageArea;
    const sync: StorageArea;
    const session: StorageArea;

    namespace onChanged {
      function addListener(callback: (changes: Record<string, { oldValue?: any; newValue?: any }>, areaName: string) => void): void;
    }
  }

  namespace runtime {
    function getURL(path: string): string;
    function sendMessage(message: any, callback?: (response: any) => void): Promise<any>;
    function openOptionsPage(): void;

    namespace onMessage {
      function addListener(callback: (message: any, sender: MessageSender, sendResponse: (response?: any) => void) => boolean | void): void;
    }

    namespace onInstalled {
      function addListener(callback: (details: { reason: string }) => void): void;
    }

    interface MessageSender {
      tab?: tabs.Tab;
      frameId?: number;
      id?: string;
      url?: string;
    }
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      title?: string;
      active: boolean;
      windowId: number;
    }

    function query(queryInfo: Partial<Tab>, callback: (tabs: Tab[]) => void): void;
    function query(queryInfo: Partial<Tab>): Promise<Tab[]>;
    function create(createProperties: { url?: string; active?: boolean }): void;
    function sendMessage(tabId: number, message: any): Promise<any>;
    function update(tabId: number, updateProperties: { url?: string; active?: boolean }): void;

    namespace onUpdated {
      function addListener(callback: (tabId: number, changeInfo: { status?: string; url?: string }, tab: Tab) => void): void;
    }
  }

  namespace scripting {
    function executeScript(injection: { target: { tabId: number }; func?: Function; files?: string[] }): Promise<any>;
  }

  namespace action {
    function setBadgeText(details: { text: string; tabId?: number }): void;
    function setBadgeBackgroundColor(details: { color: string | [number, number, number, number]; tabId?: number }): void;
  }

  namespace alarms {
    function create(name: string, alarmInfo: { delayInMinutes?: number; periodInMinutes?: number }): void;
    function clear(name: string): void;

    namespace onAlarm {
      function addListener(callback: (alarm: { name: string }) => void): void;
    }
  }

  namespace notifications {
    function create(id: string, options: {
      type: string;
      iconUrl: string;
      title: string;
      message: string;
    }): void;
  }
}
