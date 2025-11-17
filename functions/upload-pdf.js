export async function onRequestPost(context) {
  const { request, env } = context;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file) {
    return new Response(JSON.stringify({ error: "No file uploaded" }), {
      status: 400,
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const fileName = file.name;

  // --- 1. Save the PDF to R2 ---
  await env.PDFS_BUCKET.put(fileName, arrayBuffer);

  // --- 2. Extract text using Cloudflare's PDF parser ---
  const textReq = await env.AI.run("@cf/pdf-extract", {
    buffer: [...new Uint8Array(arrayBuffer)],
  });

  const pages = textReq.pages.map(p => p.text);

  // --- 3. Embed with MiniLM-L6-v2 Workers AI embedding model ---
  const embedRes = await env.AI.run(
    "@cf/sentence-transformers/all-minilm-l6-v2",
    { text: pages }
  );

  const vectors = embedRes.data; // array of embedding vectors

  // --- 4. Store embeddings in Vectorize ---
  const vectorItems = vectors.map((vec, i) => ({
    id: `page-${i}`,
    values: vec,
    metadata: {
      page: i + 1,
      source: fileName,
      text: pages[i],
    },
  }));

  await env.PDF_INDEX.upsert(vectorItems);

  return Response.json({
    message: `PDF '${fileName}' uploaded and indexed`,
    num_pages: pages.length,
  });
}

