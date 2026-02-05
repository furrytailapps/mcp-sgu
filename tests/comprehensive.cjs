// Comprehensive test script for all SGU MCP tools
const http = require('http');
const https = require('https');

// Allow testing against production via MCP_URL env var
const MCP_URL = process.env.MCP_URL || 'http://localhost:3000/mcp';
const parsedUrl = new URL(MCP_URL);
const isHttps = parsedUrl.protocol === 'https:';
const httpModule = isHttps ? https : http;

function parseSSE(sseText) {
  const lines = sseText.split('\n');
  let data = '';
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      data += line.substring(6);
    }
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

async function testMCP(method, params = {}) {
  const data = JSON.stringify({
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  });

  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (isHttps ? 443 : 80),
    path: parsedUrl.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      Accept: 'application/json, text/event-stream',
    },
  };

  return new Promise((resolve, reject) => {
    const req = httpModule.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        const parsed = parseSSE(body);
        if (parsed) {
          resolve(parsed);
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ rawBody: body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Comprehensive SGU MCP Server Test');
  console.log(`URL: ${MCP_URL}\n`);
  const results = { passed: 0, failed: 0, tests: [] };

  function recordTest(name, passed, details = '') {
    results.tests.push({ name, passed, details });
    if (passed) {
      results.passed++;
      console.log(`   OK ${name} ${details}`);
    } else {
      results.failed++;
      console.log(`   FAILED ${name} ${details}`);
    }
  }

  // Test 1: Initialize
  console.log('1. Testing MCP initialization...');
  try {
    const initResult = await testMCP('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'comprehensive-test', version: '1.0.0' },
    });
    recordTest('Initialize', !!initResult.result?.serverInfo, `(server: ${initResult.result?.serverInfo?.name || 'unknown'})`);
  } catch (error) {
    recordTest('Initialize', false, `(error: ${error.message})`);
  }

  // Test 2: List tools (should be exactly 4)
  console.log('\n2. Testing tools/list...');
  try {
    const toolsResult = await testMCP('tools/list');
    const toolCount = toolsResult.result?.tools?.length || 0;
    recordTest('List tools', toolCount === 4, `(found ${toolCount}/4 tools)`);
  } catch (error) {
    recordTest('List tools', false, `(error: ${error.message})`);
  }

  // ============ sgu_describe_layers ============
  console.log('\n3. Testing sgu_describe_layers...');

  try {
    const result = await testMCP('tools/call', {
      name: 'sgu_describe_layers',
      arguments: {},
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Describe layers - default', data.layers?.length > 0, `(found ${data.layers?.length || 0} layers)`);
  } catch (error) {
    recordTest('Describe layers - default', false, `(error: ${error.message})`);
  }

  // ============ sgu_query_point ============
  console.log('\n4. Testing sgu_query_point...');

  // 4a: Query bedrock at Stockholm
  try {
    const result = await testMCP('tools/call', {
      name: 'sgu_query_point',
      arguments: { latitude: 59.33, longitude: 18.07, dataType: 'bedrock' },
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Query point - bedrock', !data.error, '(Stockholm)');
  } catch (error) {
    recordTest('Query point - bedrock', false, `(error: ${error.message})`);
  }

  // 4b: Query soil at Gothenburg
  try {
    const result = await testMCP('tools/call', {
      name: 'sgu_query_point',
      arguments: { latitude: 57.71, longitude: 11.97, dataType: 'soil' },
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Query point - soil', !data.error, '(Gothenburg)');
  } catch (error) {
    recordTest('Query point - soil', false, `(error: ${error.message})`);
  }

  // 4c: Query groundwater at Malmö
  try {
    const result = await testMCP('tools/call', {
      name: 'sgu_query_point',
      arguments: { latitude: 55.61, longitude: 13.0, dataType: 'groundwater' },
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Query point - groundwater', !data.error, '(Malmö)');
  } catch (error) {
    recordTest('Query point - groundwater', false, `(error: ${error.message})`);
  }

  // ============ sgu_get_bedrock ============
  console.log('\n5. Testing sgu_get_bedrock...');

  // 5a: Get bedrock features near Stockholm
  try {
    const result = await testMCP('tools/call', {
      name: 'sgu_get_bedrock',
      arguments: { latitude: 59.33, longitude: 18.07, radiusKm: 5 },
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Get bedrock - by location', data.features !== undefined || !data.error, `(found ${data.count || 0} features)`);
  } catch (error) {
    recordTest('Get bedrock - by location', false, `(error: ${error.message})`);
  }

  // 5b: Get bedrock features by bbox
  try {
    const result = await testMCP('tools/call', {
      name: 'sgu_get_bedrock',
      arguments: { bbox: '18.0,59.3,18.1,59.35' },
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Get bedrock - by bbox', data.features !== undefined || !data.error, `(found ${data.count || 0} features)`);
  } catch (error) {
    recordTest('Get bedrock - by bbox', false, `(error: ${error.message})`);
  }

  // ============ sgu_get_map ============
  console.log('\n6. Testing sgu_get_map...');

  // 6a: Get bedrock map
  try {
    const result = await testMCP('tools/call', {
      name: 'sgu_get_map',
      arguments: {
        latitude: 59.33,
        longitude: 18.07,
        layerType: 'bedrock',
        width: 256,
        height: 256,
      },
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Get map - bedrock', data.url !== undefined || data.imageData !== undefined || !data.error, '');
  } catch (error) {
    recordTest('Get map - bedrock', false, `(error: ${error.message})`);
  }

  // 6b: Get soil map
  try {
    const result = await testMCP('tools/call', {
      name: 'sgu_get_map',
      arguments: {
        latitude: 57.71,
        longitude: 11.97,
        layerType: 'soil',
        width: 256,
        height: 256,
      },
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Get map - soil', data.url !== undefined || data.imageData !== undefined || !data.error, '');
  } catch (error) {
    recordTest('Get map - soil', false, `(error: ${error.message})`);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\nFailed Tests:');
    results.tests
      .filter((t) => !t.passed)
      .forEach((t) => {
        console.log(`  - ${t.name} ${t.details}`);
      });
    process.exit(1);
  }

  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
