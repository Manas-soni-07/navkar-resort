/**
 * Minimal Express-compatible router so the mobile-nav route handlers
 * (router.get('/rooms', async (req, res) => ...)) run unchanged inside Next.js.
 * Supports :params, req.query/body/params/headers, res.status().json(), res.json().
 */

export interface MobileRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  params: Record<string, string>;
  body: any;
  headers: Record<string, string>;
}

export interface MobileResponse {
  statusCode: number;
  body: unknown;
  headersSent: boolean;
  status(code: number): MobileResponse;
  json(body: unknown): MobileResponse;
}

export type Handler = (req: MobileRequest, res: MobileResponse) => unknown | Promise<unknown>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  path: string;
  handler: Handler;
}

export class MobileRouter {
  private routes: Route[] = [];

  private add(method: string, path: string, handler: Handler) {
    const keys: string[] = [];
    const pattern = new RegExp(
      '^' +
        path.replace(/\//g, '\\/').replace(/:([A-Za-z_]+)/g, (_m, k: string) => {
          keys.push(k);
          return '([^/]+)';
        }) +
        '\\/?$'
    );
    this.routes.push({ method, pattern, keys, path, handler });
  }

  get(path: string, h: Handler) { this.add('GET', path, h); }
  post(path: string, h: Handler) { this.add('POST', path, h); }
  put(path: string, h: Handler) { this.add('PUT', path, h); }
  patch(path: string, h: Handler) { this.add('PATCH', path, h); }
  delete(path: string, h: Handler) { this.add('DELETE', path, h); }

  match(method: string, path: string): { handler: Handler; params: Record<string, string>; path: string } | null {
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const m = r.pattern.exec(path);
      if (!m) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { handler: r.handler, params, path: r.path };
    }
    return null;
  }
}

export function createResponse(): MobileResponse {
  const res: MobileResponse = {
    statusCode: 200,
    body: undefined,
    headersSent: false,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(body) {
      res.body = body;
      res.headersSent = true;
      return res;
    },
  };
  return res;
}
