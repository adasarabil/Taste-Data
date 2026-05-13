const https = require('https');
const {
  CLAUDE_ENDPOINT_CONFIG,
  parseJsonBody,
  validateClaudeRequest,
  buildSafeClaudePayload
} = require('./claude-config.cjs');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured.' });
  }

  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > 64000) {
    return res.status(413).json({ error: 'Request body too large.' });
  }

  const parsedBody = parseJsonBody(req.body || {});
  if (parsedBody.error) {
    return res.status(400).json({ error: parsedBody.error });
  }

  const validated = validateClaudeRequest(parsedBody.value);
  if (validated.error) {
    return res.status(400).json({ error: validated.error });
  }

  const safePayload = buildSafeClaudePayload(validated.value);

  const body = JSON.stringify(safePayload);

  return new Promise((resolve) => {
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

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        res.status(response.statusCode).send(data);
        resolve();
      });
    });

    request.on('error', (err) => {
      res.status(500).json({ error: err.message });
      resolve();
    });

    request.write(body);
    request.end();
  });
}
