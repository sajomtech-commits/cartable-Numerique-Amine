export async function resumeCours(text: string, matiere: string, apiKey?: string) {
  const key = apiKey || (typeof document !== 'undefined' ? localStorage.getItem('deepseek_key') : null) || '';
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: "Tu es un assistant pédagogique pour un lycéen français." },
        { role: 'user', content: `Résume ce chapitre de ${matiere} en 10 points max, format markdown :\n\n${text}` }
      ],
      max_tokens: 800,
      temperature: 0.3
    })
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || res.statusText); }
  const j = await res.json();
  return j.choices?.[0]?.message?.content || '';
}
