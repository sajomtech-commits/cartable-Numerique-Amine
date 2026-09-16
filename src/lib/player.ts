// Lecteur audio persistant : contrôles sur l'écran de verrouillage (Media Session)
// + reprise automatique à la dernière position (localStorage), sur n'importe quelle page.
import { audioUrl } from './audios';

const CLE = 'cartable_audio_play'; // {path, titre, time}

function lireMarker(): { path: string; titre: string; time: number } | null {
  try { return JSON.parse(localStorage.getItem(CLE) || 'null'); }
  catch { return null; }
}

function ecrire(pos: { path: string; titre: string; time: number }) {
  try { localStorage.setItem(CLE, JSON.stringify(pos)); } catch { }
}

export function effacerLecture() {
  try { localStorage.removeItem(CLE); } catch { }
}

/** Enregistre les contrôles de l'écran de verrouillage + mémorise la position. */
export function brancherLecteur(au: HTMLAudioElement, titre: string, path: string) {
  const update = () => {
    if (!au.paused && !au.ended) ecrire({ path, titre, time: au.currentTime });
  };
  au.addEventListener('timeupdate', () => { if (Math.random() < 0.2) update(); });
  au.addEventListener('pause', () => { /* on garde la position pour reprise */ });
  au.addEventListener('ended', () => effacerLecture());

  // Media Session : titre + boutons sur l'écran de verrouillage
  if ('mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({ title: 'Révision audio', artist: 'Cartable d\'Amine', album: titre });
    const sync = () => {
      ms.playbackState = au.paused ? 'paused' : 'playing';
    };
    try {
      ms.setActionHandler('play', () => { au.play().then(sync).catch(() => {}); });
      ms.setActionHandler('pause', () => { au.pause(); sync(); });
      ms.setActionHandler('seekto', (d) => { if (d.seekTime != null) au.currentTime = d.seekTime; });
    } catch { /* non supporté */ }
    au.addEventListener('play', sync);
    au.addEventListener('pause', sync);
    au.addEventListener('ended', sync);
  }
}

/** Petit mini-player flottant pour reprendre la lecture sur n'importe quelle page. */
export function proposerReprise() {
  const m = lireMarker();
  if (!m) return;
  const barre = document.createElement('div');
  barre.className = 'fixed bottom-16 md:bottom-4 inset-x-3 z-50 carte p-3 flex items-center gap-2 shadow-2xl bg-slate-900';
  barre.innerHTML = `
    <button data-act class="btn-principal !px-3 !py-1.5 text-sm">▶ Reprendre</button>
    <span class="text-xs text-slate-300 truncate flex-1">🎙️ ${/* titre */ ''}<span data-t></span></span>
    <button data-x class="w-7 h-7 rounded-lg bg-slate-800 text-slate-400">✕</button>`;
  barre.querySelector('[data-t]')!.textContent = m.titre;
  document.body.appendChild(barre);
  const retirer = () => barre.remove();
  barre.querySelector('[data-x]')!.addEventListener('click', () => { retirer(); effacerLecture(); });
  barre.querySelector('[data-act]')!.addEventListener('click', async () => {
    retirer();
    const u = await audioUrl(m.path);
    if (!u) return;
    const au = new Audio(u);
    brancherLecteur(au, m.titre, m.path);
    try { au.currentTime = m.time; await au.play(); } catch { /* autoplay refusé */ }
  });
}

/** Enregistre une lecture en cours pour reprise possible. */
export function signalerLecture(path: string, titre: string) {
  ecrire({ path, titre, time: 0 });
}