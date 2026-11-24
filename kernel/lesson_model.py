"""Eco Quest's weighted goal program, using only Python's standard library.

Run this file to see the campus fair solution. Import solve() to try another
mission or algorithm. Both counts are whole numbers. Their sum cannot exceed
that mission’s display, bed, shelf, round or box capacity.
"""
from collections import namedtuple
from fractions import Fraction

Resource = namedtuple('Resource', 'name unit x y limit')
Goal = namedtuple('Goal', 'name unit x y target scale')
Mission = namedtuple('Mission', 'capacity_index resources goals')

# Each x or y coefficient is the amount used or produced by one batch.
MISSIONS = {
    'fair': Mission(2,
        [Resource('Cost', 'HKD', 20, 30, 260),
         Resource('Production effort', 'person-hours', 1, 2, 16),
         Resource('Display space', 'batches', 1, 1, 10),
         Resource('Paper stock', 'sheets', 20, 60, 600)],
        [Goal('Funds', 'HKD', 30, 40, 360, 40),
         Goal('Paper reuse', 'sheets', 20, 60, 480, 40)]),
    'garden': Mission(2,
        [Resource('Water', 'L', 2, 3, 17),
         Resource('Care time', 'hours', 3, 1, 15),
         Resource('Garden space', 'beds', 1, 1, 7)],
        [Goal('Harvest', 'crates', 5, 3, 32, 5),
         Goal('Habitat', 'points', 1, 4, 16, 5)]),
    'center': Mission(2,
        [Resource('Materials', 'units', 3, 2, 18),
         Resource('Packing time', 'time blocks', 2, 3, 18),
         Resource('Shelf space', 'packs', 1, 1, 8)],
        [Goal('Center readiness', 'points', 4, 2, 24, 4),
         Goal('Trail readiness', 'points', 1, 5, 22, 4)]),
    'field': Mission(2,
        [Resource('Survey time', 'minutes', 15, 25, 125),
         Resource('Camera battery', 'units', 3, 2, 17),
         Resource('Round limit', 'rounds', 1, 1, 7)],
        [Goal('Useful photos', 'photos', 5, 3, 28, 5),
         Goal('Habitat coverage', 'points', 2, 5, 27, 5)]),
    'cards': Mission(3,
        [Resource('Trainer cards', 'cards', 24, 32, 180),
         Resource('Energy cards', 'cards', 18, 12, 112),
         Resource('Pokémon cards', 'cards', 18, 16, 145),
         Resource('Deck boxes', 'boxes', 1, 1, 8)],
        [Goal('Beginner practice', 'points', 5, 2, 29, 5),
         Goal('Tactics practice', 'points', 2, 6, 30, 5)])
}


def settings(part, level):
    if part not in MISSIONS:
        raise ValueError('Unknown mission.')
    if type(level) is not int or level not in (0, 1, 2):
        raise ValueError('level must be 0, 1 or 2.')
    mission = MISSIONS[part]
    limits = [resource.limit for resource in mission.resources]
    if level == 2:
        # In all five missions the first resource can be increased by 20%.
        limits[0] += (limits[0] + 4) // 5
    weights = [3, 1] if level == 1 else [1, 1]
    return mission, limits, weights


def goal_penalty(goal, weight, x, y):
    """Turn the unmet part of one goal into penalty points."""
    value = goal.x * x + goal.y * y
    gap = max(0, goal.target - value)
    penalty = Fraction(weight * gap, goal.scale)
    return value, gap, penalty


def step(part, level, x, y):
    """Follow a single pair through its resource guard and goal calculation."""
    mission, limits, weights = settings(part, level)
    max_count = limits[mission.capacity_index]
    if any(type(n) is not int or not 0 <= n <= max_count for n in (x, y)):
        raise ValueError('x and y must be integers from 0 to {}.'.format(max_count))

    resources = []
    for resource, limit in zip(mission.resources, limits):
        used = resource.x * x + resource.y * y
        resources.append(dict(name=resource.name, unit=resource.unit,
                              coefX=resource.x, coefY=resource.y,
                              used=used, limit=limit, ok=used <= limit))
    feasible = all(resource['ok'] for resource in resources)
    result = dict(part=part, level=level, x=x, y=y, feasible=feasible,
                  resources=resources, weights=weights, goals=[], gaps=[], score=None)
    if not feasible:
        return result

    score = Fraction(0)
    for goal, weight in zip(mission.goals, weights):
        value, gap, penalty = goal_penalty(goal, weight, x, y)
        score += penalty
        result['gaps'].append(gap)
        result['goals'].append(dict(name=goal.name, unit=goal.unit,
                                    coefX=goal.x, coefY=goal.y, value=value,
                                    target=goal.target, gap=gap, weight=weight,
                                    scale=goal.scale, penalty=float(penalty)))
    # The exact sum is converted once for JSON. Equal rational sums become
    # identical numbers, so distinct plans can correctly share first place.
    result['score'] = float(score)
    return result


def solve(part='fair', level=0, method='enumeration'):
    """Search every pair or visit row endpoints and recover tied neighbours."""
    mission, limits, weights = settings(part, level)
    if method not in ('enumeration', 'rows'):
        raise ValueError('method must be enumeration or rows.')
    trace = []
    winners = []
    best = None
    feasible_count = 0

    def visit(x, y, bounds=None):
        nonlocal best, winners
        score = step(part, level, x, y)['score'] if y is not None else None
        if score is not None:
            if best is None or score < best:
                best = score
                winners = [[x, y]]
            elif score == best:
                winners.append([x, y])
        frame = dict(step=len(trace) + 1, x=x, y=y, feasible=score is not None,
                     score=score, bestSoFar=best)
        if bounds is not None:
            frame['bounds'] = bounds
        trace.append(frame)
        return frame['feasible']

    max_count = limits[mission.capacity_index]
    for x in range(max_count + 1):
        if method == 'enumeration':
            for y in range(max_count + 1):
                if visit(x, y):
                    feasible_count += 1
        else:
            # All resource coefficients of y in these missions are positive.
            bounds = []
            for resource, limit in zip(mission.resources, limits):
                remaining = limit - resource.x * x
                bounds.append(remaining // resource.y if remaining >= 0 else -1)
            last_y = min([max_count] + bounds)
            feasible_count += last_y + 1
            visit(x, last_y if last_y >= 0 else None, bounds)

    if method == 'rows':
        # Increasing y never increases a shortfall here. A row's endpoint has
        # its lowest score; neighbouring points may tie that score as well.
        endpoints = winners
        winners = []
        for x, last_y in endpoints:
            for y in range(last_y, -1, -1):
                if step(part, level, x, y)['score'] != best:
                    break
                winners.append([x, y])
        winners.sort()
    return dict(part=part, level=level, method=method, limits=limits,
                weights=weights, maxCount=max_count, bestScore=best, winners=winners,
                feasibleCount=feasible_count, trace=trace)


if __name__ == '__main__':
    answer = solve()
    print('Minimum:', answer['bestScore'], 'Winning pairs:', answer['winners'])
    for pair in ((1, 8), (2, 7)):
        check = step('fair', 0, *pair)
        print(pair, 'score:', check['score'] if check['feasible'] else 'skipped')
