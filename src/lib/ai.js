// Lightweight Hugging Face Inference client for JSON extraction

export const extractJsonFromText = async ({ text, model, token }) => {
    if (!text || !model || !token) return null;
    const systemPrompt = 'You are a data extraction agent. Extract structured investment data as strict JSON only.';
    const userPrompt = `Extract key company information from the content below. Return ONLY JSON with fields: company, sector, metrics {arr, customers, churn, ltv_cac, cac}, risks [ {title, note} ], monitor [string], analysis {summary, recommendation, valueDriver}. If unknown, set null or empty.\n\nCONTENT:\n${text.slice(0, 12000)}`;

    const body = { inputs: `${systemPrompt}\n\n${userPrompt}`, parameters: { max_new_tokens: 512, temperature: 0.2 } };
    const resp = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    const data = await resp.json();

    let textOut = '';
    if (Array.isArray(data) && data[0]?.generated_text) textOut = data[0].generated_text;
    else if (typeof data === 'string') textOut = data;
    else if (data?.generated_text) textOut = data.generated_text;

    const match = textOut.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
};


