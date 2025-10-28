import { Hono, Context, Next } from "hono";
import { cors } from "hono/cors";
// import { handleRest } from './rest';
import { compileParams, ensureReadOnly, ensureSingleStatement } from "./sql";
import { fromBase64, safeJsonParse } from "./helpers/helpers";

export interface Env {
  DB: D1Database;
}

// # List all users
// GET /rest/users

// # Get filtered and sorted users
// GET /rest/users?age=25&sort_by=name&order=desc

// # Get paginated results
// GET /rest/users?limit=10&offset=20

// # Create a new user
// POST /rest/users
// { "name": "John", "age": 30 }

// # Update a user
// PATCH /rest/users/123
// { "age": 31 }

// # Delete a user
// DELETE /rest/users/123

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const app = new Hono<{ Bindings: Env }>();

    // Apply CORS to all routes
    app.use("*", async (c, next) => {
      return cors()(c, next);
    });

    const authMiddleware = async (c: Context, next: Next) => {
      return next();
    };

    // CRUD REST endpoints made available to all of our tables
    // app.all('/rest/*', authMiddleware, handleRest);

    app.get("/sql/query", authMiddleware, async (c) => {
      try {
        const q = c.req.query("q"); // raw SQL (url-encoded)
        const paramsRaw = c.req.query("params"); // JSON (url-encoded)
        if (!q) return c.json({ error: 'Query param "q" is required' }, 400);

        ensureSingleStatement(q);
        ensureReadOnly(q);

        const params = safeJsonParse<Record<string, unknown> | unknown[]>(
          paramsRaw ?? null
        );
        const { sql, values } = compileParams(q, params);

        const results = await env.DB.prepare(sql)
          .bind(...values)
          .all();
        return c.json(results);
      } catch (err: any) {
        const message = err?.message ?? "Unexpected error";
        const isClient =
          /single statement|only select|forbidden token|invalid json|required/i.test(
            message
          );
        return c.json({ error: message }, isClient ? 400 : 500);
      }
    });

    app.get("/sql/qb64", authMiddleware, async (c) => {
      try {
        const b64 = c.req.query("b64");
        const params64 = c.req.query("params64");
        const q = fromBase64(b64);
        const params = params64
          ? safeJsonParse<Record<string, unknown> | unknown[]>(
              fromBase64(params64)
            )
          : undefined;

        ensureSingleStatement(q);
        ensureReadOnly(q);

        const { sql, values } = compileParams(q, params);
        const results = await env.DB.prepare(sql)
          .bind(...values)
          .all();
        return c.json(results);
      } catch (err: any) {
        const message = err?.message ?? "Unexpected error";
        const isClient =
          /single statement|only select|forbidden token|invalid json|missing base64/i.test(
            message
          );
        return c.json({ error: message }, isClient ? 400 : 500);
      }
    });

    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
