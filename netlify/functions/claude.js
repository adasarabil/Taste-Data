const https = require('https');
const {
  CLAUDE_ENDPOINT_CONFIG,
  parseJsonBody,
  validateClaudeRequest,
  buildSafeClaudePayload
} = require('../../api/claude-config.cjs');

exports.handler = async function(event, context) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API key not configured on server.' })
    };
  }

  if ((event.body || '').length > 64000) {
    return {
      statusCode: 413,
      headers,
      body: JSON.stringify({ error: 'Request body too large.' })
    };
  }

  const parsedBody = parseJsonBody(event.body);
  if (parsedBody.error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: parsedBody.error })
    };
  }

  const validated = validateClaudeRequest(parsedBody.value);
  if (validated.error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: validated.error })
    };
  }

  const safePayload = buildSafeClaudePayload(validated.value);

  return new Promise((resolve) => {
    const body = JSON.stringify(safePayload);
    
    const options = {
      hostname: CLAUDE_ENDPOINT_CONFIG.hostname,
      path: CLAUDE_ENDPOINT_CONFIG.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': CLAUDE_ENDPOINT_CONFIG.anthropicVersion,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: err.message })
      });
    });

    req.write(body);
    req.end();
  });
};
