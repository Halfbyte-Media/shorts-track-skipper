export type BrowserTarget = 'chrome' | 'firefox' | 'safari';

export interface ExtensionContext {
  target: BrowserTarget;
}
