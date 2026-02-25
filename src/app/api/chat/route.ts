export const runtime = "edge";

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { messages, context } = await req.json();

    const systemPrompt = `You are a senior fraud analyst for Mercado Luna, a Mexican e-commerce platform. You analyze transaction data to identify fraud patterns and provide actionable recommendations.

Current dashboard statistics:
- Total Transactions: ${context.kpi?.totalTransactions?.toLocaleString() ?? "N/A"}
- Chargeback Rate: ${context.kpi?.chargebackRate?.toFixed(2) ?? "N/A"}%
- Flagged Suspicious: ${context.flaggedCount ?? "N/A"} transactions
- Total Customers: ${context.totalCustomers ?? "N/A"}
- Top Chargeback States: ${JSON.stringify(context.topChargebackStates?.map((s: { state: string; chargebackRate: number }) => `${s.state} (${s.chargebackRate.toFixed(1)}%)`) ?? [])}
- Risk by Payment Method: ${JSON.stringify(context.riskByMethod?.map((r: { label: string; chargebackRate: number }) => `${r.label}: ${r.chargebackRate.toFixed(2)}%`) ?? [])}
- Peak Chargeback Hours: ${JSON.stringify(context.peakChargebackHours ?? [])}

Guidelines:
- Be specific and data-driven in your analysis
- Reference the actual numbers from the dashboard
- Suggest concrete fraud prevention rules when asked
- Identify patterns like late-night transaction clusters, geographic hotspots, velocity abuse
- Keep responses concise and actionable (2-3 paragraphs max)
- Use Mexican business context (SPEI, OXXO, MXN currency)`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        max_tokens: 1024,
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errBody);
      return new Response(JSON.stringify({ error: `Groq API ${groqRes.status}: ${errBody}` }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Pipe the SSE stream from Groq, extracting text deltas
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readable = new ReadableStream({
      async start(controller) {
        const reader = groqRes.body?.getReader();
        if (!reader) { controller.close(); return; }

        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const text = parsed.choices?.[0]?.delta?.content || "";
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // skip malformed chunks
            }
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Chat route error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
