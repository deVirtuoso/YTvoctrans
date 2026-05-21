export function corsHeaders(req) {
  const origin = req.headers.get('origin');
  
  const headers = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
}

export function handleOptions(req) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}
