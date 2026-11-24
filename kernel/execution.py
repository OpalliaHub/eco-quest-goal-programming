"""A read-only classroom debugger for one visit in the real Python search."""
from functools import lru_cache
from linecache import getline
import sys

from lesson_model import goal_penalty, solve, step


@lru_cache(maxsize=96)
def execution_trace(part, level, method, number):
    """Record selected executed source lines and their resulting values.

    Python emits a line event before running it. On the *next* event we can
    read the values assigned by that line. Only the selected visit and its
    two teaching functions are observed, on the current request thread.
    """
    events = []
    pending = {}
    active = None
    previous_best = None
    decision_line = None
    conclusion = {}
    model_file = solve.__code__.co_filename

    def add(kind, frame, lineno, values, code=None):
        events.append(dict(kind=kind, function=frame.f_code.co_name, line=lineno,
                           code=code or getline(model_file, lineno).strip(), values=values))

    def observe(frame, event, arg):
        nonlocal active, previous_best, decision_line
        name = frame.f_code.co_name
        if event == 'call':
            if name == 'visit' and frame.f_code.co_filename == model_file:
                if len(frame.f_locals['trace']) + 1 != number:
                    return None
                active = frame
                loc = frame.f_locals
                previous_best = loc['best']
                values = dict(x=loc['x'], y=loc['y'], best=previous_best)
                if loc.get('bounds') is not None:
                    values['bounds'] = loc['bounds']
                add('visit', frame, frame.f_code.co_firstlineno, values)
                return observe
            if active is not None and frame.f_code in (step.__code__, goal_penalty.__code__):
                return observe
            return None
        if event not in ('line', 'return'):
            return observe

        loc = frame.f_locals
        lineno = pending.pop(id(frame), None)
        if lineno is not None:
            source = getline(model_file, lineno).strip()
            if name == 'step':
                if source.startswith('used = resource.x'):
                    add('resource', frame, lineno, dict(resource=loc['resource'].name,
                        used=loc['used'], limit=loc['limit'], ok=loc['used'] <= loc['limit']))
                elif source.startswith('feasible = all('):
                    add('guard', frame, lineno, dict(feasible=loc['feasible']))
                elif source == 'return result' and not loc['feasible']:
                    add('reject', frame, lineno, dict(score=None))
                elif source == 'score += penalty':
                    add('sum', frame, lineno, dict(score=float(loc['score'])))
            elif name == 'goal_penalty' and source.startswith('penalty = Fraction('):
                # These three consecutive model lines form one arithmetic step.
                start = lineno - 2
                code = '\n'.join(getline(model_file, i).strip() for i in range(start, lineno+1))
                goal = loc['goal']
                add('goal', frame, start, dict(goal=goal.name, value=loc['value'],
                    target=goal.target, gap=loc['gap'], weight=loc['weight'],
                    scale=goal.scale, penalty=float(loc['penalty'])), code)
            elif frame is active:
                if source == 'if score is not None:':
                    decision_line = ('skip', lineno)
                elif source == 'winners = [[x, y]]':
                    decision_line = ('lower', lineno)
                elif source == 'elif score == best:':
                    decision_line = ('keep', lineno)
                elif source == 'winners.append([x, y])':
                    decision_line = ('tie', lineno)
        if event == 'line':
            pending[id(frame)] = frame.f_lineno
        elif frame is active:
            decision, line = decision_line
            conclusion.update(decision=decision, before=previous_best, after=loc['best'],
                              score=loc['score'], x=loc['x'], y=loc['y'])
            add('decision', frame, line, dict(conclusion))
            active = None
        return observe

    old = sys.gettrace()
    try:
        sys.settrace(observe)
        search = solve(part, level, method)
    finally:
        sys.settrace(old)
    if not events:
        raise ValueError('Step lies outside the selected search.')
    return dict(part=part, level=level, method=method, step=number,
                total=len(search['trace']), source='lesson_model.py', events=events,
                result=conclusion)
