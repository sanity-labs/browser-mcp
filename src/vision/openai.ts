/**
 * OpenAI Vision API wrapper
 */

import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (client) return client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  client = new OpenAI({ apiKey });
  return client;
}

export function isConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function describeImage(
  base64Image: string,
  prompt: string
): Promise<string> {
  const openai = getClient();
  if (!openai) {
    throw new Error('OpenAI not configured');
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${base64Image}`,
            detail: 'high'
          }
        }
      ]
    }],
    max_tokens: 1000
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return content;
}
