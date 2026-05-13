var TASTEDATA_ENDPOINTS = {
  netlify: '/.netlify/functions/claude',
  vercel: '/api/claude'
};

function getClaudeEndpoint() {
  var location = window.location || {};
  if (window.TASTEDATA_API_ENDPOINT) return window.TASTEDATA_API_ENDPOINT;
  var search = location.search || '';
  var params = new URLSearchParams(search);
  var override = params.get('api');
  if (override) return override;
  if (/vercel\.app$/i.test(location.hostname || '')) return TASTEDATA_ENDPOINTS.vercel;
  return TASTEDATA_ENDPOINTS.netlify;
}
