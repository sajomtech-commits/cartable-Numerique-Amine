// Lecteur audio persistant : barre flottante AVEC contrôles (▶/⏸, progression),
// contrôles sur l'écran de verrouillage (Media Session), reprise à la position
// sauvegardée sur n'importe quelle page.
import { audioUrl } from './audios';

const CLE = 'cartable_audio_play'; // {path, titre, time}
interface Marqueur { path: string; titre: string; time: number; }

function lireMarker(): Marqueur | null {
  try { return JSON.parse(localStorage.getItem(CLE) || 'null'); } catch { return null; }
}
function ecrire(m: Marqueur) { try { localStorage.setItem(CLE, JSON.stringify(m)); } catch { } }
export function effacerLecture() { try { localStorage.removeItem(CLE); } catch { } }

const fmt = (s: number) => (isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00');

let barre: HTMLElement | null = null;
let courant: HTMLAudioElement | null = null;

function mediaSession(au: HTMLAudioElement, titre: string) {
  if (!('mediaSession' in navigator)) return;
  try {
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({ title: titre, artist: 'Cartable d\'Amine', album: 'Révision audio' });
    ms.setActionHandler('play', () => au.play().catch(() => {}));
    ms.setActionHandler('pause', () => au.pause());
    ms.setActionHandler('seekto', (d) => { if (d.seekTime != null) au.currentTime = d.seekTime; });
    const sync = () => { ms.playbackState = au.paused ? 'paused' : 'playing'; };
    au.addEventListener('play', sync);
    au.addEventListener('pause', sync);
    au.addEventListener('ended', sync);
  } catch { /* non supporté */ }
}

/** Construit (ou met à jour) la barre flottante liée à l'élément audio donné. */
function construireBarre(au: HTMLAudioElement, titre: string) {
  courant = au;
  if (barre) barre.remove();
  const b = document.createElement('div');
  b.className = 'fixed bottom-16 md:bottom-4 inset-x-3 z-50 carte p-3 shadow-2xl';
  b.innerHTML = `
    <div class="flex items-center gap-2">
      <button data-play class="btn-principal !px-3 !py-1.5 text-sm shrink-0">▶</button>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-bold truncate">🎙️ <span data-t></span></p>
        <input data-seek type="range" min="0" max="0" value="0" step="1" class="w-full h-1.5 accent-brand" />
        <p class="text-[10px] text-slate-500"><span data-cur>0:00</span> / <span data-dur>0:00</span></p>
      </div>
      <button data-close class="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 shrink-0">✕</button>
    </div>`;
  document.body.appendChild(b);
  const btn = b.querySelector('[data-play]') as HTMLButtonElement;
  const seek = b.querySelector('[data-seek]') as HTMLInputElement;
  const cur = b.querySelector('[data-cur]')!;
  const dur = b.querySelector('[data-dur]')!;
  b.querySelector('[data-t]')!.textContent = titre;

  const maj = () => {
    btn.textContent = au.paused ? '▶' : '⏸';
    if (isFinite(au.duration)) { seek.max = String(au.duration); dur.textContent = fmt(au.duration); } else { dur.textContent = fmt(au.currentTime); }
    seek.value = String(au.currentTime);
    cur.textContent = fmt(au.currentTime);
    ecrire({ path: (au as any).__path || '', titre: titre, time: au.currentTime });
  };

  btn.addEventListener('click', () => { if (au.paused) au.play().catch(() => {}); else au.pause(); });
  seek.addEventListener('input', () => { au.currentTime = Number(seek.value); });
  b.querySelector('[data-close]')!.addEventListener('click', () => { au.pause(); effacerLecture(); barre?.remove(); barre = null; });

  au.addEventListener('timeupdate', maj);
  au.addEventListener('play', maj);
  au.addEventListener('pause', maj);
  au.addEventListener('ended', () => effacerLecture());
  au.addEventListener('ended', () => { barre?.remove(); barre = null; });
  barre = b;
  maj();
}

/** À brancher sur chaque <audio> natif du site (page chapitre). */
export function brancherLecteur(au: HTMLAudioElement, titre: string, path: string) {
  (au as any).__path = path;
  mediaSession(au, titre);
  // Dès qu'on le lit, la barre flottante prend le relais (utile si on change d'onglet).
  au.addEventListener('play', () => construireBarre(au, titre));
}

/** Sur toute page : propose de reprendre la dernière lecture en cours. */
export async function proposerReprise() {
  const m = lireMarker();
  if (!m || !m.path) return;
  const u = await audioUrl(m.path);
  if (!u) return;
  const audio = new Audio();
  audio.src = u; audio.type = 'audio/mpeg'; audio.preload = 'auto';
  (audio as any).__path = m.path;
  audio.currentTime = m.time;
  construireBarre(audio, m.titre);
  mediaSession(audio, m.titre);
  audio.play().catch(() => { /* autoplay bloqué : l'utilisateur clique ▶ */ });
}