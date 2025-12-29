/**
 * Browser actions - interact with page elements.
 */

import { Page } from 'playwright';

export type ActionType =
  | 'navigate'
  | 'back'
  | 'forward'
  | 'click'
  | 'fill'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'press'
  | 'scroll'
  | 'highlight';

export interface ActionParams {
  type: ActionType;
  selector?: string;
  value?: string;
  url?: string;
}

export interface ActionResult {
  success: boolean;
  action: ActionType;
  url?: string;
  title?: string;
  selector?: string;
  direction?: string;
  error?: string;
}

export async function performAction(page: Page, params: ActionParams): Promise<ActionResult> {
  const { type, selector, value, url } = params;
  const result: ActionResult = { success: true, action: type };

  switch (type) {
    case 'navigate':
      if (!url) {
        throw new Error('navigate requires url parameter');
      }
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      result.url = page.url();
      result.title = await page.title();
      break;

    case 'back':
      await page.goBack({ waitUntil: 'domcontentloaded' });
      result.url = page.url();
      result.title = await page.title();
      break;

    case 'forward':
      await page.goForward({ waitUntil: 'domcontentloaded' });
      result.url = page.url();
      result.title = await page.title();
      break;

    case 'click':
      if (!selector) {
        throw new Error('click requires selector parameter');
      }
      await page.click(selector);
      // Wait for any navigation or network activity to settle
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      result.url = page.url();
      break;

    case 'fill':
      if (!selector) {
        throw new Error('fill requires selector parameter');
      }
      if (value === undefined) {
        throw new Error('fill requires value parameter');
      }
      await page.fill(selector, value);
      result.selector = selector;
      break;

    case 'select':
      if (!selector) {
        throw new Error('select requires selector parameter');
      }
      if (value === undefined) {
        throw new Error('select requires value parameter');
      }
      await page.selectOption(selector, value);
      result.selector = selector;
      break;

    case 'check':
      if (!selector) {
        throw new Error('check requires selector parameter');
      }
      await page.check(selector);
      result.selector = selector;
      break;

    case 'uncheck':
      if (!selector) {
        throw new Error('uncheck requires selector parameter');
      }
      await page.uncheck(selector);
      result.selector = selector;
      break;

    case 'press':
      if (!selector && !value) {
        throw new Error('press requires selector or value (key) parameter');
      }
      if (selector) {
        await page.press(selector, value || 'Enter');
      } else {
        await page.keyboard.press(value!);
      }
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      result.url = page.url();
      break;

    case 'scroll': {
      const direction = value || 'down';
      if (selector) {
        await page.evaluate(
          ({ sel, dir }: { sel: string; dir: string }) => {
            const el = document.querySelector(sel);
            if (el) {
              const amount = dir === 'up' ? -500 : 500;
              el.scrollBy(0, amount);
            }
          },
          { sel: selector, dir: direction }
        );
      } else {
        await page.evaluate((dir: string) => {
          const amount = dir === 'up' ? -500 : 500;
          window.scrollBy(0, amount);
        }, direction);
      }
      result.direction = direction;
      break;
    }

    case 'highlight': {
      if (!selector) {
        throw new Error('highlight requires selector parameter');
      }
      // Scroll element into view and flash it with a colored border
      await page.evaluate(async (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) {
          throw new Error(`Element not found: ${sel}`);
        }

        // Scroll into view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Store original styles
        const htmlEl = el as HTMLElement;
        const originalOutline = htmlEl.style.outline;
        const originalTransition = htmlEl.style.transition;

        // Apply highlight
        htmlEl.style.transition = 'outline 0.15s ease-in-out';
        htmlEl.style.outline = '3px solid #ff6b00';

        // Flash 3 times
        for (let i = 0; i < 3; i++) {
          await new Promise(r => setTimeout(r, 200));
          htmlEl.style.outline = 'none';
          await new Promise(r => setTimeout(r, 200));
          htmlEl.style.outline = '3px solid #ff6b00';
        }

        // Wait a moment then restore
        await new Promise(r => setTimeout(r, 300));
        htmlEl.style.outline = originalOutline;
        htmlEl.style.transition = originalTransition;
      }, selector);
      result.selector = selector;
      break;
    }

    default:
      throw new Error(`Unknown action type: ${type}`);
  }

  return result;
}
