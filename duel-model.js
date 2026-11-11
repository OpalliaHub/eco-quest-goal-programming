/* Planning duels use the same feasible pairs and score as the classroom solver. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./scenarios.js'));
  else root.QuestDuel = factory(root.QuestModels);
})(globalThis, function (models) {
  'use strict';

  const add = (label, route) => ({ label, type: 'add', route });
  const swap = (label, route) => ({ label, type: 'swap', route });

  const arenas = {
    fair: {
      title: 'Stall Showdown', field: 'Stall display', palette: 'fair',
      player: 'Pikachu', rival: 'Bulbasaur', rivalGoal: 1,
      brief: 'Build a stall that balances funds and paper reuse. A mixed bundle reserves one batch of each product in a single move.',
      prompt: 'Did the selected budget and effort let both goals hold? Explain one rejected move or tied plan.',
      presets: [
        { label: 'Original stall', limits: [260, 16, 10, 600] },
        { label: 'More budget and effort', limits: [270, 17, 10, 600] }
      ],
      tokens: ['Bookmark', 'Notebook'],
      moves: {
        x: add('Make bookmarks', 'x'), y: add('Make notebooks', 'y'),
        mix: { label: 'Build a mixed bundle', type: 'mix' }
      }
    },
    garden: {
      title: 'Berry Bed Clash', field: 'Garden bed board', palette: 'garden',
      player: 'Bulbasaur', rival: 'Squirtle', rivalGoal: 0,
      brief: 'Plant one bed at a time. Both settings have 20 L of water and 18 care hours. Only the bed permit changes.',
      prompt: 'Explain why the bed permit can change feasibility. Find two plans that meet both targets if the eighth bed opens.',
      presets: [
        { label: 'Seven-bed permit', limits: [20, 18, 7] },
        { label: 'Open the eighth bed', limits: [20, 18, 8] }
      ],
      tokens: ['Oran', 'Pecha'],
      moves: { x: add('Plant Oran', 'x'), y: add('Plant Pecha', 'y') }
    },
    center: {
      title: 'Supply Draft', field: 'Packing shelf', palette: 'center',
      player: 'Squirtle', rival: 'Pikachu', rivalGoal: 1,
      brief: 'Reserve packs on the shelf, or swap one draft pack for the other type. A swap revises your plan and recalculates its resource use.',
      prompt: 'How did a weight change affect the recommended mix? Explain whether it affected feasibility.',
      presets: [
        { label: 'Equal readiness weights', weights: [1, 1] },
        { label: 'Center readiness × 3', weights: [3, 1] }
      ],
      tokens: ['Comfort', 'Trail'],
      moves: {
        x: add('Draft comfort pack', 'x'), y: add('Draft trail pack', 'y'),
        toX: swap('Swap trail for comfort', 'x'), toY: swap('Swap comfort for trail', 'y')
      }
    },
    field: {
      title: 'Survey Route Duel', field: 'Route itinerary', palette: 'field',
      player: 'Pikachu', rival: 'Squirtle', rivalGoal: 0,
      brief: 'Pick one upgrade and schedule your routes. You can reroute the last planned leg before sending out the team.',
      prompt: 'Compare time and battery at equal weights. Which upgrade yields a smaller best score, and which goal still falls short?',
      presets: [
        { label: 'Extra time · 140 min', limits: [140, 17, 7] },
        { label: 'Extra battery · 20 units', limits: [125, 20, 7] }
      ],
      tokens: ['Riverside', 'Woodland'],
      moves: {
        x: add('Schedule riverside', 'x'), y: add('Schedule woodland', 'y'),
        reroute: { label: 'Reroute the last leg', type: 'reroute' }
      }
    }
  };

  function start(id, presetIndex) {
    const arena = arenas[id];
    const preset = arena?.presets[presetIndex];
    if (!preset) throw new Error('Choose a duel and a resource setting.');
    const run = models.solve(id, preset.limits, preset.weights);
    const byPair = new Map(run.candidates.map((plan) => [`${plan.x},${plan.y}`, plan]));
    const rank = arena.rivalGoal;
    const rivalTarget = [...run.feasible].sort((a, b) =>
      b.values[rank] - a.values[rank] || a.score - b.score || a.x - b.x || a.y - b.y
    )[0];
    const types = rank === 0 ? ['x', 'y'] : ['y', 'x'];
    const rivalOrder = types.flatMap((type) => Array(rivalTarget[type]).fill(type));
    const zero = byPair.get('0,0');
    return { arena, preset, presetIndex, run, byPair, order: [], player: zero, rival: zero, rivalOrder, rivalTarget, turn: 0 };
  }

  function count(order) {
    const x = order.filter((type) => type === 'x').length;
    return [x, order.length - x];
  }

  function step(match, action) {
    const move = match.arena.moves[action];
    if (!move) return { reason: 'Choose an arena move.' };
    const order = [...match.order];
    if (move.type === 'add') order.push(move.route);
    if (move.type === 'mix') order.push('x', 'y');
    if (move.type === 'swap') {
      const from = order.lastIndexOf(move.route === 'x' ? 'y' : 'x');
      if (from === -1) return { reason: 'Reserve a pack of that type before swapping.' };
      order[from] = move.route;
    }
    if (move.type === 'reroute') {
      if (!order.length) return { reason: 'Schedule a leg before rerouting.' };
      order[order.length - 1] = order.at(-1) === 'x' ? 'y' : 'x';
    }
    const [x, y] = count(order);
    const plan = match.byPair.get(`${x},${y}`);
    if (!plan) return { reason: `(${x}, ${y}) is outside the whole-number range 0–8.` };
    if (!plan.feasible) {
      const excess = match.run.model.resources.flatMap((resource, i) => {
        const limit = match.run.limits[i];
        return plan.resources[i] > limit ? [`${resource.name} ${plan.resources[i]} > ${limit} ${resource.unit}`] : [];
      });
      return { reason: excess.join(' · ') };
    }
    const turn = match.turn + 1;
    const rival = match.byPair.get(count(match.rivalOrder.slice(0, turn)).join(','));
    return { match: { ...match, order, player: plan, rival, turn }, move };
  }

  function finish(match) {
    const rival = match.rivalTarget;
    const gap = match.player.score - rival.score;
    return {
      player: match.player,
      rival,
      outcome: Math.abs(gap) < 1e-9 ? 'Tie' : gap < 0 ? 'Win' : 'Rival wins',
      optimal: match.run.winners.includes(match.player)
    };
  }

  return { arenas, start, step, finish };
});
