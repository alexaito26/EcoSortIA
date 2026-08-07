import { authenticateDevice } from "../_shared/device-auth.ts";
import { corsHeaders, error, json } from "../_shared/http.ts";

const CATEGORIES = ["plastic", "glass", "reject", "unknown"] as const;
type Category = (typeof CATEGORIES)[number];

type Analysis = {
  category: Category;
  confidence: number;
  accepted: boolean;
  reason: string;
  points_available: number;
};

const prompt =
  "Eres el clasificador visual de EcoSort AI. Analiza la imagen de un residuo. " +
  "Solo puedes clasificar en una de estas categorías: plastic, glass, reject, unknown. " +
  "Usa plastic para botellas/envases plásticos reciclables. " +
  "Usa glass para botellas/envases de vidrio reciclables. " +
  "Usa reject para residuos no aceptados por el prototipo. " +
  "Usa unknown si la imagen no es clara, no hay residuo visible o no puedes decidir con seguridad. " +
  "Si hay varias cosas, clasifica el objeto principal. " +
  "Devuelve únicamente JSON válido.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function token(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalize(value: unknown): Analysis {
  if (!isRecord(value)) {
    throw new Error("INVALID_MODEL_JSON");
  }

  const raw = typeof value.category === "string"
    ? value.category
    : "unknown";

  const confidence =
    typeof value.confidence === "number" &&
      Number.isFinite(value.confidence)
      ? Math.max(0, Math.min(1, value.confidence))
      : 0;

  const reason =
    typeof value.reason === "string" && value.reason.trim()
      ? value.reason.slice(0, 500)
      : "No se pudo clasificar el residuo";

  if (!CATEGORIES.includes(raw as Category) || confidence < 0.6) {
    return {
      category: "unknown",
      confidence,
      accepted: false,
      reason:
        confidence < 0.6
          ? "Confianza insuficiente para clasificar el residuo"
          : reason,
      points_available: 0,
    };
  }

  const category = raw as Category;

  if (category === "plastic") {
    return {
      category,
      confidence,
      accepted: true,
      reason,
      points_available: 10,
    };
  }

  if (category === "glass") {
    return {
      category,
      confidence,
      accepted: true,
      reason,
      points_available: 15,
    };
  }

  return {
    category,
    confidence,
    accepted: false,
    reason,
    points_available: 0,
  };
}

function claimBaseUrl(): string {
  return (
    Deno.env.get("SITE_URL") ??
    Deno.env.get("NEXT_PUBLIC_SITE_URL") ??
    "https://ecosort-ai-pi.vercel.app"
  ).replace(/\/$/, "");
}

async function analyzeWithOpenAI(
  imageUrl: string,
  apiKey: string,
  model: string,
): Promise<Analysis> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "low",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "waste_classification",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              category: {
                type: "string",
                enum: [...CATEGORIES],
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
              },
              accepted: {
                type: "boolean",
              },
              reason: {
                type: "string",
              },
              points_available: {
                type: "integer",
                minimum: 0,
              },
            },
            required: [
              "category",
              "confidence",
              "accepted",
              "reason",
              "points_available",
            ],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1000);

    // Seguro: no registra API key, token QR ni token del dispositivo.
    console.error(
      JSON.stringify({
        source: "openai",
        model,
        status: response.status,
        detail,
      }),
    );

    throw new Error(
      response.status === 429
        ? "OPENAI_RATE_LIMIT"
        : `OPENAI_REQUEST_FAILED_${response.status}`,
    );
  }

  const payload = await response.json();

  const output =
    typeof payload?.output_text === "string"
      ? payload.output_text
      : Array.isArray(payload?.output)
      ? payload.output
          .flatMap((item: { content?: unknown[] }) =>
            Array.isArray(item.content) ? item.content : [],
          )
          .map((content: { type?: unknown; text?: unknown }) =>
            content.type === "output_text" && typeof content.text === "string"
              ? content.text
              : "",
          )
          .find((text: string) => text.length > 0) ?? ""
      : "";

  try {
    return normalize(JSON.parse(output));
  } catch {
    console.error(
      JSON.stringify({
        source: "openai-output",
        model,
        output_preview: output.slice(0, 500),
      }),
    );

    throw new Error("INVALID_MODEL_JSON");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return error("METHOD_NOT_ALLOWED", 405);
  }

  const auth = await authenticateDevice(req);

  if (auth instanceof Response) {
    return auth;
  }

  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return error("INVALID_JSON", 400);
  }

  const eventId =
    typeof body.event_id === "string" && body.event_id.length <= 128
      ? body.event_id
      : "";

  const deviceCode =
    typeof body.device_code === "string"
      ? body.device_code
      : "";

  const imageUrl =
    typeof body.image_url === "string" && body.image_url.length <= 4096
      ? body.image_url
      : "";

  const occurredAt =
    typeof body.occurred_at === "string" &&
      !Number.isNaN(Date.parse(body.occurred_at))
      ? body.occurred_at
      : "";

  if (!eventId || !imageUrl || !occurredAt || deviceCode !== auth.code) {
    return error("VALIDATION_ERROR", 400);
  }

  try {
    const parsed = new URL(imageUrl);

    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      return error("INVALID_IMAGE_URL", 400);
    }
  } catch {
    return error("INVALID_IMAGE_URL", 400);
  }

  const { data: existing } = await auth.supabase
    .from("classifications")
    .select("id, screen_events(id)")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) {
    return json({
      success: true,
      duplicate: true,
      event_id: eventId,
      classification_id: existing.id,
      screen_event_id:
        (existing.screen_events as { id: string }[] | null)?.[0]?.id ??
        null,
    });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

  let result: Analysis;
  let modelError: string | null = null;

  try {
    if (!apiKey) {
      throw new Error("OPENAI_NOT_CONFIGURED");
    }

    result = await analyzeWithOpenAI(imageUrl, apiKey, model);
  } catch (cause) {
    modelError =
      cause instanceof Error
        ? cause.message
        : "OPENAI_REQUEST_FAILED";

    // Seguro: registra solo el código de error y el modelo.
    console.error(
      JSON.stringify({
        source: "analyze-waste-image",
        event_id: eventId,
        model,
        error: modelError,
      }),
    );

    result = {
      category: "unknown",
      confidence: 0,
      accepted: false,
      reason: "No se pudo analizar la imagen",
      points_available: 0,
    };

    await auth.supabase.from("system_logs").insert({
      device_id: auth.deviceId,
      level: "error",
      source: "network",
      message: "Fallo de análisis visual",
      context: {
        event_id: eventId,
        code: modelError,
        model,
      },
    });
  }

  const realToken = result.accepted ? token() : null;

  const expiresAt = result.accepted
    ? new Date(Date.now() + 5 * 60_000).toISOString()
    : null;

  const qrContent = realToken
    ? `${claimBaseUrl()}/claim?token=${encodeURIComponent(realToken)}`
    : null;

  const { data, error: rpcError } = await auth.supabase.rpc(
    "ingest_analyzed_waste",
    {
      p_device_id: auth.deviceId,
      p_event_id: eventId,
      p_occurred_at: occurredAt,
      p_image_url: imageUrl,
      p_category: result.category,
      p_confidence: result.confidence,
      p_accepted: result.accepted,
      p_reason: result.reason,
      p_points: result.points_available,
      p_claim_token_hash: realToken
        ? await sha256(realToken)
        : null,
      p_qr_content: qrContent,
      p_expires_at: expiresAt,
      p_payload: {
        model_version: model,
        analysis_error: modelError,
      },
    },
  );

  if (rpcError) {
    console.error(
      JSON.stringify({
        source: "ingest_analyzed_waste",
        event_id: eventId,
        error: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code,
      }),
    );

    return error("INGEST_FAILED", 500);
  }

  return json({
    success: true,
    event_id: eventId,
    duplicate: Boolean(data?.duplicate),
    classification: result.category,
    category: result.category,
    confidence: result.confidence,
    accepted: result.accepted,
    rejection_reason: result.accepted ? null : result.reason,
    points: result.points_available,
    points_available: result.points_available,
    qr_content: data?.duplicate ? null : qrContent,
    classification_id: data?.classification_id ?? null,
    screen_event_id: data?.screen_event_id ?? null,
  });
});
