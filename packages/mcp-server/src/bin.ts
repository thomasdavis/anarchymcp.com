#!/usr/bin/env node
import { createServer } from './index.js';

const API_KEY = process.env.ANARCHYMCP_API_KEY;
const BASE_URL = process.env.ANARCHYMCP_BASE_URL;

if (!API_KEY) {
  console.error('Error: ANARCHYMCP_API_KEY environment variable is required');
  process.exit(1);
}

createServer({
  apiKey: API_KEY,
  baseUrl: BASE_URL,
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
