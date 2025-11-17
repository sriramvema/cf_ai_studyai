export async function onRequestPost(context) {
  const { request, env } = context;

  const formData = await request.formData();
  const file = formData.get("pdf");

  if (!file) {
    return new Response(JSON.stringify({ error: "No file uploaded" }), {
      status: 400,
    });
  }

  // ⭐ SAFETY CHECK ADDED HERE ⭐
  if (!env.AI) {
    return Response.json({
      error: "AI not available in local dev. Deploy to test AI.",
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const fileName = file.name;

  // --- 1. Save PDF to R2 ---
  await env.PDFS_BUCKET.put(fileName, arrayBuffer);

  // --- 2. Extract text using Cloudflare AI ---
  const textReq = await env.AI.run("@cf/pdf-extract", {
    buffer: [...new Uint8Array(arrayBuffer)],
  });

  const pages = textReq.pages.map((p) => p.text);

  // --- 3. Embeddings ---
  const embedRes = await env.AI.run(
    "@cf/sentence-transformers/all-minilm-l6-v2",
    { text: pages }
  );

  const vectors = embedRes.data;

  // --- 4. Vectorize ---
  const vectorItems = vectors.map((vec, i) => ({
    id: `page-${i}`,
    values: vec,
    metadata: {
      page: i + 1,
      source: fileName,
      text: pages[i],
    },
  }));

  await env.VECTORIZE.upsert(vectorItems);

  return Response.json({
    message: `PDF '${fileName}' uploaded and indexed`,
    num_pages: pages.length,
  });
}
