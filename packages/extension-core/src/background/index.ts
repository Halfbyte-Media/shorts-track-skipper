import { BrowserTarget, ExtensionContext } from '../shared/types';

export function bootstrapBackground(target: BrowserTarget): ExtensionContext {
  const context: ExtensionContext = { target };
  console.info(`[ext] background booting for ${target}`);

  chrome.runtime?.onInstalled?.addListener(() => {
    console.info('[ext] installed for target', target);
  });

  return context;
}
