const CLAUDE_ENDPOINT_CONFIG = Object.freeze({
  hostname: 'api.anthropic.com',
  path: '/v1/messages',
  model: 'claude-sonnet-4-5',
  anthropicVersion: '2023-06-01',
  maxTokensDefault: 4000,
  maxTokensLimit: 4000,
  maxSystemChars: 12000,
  maxMessages: 4,
  maxMessageChars: 16000,
  allowedRoles: new Set(['user', 'assistant'])
});

function parseJsonBody(body) {
  if (!body) return { value: {} };
  if (typeof body === 'object') return { value: body };
  try {
    return { value: JSON.parse(body) };
  } catch (err) {
    return { error: 'Invalid JSON body.' };
  }
}

function validateClaudeRequest(incoming) {
  if (!incoming || typeof incoming !== 'object') {
    return { error: 'Request body must be a JSON object.' };
  }
  if (typeof incoming.system !== 'string' || incoming.system.trim() === '') {
    return { error: 'Missing required Claude system field.' };
  }
  if (!Array.isArray(incoming.messages) || incoming.messages.length === 0) {
    return { error: 'Missing required Claude messages field.' };
  }
  for (const message of incoming.messages) {
    if (!message || typeof message !== 'object') {
      return { error: 'Each Claude message must be an object.' };
    }
    if (!CLAUDE_ENDPOINT_CONFIG.allowedRoles.has(message.role)) {
      return { error: 'Claude message role must be user or assistant.' };
    }
    if (typeof message.content !== 'string' || message.content.trim() === '') {
      return { error: 'Claude message content must be a non-empty string.' };
    }
  }
  return { value: incoming };
}

function buildSafeClaudePayload(incoming) {
  const maxTokens = Math.min(
    Number(incoming.max_tokens) || CLAUDE_ENDPOINT_CONFIG.maxTokensDefault,
    CLAUDE_ENDPOINT_CONFIG.maxTokensLimit
  );

  return {
    model: CLAUDE_ENDPOINT_CONFIG.model,
    max_tokens: maxTokens,
    system: incoming.system.slice(0, CLAUDE_ENDPOINT_CONFIG.maxSystemChars),
    messages: incoming.messages.slice(0, CLAUDE_ENDPOINT_CONFIG.maxMessages).map((message) => ({
      role: message.role,
      content: message.content.slice(0, CLAUDE_ENDPOINT_CONFIG.maxMessageChars)
    }))
  };
}

module.exports = {
  CLAUDE_ENDPOINT_CONFIG,
  parseJsonBody,
  validateClaudeRequest,
  buildSafeClaudePayload
};
