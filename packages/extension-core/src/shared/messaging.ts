import { BrowserTarget } from './types';

export interface Message<TPayload = unknown> {
  type: string;
  payload?: TPayload;
}

export function sendRuntimeMessage(target: BrowserTarget, message: Message) {
  if (!(globalThis as typeof globalThis & { chrome?: unknown }).chrome) {
    console.warn('[ext] runtime messaging is not available in this context');
    return;
  }

  chrome.runtime?.sendMessage({ ...message, target });
}
