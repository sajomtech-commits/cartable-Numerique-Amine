export async function resumeCours(text: string, matiere: string, hfKey?: string) {
  const key = hfKey || (typeof document !== 'undefined' ? localStorage.getItem('hf_key') : null) || '';
  const res = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: `Résume ce chapitre de ${matiere} en 10 points max, format markdown :\n\n${text}`, parameters: { max_new_tokens: 500, temperature: 0.3, return_full_text: false } })
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error || res.statusText); }
  const j = await res.json();
  return Array.isArray(j) ? j[0]?.generated_text || j[0] || '' : (j.generated_text || j[0]?.summary_text || JSON.stringify(j));
}
