/**
 * describe tool - Use vision AI to describe page screenshots
 *
 * Takes a screenshot and sends it to a vision API (OpenAI or Anthropic)
 * to get a text description of what's visible on the page.
 */

import { getSession, listSessions } from '../session.js';
import { describeImage, isConfigured, VisionProvider } from '../vision/index.js';

export const schema = {
  name: 'describe',
  description: `Use vision AI to describe what's visible on the page. Takes a screenshot and returns a text description.

Requires OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable to be set.

Use cases:
- Understand page layout and content without raw HTML
- Check if forms submitted successfully
- Identify error messages or alerts
- Verify visual state after actions`,
  inputSchema: {
    type: 'object',
    properties: {
      session: {
        type: 'string',
        description: 'The session name',
      },
      selector: {
        type: 'string',
        description: 'CSS selector for a specific element to describe. If omitted, describes the full viewport.',
      },
      fullPage: {
        type: 'boolean',
        description: 'Capture full scrollable page instead of viewport only. Ignored if selector is provided. Default: false',
      },
      prompt: {
        type: 'string',
        description: 'Specific question about the screenshot (e.g., "What errors are visible?"). If omitted, provides a general description.',
      },
    },
    required: ['session'],
  },
};

export interface DescribeParams {
  session: string;
  selector?: string;
  fullPage?: boolean;
  prompt?: string;
}

export interface DescribeResult {
  success: boolean;
  description?: string;
  provider?: VisionProvider;
  error?: string;
}

export async function handler(params: DescribeParams): Promise<DescribeResult | { error: string; availableSessions?: string[] }> {
  const { session: sessionId, selector, fullPage = false, prompt } = params;

  // Check if vision is configured
  if (!isConfigured()) {
    return {
      success: false,
      error: 'Vision not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.'
    };
  }

  const session = getSession(sessionId);
  if (!session) {
    return {
      error: `Session '${sessionId}' not found`,
      availableSessions: listSessions(),
    };
  }

  try {
    let buffer: Buffer;

    if (selector) {
      // Capture specific element
      const element = session.page.locator(selector);

      // Check if element exists
      const count = await element.count();
      if (count === 0) {
        return {
          success: false,
          error: `Element not found: ${selector}`
        };
      }

      buffer = await element.screenshot({ type: 'png' });
    } else {
      // Capture page/viewport
      buffer = await session.page.screenshot({
        type: 'png',
        fullPage,
      });
    }

    // Convert to base64
    const base64Image = buffer.toString('base64');

    // Send to vision API
    const result = await describeImage(base64Image, prompt);

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
