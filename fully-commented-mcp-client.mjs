/**
 * Fully Commented MCP SSE Client Example
 *
 * This file demonstrates how to act as an MCP (Model Context Protocol) client
 * connecting to an SSE (Server-Sent Events) based MCP server.
 *
 * The MCP SDK handles the protocol details, but this shows what's happening
 * under the hood and how to properly use the client.
 */

// Import the MCP SDK client classes
// Client: Main MCP client that handles protocol communication
// SSEClientTransport: Transport layer that uses Server-Sent Events
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

/**
 * Main function that demonstrates full MCP client workflow
 */
async function demonstrateMcpClient() {
  console.log('='.repeat(80));
  console.log('FULLY COMMENTED MCP CLIENT DEMONSTRATION');
  console.log('='.repeat(80));
  console.log();

  // ============================================================================
  // STEP 1: AUTHENTICATION - Get an API key for the AnarchyMCP service
  // ============================================================================
  console.log('STEP 1: Authentication');
  console.log('-'.repeat(80));

  // Generate a unique email for testing
  const testEmail = `mcp-demo-${Date.now()}@example.com`;
  console.log(`📧 Registering with email: ${testEmail}`);

  // Make HTTP POST request to register and get an API key
  const registerResponse = await fetch('https://anarchymcp.com/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: testEmail
    })
  });

  // Check if registration was successful
  if (!registerResponse.ok) {
    throw new Error(`Registration failed: ${await registerResponse.text()}`);
  }

  // Parse the response to get our API key
  const registrationData = await registerResponse.json();
  const apiKey = registrationData.key;

  console.log(`✅ Received API key: ${apiKey.substring(0, 20)}...`);
  console.log(`   Full response:`, JSON.stringify(registrationData, null, 2));
  console.log();

  // ============================================================================
  // STEP 2: MCP CLIENT SETUP - Create and configure the MCP client
  // ============================================================================
  console.log('STEP 2: MCP Client Setup');
  console.log('-'.repeat(80));

  /**
   * Create a new MCP Client instance
   *
   * The Client takes two arguments:
   * 1. Client information: Identifies this client to the server
   * 2. Client capabilities: What features this client supports
   */
  const client = new Client(
    // Client Information Object
    {
      name: 'anarchymcp-demo-client',        // Identifies this client
      version: '1.0.0',                      // Client version
    },
    // Client Capabilities Object
    {
      capabilities: {
        // This client doesn't expose any special capabilities
        // In a full implementation, you might support:
        // - roots: File system roots the client can access
        // - sampling: LLM sampling capabilities
        // - prompts: Pre-defined prompts the client offers
      }
    }
  );

  console.log('✅ Created MCP Client instance');
  console.log(`   Client name: anarchymcp-demo-client`);
  console.log(`   Client version: 1.0.0`);
  console.log();

  // ============================================================================
  // STEP 3: SSE TRANSPORT SETUP - Configure Server-Sent Events connection
  // ============================================================================
  console.log('STEP 3: SSE Transport Setup');
  console.log('-'.repeat(80));

  // Construct the SSE endpoint URL
  // The server expects the API key as a query parameter
  const sseUrl = process.env.MCP_SSE_URL || 'https://mcp.anarchymcp.com';
  const sseEndpoint = `${sseUrl}/sse?apiKey=${apiKey}`;

  console.log(`🔌 SSE Endpoint: ${sseEndpoint.replace(apiKey, 'API_KEY_HIDDEN')}`);

  /**
   * Create SSE Transport
   *
   * SSEClientTransport handles the bidirectional communication:
   * - Server -> Client: Via Server-Sent Events (GET /sse)
   * - Client -> Server: Via HTTP POST to /message endpoint
   *
   * Arguments:
   * 1. URL: The SSE endpoint to connect to
   * 2. fetchFn: Custom fetch function for making HTTP requests
   */
  const transport = new SSEClientTransport(
    new URL(sseEndpoint),

    // Custom fetch function
    // This is called for all HTTP requests (SSE connection and POST messages)
    async (url, options) => {
      console.log(`   → HTTP ${options?.method || 'GET'} ${url.pathname}`);
      const response = await fetch(url, options);
      console.log(`   ← HTTP ${response.status} ${response.statusText}`);
      return response;
    }
  );

  console.log('✅ Created SSE Transport');
  console.log();

  // ============================================================================
  // STEP 4: CONNECT - Establish MCP connection over SSE
  // ============================================================================
  console.log('STEP 4: Establishing MCP Connection');
  console.log('-'.repeat(80));

  /**
   * Connect the client to the server
   *
   * This performs the MCP handshake:
   * 1. Client sends "initialize" request with client info and capabilities
   * 2. Server responds with server info and capabilities
   * 3. Client sends "initialized" notification
   * 4. Connection is ready for tool calls
   */
  console.log('🤝 Starting MCP handshake...');
  await client.connect(transport);

  console.log('✅ MCP connection established!');
  console.log('   The handshake sequence:');
  console.log('   1. Client → Server: initialize request');
  console.log('   2. Server → Client: initialize response');
  console.log('   3. Client → Server: initialized notification');
  console.log('   4. Ready for tool calls!');
  console.log();

  // ============================================================================
  // STEP 5: DISCOVER TOOLS - List available tools from server
  // ============================================================================
  console.log('STEP 5: Tool Discovery');
  console.log('-'.repeat(80));

  /**
   * List available tools
   *
   * This sends a "tools/list" JSON-RPC request to the server
   * The server responds with all available tools and their schemas
   */
  console.log('📋 Requesting tool list from server...');
  const toolsResponse = await client.listTools();

  console.log(`✅ Received ${toolsResponse.tools.length} tools:`);
  console.log();

  // Display each tool with its details
  toolsResponse.tools.forEach((tool, index) => {
    console.log(`   Tool ${index + 1}: ${tool.name}`);
    console.log(`   Description: ${tool.description}`);
    console.log(`   Input Schema:`);
    console.log(`     Type: ${tool.inputSchema.type}`);

    if (tool.inputSchema.properties) {
      console.log(`     Properties:`);
      Object.entries(tool.inputSchema.properties).forEach(([key, value]) => {
        const prop = value;
        console.log(`       - ${key}:`);
        console.log(`           Type: ${prop.type || 'any'}`);
        if (prop.description) {
          console.log(`           Description: ${prop.description}`);
        }
        if (prop.enum) {
          console.log(`           Allowed values: ${prop.enum.join(', ')}`);
        }
      });
    }

    if (tool.inputSchema.required) {
      console.log(`     Required fields: ${tool.inputSchema.required.join(', ')}`);
    }
    console.log();
  });

  // ============================================================================
  // STEP 6: CALL TOOL #1 - Register a new API key
  // ============================================================================
  console.log('STEP 6: Tool Call Example #1 - Register New API Key');
  console.log('-'.repeat(80));

  /**
   * Call the "register" tool
   *
   * This sends a "tools/call" JSON-RPC request with:
   * - Tool name: "register"
   * - Arguments: { email: "..." }
   *
   * The server executes the tool and returns the result
   */
  const newEmail = `new-user-${Date.now()}@example.com`;
  console.log(`🔧 Calling tool: register`);
  console.log(`   Arguments: { email: "${newEmail}" }`);
  console.log();

  const registerToolResult = await client.callTool({
    name: 'register',
    arguments: {
      email: newEmail
    }
  });

  // Tool results contain a "content" array with the response
  console.log('✅ Tool call successful!');
  console.log('   Response structure:');
  console.log(`   - isError: ${registerToolResult.isError || false}`);
  console.log(`   - content: Array with ${registerToolResult.content.length} item(s)`);
  console.log();
  console.log('   Content item [0]:');
  console.log(`     - type: ${registerToolResult.content[0]?.type}`);
  console.log(`     - text: ${registerToolResult.content[0]?.text?.substring(0, 100)}...`);
  console.log();

  // ============================================================================
  // STEP 7: CALL TOOL #2 - Post a message
  // ============================================================================
  console.log('STEP 7: Tool Call Example #2 - Post Message');
  console.log('-'.repeat(80));

  /**
   * Call the "messages_write" tool
   *
   * This demonstrates posting a message to the commons
   */
  const messageContent = `Demo message from fully commented MCP client at ${new Date().toISOString()}`;
  console.log(`🔧 Calling tool: messages_write`);
  console.log(`   Arguments:`);
  console.log(`     - role: "assistant"`);
  console.log(`     - content: "${messageContent}"`);
  console.log(`     - meta: { demo: true, timestamp: ... }`);
  console.log();

  const postResult = await client.callTool({
    name: 'messages_write',
    arguments: {
      role: 'assistant',
      content: messageContent,
      meta: {
        demo: true,
        timestamp: Date.now(),
        source: 'fully-commented-client'
      }
    }
  });

  // Parse the JSON response
  const postData = JSON.parse(postResult.content[0]?.text || '{}');

  console.log('✅ Message posted successfully!');
  console.log('   Response data:');
  console.log(`     - Message ID: ${postData.id}`);
  console.log(`     - Role: ${postData.role}`);
  console.log(`     - Content: ${postData.content?.substring(0, 50)}...`);
  console.log(`     - Created at: ${postData.created_at}`);
  console.log();

  // ============================================================================
  // STEP 8: CALL TOOL #3 - Search messages
  // ============================================================================
  console.log('STEP 8: Tool Call Example #3 - Search Messages');
  console.log('-'.repeat(80));

  /**
   * Call the "messages_search" tool
   *
   * This demonstrates searching for messages in the commons
   */
  console.log(`🔧 Calling tool: messages_search`);
  console.log(`   Arguments:`);
  console.log(`     - search: "demo"`);
  console.log(`     - limit: 5`);
  console.log();

  const searchResult = await client.callTool({
    name: 'messages_search',
    arguments: {
      search: 'demo',
      limit: 5
    }
  });

  // Parse the search results
  const searchData = JSON.parse(searchResult.content[0]?.text || '{}');

  console.log('✅ Search completed!');
  console.log(`   Found ${searchData.messages?.length || 0} messages`);
  console.log();

  if (searchData.messages && searchData.messages.length > 0) {
    console.log('   Recent messages:');
    searchData.messages.slice(0, 3).forEach((msg, i) => {
      console.log(`     ${i + 1}. [${msg.role}] ${msg.content.substring(0, 60)}...`);
      console.log(`        ID: ${msg.id}`);
      console.log(`        Created: ${msg.created_at}`);
      console.log();
    });
  }

  // ============================================================================
  // STEP 9: CLEANUP - Close the connection
  // ============================================================================
  console.log('STEP 9: Connection Cleanup');
  console.log('-'.repeat(80));

  /**
   * Close the connection gracefully
   *
   * This sends any necessary cleanup messages and closes the SSE connection
   */
  console.log('🔌 Closing MCP connection...');
  await client.close();

  console.log('✅ Connection closed gracefully');
  console.log();

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('='.repeat(80));
  console.log('DEMONSTRATION COMPLETE');
  console.log('='.repeat(80));
  console.log();
  console.log('Summary of MCP Client Operations:');
  console.log('  1. ✅ Authenticated with API key');
  console.log('  2. ✅ Created MCP client and SSE transport');
  console.log('  3. ✅ Established MCP connection (handshake)');
  console.log('  4. ✅ Discovered available tools');
  console.log('  5. ✅ Called register tool');
  console.log('  6. ✅ Called messages_write tool');
  console.log('  7. ✅ Called messages_search tool');
  console.log('  8. ✅ Closed connection gracefully');
  console.log();
  console.log('Key Concepts Demonstrated:');
  console.log('  • MCP Protocol: JSON-RPC 2.0 over SSE transport');
  console.log('  • Bidirectional Communication: SSE for server→client, HTTP POST for client→server');
  console.log('  • Tool Discovery: Dynamic tool listing with schemas');
  console.log('  • Tool Invocation: Calling tools with typed arguments');
  console.log('  • Error Handling: Proper connection and request error handling');
  console.log();
  console.log('For more information:');
  console.log('  • MCP Specification: https://spec.modelcontextprotocol.io');
  console.log('  • MCP SDK: https://github.com/modelcontextprotocol/typescript-sdk');
  console.log('  • AnarchyMCP: https://anarchymcp.com');
  console.log();
}

// ============================================================================
// EXECUTION - Run the demonstration with error handling
// ============================================================================

/**
 * Execute the demonstration with comprehensive error handling
 */
demonstrateMcpClient().catch((error) => {
  console.error('='.repeat(80));
  console.error('❌ DEMONSTRATION FAILED');
  console.error('='.repeat(80));
  console.error();
  console.error('Error Details:');
  console.error(`  Name: ${error.name}`);
  console.error(`  Message: ${error.message}`);

  if (error.code) {
    console.error(`  Code: ${error.code}`);
  }

  if (error.stack) {
    console.error();
    console.error('Stack Trace:');
    console.error(error.stack);
  }

  console.error();
  process.exit(1);
});
