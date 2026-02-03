import http.server
import json
import os
import urllib.parse
import urllib.request

API_URL = "https://www.dictionaryapi.com/api/v3/references/thesaurus/json/"
PORT = 5173


def load_api_key():
    env_key = os.environ.get("MW_THESAURUS_KEY")
    if env_key:
        return env_key.strip()
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                if key.strip() == "MW_THESAURUS_KEY":
                    return value.strip()
    return ""


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/thesaurus":
            params = urllib.parse.parse_qs(parsed.query)
            word = (params.get("word") or [""])[0].strip()
            api_key = load_api_key()
            if not api_key:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing MW_THESAURUS_KEY"}).encode())
                return
            if not word:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing word"}).encode())
                return
            url = f"{API_URL}{urllib.parse.quote(word)}?key={api_key}"
            try:
                with urllib.request.urlopen(url, timeout=10) as resp:
                    data = resp.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(data)
            except Exception as exc:
                self.send_response(502)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(exc)}).encode())
            return
        return super().do_GET()


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = http.server.ThreadingHTTPServer(("", PORT), Handler)
    print(f"Serving on http://localhost:{PORT}")
    server.serve_forever()
