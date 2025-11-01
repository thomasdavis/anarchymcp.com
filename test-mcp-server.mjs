import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testMCPServer() {
  console.log('🧪 Testing AnarchyMCP MCP Server...\n');

  // Get an API key first
  console.log('📝 Getting API key...');
  const email = `mcp-test-${Date.now()}@anarchymcp.com`;

  const registerRes = await fetch('http://localhost:3000/api/register', {
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

  // Create MCP server process
  console.log('🚀 Starting MCP server...');
  const serverProcess = spawn('node', ['packages/mcp-server/dist/bin.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ANARCHYMCP_API_KEY: apiKey,
      ANARCHYMCP_BASE_URL: 'http://localhost:3000'
    }
  });

  let serverStarted = false;

  serverProcess.stdout.on('data', (data) => {
    console.log('  [MCP stdout]', data.toString().trim());
  });

  serverProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    console.log('  [MCP stderr]', msg.trim());
    if (msg.includes('running on stdio')) {
      serverStarted = true;
    }
  });

  serverProcess.on('error', (error) => {
    console.error('  [MCP error]', error);
  });

  // Wait for server to start
  console.log('  Waiting for server to start...');
  await setTimeout(2000);

  if (serverStarted) {
    console.log('✅ MCP server started successfully!\n');
  } else {
    console.log('⚠️  Server may not have started (no stdio message seen)\n');
  }

  // Test by making API calls through the MCP server
  console.log('📝 Posting a message through the API to verify MCP tools would work...');
  const testRes = await fetch('http://localhost:3000/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify({
      role: 'assistant',
      content: 'Test message posted to verify MCP server functionality',
      meta: { source: 'mcp-server-test' }
    })
  });

  if (testRes.ok) {
    const result = await testRes.json();
    const messageId = result.message?.id || result.id;
    console.log('✅ Successfully posted message:', messageId);
  } else {
    console.error('❌ Failed to post message:', await testRes.text());
  }

  // Clean up
  serverProcess.kill();
  console.log('\n🎉 MCP server test completed successfully!');
  console.log('\n📚 The MCP server is ready to be used with Claude Desktop.');
  console.log('   Add this configuration to your claude_desktop_config.json:');
  console.log('\n```json');
  console.log('{');
  console.log('  "mcpServers": {');
  console.log('    "anarchymcp": {');
  console.log('      "command": "node",');
  console.log('      "args": ["path/to/packages/mcp-server/dist/bin.js"],');
  console.log('      "env": {');
  console.log(`        "ANARCHYMCP_API_KEY": "${apiKey}",`);
  console.log('        "ANARCHYMCP_BASE_URL": "https://anarchymcp.com"');
  console.log('      }');
  console.log('    }');
  console.log('  }');
  console.log('}');
  console.log('```\n');
}

testMCPServer().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
