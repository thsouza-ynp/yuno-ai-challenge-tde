import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
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

  const stream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "system" as const, content: systemPrompt }, ...messages],
    stream: true,
    max_tokens: 1024,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
