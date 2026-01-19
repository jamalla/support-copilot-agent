import Fastify from "fastify";
import { z } from "zod";
import { badRequest } from "./httpErrors.js"

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

const app = Fastify({ logger: true });

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

app.post("/copilot/draft", async (req, reply) => {
  const parsed = CopilotDraftReq.safeParse(req.body);

  if (!parsed.success) {
    return reply.code(400).send(
      badRequest("Invalid request body", parsed.error.flatten())
    );
  }

  // Stubbed output for now (Step 5 will call OpenAI)
  return {
    summary: `Ticket: ${parsed.data.ticket.subject}`,
    suggested_reply: "Thanks for reaching out — we’re checking this and will update you shortly.",
    extracted: {
      issue_type: "unknown",
      priority: "medium",
      next_action: "Request additional details from the customer",
    },
  };
});

try {
  await app.listen({ port, host });
  app.log.info(`API listening on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
