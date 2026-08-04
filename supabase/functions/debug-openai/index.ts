Deno.serve(async () => {
  const key = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_MODEL");
  if (!key) return Response.json({ has_key: false }, { status: 500 });
  const response = await fetch("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${key}` } });
  const body = await response.text();
  return Response.json({ has_key: true, model, openai_status: response.status, detail: response.ok ? "authenticated" : body.slice(0, 800) }, { status: response.ok ? 200 : 502 });
});
