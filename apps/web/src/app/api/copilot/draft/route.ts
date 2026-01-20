import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const apiBase = process.env.API_BASE ?? "http://localhost:3001";

    const body = await req.text(); // keep raw JSON
    const upstream = await fetch(`${apiBase}/copilot/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
    });

    const text = await upstream.text();
    return new NextResponse(text, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
    });
}
