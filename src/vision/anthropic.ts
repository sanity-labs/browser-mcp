/**
 * Anthropic Vision API wrapper
 */

import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  client = new Anthropic({ apiKey });
  return client;
}

export function isConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function describeImage(
  base64Image: string,
  prompt: string
): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) {
    throw new Error('Anthropic not configured');
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: base64Image
          }
        },
        { type: 'text', text: prompt }
      ]
    }]
  });

  const textBlock = response.content.find(block => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No response from Anthropic');
  }

  return textBlock.text;
}
