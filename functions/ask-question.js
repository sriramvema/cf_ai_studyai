export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const backendUrl = context.env.BACKEND_URL;

    const response = await fetch(`${backendUrl}/ask-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}
