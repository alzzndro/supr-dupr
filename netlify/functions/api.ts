import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  // 1. Get the target endpoint path by removing the '/api' prefix
  // e.g., '/api/auth/v1.0/login/' becomes '/auth/v1.0/login/'
  const path = event.path.replace(/^\/api/, '');
  
  // 2. Build the target DUPR URL
  const targetUrl = `https://api.dupr.gg${path}`;
  
  // 3. Extract query parameters
  const queryString = event.rawQuery ? `?${event.rawQuery}` : '';
  const finalUrl = `${targetUrl}${queryString}`;

  // 4. Prepare headers (completely strip Origin and Referer!)
  const headers = new Headers();
  
  // Forward incoming headers (e.g. Authorization token, Content-Type)
  // but strip browser-injected CORS headers so DUPR sees it as a direct server-to-server request
  for (const [key, value] of Object.entries(event.headers)) {
    if (value && !['host', 'origin', 'referer', 'content-length'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  // 5. Prepare request options
  const requestOptions: RequestInit = {
    method: event.httpMethod,
    headers: headers,
    redirect: 'follow'
  };

  // Attach body if present
  if (event.body) {
    requestOptions.body = event.body;
  }

  try {
    const response = await fetch(finalUrl, requestOptions);
    const responseBody = await response.text();
    
    // Copy the response headers back, ensuring standard CORS headers are provided
    const clientHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };

    response.headers.forEach((value, key) => {
      // Avoid forwarding content encoding/length, let Netlify compress it
      if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
        clientHeaders[key] = value;
      }
    });

    return {
      statusCode: response.status,
      headers: clientHeaders,
      body: responseBody
    };
  } catch (error: any) {
    console.error('Serverless Proxy Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Proxy request failed', 
        details: error.message 
      })
    };
  }
};
