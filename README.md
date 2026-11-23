# Eco Quest

An interactive goal-programming classroom project for high-school learners, developed for INT6064.

## Join the class demonstration

Try the [English campus fair coding lesson](http://120.77.58.145/eco-quest/?lang=en#part/fair/code). The seven-minute presentation includes a live block repair and a hand calculation. Use the [PowerPoint presentation](classroom/eco-quest-presentation.pptx) or the [projector PDF](classroom/eco-quest-presentation.pdf).

## Run the Python classroom

From the project directory, with Python 3 and its standard SQLite module available:

```sh
python3 kernel/server.py --classroom
```

Open [the fair reference lesson on this computer](http://127.0.0.1:8766/?lang=en#part/fair/algorithm/2/7). The local server supplies the lesson, its API and the chart. Opening `index.html` directly runs the offline browser version, including the editable block program.

| Component | Classroom use |
| --- | --- |
| JavaScript, `studio-engine.js` | Executes the student's ordered blocks, including incorrect instructions. Saves predictions and test runs in the browser. |
| Python, `kernel/lesson_model.py` | Checks resource limits and scores feasible plans with weighted shortfalls. Exhaustive search and row bounds both retain tied winners. |
| Python, `kernel/chart.py` | Draws an SVG from the chosen search trace. The line records the lowest eligible score reached by that step. |
| SQL, `kernel/score_distribution.sql` | Groups feasible plans by score in a temporary SQLite database. At the equal-weight fair, the minimum group contains three of 57 feasible plans. |
| HTTP, JSON and SVG | Carry the reference calculations and chart to the bilingual lesson. Student-authored programs run separately from the reference. |

Inspect the worked responses [for the 17-hour plan](http://127.0.0.1:8766/api/step?part=fair&level=0&x=1&y=8) and [for the 16-hour plan](http://127.0.0.1:8766/api/step?part=fair&level=0&x=2&y=7). To see the implementation, open the [Python model](kernel/lesson_model.py) and [SQL grouping query](kernel/score_distribution.sql). Run the kernel tests from this directory with `python3 -m unittest discover -s kernel`. Node.js enables the cross-language tests against the offline reference.

## Learning activities

The bilingual Academy offers 15 modelling activities across five parts, with foundation, intermediate and challenge settings in each part.

- Campus Eco Fair balances fundraising and paper reuse.
- Berry Garden balances harvest and habitat.
- Pokémon Center Supplies balances two kinds of readiness.
- Field Survey balances useful photos and habitat coverage.
- TCG Deck Workshop balances beginner and tactics practice.

Students predict a plan, check resources, add or remove units, inspect the search and explain a recommendation. Each mission can export its evidence as JSON. Prediction and reflection text stay in memory until exported. Switching activities resets that activity's current input. Language preference is stored locally when browser storage is available.

The card battle has three playable starting conditions. The foundation state starts with one Lightning Energy attached. The intermediate state starts with none. The challenge state starts with one attached Lightning, one Lightning in hand and an empty Lightning reserve. Its winning line requires using the Water Energy, creating an unavoidable conflict with the Water preservation goal.

## Algorithm

The visualiser enumerates every integer pair (x, y) in {0, …, 8}². It rejects hard-constraint violations, calculates nonnegative target shortfalls, divides them by the scenario's declared scales, and minimises their weighted sum. All numerical ties within 1e-9 are retained. Scales are classroom modelling choices. Changing a weight changes preferences, while changing a resource limit changes feasibility.

Row bounds provide a second exact method. For each x, divide each remaining resource by its per-y use and round down. The smallest bound gives the largest feasible y. Both goal outputs increase with y, so the endpoint minimises the score on that row. In a winning row, scan backwards while the score stays tied. This reasoning depends on nonnegative yields, weights and resource costs.

The chart plots feasible candidate scores and the running minimum. Use Previous, Next, Play, Pause or Finish. Foundation includes a paper-and-pencil proof for the fair and a guided AND/OR debugging check. LaTeX is rendered offline with bundled KaTeX.

## Languages and scope

The Academy tasks and algorithm explanation support English and Simplified Chinese. Common controls in the original missions are translated too. Some extended narrative feedback and historical logs in the original activities remain in English. Card scans retain the language printed on the original images.

All coefficients are fictional classroom assumptions. The card drill is a fixed mid-match teaching abstraction with attack costs, damage and one manual Energy attachment per turn. It omits draws, the Bench, Prize cards and Weakness. The activity is not a full Pokémon TCG rules engine.

## Validation

The 15 settings were checked for 81 candidates and at least one optimum. Battle action sequences were enumerated to verify a winning line for all three starting states and the unavoidable Water shortfall in the challenge state. Browser checks cover Chinese switching, step-by-step tracing and the three tied Eco Fair optima with score 1. These are software checks, not evidence of classroom learning gains.

## License and assets

Original application code is released under the MIT License. Pokémon names, artwork and card images belong to their respective rights holders and are excluded from that code license. See ASSET_CREDITS.txt for individual sources and teaching-rule scope. This is an unofficial educational fan project. Users distributing third-party images must consider the applicable permissions.

## Student coding studio

Choose **Start the one-block lesson** on the homepage for a guided prediction, one missing resource check and two test cases. A [bilingual illustrated teacher walkthrough](first-lesson.html) includes a five-minute classroom script. Save the guided record before reloading. For independent block construction, choose **Open full editor**. The four drawers cover picking a plan, checking supplies, scoring gaps and keeping winners. Drag an instruction to a dotted line, or move a whole module by its heading. Keyboard users can select a destination, then a library instruction, or select an existing heading and then its destination. Undo restores the last edit. After running, step through the instructions actually executed for the selected pair. In that editor, Foundation starts with a running program that accepts over-budget or overtime plans. Insert an executable guard, test a prediction and inspect the first failing pair. Intermediate introduces incorrect weighting and drops tied solutions. Challenge opens an empty workspace and exposes an accumulator so learners can add each goal's penalty separately. The interpreter runs student blocks on raw mission data. The reference search checks their predictions and outputs. Reloading the same browser restores drafts where local storage is available. Export each student's JSON before clearing a shared device. Run `node studio-checks.cjs` for the interpreter and cross-scenario checks.
