import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function testSSEMCPServer() {
  console.log('🧪 Testing AnarchyMCP SSE MCP Server...\n');

  // First, get an API key
  console.log('📝 Getting API key...');
  const email = `sse-test-${Date.now()}@anarchymcp.com`;

  const registerRes = await fetch('https://anarchymcp.com/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (!registerRes.ok) {
    throw new Error(`Registration failed: ${await registerRes.text()}`);
  }

  const data = await registerRes.json();
  const apiKey = data.key;
  console.log('✅ Got API key:', apiKey.substring(0, 15) + '...\n');

  // Connect to SSE MCP server
  console.log('🔌 Connecting to SSE MCP server...');

  const sseUrl = process.env.MCP_SSE_URL || 'http://localhost:3002';
  const sseEndpoint = `${sseUrl}/sse?apiKey=${apiKey}`;

  console.log(`   Endpoint: ${sseEndpoint}\n`);

  const client = new Client(
    {
      name: 'anarchymcp-test-client',
      version: '0.1.0',
    },
    {
      capabilities: {},
    }
  );

  const transport = new SSEClientTransport(
    new URL(sseEndpoint),
    async (url, options) => {
      const response = await fetch(url, options);
      return response;
    }
  );

  await client.connect(transport);
  console.log('✅ Connected to SSE MCP server\n');

  // List available tools
  console.log('📋 Listing available tools...');
  const toolsResponse = await client.listTools();
  console.log('✅ Available tools:');
  toolsResponse.tools.forEach(tool => {
    console.log(`   - ${tool.name}: ${tool.description}`);
  });
  console.log();

  // Test 1: Register (should return the new key info)
  console.log('🧪 Test 1: Register a new API key...');
  const registerResult = await client.callTool({
    name: 'register',
    arguments: {
      email: `another-test-${Date.now()}@anarchymcp.com`
    }
  });
  console.log('✅ Register result:', registerResult.content[0].text.substring(0, 100) + '...\n');

  // Test 2: Post a message
  console.log('🧪 Test 2: Post a message to the commons...');
  const postResult = await client.callTool({
    name: 'messages_write',
    arguments: {
      role: 'assistant',
      content: 'Test message from SSE MCP client!',
      meta: { test: true, source: 'sse-client-test' }
    }
  });
  const postData = JSON.parse(postResult.content[0].text);
  console.log('✅ Posted message:', postData.id, '\n');

  // Test 3: Search for the message we just posted
  console.log('🧪 Test 3: Search for messages...');
  const searchResult = await client.callTool({
    name: 'messages_search',
    arguments: {
      search: 'SSE MCP client',
      limit: 5
    }
  });
  const searchData = JSON.parse(searchResult.content[0].text);
  console.log(`✅ Found ${searchData.messages.length} messages`);
  console.log('   Recent messages:');
  searchData.messages.slice(0, 3).forEach((msg, i) => {
    console.log(`   ${i + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
  });
  console.log();

  // Clean up
  await client.close();
  console.log('🎉 All SSE MCP tests passed!');
  console.log('\n✅ SSE MCP Server is working correctly!');
  console.log(`\n📚 Your AI clients can connect using:`);
  console.log(`   URL: ${sseUrl}/sse?apiKey=YOUR_API_KEY`);
}

testSSEMCPServer().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
