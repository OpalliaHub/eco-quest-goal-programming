"""Confirm that the classroom debugger reports only executed model branches."""
import json
from pathlib import Path
import unittest

from execution import execution_trace
from lesson_model import MISSIONS, solve
from server import response


class ExecutionTests(unittest.TestCase):
    def test_legal_tied_and_over_limit_plans(self):
        legal = execution_trace('fair', 0, 'enumeration', 30)
        goals = [e['values'] for e in legal['events'] if e['kind'] == 'goal']
        self.assertEqual([(g['gap'],g['penalty']) for g in goals],[(20,.5),(20,.5)])
        self.assertEqual(legal['result'],dict(x=2,y=7,before=1,after=1,decision='tie',score=1))
        skipped = execution_trace('fair', 0, 'enumeration', 20)
        kinds = [e['kind'] for e in skipped['events']]
        self.assertIn('reject', kinds)
        self.assertNotIn('goal', kinds)
        self.assertNotIn('sum', kinds)
        self.assertIsNone(skipped['result']['score'])
        rejected = [e['values']['resource'] for e in skipped['events']
                    if e['kind']=='resource' and not e['values']['ok']]
        self.assertEqual(rejected, ['Production effort'])
        old_best = execution_trace('fair', 0, 'enumeration', 111)['result']
        self.assertEqual((old_best['decision'], old_best['score'], old_best['after']),('keep',8.5,1))
        self.assertEqual(execution_trace('fair',0,'enumeration',1)['result']['decision'],'lower')

    def test_recorded_lines_are_in_published_source(self):
        lines=Path(__file__).with_name('lesson_model.py').read_text(encoding='utf-8').splitlines()
        for mission in MISSIONS:
            for method in ('rows','enumeration'):
                search=solve(mission,0,method)
                for n in (1,len(search['trace'])):
                    events=execution_trace(mission,0,method,n)['events']
                    for e in events:
                        for off,code in enumerate(e['code'].splitlines()):
                            self.assertEqual(lines[e['line']-1+off].strip(),code)
                    self.assertEqual(events[-1]['values']['after'],search['trace'][n-1]['bestSoFar'])
        empty=execution_trace('center',0,'rows',9)
        self.assertIsNone(empty['result']['y'])
        self.assertEqual([e['kind'] for e in empty['events']], ['visit','decision'])

    def test_http_boundary_and_invalid_arguments(self):
        status,_,body=response('/api/execution?part=fair&level=0&method=enumeration&step=111')
        self.assertEqual(status,200)
        self.assertEqual(json.loads(body)['result']['x'],10)
        for query in ('step=0','step=122','method=rows&step=12','method=bad','step=1&step=2'):
            self.assertEqual(response('/api/execution?'+query)[0],400)
