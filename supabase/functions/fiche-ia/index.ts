
Deno.serve(async (req) => {
  try {
    const t0 = Date.now();
    const r = await fetch("https://opencode.ai/zen/go/v1/models", {headers: {"User-Agent": "cartable-edge"}});
    const t = Date.now() - t0;
    return new Response(JSON.stringify({ status: r.status, ms: t }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ erreur: String(e?.message || e).slice(0, 200) }), { status: 502, headers: { "Content-Type": "application/json" } });
  }
});
