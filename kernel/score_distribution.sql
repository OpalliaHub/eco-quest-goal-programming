-- Each row is one whole-number plan. A rejected plan has no score.
SELECT score, COUNT(*) AS plans
FROM candidates
WHERE score IS NOT NULL
GROUP BY score
ORDER BY score;
