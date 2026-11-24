"""Run from the site root: python3 -m unittest discover -s kernel -p 'test_*.py'."""
import json
import shutil
import subprocess
import unittest
from xml.etree.ElementTree import fromstring

from lesson_model import MISSIONS, Goal, goal_penalty, solve, step
from server import ClassroomSite, SOURCE, response


class LessonTests(unittest.TestCase):
    def test_boundary_pair_and_skipped_pair(self):
        rejected = step('fair', 0, 1, 8)
        self.assertFalse(rejected['feasible'])
        self.assertEqual([row['name'] for row in rejected['resources']
                          if not row['ok']], ['Production effort'])
        self.assertIsNone(rejected['score'])
        self.assertEqual(rejected['goals'], [])
        legal = step('fair', 0, 2, 7)
        self.assertEqual([row['used'] for row in legal['resources']], [250, 16, 9, 460])
        self.assertEqual(legal['gaps'], [20, 20])
        self.assertEqual(legal['score'], 1)
        self.assertEqual(step('fair', 1, 2, 7)['score'], 2)

    def test_stall_capacity_and_search_indices(self):
        full = solve('fair', 0)
        self.assertEqual((len(full['trace']), full['feasibleCount']), (121, 60))
        for x, y in ((9, 0), (9, 1), (10, 0)):
            self.assertTrue(step('fair', 0, x, y)['feasible'])
        last_bookmarks = step('fair', 0, 10, 0)
        self.assertEqual([r['used'] for r in last_bookmarks['resources']], [200, 10, 10, 200])
        self.assertEqual(last_bookmarks['gaps'], [60, 280])
        self.assertEqual(last_bookmarks['score'], 8.5)
        self.assertEqual(full['trace'][110]['score'], 8.5)
        self.assertEqual([full['trace'][29][key] for key in ('x', 'y', 'score')], [2, 7, 1])
        self.assertFalse(step('fair', 0, 10, 1)['feasible'])
        status, _, result = response('/api/step?part=fair&level=0&x=10&y=0')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(result)['score'], 8.5)

    def test_all_activity_answers_against_resource_bounds(self):
        # Enumerate the triangle x+y<=capacity independently; outside it,
        # every pair violates the capacity inequality. Cross-check every
        # point in the remaining square against that solution.
        from fractions import Fraction
        from lesson_model import settings
        # Hand-checked answer keys (number of eligible pairs, score and all ties).
        tied_fair = [(0, 8), (2, 7), (4, 6)]
        expected = {
            'fair': [(60, 1, tied_fair), (60, 1, [(4, 6)]), (60, 1, tied_fair)],
            'garden': [(26, .6, [(4, 3)]), (26, 1.8, [(4, 3)]), (31, .6, [(4, 3)])],
            'center': [(30, 1, [(3, 4)]), (30, 2.25, [(4, 3)]), (34, 1, [(3, 4)])],
            'field': [(24, 2, [(3, 3)]), (24, 2.4, [(5, 1)]), (28, .4, [(3, 4)])],
            'cards': [(26, 2.6, [(2, 4)]), (26, 3.6, [(6, 0)]), (32, 1.2, [(3, 4)])],
        }
        for part, levels in expected.items():
            for level, (count, minimum, winners) in enumerate(levels):
                with self.subTest(part=part, level=level):
                    mission, limits, weights = settings(part, level)
                    capacity = limits[mission.capacity_index]
                    eligible = {}
                    for x in range(capacity + 1):
                        for y in range(capacity - x + 1):
                            if all(x*r.x + y*r.y <= lim for r, lim in zip(mission.resources, limits)):
                                eligible[x, y] = sum(Fraction(w * max(g.target - x*g.x - y*g.y, 0), g.scale)
                                                     for g, w in zip(mission.goals, weights))
                    optimum = min(eligible.values())
                    self.assertEqual(len(eligible), count)
                    self.assertEqual(float(optimum), minimum)
                    self.assertEqual([p for p, score in eligible.items() if score == optimum], winners)
                    full = solve(part, level)
                    for frame in full['trace']:
                        key = (frame['x'], frame['y'])
                        self.assertEqual(frame['feasible'], key in eligible)
                        self.assertEqual(frame['score'], float(eligible[key]) if key in eligible else None)

    def test_surpluses_have_no_negative_penalty(self):
        value, gap, penalty = goal_penalty(Goal('Test', 'u', 3, 2, 10, 4), 3, 4, 4)
        self.assertEqual((value, gap, penalty), (20, 0, 0))

    def test_all_settings_and_running_minimum(self):
        for part in MISSIONS:
            for level in range(3):
                full = solve(part, level)
                rows = solve(part, level, 'rows')
                for name in ('winners', 'bestScore', 'feasibleCount', 'weights', 'limits'):
                    self.assertEqual(full[name], rows[name])
                capacity = {'fair': 10, 'garden': 7, 'center': 8, 'field': 7, 'cards': 8}[part]
                self.assertEqual(full['maxCount'], capacity)
                self.assertEqual(len(full['trace']), (capacity + 1) ** 2)
                self.assertEqual(len(rows['trace']), capacity + 1)
                for run in (full, rows):
                    best = None
                    for n, frame in enumerate(run['trace'], 1):
                        self.assertEqual(frame['step'], n)
                        if frame['feasible']:
                            best = frame['score'] if best is None else min(best, frame['score'])
                        else:
                            self.assertIsNone(frame['score'])
                        self.assertEqual(frame['bestSoFar'], best)
                    self.assertEqual(best, run['bestScore'])
        self.assertEqual(solve('fair', 0)['winners'], [[0, 8], [2, 7], [4, 6]])

    def test_row_plateau_recovery(self):
        # A zero-target teaching variant makes every feasible point optimal,
        # so it catches a row method that only returns row endpoints.
        from unittest.mock import patch
        mission = MISSIONS['garden']
        flat = mission._replace(goals=[g._replace(target=0) for g in mission.goals])
        with patch.dict(MISSIONS, {'plateau': flat}):
            search = solve('plateau', 0, 'rows')
            self.assertEqual(len(search['winners']), search['feasibleCount'])
            self.assertEqual(search['winners'], solve('plateau', 0)['winners'])


class ApiTests(unittest.TestCase):
    def test_request_validation(self):
        for bad in ('/api/solve?part=missing', '/api/solve?level=3',
                    '/api/solve?level=-1', '/api/solve?level=1.5', '/api/solve?level=',
                    '/api/solve?level=1&level=0', '/api/solve?q=1', '/api/solve?x',
                    '/api/solve?method=other', '/api/step?x=0', '/api/step?x=11&y=1',
                    '/api/chart.svg?step=0', '/api/chart.svg?method=rows&step=12',
                    '/api/chart.svg?lang=other'):
            self.assertEqual(response(bad)[0], 400, bad)
        self.assertEqual(response('/api/' + 'x' * 1100)[0], 414)
        self.assertEqual(response('/api/unknown')[0], 404)

    def test_chart_tracks_current_frame(self):
        svg_namespace = {'s': 'http://www.w3.org/2000/svg'}
        for method, last in [('enumeration', 121), ('rows', 11)]:
            for n in (1, last):
                status, kind, body = response('/api/chart.svg?method={}&step={}&lang=zh'.format(method, n))
                self.assertEqual(status, 200)
                self.assertTrue(kind.startswith('image/svg+xml'))
                root = fromstring(body)
                self.assertIn('{}/{}'.format(n, last), root.find('s:desc', svg_namespace).text.replace(' ', ''))
                result = solve('fair', 0, method)
                points = root.findall("s:circle[@class='candidate']", svg_namespace)
                self.assertEqual(len(points), sum(row['feasible'] for row in result['trace'][:n]))

    def test_read_only_routes_and_download(self):
        for prefix in ('/', '/api/'):
            status, _, body = response(prefix + 'health')
            self.assertEqual(status, 200)
            self.assertEqual(json.loads(body.decode())['engine'], 'python')
            self.assertEqual(response(prefix + 'source.py')[2], SOURCE.read_bytes())
        site_dir = SOURCE.resolve().parent.parent
        if not (site_dir / 'index.html').exists():
            site_dir = site_dir / 'site'
        if not (site_dir / 'index.html').exists():
            self.skipTest('API-only installation.')
        site = ClassroomSite(site_dir)
        self.assertEqual(response('/?lang=en', site)[0], 200)
        for asset in site.pages:
            self.assertEqual(response('/' + asset, site)[0], 200, asset)
        for path in ('/kernel/server.py', '/README.md', '/.git/config',
                     '/assets/%2e%2e/index.html', '/first-lesson.html/../.git/config'):
            self.assertEqual(response(path, site)[0], 404, path)


@unittest.skipUnless(shutil.which('node'), 'Node is only needed for the JS comparison.')
class BrowserParity(unittest.TestCase):
    def test_every_pair_against_both_browser_algorithms(self):
        root = SOURCE.resolve().parent.parent
        if not (root / 'scenarios.js').is_file():
            root = root / 'site'
        if not (root / 'scenarios.js').is_file():
            self.skipTest('API-only installation.')
        program = """
const Q=require('./scenarios.js'), rows=require('./row-search.js'), records=[];
for(const part of Object.keys(Q.models))for(let level=0;level<3;level++){
 const model=Q.models[part], limits=Q.defaults(part), weights=level===1?[3,1]:[1,1];
 if(level===2){const i=model.resources.findIndex(r=>r.editable);limits[i]+=Math.ceil(limits[i]/5);}
 const full=Q.solve(part,limits,weights), bounded=rows(model,limits,weights,Q.evaluate);
 records.push({part,level,limits,weights,feasible:full.feasible.length,minimum:full.bestScore,
   winners:full.winners.map(p=>[p.x,p.y]),rowsMinimum:bounded.best,
   rowsWinners:bounded.winners.map(p=>[p.x,p.y]),rows:bounded.rows.map(r=>[r.x,r.y,r.bounds]),
   candidates:full.candidates.map(p=>[p.x,p.y,p.feasible,p.resources,p.shortfalls,p.score])});
}
process.stdout.write(JSON.stringify(records));
"""
        records = json.loads(subprocess.check_output(['node', '-e', program], cwd=str(root)))
        self.assertEqual(len(records), 15)
        self.assertEqual(sum(len(r['candidates']) for r in records), 1233)
        for case in records:
            part, level = case['part'], case['level']
            full, bounded = solve(part, level), solve(part, level, 'rows')
            self.assertEqual((full['limits'], full['weights']), (case['limits'], case['weights']))
            self.assertEqual(full['feasibleCount'], case['feasible'])
            self.assertEqual(full['winners'], case['winners'])
            self.assertAlmostEqual(full['bestScore'], case['minimum'])
            self.assertEqual(bounded['winners'], sorted(case['rowsWinners']))
            self.assertAlmostEqual(bounded['bestScore'], case['rowsMinimum'])
            self.assertEqual(len(case['candidates']), len(full['trace']))
            self.assertEqual(len(case['rows']), len(bounded['trace']))
            for frame, (x, y, bounds) in zip(bounded['trace'], case['rows']):
                self.assertEqual((frame['x'], frame['y'], frame['bounds']),
                                 (x, y if y >= 0 else None, bounds))
            for x, y, feasible, costs, gaps, score in case['candidates']:
                plan = step(part, level, x, y)
                self.assertEqual(plan['feasible'], feasible)
                self.assertEqual([r['used'] for r in plan['resources']], costs)
                if feasible:
                    self.assertEqual(plan['gaps'], gaps)
                    self.assertAlmostEqual(plan['score'], score)
                else:
                    self.assertIsNone(plan['score'])


if __name__ == '__main__':
    unittest.main()
