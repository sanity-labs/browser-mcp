/**
 * Session management for Playwright browser instances.
 * Each session is a named browser page that agents can control.
 */

import { chromium, Browser, Page } from 'playwright';

const MAX_BUFFER_SIZE = 100;

export interface ConsoleEntry {
  level: string;
  text: string;
  url?: string;
  line?: number;
  timestamp: Date;
}

export interface NetworkEntry {
  method: string;
  url: string;
  status?: number;
  duration?: number;
  error?: string;
  timestamp: Date;
}

export interface SessionDiagnostics {
  console: ConsoleEntry[];
  network: NetworkEntry[];
}

export interface Session {
  id: string;
  page: Page;
  createdAt: Date;
  diagnostics: SessionDiagnostics;
}

let browser: Browser | null = null;
const sessions = new Map<string, Session>();
const pendingRequests = new Map<string, { start: number; method: string; url: string }>();

let headless = true;

export function setHeadless(value: boolean) {
  headless = value;
}

async function ensureBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless });
  }
  return browser;
}

function addToBuffer<T>(buffer: T[], entry: T): void {
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER_SIZE) {
    buffer.shift();
  }
}

export async function openSession(sessionId: string, url: string): Promise<Session> {
  if (sessions.has(sessionId)) {
    throw new Error(`Session '${sessionId}' already exists`);
  }

  const b = await ensureBrowser();
  const page = await b.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const diagnostics: SessionDiagnostics = {
    console: [],
    network: [],
  };

  // Set up console listener
  page.on('console', (msg) => {
    const location = msg.location();
    addToBuffer(diagnostics.console, {
      level: msg.type(),
      text: msg.text(),
      url: location.url || undefined,
      line: location.lineNumber || undefined,
      timestamp: new Date(),
    });
  });

  // Set up network listeners
  page.on('request', (req) => {
    const requestId = `${req.url()}-${Date.now()}`;
    pendingRequests.set(requestId, {
      start: Date.now(),
      method: req.method(),
      url: req.url(),
    });
    // Store requestId on the request for later lookup
    (req as any)._requestId = requestId;
  });

  page.on('response', (res) => {
    const req = res.request();
    const requestId = (req as any)._requestId;
    const pending = requestId ? pendingRequests.get(requestId) : null;

    addToBuffer(diagnostics.network, {
      method: req.method(),
      url: req.url(),
      status: res.status(),
      duration: pending ? Date.now() - pending.start : undefined,
      timestamp: new Date(),
    });

    if (requestId) {
      pendingRequests.delete(requestId);
    }
  });

  page.on('requestfailed', (req) => {
    const requestId = (req as any)._requestId;
    const pending = requestId ? pendingRequests.get(requestId) : null;

    addToBuffer(diagnostics.network, {
      method: req.method(),
      url: req.url(),
      error: req.failure()?.errorText || 'Request failed',
      duration: pending ? Date.now() - pending.start : undefined,
      timestamp: new Date(),
    });

    if (requestId) {
      pendingRequests.delete(requestId);
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const session: Session = {
    id: sessionId,
    page,
    createdAt: new Date(),
    diagnostics,
  };

  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export async function closeSession(sessionId: string): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session) {
    return false;
  }

  await session.page.close();
  sessions.delete(sessionId);

  // If no more sessions, close browser to free resources
  if (sessions.size === 0 && browser) {
    await browser.close();
    browser = null;
  }

  return true;
}

export function listSessions(): string[] {
  return Array.from(sessions.keys());
}

export async function shutdown(): Promise<void> {
  for (const session of sessions.values()) {
    await session.page.close();
  }
  sessions.clear();

  if (browser) {
    await browser.close();
    browser = null;
  }
}
