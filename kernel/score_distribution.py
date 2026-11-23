"""Use SQL to count feasible plans at each penalty, including ties."""
from contextlib import closing
from functools import lru_cache
from pathlib import Path
import sqlite3

from lesson_model import solve

GROUP_BY_SCORE = Path(__file__).with_name('score_distribution.sql').read_text(encoding='utf-8')


@lru_cache(maxsize=15)
def score_distribution(part, level):
    # Count all pairs even when the plot is displaying only nine row endpoints.
    search = solve(part, level, 'enumeration')
    with closing(sqlite3.connect(':memory:')) as db:
        db.execute('CREATE TABLE candidates (x INTEGER, y INTEGER, score REAL)')
        db.executemany('INSERT INTO candidates VALUES (?, ?, ?)',
                       ((row['x'], row['y'], row['score']) for row in search['trace']))
        return [dict(score=score, plans=count) for score, count in db.execute(GROUP_BY_SCORE)]
