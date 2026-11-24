"""Independent checks from the classroom task sheets. Run with Python 3.

Each feasible set is constructed from the total number of items first, then
split into two products. This avoids repeating either production algorithm.
Use --url with the base path of a running classroom to check its public API.
"""
import argparse
from collections import Counter
from fractions import Fraction
import json
from pathlib import Path
import sys
from urllib.parse import urlencode
from urllib.request import urlopen

# In each row: total capacity, then (use per x, use per y, stock) for other
# resources, then (yield per x, yield per y, target, normalization scale).
TASKS = {
    'fair': (10, [(20,30,260), (1,2,16), (20,60,600)], [(30,40,360,40), (20,60,480,40)]),
    'garden': (7, [(2,3,17), (3,1,15)], [(5,3,32,5), (1,4,16,5)]),
    'center': (8, [(3,2,18), (2,3,18)], [(4,2,24,4), (1,5,22,4)]),
    'field': (7, [(15,25,125), (3,2,17)], [(5,3,28,5), (2,5,27,5)]),
    'cards': (8, [(24,32,180), (18,12,112), (18,16,145)], [(5,2,29,5), (2,6,30,5)]),
}


def reference(task, level):
    capacity, supplies, goals = TASKS[task]
    supplies = list(supplies)
    weights = (3, 1) if level == 1 else (1, 1)
    if level == 2:
        a, b, stock = supplies[0]
        supplies[0] = a, b, (6 * stock + 4) // 5
    scores = {}
    for total in range(capacity + 1):
        for y in range(total + 1):
            x = total - y
            if any(a*x + b*y > stock for a,b,stock in supplies):
                continue
            scores[x, y] = sum(Fraction(w * max(0, goal-a*x-b*y), scale)
                               for w,(a,b,goal,scale) in zip(weights, goals))
    return scores


def endpoints(public):
    if public:
        def request(route, **params):
            address = public.rstrip('/') + '/api/' + route + '?' + urlencode(params)
            with urlopen(address, timeout=15) as reply:
                return json.load(reply)
        return request
    sys.path.insert(0,str(Path(__file__).resolve().parents[1] / 'kernel'))
    from server import response
    def local(route, **params):
        code, _, body = response('/api/'+route+'?'+urlencode(params))
        assert code == 200, body
        return json.loads(body)
    return local


def verify(request):
    records = []
    for task, (capacity,_,_) in TASKS.items():
        for level in range(3):
            scores = reference(task, level)
            minimum = min(scores.values())
            winners = sorted(k for k, v in scores.items() if v == minimum)
            bands = Counter(scores.values())
            report = None
            for method in ('enumeration','rows'):
                report = request('solve',part=task,level=level,method=method)
                frames = report['trace']
                count = (capacity+1)**2 if method == 'enumeration' else capacity+1
                assert len(frames) == count, (task,level,method,'search size')
                assert report['feasibleCount'] == len(scores), (task,level,'feasible count')
                assert report['winners'] == [list(p) for p in winners], (task,level,'winning pairs')
                assert report['bestScore'] == float(minimum), (task,level,'minimum')
                assert report['distribution'] == [
                    {'score':float(value), 'plans':bands[value]} for value in sorted(bands)]
                best = None
                for idx, frame in enumerate(frames):
                    x, y = frame['x'], frame['y']
                    if method == 'enumeration':
                        assert (x,y) == divmod(idx,capacity+1)
                    else:
                        possible = [b for a,b in scores if a == idx]
                        assert (x,y) == (idx,max(possible) if possible else None)
                    score = scores.get((x,y))
                    assert frame['feasible'] == (score is not None)
                    assert frame['score'] == (float(score) if score is not None else None)
                    if score is not None:
                        best = score if best is None else min(best,score)
                    assert frame['bestSoFar'] == (float(best) if best is not None else None)
            records.append(dict(part=task,level=level+1,limits=report['limits'],
                                weights=report['weights'],maxCount=capacity,
                                candidates=(capacity+1)**2,feasible=len(scores),
                                bestScore=float(minimum),winners=[list(p) for p in winners]))
    for x,y in [(0,0),(9,0),(9,1),(10,0),(10,1),(0,10),(1,8),(2,7)]:
        step=request('step',part='fair',level=0,x=x,y=y)
        expected=reference('fair',0).get((x,y))
        assert step['score'] == (float(expected) if expected is not None else None)
    assert sum(r['candidates'] for r in records)==1233
    return records


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',help='Classroom base URL; omit to test the local source')
    args=parser.parse_args()
    print(json.dumps({'modelSettings':verify(endpoints(args.url))},indent=2))
