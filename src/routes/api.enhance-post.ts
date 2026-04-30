import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const ALLOWED_PLATFORMS: Record<string, number> = {
  instagram: 2200,
  linkedin: 3000,
  x: 280,
  facebook: 63206,
};

const MAX_TEXT_LENGTH = 5000;

export const Route = createFileRoute("/api/enhance-post")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { status: 204 });
      },

      POST: async ({ request }) => {
        try {
          // Validate auth
          const authHeader = request.headers.get("Authorization");
          if (!authHeader) {
            return Response.json(
              { error: "Missing authorization header." },
              { status: 401 }
            );
          }

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

          const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
          });

          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError || !user) {
            return Response.json(
              { error: "Invalid or expired session. Please log in again." },
              { status: 401 }
            );
          }

          // Rate limiting: 10 requests per user per minute
          const serviceClient = createClient<Database>(
            supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
          const { count, error: rlError } = await serviceClient
            .from("rate_limits")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("endpoint", "enhance-post")
            .gte("created_at", oneMinuteAgo);

          if (!rlError && (count ?? 0) >= 10) {
            return Response.json(
              { error: "Rate limit exceeded. Please wait a moment before trying again." },
              { status: 429 }
            );
          }

          // Record this request
          await serviceClient.from("rate_limits").insert({
            user_id: user.id,
            endpoint: "enhance-post",
          });

          // Validate input
          const body = await request.json();
          const text = body?.text;

          if (!text || typeof text !== "string" || text.trim().length === 0) {
            return Response.json(
              { error: "Please write some text before enhancing." },
              { status: 400 }
            );
          }

          if (text.length > MAX_TEXT_LENGTH) {
            return Response.json(
              { error: `Text must be ${MAX_TEXT_LENGTH.toLocaleString()} characters or fewer.` },
              { status: 400 }
            );
          }

          // Call AI gateway
          const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
          if (!OPENAI_API_KEY) {
            console.error("OPENAI_API_KEY is not configured");
            return Response.json(
              { error: "Service configuration error. Please try again later." },
              { status: 500 }
            );
          }

          const platformInfo = Object.entries(ALLOWED_PLATFORMS)
            .map(([name, limit]) => `${name}: ${limit} characters`)
            .join(", ");

          const systemPrompt = `You are an elite social media strategist and copywriter. The user will give you draft post text. Your job is to return exactly 3 enhanced variations of that post.

Rules:
- Each variation MUST respect ALL platform character limits: ${platformInfo}
- The shortest limit is the binding constraint — every variation must fit within it
- Preserve the user's core message and intent
- Variation 1: Polish — tighten wording, fix grammar, improve flow
- Variation 2: Engaging — add hooks, questions, or calls to action
- Variation 3: Creative — try a bold angle, storytelling, or unexpected framing
- Use relevant emojis sparingly where appropriate
- Do NOT use hashtags unless the original text has them
- Keep each variation self-contained`;

          const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: text },
                ],
                tools: [
                  {
                    type: "function",
                    function: {
                      name: "return_suggestions",
                      description: "Return 3 enhanced post variations",
                      parameters: {
                        type: "object",
                        properties: {
                          suggestions: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                label: {
                                  type: "string",
                                  description: "Short label: Polished, Engaging, or Creative",
                                },
                                text: {
                                  type: "string",
                                  description: "The enhanced post text",
                                },
                              },
                              required: ["label", "text"],
                              additionalProperties: false,
                            },
                            minItems: 3,
                            maxItems: 3,
                          },
                        },
                        required: ["suggestions"],
                        additionalProperties: false,
                      },
                    },
                  },
                ],
                tool_choice: {
                  type: "function",
                  function: { name: "return_suggestions" },
                },
              }),
            }
          );

          if (!response.ok) {
            if (response.status === 429) {
              return Response.json(
                { error: "Rate limit exceeded. Please try again in a moment." },
                { status: 429 }
              );
            }
            if (response.status === 402) {
              return Response.json(
                { error: "AI credits exhausted." },
                { status: 402 }
              );
            }
            const errText = await response.text();
            console.error("AI gateway error:", response.status, errText);
            return Response.json(
              { error: "AI service error. Please try again." },
              { status: 500 }
            );
          }

          const data = await response.json();
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

          if (!toolCall?.function?.arguments) {
            console.error("Unexpected AI response shape:", JSON.stringify(data));
            return Response.json(
              { error: "AI returned an unexpected response. Please try again." },
              { status: 500 }
            );
          }

          const parsed = JSON.parse(toolCall.function.arguments);
          return Response.json(parsed);
        } catch (e) {
          console.error("enhance-post error:", e);
          return Response.json(
            { error: "An unexpected error occurred. Please try again." },
            { status: 500 }
          );
        }
      },
    },
  },
});
