from http.server import HTTPServer, BaseHTTPRequestHandler
import json, os, urllib.request, urllib.error

OC_URL = 'https://opencode.ai/zen/go/v1/chat/completions'
KEY = os.environ['OC_KEY']

PROMPT_FICHE = (
    "Tu es un professeur de lycee en France. A partir du cours de {matiere} ci-dessous, "
    "produis une fiche de revision au format EXACT suivant (markdown) :\n"
    "## TITRE: <titre du chapitre>\n## RESUME\n<3 a 4 phrases claires>\n## POINTS CLES\n"
    "- <10 points max, un par ligne>\n## QUIZ\n**Q:** <question de controle type> **R:** <reponse courte>\n"
    "(4 Q/R)\n\nCOURS:\n{contenu}"
)

def call_opencode(messages, max_tokens=2000):
    body = json.dumps({
        'model': 'glm-5.3-flash', 'temperature': 0.3, 'max_tokens': max_tokens,
        'messages': messages,
    }).encode()
    req = urllib.request.Request(OC_URL, data=body, method='POST', headers={
        'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json',
        'x-opencode-session': f'cartable-proxy-{os.getpid()}', 'User-Agent': 'cartable-proxy',
    })
    with urllib.request.urlopen(req, timeout=120) as r:
        resp = json.loads(r.read().decode())
    content = resp['choices'][0]['message']['content']
    # si le modèle renvoie du reasoning + content, content seul suffit (testé)
    return content

class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, *a):  # logs silencieux
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
            self.send_response(200); self._hdrs(len(body))
            self.wfile.write(body); return
        self.send_response(404); self._hdrs(); self.end_headers()

    def do_POST(self):
        try:
            n = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(n))
            route = self.path
            if route == '/fiche':
                md = call_opencode([{'role':'user','content': PROMPT_FICHE.format(
                    matiere=data['matiere'], contenu=data['texte'][:15000])}])
                out = {'markdown': md}
            elif route == '/ocr':
                # data: {images: [dataurl,...]} — vision lit chaque image
                parts = [{'type':'text','text':
                    'Transcris fidèlement TOUT le texte visible de ces pages de cours '
                    '(imprimé, manuscrit, tableaux, formules). Garde la structure (titres, listes). '
                    'Répond uniquement avec la transcription.'}]
                for u in data['images'][:8]:
                    parts.append({'type':'image_url','image_url':{'url': u}})
                md = call_opencode([{'role':'user','content': parts}], max_tokens=4000)
                out = {'texte': md}
            else:
                self.send_response(404); self._hdrs(); self.end_headers(); return
            body = json.dumps(out).encode()
            self.send_response(200); self._hdrs(len(body))
            self.wfile.write(body)
        except urllib.error.HTTPError as e:
            body = json.dumps({'erreur': f'IA: {e.code} {e.read().decode()[:200]}'}).encode()
            self.send_response(502); self._hdrs(len(body)); self.wfile.write(body)
        except Exception as e:
            body = json.dumps({'erreur': str(e)[:300]}).encode()
            self.send_response(500); self._hdrs(len(body)); self.wfile.write(body)

    def _hdrs(self, n=0):
        self.send_header('Content-Type','application/json')
        self.send_header('Access-Control-Allow-Origin','*')
        self.send_header('Content-Length', str(n))

HTTPServer(('0.0.0.0', 8899), Handler).serve_forever()
