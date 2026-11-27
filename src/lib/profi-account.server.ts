type Query = (statement: string, parameters: string[]) => Promise<readonly Record<string, unknown>[]>;

export function createPostgresAccountStore(query: Query) {
  return async (subject: string) => {
    const orders = await query(
      `SELECT orders.id, orders.status, orders.created_at, orders.payable_minor::text AS amount_minor,
       (SELECT jsonb_agg(order_items.name_snapshot ORDER BY order_items.sku)
        FROM profi_market.order_items WHERE order_items.order_id = orders.id) AS items
       FROM profi_market.orders JOIN profi_market.customers ON customers.id = orders.customer_id
       WHERE customers.auth_subject = $1
       ORDER BY orders.created_at DESC, orders.id DESC LIMIT 50`, [subject],
    );
    const products = await query(
      "SELECT sku, name, price_minor::text AS amount_minor FROM profi_market.products WHERE active ORDER BY name", [],
    );
    return { orders, products };
  };
}

type AccountDependencies = {
  origin: string;
  verifySession(request: Request): Promise<{ subject: string } | null>;
  load: ReturnType<typeof createPostgresAccountStore>;
  revoke(request: Request): Promise<string>;
};

export function createAccountHandler({ origin, verifySession, load, revoke }: AccountDependencies) {
  return async (request: Request) => {
    const headers = new Headers({ "Cache-Control": "no-store" });
    const reply = (status: number, body: object) => Response.json(body, { status, headers });
    try {
      if (request.method === "POST") {
        if (request.headers.get("origin") !== origin) return reply(403, { error: "invalid_origin" });
        headers.set("Set-Cookie", await revoke(request));
        return new Response(null, { status: 204, headers });
      }
      if (request.method !== "GET") return reply(405, { error: "method_not_allowed" });
      if (new URL(request.url).search) return reply(400, { error: "invalid_request" });
      const session = await verifySession(request);
      if (!session?.subject) return reply(401, { error: "sign_in_required" });
      return reply(200, await load(session.subject));
    } catch {
      return reply(503, { error: "account_unavailable" });
    }
  };
}
