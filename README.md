# Browser MCP

Web browsing tools for AI agents. Navigate and interact with web pages using semantic accessibility patterns—no screenshots needed.

Browser MCP is an MCP server that lets AI agents navigate and interact with web pages using the same accessibility semantics that screen readers use. Instead of parsing raw HTML or analyzing screenshots, agents query landmarks, headings, forms, and other semantic elements.

## Installation

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["github:simen/browser"]
    }
  }
}
```

Restart Claude Desktop. The browsing tools will appear automatically.

### Claude Code

Add to your project's `.claude/config.json` or run:

```bash
claude mcp add browser "npx github:simen/browser"
```

### Visible Browser (Debug Mode)

To see what the agent is doing, run with a visible browser window:

```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["github:simen/browser", "--no-headless"]
    }
  }
}
```

The browser will open visibly so you can watch the agent navigate.

## Available Tools

| Tool | Description |
|------|-------------|
| `open_session` | Opens a browser tab and navigates to a URL |
| `close_session` | Closes a browser session |
| `overview` | Page summary: title, URL, landmarks, element counts |
| `query` | Query elements by CSS selector, extract structure or text |
| `section` | Extract content under a heading |
| `elements` | List elements by type (headings, links, buttons, forms, tables, images) |
| `action` | Interact: navigate, click, fill, select, check, press, scroll, back, forward, highlight |
| `screenshot` | Capture page or element screenshots (saves to disk) |
| `diagnostics` | Get console logs and network requests for debugging |
| `run_sequence` | Execute a batch of browser operations and assertions in a single call |

## Example Workflow

**The 3-call pattern** covers most browsing tasks:

1. **Overview** — Understand the page structure
2. **Elements/Query** — Find what you need
3. **Action** — Interact with it

```javascript
// 1. What's on this page?
const overview = await mcp.call('overview', { session: 's1' });
// → 1 form, 15 links, 6 headings

// 2. What does the form look like?
const forms = await mcp.call('elements', { session: 's1', type: 'forms' });
// → fields: [{ name: 'q', label: 'Search', type: 'text' }, ...]

// 3. Fill and submit
await mcp.call('action', { session: 's1', type: 'fill', selector: '[name="q"]', value: 'accessibility' });
await mcp.call('action', { session: 's1', type: 'press', selector: '[name="q"]', value: 'Enter' });
```

## Screenshot Tool

Capture full page, viewport, or specific element screenshots. Screenshots save to disk and return the file path (no base64 in context window).

```javascript
// Full viewport
await mcp.call('screenshot', { session: 'main' });
// → { success: true, path: '/tmp/browser-screenshots/screenshot-123.png', size: 150000 }

// Full scrollable page
await mcp.call('screenshot', { session: 'main', fullPage: true });

// Specific element only
await mcp.call('screenshot', { session: 'main', selector: '[data-testid="tweet"]' });

// Custom save path
await mcp.call('screenshot', { session: 'main', savePath: '/tmp/my-screenshot.png' });
```

## Diagnostics Tool

Access browser console logs and network requests for debugging.

```javascript
// Get console logs
await mcp.call('diagnostics', { session: 'main', type: 'console' });
// → { console: [{ level: 'error', text: '...', url: '...', timestamp: '...' }] }

// Get network requests
await mcp.call('diagnostics', { session: 'main', type: 'network' });
// → { network: [{ url: '...', method: 'GET', status: 200, timing: 150 }] }

// Get both
await mcp.call('diagnostics', { session: 'main', type: 'all' });

// Filter by level, limit results, clear buffer
await mcp.call('diagnostics', {
  session: 'main',
  type: 'console',
  level: 'error',
  limit: 10,
  clear: true
});
```

## Highlight Action

Scroll to an element and flash it with a colored border—useful for showing users what you're looking at.

```javascript
// Highlight an element (scrolls into view + flashes orange border 3x)
await mcp.call('action', { session: 'main', type: 'highlight', selector: '.article-title' });
```

## Run Sequence Tool

Execute a batch of browser operations and assertions in a single call. Useful for testing flows.

```javascript
await mcp.call('run_sequence', {
  session: 'main',
  steps: [
    { type: 'action', action: 'fill', selector: '#search', value: 'test' },
    { type: 'action', action: 'click', selector: '#submit' },
    { type: 'assert', condition: { element_exists: '#results' } },
    { type: 'assert', condition: { element_text_contains: { selector: '#results', text: 'test' } } }
  ]
});
// → { success: true, completed: 4, total: 4, events: [...], final_state: {...} }
```

## CLI Options

```bash
npx browser [options]

Options:
  --headless=true   Run browser in headless mode (default)
  --headless=false  Run browser with visible window (for debugging)
  --help            Show help
```

## Development

```bash
# Clone and install
git clone https://github.com/simen/browser.git
cd browser
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

### Project Structure

```
src/
├── index.ts              # MCP server entry point
├── cli.ts                # CLI
├── session.ts            # Playwright session management + diagnostics buffers
├── browser/
│   ├── accessibility.ts  # DOM queries, element extraction
│   ├── actions.ts        # Browser actions (including highlight)
│   └── assertions.ts     # Assertion conditions for run_sequence
└── tools/
    ├── open-session.ts   # open_session tool
    ├── close-session.ts  # close_session tool
    ├── overview.ts       # overview tool
    ├── query.ts          # query tool
    ├── section.ts        # section tool
    ├── elements.ts       # elements tool
    ├── action.ts         # action tool
    ├── screenshot.ts     # screenshot tool
    ├── diagnostics.ts    # diagnostics tool
    └── run-sequence.ts   # run_sequence tool

test/
├── fixtures/             # Test HTML pages
├── test-server.ts        # Local test server
└── integration.test.ts   # Integration tests
```

## Why Accessibility Semantics?

Traditional web scraping parses raw HTML—brittle and verbose. Screenshot-based approaches require vision models and can't interact precisely.

Accessibility semantics give us:
- **Structure** — Landmarks (nav, main, aside) reveal page organization
- **Labels** — Buttons, links, and inputs have accessible names
- **Hierarchy** — Headings create navigable outlines
- **Interactivity** — Forms, buttons, and controls are explicitly marked

This is how screen reader users browse—and it works for agents too.

## License

MIT
