/**
 * diagnostics tool - Get console logs and network requests
 */

import { getSession, listSessions, ConsoleEntry, NetworkEntry } from '../session.js';

export const schema = {
  name: 'diagnostics',
  description: `Get diagnostic information from the browser session. Useful for debugging JavaScript errors, failed network requests, etc.

Available types:
- "console": Recent console messages (log, warn, error, etc.)
- "network": Recent network requests with status codes and timing
- "all": Both console and network data`,
  inputSchema: {
    type: 'object',
    properties: {
      session: {
        type: 'string',
        description: 'The session name',
      },
      type: {
        type: 'string',
        enum: ['console', 'network', 'all'],
        description: 'Type of diagnostics to retrieve. Default: all',
      },
      level: {
        type: 'string',
        enum: ['error', 'warning', 'log', 'info', 'debug'],
        description: 'Filter console entries by level (only for type: console or all)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of entries to return per type. Default: 50',
      },
      clear: {
        type: 'boolean',
        description: 'Clear the buffers after reading. Default: false',
      },
    },
    required: ['session'],
  },
};

export interface DiagnosticsParams {
  session: string;
  type?: 'console' | 'network' | 'all';
  level?: string;
  limit?: number;
  clear?: boolean;
}

export async function handler(params: DiagnosticsParams) {
  const {
    session: sessionId,
    type = 'all',
    level,
    limit = 50,
    clear = false,
  } = params;

  const session = getSession(sessionId);
  if (!session) {
    return {
      error: `Session '${sessionId}' not found`,
      availableSessions: listSessions(),
    };
  }

  const result: {
    console?: ConsoleEntry[];
    network?: NetworkEntry[];
  } = {};

  if (type === 'console' || type === 'all') {
    let consoleEntries = [...session.diagnostics.console];

    // Filter by level if specified
    if (level) {
      consoleEntries = consoleEntries.filter((e) => e.level === level);
    }

    // Apply limit (most recent first)
    result.console = consoleEntries.slice(-limit).reverse();

    if (clear) {
      session.diagnostics.console.length = 0;
    }
  }

  if (type === 'network' || type === 'all') {
    // Apply limit (most recent first)
    result.network = [...session.diagnostics.network].slice(-limit).reverse();

    if (clear) {
      session.diagnostics.network.length = 0;
    }
  }

  return {
    session: sessionId,
    type,
    ...result,
  };
}
