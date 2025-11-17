export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const formData = await request.formData();
    const file = formData.get("pdf");

    if (!file) {
      return new Response(JSON.stringify({ error: "No PDF file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Convert to ArrayBuffer
    const buffer = await file.arrayBuffer();

    // TODO:
    // Upload to R2 or process PDF however you'd like.
    // For now return mock response:

    return new Response(JSON.stringify({
      message: `PDF '${file.name}' received`,
      size_kb: Math.round(buffer.byteLength / 1024)
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

export function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
