/* Five classroom data sets. Every coefficient is fictional. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./solver.js'));
  else root.QuestModels = factory(root.EcoFair);
})(globalThis, function (EcoFair) {
  'use strict';

  function resource(name, unit, x, y, limit, editable = true) {
    return { name, unit, x, y, limit, editable };
  }

  function goal(name, unit, x, y, target, scale) {
    return { name, unit, x, y, target, scale };
  }

  const models = {
    fair: {
      name: 'Eco Fair',
      title: 'Campus eco fair',
      theme: 'fair',
      purpose: 'Produce reclaimed-paper bookmarks and notebooks for a school stall. Balance fundraising surplus and paper reuse.',
      products: ['Bookmark batches', 'Notebook batches'],
      detail: 'Each batch contains 10 items. The model assumes all products sell and excludes wages from surplus.',
      resources: [
        resource('Cost', 'HKD', 20, 30, 260),
        resource('Production effort', 'person-hours', 1, 2, 16),
        resource('Display space', 'batches', 1, 1, 10, false),
        resource('Paper stock', 'sheets', 20, 60, 600, false)
      ],
      goals: [goal('Funds', 'HKD', 30, 40, 360, 40), goal('Paper reuse', 'sheets', 20, 60, 480, 40)]
    },
    garden: {
      name: 'Berry Garden',
      title: 'A garden for two goals',
      theme: 'garden',
      purpose: 'Bulbasaur helps plan Oran and Pecha Berry beds. Balance harvest and habitat while sharing water, care time and space.',
      products: ['Oran Berry beds', 'Pecha Berry beds'],
      detail: 'The estimated harvest and habitat points are classroom assumptions. Real growing conditions would change the coefficients.',
      resources: [
        resource('Water', 'L', 2, 3, 17),
        resource('Care time', 'hours', 3, 1, 15),
        resource('Garden space', 'beds', 1, 1, 7)
      ],
      goals: [goal('Harvest', 'crates', 5, 3, 32, 5), goal('Habitat', 'points', 1, 4, 16, 5)]
    },
    center: {
      name: 'Center Supplies',
      title: 'Pokémon Center supplies',
      theme: 'center',
      purpose: 'Prepare visitor comfort packs and trail packs. Decide how much to emphasise readiness at the Center or on the trail.',
      products: ['Comfort packs', 'Trail packs'],
      detail: 'These are fictional supply packs. Readiness points are modelled estimates assigned by the class.',
      resources: [
        resource('Materials', 'units', 3, 2, 18),
        resource('Packing time', 'time blocks', 2, 3, 18),
        resource('Shelf space', 'packs', 1, 1, 8, false)
      ],
      goals: [goal('Center readiness', 'points', 4, 2, 24, 4), goal('Trail readiness', 'points', 1, 5, 22, 4)]
    },
    field: {
      name: 'Field Survey',
      title: 'A survey of two habitats',
      theme: 'field',
      purpose: 'Choose riverside and woodland survey rounds. Plan for useful photographs and coverage of different habitats.',
      products: ['Riverside rounds', 'Woodland rounds'],
      detail: 'Photo yield and habitat points are forecasts. A later model could use observations from a pilot survey.',
      resources: [
        resource('Survey time', 'minutes', 15, 25, 125),
        resource('Camera battery', 'units', 3, 2, 17),
        resource('Round limit', 'rounds', 1, 1, 7, false)
      ],
      goals: [goal('Useful photos', 'photos', 5, 3, 28, 5), goal('Habitat coverage', 'points', 2, 5, 27, 5)]
    },
    cards: {
      name: 'TCG Club',
      title: 'Pokémon TCG club deck planning',
      theme: 'cards',
      purpose: 'Prepare guided decks and tactics decks for a school club. Count Pokémon, Trainer and Energy cards and decide what practice the club needs most.',
      products: ['Guided decks', 'Tactics decks'],
      detail: 'Each template uses 60 cards. The activity models inventory and fictional practice points. The table gives category totals rather than a playable deck list.',
      resources: [
        resource('Trainer cards', 'cards', 24, 32, 180),
        resource('Energy cards', 'cards', 18, 12, 112),
        resource('Pokémon cards', 'cards', 18, 16, 145),
        resource('Deck boxes', 'boxes', 1, 1, 8, false)
      ],
      goals: [goal('Beginner practice', 'points', 5, 2, 29, 5), goal('Tactics practice', 'points', 2, 6, 30, 5)]
    }
  };

  const defaults = (id) => models[id].resources.map(({ limit }) => limit);
  const dot = (entry, x, y) => entry.x * x + entry.y * y;

  function evaluate(model, x, y, limits, weights) {
    const resources = model.resources.map((entry) => dot(entry, x, y));
    const reasons = model.resources.filter((_, index) => resources[index] > limits[index]).map(({ name }) => name);
    const values = model.goals.map((entry) => dot(entry, x, y));
    const shortfalls = model.goals.map(({ target }, i) => Math.max(0, target - values[i]));
    const scaled = model.goals.map(({ scale }, i) => shortfalls[i] / scale);
    const score = scaled[0] * weights[0] + scaled[1] * weights[1];
    return { x, y, resources, reasons, values, shortfalls, scaled, score, feasible: reasons.length === 0 };
  }

  function solve(id, limits = defaults(id), weights = [1, 1]) {
    const model = models[id];
    if (limits.length !== model.resources.length || limits.some((n) => !Number.isInteger(n) || n < 0 || n > 1000))
      throw new Error('Enter a whole number from 0 to 1,000 for each resource limit.');
    if (model.resources.some((entry, i) => !entry.editable && limits[i] !== entry.limit))
      throw new Error('Fixed resource limits must match the scenario.');
    if (weights.length !== 2 || weights.some((n) => !Number.isInteger(n) || n < 0 || n > 20))
      throw new Error('Enter whole-number weights from 0 to 20.');
    if (weights.every((n) => n === 0)) throw new Error('At least one weight must be greater than zero.');
    let candidates = [];
    if (id === 'fair') {
      const original = EcoFair.solve({
        budget: limits[0], hours: limits[1], maxBatches: limits[2], profitWeight: weights[0], paperWeight: weights[1]
      });
      candidates = original.candidates.map((plan) => ({
        x: plan.x, y: plan.y, resources: [plan.cost, plan.effort, plan.x + plan.y, plan.paper],
        reasons: plan.reasons, values: [plan.profit, plan.paper],
        shortfalls: [plan.profitDeficit, plan.paperDeficit], scaled: [plan.profitUnits, plan.paperUnits],
        score: plan.score, feasible: plan.feasible
      }));
    } else {
      for (let x = 0; x <= 8; x++) {
        for (let y = 0; y <= 8; y++) candidates.push(evaluate(model, x, y, limits, weights));
      }
    }
    const feasible = candidates.filter((plan) => plan.feasible);
    const bestScore = Math.min(...feasible.map((plan) => plan.score));
    const winners = feasible.filter((plan) => Math.abs(plan.score - bestScore) <= 1e-9);
    return {
      model, limits, weights, candidates, feasible, bestScore, winners,
      goalsJointlyAchievable: feasible.some((plan) => plan.shortfalls.every((gap) => gap === 0))
    };
  }
  return { models, defaults, solve };
});
