from http.server import HTTPServer, BaseHTTPRequestHandler
import json, re, time, urllib.request, urllib.error

def slug(s, defaut='divers'):
    s = re.sub(r'[^\w\-]+', '-', (s or '').lower().strip())
    s = re.sub(r'-+', '-', s).strip('-')[:60]
    return s or defaut

def tts_mp3(script, voice='fr-FR-DeniseNeural'):
    import asyncio, edge_tts
    async def go():
        c = edge_tts.Communicate(script, voice)
        out = b''
        async for chunk in c.stream():
            if chunk.get('type') == 'audio':
                out += chunk['data']
        return out
    return asyncio.run(go())

class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, *a):  # silencieux
        pass

    def _cors(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_OPTIONS(self):
        self._cors()

    def do_GET(self):
        if self.path == '/health':
            body = b'{"ok":true}'
            self.send_response(200); self._hdrs(len(body)); self.wfile.write(body); return
        self.send_response(404); self._hdrs(); self.end_headers()

    def do_POST(self):
        try:
            n = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(n))
            route = self.path

            if route == '/audio':
                # Génération de la révision audio : script -> MP3 (edge-tts) -> bucket Supabase
                script = str(data.get('script') or '')[:3200]
                uid = str(data.get('uid') or '')
                su = (data.get('supabase_url') or '').rstrip('/')
                key = data.get('service_key') or ''
                if not script or not uid or not su or not key:
                    out = {'error': 'parametres manquants (script, uid, supabase_url, service_key)'}
                    self.send_response(400); self._hdrs(len(json.dumps(out).encode())); self.wfile.write(json.dumps(out).encode()); return
                mp3 = tts_mp3(script, data.get('voice') or 'fr-FR-DeniseNeural')
                mat = slug(data.get('matiere'))
                chap = slug(data.get('chapitre') or 'sans-chapitre')
                path = f"{uid}/{mat}/{chap}/{int(time.time()*1000)}.mp3"
                req = urllib.request.Request(
                    f"{su}/storage/v1/object/audio/{path}", data=mp3, method='POST',
                    headers={'Authorization': f'Bearer {key}', 'apikey': key,
                             'Content-Type': 'audio/mpeg', 'x-upsert': 'true',
                             'User-Agent': 'Mozilla/5.0'})  # Cloudflare exige un UA navigateur
                with urllib.request.urlopen(req, timeout=90) as r:
                    r.read()
                duree = max(1, round(len(script) / 13.5))  # ~13-14 caractères/s à l'oral
                out = {'path': path, 'duree_sec': duree, 'octets': len(mp3)}
                self.send_response(200); self._hdrs(len(json.dumps(out).encode())); self.wfile.write(json.dumps(out).encode()); return

            out = {'error': 'route inconnue'}
            self.send_response(404); self._hdrs(len(json.dumps(out).encode())); self.wfile.write(json.dumps(out).encode())
        except urllib.error.HTTPError as e:
            body = json.dumps({'erreur': f'{e.code} {e.read().decode()[:200]}'}).encode()
            self.send_response(502); self._hdrs(len(body)); self.wfile.write(body)
        except Exception as e:
            body = json.dumps({'erreur': str(e)[:300]}).encode()
            self.send_response(500); self._hdrs(len(body)); self.wfile.write(body)

    def _hdrs(self, n=0):
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(n))
        self.end_headers()

HTTPServer(('0.0.0.0', 8899), Handler).serve_forever()