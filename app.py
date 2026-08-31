#!/usr/bin/env python3
"""
GitHub Stars, Trending & AI Pulse Hub - Server Entry Point
Modular architecture utilizing services package.
"""

import sys
import os
import io
import json
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs
from datetime import datetime

# Windows UTF-8
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, 'static')

# Import modular services
from services.stars_service import load_stars_data, save_stars_data, load_notes_data, save_notes_data
from services.github_trending_service import get_github_trending, get_fresh_discoveries
from services.huggingface_service import get_huggingface_trending
from services.ai_pulse_service import get_ai_pulse_data
from services.stats_service import compute_stars_stats
from services.export_service import export_all_markdown_and_csv

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class AppRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == '/api/stars':
            self.handle_api_stars()
        elif path == '/api/trending':
            self.handle_api_trending(query)
        elif path == '/api/fresh':
            self.handle_api_fresh(query)
        elif path == '/api/hf-trending':
            self.handle_api_hf_trending(query)
        elif path == '/api/ai-pulse':
            self.handle_api_ai_pulse()
        elif path == '/api/collections':
            self.handle_api_json_file('collections.json')
        elif path in ('/api/dev-tools', '/api/tools'):
            self.handle_api_json_file('dev_tools.json')
        elif path in ('/api/weekly-digest', '/api/digest'):
            self.handle_api_json_file('weekly_digest.json')
        elif path == '/api/jobs':
            self.handle_api_json_file('jobs.json')
        elif path == '/api/download':
            self.handle_api_download(query)
        elif path == '/api/notes':
            self.handle_api_get_notes()
        elif path.startswith('/data/'):
            self.handle_data_file(path)
        elif path in ('/', '/index.html'):
            self.serve_index()
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/notes':
            self.handle_api_save_notes()
        elif path == '/api/sync':
            self.handle_api_sync()
        elif path == '/api/export':
            self.handle_api_export()
        elif path == '/api/jobs/add-platform':
            self.handle_api_add_job_platform()
        else:
            self.send_error(404, "Endpoint Not Found")

    def serve_index(self):
        index_file = os.path.join(STATIC_DIR, 'index.html')
        if not os.path.exists(index_file):
            self.send_error(404, "index.html not found")
            return
        with open(index_file, 'rb') as f:
            content = f.read()
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(content)

    def handle_api_download(self, query):
        filename = query.get('file', ['github_stars.md'])[0]
        safe_files = {
            'github_stars.md': os.path.join(BASE_DIR, 'github_stars.md'),
            'github_stars_by_topic.md': os.path.join(BASE_DIR, 'github_stars_by_topic.md'),
            'github_stars_timeline.md': os.path.join(BASE_DIR, 'github_stars_timeline.md'),
            'github_stars.csv': os.path.join(BASE_DIR, 'github_stars.csv')
        }
        target_path = safe_files.get(filename)
        if not target_path or not os.path.exists(target_path):
            self.send_error(404, "File not found")
            return

        with open(target_path, 'rb') as f:
            content = f.read()

        mime = 'text/csv' if filename.endswith('.csv') else 'text/markdown; charset=utf-8'
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(content)

    def handle_api_stars(self):
        raw = load_stars_data()
        repos = raw.get('repos', [])
        stats = compute_stars_stats(repos)
        self.send_json_response({
            'repos': repos,
            'stats': stats,
            'updated_at': raw.get('updated_at', 'Vừa cập nhật')
        })

    def handle_api_trending(self, query):
        since = query.get('since', ['daily'])[0]
        language = query.get('language', [''])[0]
        trending_repos = get_github_trending(language=language, since=since)
        self.send_json_response({
            'source': 'github',
            'since': since,
            'language': language,
            'count': len(trending_repos),
            'repos': trending_repos,
            'fetched_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })

    def handle_api_fresh(self, query):
        language = query.get('language', [''])[0]
        fresh_repos = get_fresh_discoveries(language=language)
        self.send_json_response({
            'source': 'github_fresh',
            'language': language,
            'count': len(fresh_repos),
            'repos': fresh_repos,
            'fetched_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })

    def handle_api_hf_trending(self, query):
        entity_type = query.get('type', ['models'])[0]
        trending_items = get_huggingface_trending(entity_type=entity_type)
        self.send_json_response({
            'source': 'huggingface',
            'type': entity_type,
            'count': len(trending_items),
            'items': trending_items,
            'fetched_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })

    def handle_api_ai_pulse(self):
        pulse = get_ai_pulse_data()
        self.send_json_response({
            'count': len(pulse),
            'items': pulse,
            'fetched_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })

    def handle_api_get_notes(self):
        notes_data = load_notes_data()
        self.send_json_response(notes_data)

    def handle_api_save_notes(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(length).decode('utf-8')
            req_json = json.loads(post_data)
            save_notes_data(req_json)
            self.send_json_response({'success': True, 'message': 'Đã lưu ghi chú và bookmark!'})
        except Exception as e:
            self.send_json_response({'success': False, 'error': str(e)}, status=400)

    def handle_api_sync(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            if length > 0:
                self.rfile.read(length)

            import export_stars
            raw_items = export_stars.fetch_all_stars('vuongdat67')
            analysis = export_stars.parse_and_analyze(raw_items)
            repos = analysis['repos']
            save_stars_data(repos)
            stats = compute_stars_stats(repos)
            export_all_markdown_and_csv(repos, stats, 'vuongdat67')

            self.send_json_response({
                'success': True,
                'total': len(repos),
                'message': f"Đã đồng bộ thành công {len(repos)} repositories từ GitHub!"
            })
        except Exception as e:
            print(f"[!] Sync error: {e}")
            self.send_json_response({'success': False, 'error': str(e)}, status=500)

    def handle_api_export(self):
        try:
            custom_dir = None
            length = int(self.headers.get('Content-Length', 0))
            if length > 0:
                body = self.rfile.read(length).decode('utf-8')
                try:
                    req_data = json.loads(body)
                    custom_dir = req_data.get('export_path')
                except Exception:
                    pass

            raw = load_stars_data()
            repos = raw.get('repos', [])
            stats = compute_stars_stats(repos)
            res = export_all_markdown_and_csv(repos, stats, 'vuongdat67', target_dir=custom_dir)

            self.send_json_response({
                'success': True,
                'output_dir': res['output_directory'],
                'files': res['files'],
                'message': f"Đã xuất thành công 4 file tại: {res['output_directory']}"
            })
        except Exception as e:
            print(f"[!] Export error: {e}")
            self.send_json_response({'success': False, 'error': str(e)}, status=500)

    def handle_api_add_job_platform(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            if length > 0:
                body = self.rfile.read(length).decode('utf-8')
                req_json = json.loads(body)
                from services.jobs_service import add_custom_platform
                saved_item = add_custom_platform(req_json)
                self.send_json_response({
                    'success': True,
                    'item': saved_item,
                    'message': f"Đã lưu thành công group/cổng tuyển dụng: {saved_item['name']}"
                })
            else:
                self.send_json_response({'success': False, 'error': 'Dữ liệu rỗng'}, status=400)
        except Exception as e:
            print(f"[!] Add platform error: {e}")
            self.send_json_response({'success': False, 'error': str(e)}, status=500)

    def handle_api_json_file(self, filename):
        data_path = os.path.join(BASE_DIR, 'data', filename)
        if not os.path.exists(data_path):
            data_path = os.path.join(STATIC_DIR, 'data', filename)
        if os.path.exists(data_path):
            try:
                with open(data_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                self.send_json_response(data)
                return
            except Exception as e:
                self.send_json_response({'error': str(e)}, status=500)
                return
        self.send_json_response({}, status=404)

    def handle_data_file(self, req_path):
        rel_path = req_path.lstrip('/')
        data_path = os.path.join(BASE_DIR, rel_path)
        if not os.path.exists(data_path):
            data_path = os.path.join(STATIC_DIR, rel_path)
        if os.path.exists(data_path) and os.path.isfile(data_path):
            try:
                with open(data_path, 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(content)
                return
            except Exception as e:
                self.send_error(500, str(e))
                return
        self.send_error(404, "Data file not found")

    def send_json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(body)

def run_server(port=5000, open_browser=True):
    for candidate_port in [port, 5001, 8000, 8080, 3000]:
        try:
            server_address = ('127.0.0.1', candidate_port)
            httpd = ThreadedHTTPServer(server_address, AppRequestHandler)
            print(f"\n=======================================================")
            print(f" 🚀 GitHub & HuggingFace Stars, Trending Hub")
            print(f" 🌐 Dashboard: http://127.0.0.1:{candidate_port}")
            print(f"=======================================================\n")
            if open_browser:
                webbrowser.open(f"http://127.0.0.1:{candidate_port}")
            httpd.serve_forever()
            break
        except OSError as e:
            if "Address already in use" in str(e) or e.errno in (48, 98, 10048):
                continue
            raise e

if __name__ == '__main__':
    open_b = '--no-browser' not in sys.argv
    run_server(port=5000, open_browser=open_b)
