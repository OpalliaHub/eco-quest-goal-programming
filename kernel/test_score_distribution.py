import unittest

from lesson_model import MISSIONS, solve
from score_distribution import score_distribution


class ScoreDistributionTests(unittest.TestCase):
    def test_distribution_accounts_for_every_feasible_plan_and_every_winner(self):
        for part in MISSIONS:
            for level in range(3):
                with self.subTest(part=part, level=level):
                    reference = solve(part, level, 'rows')
                    bands = score_distribution(part, level)
                    self.assertEqual(sum(band['plans'] for band in bands), reference['feasibleCount'])
                    self.assertEqual(bands[0], dict(score=reference['bestScore'],
                                                   plans=len(reference['winners'])))
                    scores = [band['score'] for band in bands]
                    self.assertEqual(scores, sorted(set(scores)))

    def test_weights_change_the_fair_winner_count(self):
        self.assertEqual(score_distribution('fair', 0)[0], dict(score=1.0, plans=3))
        self.assertEqual(score_distribution('fair', 1)[0], dict(score=1.0, plans=1))


if __name__ == '__main__':
    unittest.main()
