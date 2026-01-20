import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { extractOrderId } from "@/lib/extractors";

export const runtime = "nodejs"; // ensure Node runtime on Vercel

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
        next_action: z.string(),
        order_id: z.string().optional(),
    }),
    _meta: z
        .object({
            error: z.object({
                code: z.literal("UPSTREAM_ERROR"),
                message: z.string(),
            }),
        })
        .optional(),
});

function fallback(subject: string, orderId?: string) {
    return {
        summary: `Ticket: ${subject}`,
        suggested_reply:
            "Thanks for reaching out — we’re checking this and will update you shortly.",
        extracted: {
            issue_type: "unknown",
            priority: "medium" as const,
            ...(orderId ? { order_id: orderId } : {}),
            next_action: "Request additional details from the customer",
        },
    };
}

export async function POST(req: Request) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { message: "Invalid JSON body" },
            { status: 400 }
        );
    }

    const parsed = CopilotDraftReq.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { message: "Invalid request body", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const { ticket, tone } = parsed.data;

    const combinedText =
        ticket.subject + "\n" + ticket.messages.map((m) => m.text).join("\n");
    const orderId = extractOrderId(combinedText);

    // Strict schema for the model output (no optional fields here)
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            {
                ...fallback(ticket.subject, orderId),
                _meta: { error: { code: "UPSTREAM_ERROR", message: "Missing OPENAI_API_KEY" } },
            },
            { status: 200 }
        );
    }

    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const openai = new OpenAI({ apiKey });

    try {
        const resp = await openai.responses.create({
            model,
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

        const raw = resp.output_text;
        const data = JSON.parse(raw);

        // merge deterministic order_id into the final response
        const merged = {
            ...data,
            extracted: { ...data.extracted, ...(orderId ? { order_id: orderId } : {}) },
        };

        // validate final shape
        const final = CopilotDraftRes.parse(merged);
        return NextResponse.json(final, { status: 200 });
    } catch (err: any) {
        const msg = typeof err?.message === "string" ? err.message : "OpenAI request failed";
        return NextResponse.json(
            {
                ...fallback(ticket.subject, orderId),
                _meta: { error: { code: "UPSTREAM_ERROR", message: msg } },
            },
            { status: 200 }
        );
    }
}
