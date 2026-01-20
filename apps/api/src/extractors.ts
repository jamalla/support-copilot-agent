export function extractOrderId(text: string): string | undefined {
    // Examples matched: "Order #A10293", "order A10293", "#10293"
    const patterns = [
        /\border\s*#?\s*([A-Z0-9-]{4,})\b/i,
        /#\s*([A-Z0-9-]{4,})\b/i,
    ];

    for (const re of patterns) {
        const m = text.match(re);
        if (m?.[1]) return m[1].toUpperCase();
    }
    return undefined;
}
