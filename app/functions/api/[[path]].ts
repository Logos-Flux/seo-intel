// Pages Function: proxy /api/* to the worker, injecting the API key server-side.
// This keeps the API key out of the frontend bundle.

interface FuncEnv {
  SEO_INTEL_API_KEY: string;
  SEO_INTEL_API_URL: string;
}

export const onRequest: PagesFunction<FuncEnv> = async (context) => {
  const url = new URL(context.request.url);
  const apiBase = context.env.SEO_INTEL_API_URL;
  if (!apiBase) {
    return new Response(JSON.stringify({ error: 'SEO_INTEL_API_URL not configured' }), { status: 500 });
  }
  const workerUrl = `${apiBase}${url.pathname}${url.search}`;

  const headers = new Headers(context.request.headers);
  headers.set('Authorization', `Bearer ${context.env.SEO_INTEL_API_KEY}`);
  headers.delete('host');

  return fetch(workerUrl, {
    method: context.request.method,
    headers,
    body: context.request.body,
  });
};
