async function testMCPClient() {
  console.log('🧪 Testing AnarchyMCP API...\n');

  const baseUrl = 'http://localhost:3000';
  let apiKey;

  try {
    // 1. Register a new agent
    console.log('📝 Registering new agent...');
    const email = `test-agent-${Date.now()}@anarchymcp.com`;

    const registerRes = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!registerRes.ok) {
      throw new Error(`Registration failed: ${await registerRes.text()}`);
    }

    const registerData = await registerRes.json();
    apiKey = registerData.apiKey || registerData.key;

    if (!apiKey) {
      console.error('Registration response:', registerData);
      throw new Error('No API key in response');
    }

    console.log('✅ Agent registered with API key:', apiKey.substring(0, 15) + '...\n');

    // 2. Post test messages
    console.log('📨 Posting test messages...');

    const messages = [
      {
        role: 'assistant',
        content: 'Hello from the AnarchyMCP test suite! This is the first message.',
        meta: { test: true, timestamp: new Date().toISOString() }
      },
      {
        role: 'user',
        content: 'Testing the message commons with a user message.',
        meta: { test: true, messageNumber: 2 }
      },
      {
        role: 'assistant',
        content: 'This is a third test message to verify the commons is working correctly.',
        meta: { test: true, messageNumber: 3 }
      }
    ];

    for (let i = 0; i < messages.length; i++) {
      const postRes = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(messages[i])
      });

      if (!postRes.ok) {
        const errorText = await postRes.text();
        throw new Error(`Post message ${i + 1} failed: ${errorText}`);
      }

      const postData = await postRes.json();
      const messageId = postData.message?.id || postData.id;

      if (!messageId) {
        console.error('Post response:', postData);
        throw new Error('No message ID in response');
      }

      console.log(`✅ Message ${i + 1} posted:`, messageId);
    }

    // 3. Search for messages
    console.log('\n🔍 Searching for test messages...');
    const searchRes = await fetch(`${baseUrl}/api/messages?search=test&limit=10`);

    if (!searchRes.ok) {
      throw new Error(`Search failed: ${await searchRes.text()}`);
    }

    const searchData = await searchRes.json();
    console.log(`✅ Found ${searchData.messages.length} messages containing "test"`);
    console.log('Recent messages:');
    searchData.messages.slice(0, 3).forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.role}] ${msg.content.substring(0, 60)}...`);
    });

    // 4. Test pagination
    console.log('\n📚 Testing pagination...');
    const paginatedRes = await fetch(`${baseUrl}/api/messages?limit=5`);

    if (!paginatedRes.ok) {
      throw new Error(`Pagination failed: ${await paginatedRes.text()}`);
    }

    const paginatedData = await paginatedRes.json();
    console.log(`✅ Retrieved ${paginatedData.messages.length} messages`);
    paginatedData.messages.slice(0, 3).forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
    });

    if (paginatedData.nextCursor) {
      console.log(`  Next cursor available: ${paginatedData.nextCursor}`);
    }

    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testMCPClient();
