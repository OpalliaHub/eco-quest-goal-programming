# Eco Quest

An interactive goal-programming classroom project for high-school learners, developed for INT6064.

## Run locally

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. The site uses plain HTML, CSS and JavaScript, with no package installation or backend. It also works under a subdirectory on a static web server.

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

The animation supports single steps, playback, scrubbing, replaying a specific candidate and showing the completed search. Values come from the same solver as the activities. The finite search is exact within the stated domain. It does not demonstrate the simplex method or priority-based lexicographic optimisation.

## Languages and scope

The Academy tasks and algorithm explanation support English and Simplified Chinese. Common controls in the original missions are translated too. Some extended narrative feedback and historical logs in the original activities remain in English. Card scans retain the language printed on the original images.

All coefficients are fictional classroom assumptions. The card drill is a fixed mid-match teaching abstraction with attack costs, damage and one manual Energy attachment per turn. It omits draws, the Bench, Prize cards and Weakness. The activity is not a full Pokémon TCG rules engine.

## Validation

The 15 settings were checked for 81 candidates and at least one optimum. Battle action sequences were enumerated to verify a winning line for all three starting states and the unavoidable Water shortfall in the challenge state. Browser checks cover Chinese switching, replay of a candidate and the three tied Eco Fair optima with score 1. These are software checks, not evidence of classroom learning gains.

## License and assets

Original application code is released under the MIT License. Pokémon names, artwork and card images belong to their respective rights holders and are excluded from that code license. See ASSET_CREDITS.txt for individual sources and teaching-rule scope. This is an unofficial educational fan project. Users distributing third-party images must consider the applicable permissions.
