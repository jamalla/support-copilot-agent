import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";

import { z } from "zod";
import { badRequest, upstreamError } from "./httpErrors.js";
import { openai } from "./openai.js";
import { ENV } from "./config.js";
import { extractOrderId } from "./extractors.js";

const app = Fastify({ logger: true, bodyLimit: 256 * 1024 });

await app.register(rateLimit, {
  max: 60,                 // 60 requests
  timeWindow: "1 minute",  // per minute
  ban: 2,                  // optional: ban after 2x violations
});



app.get("/health", async () => {
  return { status: "ok" };
});

const CopilotDraftReq = z.object({
  ticket: z.object({
    subject: z.string().min(1),
    messages: z
      .array(
        z.object({
          from: z.enum(["customer", "agent"]),
          text: z.string().min(1),
          ts: z.string().optional(),
        })
      )
      .min(1),
  }),
  tone: z.enum(["professional", "friendly", "firm"]),
});

const CopilotDraftRes = z.object({
  summary: z.string(),
  suggested_reply: z.string(),
  extracted: z.object({
    issue_type: z.string(),
    priority: z.enum(["low", "medium", "high"]),
    order_id: z.string().optional(),
    next_action: z.string(),
  }),
});

app.post(
  "/copilot/draft",
  {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: "1 minute",
      },
    },
  },
  async (req, reply) => {
    const parsed = CopilotDraftReq.safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send(
        badRequest("Invalid request body", parsed.error.flatten())
      );
    }

    const { ticket, tone } = parsed.data;

    const combinedText =
      ticket.subject + "\n" + ticket.messages.map(m => m.text).join("\n");
    const orderId = extractOrderId(combinedText);


    // Strict JSON schema for OpenAI Structured Outputs
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        suggested_reply: { type: "string" },
        extracted: {
          type: "object",
          additionalProperties: false,
          properties: {
            issue_type: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            next_action: { type: "string" },
          },
          required: ["issue_type", "priority", "next_action"],
        },
      },
      required: ["summary", "suggested_reply", "extracted"],
    } as const;

    // Always-available fallback (same contract)
    const fallback = {
      summary: `Ticket: ${ticket.subject}`,
      suggested_reply:
        "Thanks for reaching out — we’re checking this and will update you shortly.",
      extracted: {
        issue_type: "unknown",
        priority: "medium" as const,
        ...(orderId ? { order_id: orderId } : {}),
        next_action: "Request additional details from the customer",
      },
    };

    try {
      const resp = await openai.responses.create({
        model: ENV.OPENAI_MODEL,
        temperature: 0.2,
        instructions:
          "You are a customer support copilot for human agents. " +
          "Return ONLY valid JSON that matches the provided schema. " +
          "Be concise and accurate. Do not invent details.",
        input: [
          {
            role: "user",
            content:
              `TONE: ${tone}\n` +
              `SUBJECT: ${ticket.subject}\n` +
              `MESSAGES:\n` +
              ticket.messages
                .map((m) => `- ${m.from.toUpperCase()}: ${m.text}`)
                .join("\n"),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "copilot_draft",
            strict: true,
            schema,
          },
        },
      });

      const raw = resp.output_text; // JSON string
      const data = CopilotDraftRes.parse(JSON.parse(raw));
      return {
        ...data,
        extracted: {
          ...data.extracted,
          ...(orderId ? { order_id: orderId } : {}),
        },
      };

      return data;
    } catch (err: any) {
      const msg =
        typeof err?.message === "string" ? err.message : "OpenAI request failed";

      // Return 200 with fallback + meta error (keeps agents unblocked)
      return reply.code(200).send({
        ...fallback,
        _meta: upstreamError(msg),
      });
    }
  });

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`API listening on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
