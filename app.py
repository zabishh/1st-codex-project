from flask import Flask, jsonify, request
import os
import requests

API_URL = "https://www.dictionaryapi.com/api/v3/references/thesaurus/json/"

app = Flask(__name__)


@app.get("/api/thesaurus")
def thesaurus():
    word = request.args.get("word", "").strip()
    api_key = os.environ.get("MW_THESAURUS_KEY", "").strip()
    if not api_key:
        return jsonify({"error": "Missing MW_THESAURUS_KEY"}), 500
    if not word:
        return jsonify({"error": "Missing word"}), 400
    try:
        url = f"{API_URL}{requests.utils.quote(word)}?key={api_key}"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        return jsonify({"error": str(exc)}), 502


@app.get("/")
def health():
    return "ok"
