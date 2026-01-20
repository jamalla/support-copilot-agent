"use client";

import { useMemo, useState } from "react";

type Tone = "professional" | "friendly" | "firm";

type DraftResponse = {
    summary: string;
    suggested_reply: string;
    extracted: {
        issue_type: string;
        priority: "low" | "medium" | "high";
        next_action: string;
        order_id?: string;
    };
    _meta?: Record<string, unknown> | null;
};

export default function Page() {
    const [subject, setSubject] = useState("Order delayed");
    const [tone, setTone] = useState<Tone>("professional");
    const [messagesText, setMessagesText] = useState(
        "customer: My order has not arrived yet. Order #A10293.\nagent: Sorry to hear that. Can you confirm your address?"
    );

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<DraftResponse | null>(null);

    const parsedMessages = useMemo(() => {
        return messagesText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                const idx = line.indexOf(":");
                const left = idx >= 0 ? line.slice(0, idx).trim().toLowerCase() : "customer";
                const text = idx >= 0 ? line.slice(idx + 1).trim() : line;

                const from = left === "agent" ? "agent" : "customer";
                return { from, text };
            });
    }, [messagesText]);

    async function runCopilot() {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch(`/api/copilot/draft`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticket: { subject, messages: parsedMessages },
                    tone,
                }),
            });

            const text = await res.text();

            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch {
                // not JSON; keep raw text for debugging
                json = { message: text || "Empty response from server" };
            }

            if (!res.ok) {
                setError(json?.message ?? `Request failed with ${res.status}`);
                return;
            }

            setResult(json);
        } catch (e: any) {
            setError(e?.message ?? "Network error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>Support Copilot (Agent)</h1>
            <p style={{ opacity: 0.8, marginTop: 0 }}>
                Paste a ticket conversation and generate a draft reply + extracted fields.
            </p>

            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                <label>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Subject</div>
                    <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                    />
                </label>

                <label>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Tone</div>
                    <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value as Tone)}
                        style={{ width: 240, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                    >
                        <option value="professional">professional</option>
                        <option value="friendly">friendly</option>
                        <option value="firm">firm</option>
                    </select>
                </label>

                <label>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Messages (one per line)</div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                        Format: <code>customer: ...</code> or <code>agent: ...</code>
                    </div>
                    <textarea
                        value={messagesText}
                        onChange={(e) => setMessagesText(e.target.value)}
                        rows={8}
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                    />
                </label>

                <button
                    onClick={runCopilot}
                    disabled={loading}
                    style={{
                        width: 220,
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #333",
                        cursor: loading ? "not-allowed" : "pointer",
                        background: "#fff",
                        fontWeight: 700,
                    }}
                >
                    {loading ? "Generating..." : "Generate Draft"}
                </button>

                {error && (
                    <div style={{ padding: 12, borderRadius: 10, background: "#ffecec", border: "1px solid #ffb3b3" }}>
                        <b>Error:</b> {error}
                    </div>
                )}

                {result && (
                    <div style={{ padding: 16, borderRadius: 12, border: "1px solid #ddd", background: "#fafafa" }}>
                        <h2 style={{ marginTop: 0 }}>Result</h2>

                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontWeight: 700 }}>Summary</div>
                            <div>{result.summary}</div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontWeight: 700 }}>Suggested Reply</div>
                            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{result.suggested_reply}</pre>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontWeight: 700 }}>Extracted</div>
                            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                                {JSON.stringify(result.extracted, null, 2)}
                            </pre>
                        </div>

                        {!!result._meta && (
                            <div style={{ marginTop: 12, opacity: 0.85 }}>
                                <div style={{ fontWeight: 700 }}>Meta</div>
                                <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                                    {JSON.stringify(result._meta, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
