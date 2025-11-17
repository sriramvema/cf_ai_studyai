export async function onRequestPost(context) {
  const { request, env } = context;

  const { question, userId } = await request.json();

  // --- 1. Vector search ---
  const searchRes = await env.VECTORIZE.query({
    topK: 5,
    vector: (
      await env.AI.run("@cf/sentence-transformers/all-minilm-l6-v2", {
        text: question,
      })
    ).data[0],
  });

  const contextText = searchRes.matches
    .map(m => m.metadata.text)
    .join("\n\n");

  const retrievedPages = searchRes.matches.map(m => m.metadata.page);

  // --- 2. Load chat history from KV ---
  const historyKey = `chat:${userId}`;
  const oldHistory = (await env.CHAT_HISTORY.get(historyKey)) || "";

  // --- 3. Call Anthropic ---
  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      temperature: 0.7,
      messages: [
        { role: "system", content: "You are a professor." },
        { role: "user", content: oldHistory },
        {
          role: "user",
          content: `Context:\n${contextText}\n\nQuestion: ${question}\n\nAnswer using only the context.`,
        },
      ],
    }),
  });

  const data = await anthropicRes.json();
  const answer = data.content[0].text;

  // --- 4. Save new chat turn in KV ---
  const newHistory =
    oldHistory +
    `\nUser: ${question}\nAssistant: ${answer}\n`;

  await env.CHAT_HISTORY.put(historyKey, newHistory);

  // --- 5. Response to frontend ---
  return Response.json({
    user_question: question,
    response: answer,
    context: contextText,
    retrieved_pages: retrievedPages,
  });
}
