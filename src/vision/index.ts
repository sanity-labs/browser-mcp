/**
 * Vision module - provider selection and unified interface
 */

import * as openai from './openai.js';
import * as anthropic from './anthropic.js';

export type VisionProvider = 'openai' | 'anthropic';

const DEFAULT_PROMPT = `Describe this screenshot of a web page. Include:
- Main content and purpose of the page
- Key UI elements (buttons, forms, navigation)
- Any error messages or alerts visible
- Current state (loading, loaded, error)
Keep the description concise but comprehensive.`;

export interface VisionResult {
  success: boolean;
  description?: string;
  provider?: VisionProvider;
  error?: string;
}

/**
 * Get the configured vision provider.
 * Prefers OpenAI if both are configured.
 */
export function getProvider(): VisionProvider | null {
  if (openai.isConfigured()) return 'openai';
  if (anthropic.isConfigured()) return 'anthropic';
  return null;
}

/**
 * Check if any vision provider is configured.
 */
export function isConfigured(): boolean {
  return getProvider() !== null;
}

/**
 * Build the prompt for vision API.
 */
function buildPrompt(userPrompt?: string): string {
  if (!userPrompt) {
    return DEFAULT_PROMPT;
  }
  return `Looking at this screenshot of a web page: ${userPrompt}`;
}

/**
 * Describe an image using the configured vision provider.
 */
export async function describeImage(
  base64Image: string,
  userPrompt?: string
): Promise<VisionResult> {
  const provider = getProvider();

  if (!provider) {
    return {
      success: false,
      error: 'Vision not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.'
    };
  }

  const prompt = buildPrompt(userPrompt);

  try {
    let description: string;

    if (provider === 'openai') {
      description = await openai.describeImage(base64Image, prompt);
    } else {
      description = await anthropic.describeImage(base64Image, prompt);
    }

    return {
      success: true,
      description,
      provider
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Vision API error: ${message}`,
      provider
    };
  }
}
