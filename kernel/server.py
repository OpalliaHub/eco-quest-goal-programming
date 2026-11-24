"""Read-only HTTP service for Eco Quest. Run: python3 kernel/server.py"""
import argparse
import json
import mimetypes
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from socketserver import ThreadingMixIn
from urllib.parse import parse_qsl, unquote, urlsplit

from chart import score_chart
from lesson_model import MISSIONS, settings, solve, step
from score_distribution import score_distribution

JSON_TYPE = 'application/json; charset=utf-8'
SOURCE = Path(__file__).with_name('lesson_model.py')
SQL = SOURCE.with_name('score_distribution.sql')
FIELDS = {'health': (), 'source.py': (), 'source.sql': (), 'solve': ('part', 'level', 'method'),
          'step': ('part', 'level', 'x', 'y'),
          'chart.svg': ('part', 'level', 'method', 'lang', 'step')}


def integer(value, name, low, high):
    if not re.fullmatch(r'[0-9]{1,3}', value) or not low <= int(value) <= high:
        raise ValueError('{} must be an integer from {} to {}.'.format(name, low, high))
    return int(value)


def json_body(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False,
                      separators=(',', ':')).encode('utf-8')


class ClassroomSite:
    """Serve the teaching page and its assets from a verified site directory."""
    def __init__(self, root):
        self.root = root.resolve()
        index = (self.root / 'index.html').read_text(encoding='utf-8')
        self.pages = {'index.html', 'first-lesson.html'}
        self.pages.update(re.findall(r'(?:src|href)="([\w-]+\.(?:js|css))(?:\?[^"]*)?"', index))

    def response(self, path):
        name = unquote(path[1:]) or 'index.html'
        sources = {'kernel/lesson_model.py': SOURCE, 'kernel/score_distribution.sql': SQL}
        if name in sources:
            return 200, 'text/plain; charset=utf-8', sources[name].read_bytes()
        segments = name.split('/')
        if any(not piece or piece.startswith('.') or '\\' in piece for piece in segments):
            return None
        suffix = Path(name).suffix
        is_asset = segments[0] == 'assets' and suffix in ('.png', '.jpg', '.webp', '.gif')
        is_math = segments[:2] == ['vendor', 'katex'] and suffix in (
            '.css', '.js', '.woff', '.woff2', '.ttf')
        if name not in self.pages and not is_asset and not is_math:
            return None
        file = (self.root / name).resolve()
        if self.root not in file.parents or not file.is_file():
            return None
        mime = {'js': 'text/javascript', 'css': 'text/css', 'html': 'text/html'}
        kind = mime.get(suffix[1:]) or mimetypes.guess_type(str(file))[0] or 'application/octet-stream'
        return 200, kind, file.read_bytes()


def response(target, site=None):
    if len(target) > 1024:
        return 414, JSON_TYPE, json_body({'error': 'Request target is too long.'})
    try:
        url = urlsplit(target)
        route = url.path[5:] if url.path.startswith('/api/') else url.path[1:]
        if route not in FIELDS and site and url.path.startswith('/') and not url.netloc:
            static = site.response(url.path)
            if static:
                return static
        if not url.path.startswith('/') or url.netloc or route not in FIELDS:
            return 404, JSON_TYPE, json_body({'error': 'Unknown endpoint.'})
        pairs = parse_qsl(url.query, keep_blank_values=True, strict_parsing=True) if url.query else []
        query = dict(pairs)
        if len(pairs) != len(query) or set(query) - set(FIELDS[route]):
            raise ValueError('Unknown or repeated query parameter.')
        if route == 'health':
            return 200, JSON_TYPE, json_body(dict(ok=True, engine='python', version=1))
        if route in ('source.py', 'source.sql'):
            source = SOURCE if route == 'source.py' else SQL
            return 200, 'text/plain; charset=utf-8', source.read_bytes()
        part = query.get('part', 'fair')
        if part not in MISSIONS:
            raise ValueError('Unknown mission.')
        level = integer(query.get('level', '0'), 'level', 0, 2)
        if route == 'step':
            mission, limits, _ = settings(part, level)
            max_count = limits[mission.capacity_index]
            x = integer(query.get('x', ''), 'x', 0, max_count)
            y = integer(query.get('y', ''), 'y', 0, max_count)
            return 200, JSON_TYPE, json_body(step(part, level, x, y))
        result = solve(part, level, query.get('method', 'enumeration'))
        if route == 'solve':
            result['distribution'] = score_distribution(part, level)
            return 200, JSON_TYPE, json_body(result)
        language = query.get('lang', 'en')
        if language not in ('en', 'zh'):
            raise ValueError('lang must be en or zh.')
        total = len(result['trace'])
        count = integer(query.get('step', str(total)), 'step', 1, total)
        return 200, 'image/svg+xml; charset=utf-8', score_chart(result, count, language)
    except ValueError as exc:
        return 400, JSON_TYPE, json_body({'error': str(exc)})


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        status, content_type, body = response(self.path, self.server.site)
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    do_HEAD = do_GET


class ClassroomServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    request_queue_size = 64
    site = None


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8766)
    parser.add_argument('--classroom', action='store_true',
                        help='serve the local site and its API together')
    options = parser.parse_args()
    local_site = None
    if options.classroom:
        parent = SOURCE.resolve().parent.parent
        root = parent if (parent / 'index.html').is_file() else parent / 'site'
        if not (root / 'index.html').is_file():
            parser.error('Place kernel next to index.html or beside the site folder.')
        local_site = ClassroomSite(root)
    server = ClassroomServer(('127.0.0.1', options.port), Handler)
    server.site = local_site
    if local_site:
        print('Open http://127.0.0.1:{}/?lang=en#part/fair/algorithm'.format(
            server.server_port), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
