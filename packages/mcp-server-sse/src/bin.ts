#!/usr/bin/env node

import { createServer } from './index.js';

const apiKey = process.env.ANARCHYMCP_API_KEY;
const baseUrl = process.env.ANARCHYMCP_BASE_URL;

if (!apiKey) {
  console.error('Error: ANARCHYMCP_API_KEY environment variable is required');
  process.exit(1);
}

console.error('Starting AnarchyMCP SSE MCP Server...');
console.error(`Base URL: ${baseUrl || 'https://anarchymcp.com'}`);
console.error(`API Key: ${apiKey.substring(0, 20)}...`);

createServer({
  apiKey,
  baseUrl,
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
