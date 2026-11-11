(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  function node(tag, value, className) {
    const element = document.createElement(tag);
    if (value !== undefined) element.textContent = value;
    if (className) element.className = className;
    return element;
  }
  const pair = ({ x, y }) => `(${x}, ${y})`;
  const number = (n) => Number(n.toFixed(3)).toString();
  const expression = (item) => `${item.x === 1 ? '' : item.x}x + ${item.y === 1 ? '' : item.y}y`;
  const ui = {
    setup: el('arena-setup'),
    preset: el('arena-preset'),
    play: el('arena-play'),
    scene: el('arena-scene'),
    feedback: el('arena-feedback'),
    finish: el('arena-finish')
  };
  let activeId;
  let match;
  let prediction;
  let settlement;
  let pulse;
  let trace = [];

  function renderSetup() {
    const arena = QuestDuel.arenas[activeId];
    const model = QuestModels.models[activeId];
    const preset = arena.presets[Number(ui.preset.value)];
    const limits = preset.limits || QuestModels.defaults(activeId);
    const weights = preset.weights || [1, 1];
    el('arena-variables').textContent = `x = ${model.products[0].toLowerCase()}, y = ${model.products[1].toLowerCase()}.`;
    el('arena-equations').replaceChildren(
      ...model.resources.map((resource, i) => node('li', `${resource.name}: ${expression(resource)} ≤ ${limits[i]} ${resource.unit}`)),
      ...model.goals.map((goal) => node('li', `${goal.name}: ${expression(goal)} ≥ ${goal.target} ${goal.unit}`))
    );
    el('arena-score-rule').textContent = `Score = ${weights[0]} × gap₁ ÷ ${model.goals[0].scale} + ${weights[1]} × gap₂ ÷ ${model.goals[1].scale}. Clamp each gap at zero.`;
  }

  function resetRound() {
    clearTimeout(pulse);
    ui.scene.classList.remove('play', 'block');
    match = undefined;
    settlement = undefined;
    trace = [];
    el('arena-history').replaceChildren();
    ui.setup.hidden = false;
    ui.play.hidden = true;
    ui.finish.hidden = true;
    el('arena-turn').textContent = 'PLAN FIRST';
  }

  function select(id) {
    const arena = QuestDuel.arenas[id];
    el('arena').hidden = !arena;
    el('arena-link').hidden = !arena;
    if (id === activeId) return;
    activeId = id;
    resetRound();
    if (!arena) return;
    ui.setup.reset();
    el('arena-reason').setCustomValidity('');
    el('arena-title').textContent = arena.title;
    el('arena-brief').textContent = arena.brief;
    ui.preset.replaceChildren(...arena.presets.map((preset, i) => {
      const option = node('option', preset.label);
      option.value = i;
      return option;
    }));
    renderSetup();
  }

  function goalMeter(goal, actual, gap) {
    const line = node('div', undefined, 'goal-line');
    const bar = node('progress');
    bar.max = goal.target;
    bar.value = Math.min(actual, goal.target);
    bar.setAttribute('aria-label', goal.name);
    bar.setAttribute('aria-valuetext', `${actual} of ${goal.target} ${goal.unit}`);
    line.append(node('strong', goal.name), node('span', `${actual} / ${goal.target}`), bar,
      node('span', `Gap ${gap} ${goal.unit}`, 'gap'));
    return line;
  }

  function renderRound() {
    const { arena, order, player, rival, run, turn } = match;
    const slotLimit = run.limits[2];
    const visibleSlots = arena.palette === 'garden' ? 8 : slotLimit;
    const labels = { x: arena.tokens[0], y: arena.tokens[1] };
    el('arena-board').replaceChildren(...Array.from({ length: visibleSlots }, (_, i) => {
      const type = order[i];
      if (type) return node('span', labels[type], `arena-slot type-${type}`);
      if (i >= slotLimit) return node('span', 'Closed', 'arena-slot locked');
      return node('span', `${i + 1}`, 'arena-slot');
    }));
    el('arena-turn').textContent = settlement ? 'PLAN LOCKED' : `TURN ${turn + 1}`;
    el('arena-plan').textContent = `Your plan ${pair(player)}`;
    el('arena-resources').replaceChildren(...run.model.resources.flatMap((resource, i) => [
      node('dt', resource.name),
      node('dd', `${player.resources[i]} / ${run.limits[i]} ${resource.unit}`)
    ]));
    el('arena-goals').replaceChildren(...run.model.goals.map((g, i) => goalMeter(g, player.values[i], player.shortfalls[i])));
    el('arena-live-score').textContent = `Your score ${number(player.score)} · Rival ${pair(rival)}`;
    el('arena-lock').disabled = Boolean(settlement) || turn === 0;
    for (const button of el('arena-moves').querySelectorAll('button')) button.disabled = Boolean(settlement);
  }

  function describeMove(arena, move, run) {
    if (move.type === 'swap') return 'Recalculate the resources reserved for both types.';
    if (move.type === 'reroute') return 'Replace the last route and recheck time and battery.';
    const moveResources = run.model.resources.slice(0, 2).map((r) => {
      const use = move.type === 'mix' ? r.x + r.y : r[move.route];
      return `${use} ${r.unit}`;
    });
    return moveResources.join(' · ');
  }

  function announce(text, retry = false) {
    ui.feedback.textContent = text;
    ui.feedback.classList.toggle('retry', retry);
  }

  function effect(style, glyph) {
    clearTimeout(pulse);
    ui.scene.classList.remove('play', 'block');
    void ui.scene.offsetWidth;
    el('arena-impact').textContent = glyph;
    ui.scene.classList.add(style);
    pulse = setTimeout(() => ui.scene.classList.remove(style), 660);
  }

  function recordLine(line) {
    if (trace.length >= 80) {
      trace.shift();
      el('arena-history').firstElementChild?.remove();
    }
    trace.push(line);
    el('arena-history').append(node('li', line));
  }

  function takeMove(key) {
    if (!match || settlement) return;
    const result = QuestDuel.step(match, key);
    if (result.reason) {
      const line = `Move blocked. ${result.reason}`;
      announce(line, true);
      recordLine(`${match.arena.moves[key].label}: ${line}`);
      effect('block', '×');
      return;
    }
    const before = match.rival;
    match = result.match;
    renderRound();
    const rival = before === match.rival ? 'Rival holds.' : `Rival advances to ${pair(match.rival)}.`;
    const usage = match.run.model.resources.map((r, i) => `${r.name} ${match.player.resources[i]}/${match.run.limits[i]} ${r.unit}`).join(', ');
    const line = `Turn ${match.turn}. ${result.move.label}. Plan ${pair(match.player)}. ${usage}. ${rival}`;
    announce(line);
    recordLine(line);
    effect('play', '✦');
  }

  ui.preset.addEventListener('change', renderSetup);
  el('arena-reason').addEventListener('input', (event) => event.currentTarget.setCustomValidity(''));
  ui.setup.addEventListener('submit', (event) => {
    event.preventDefault();
    const reason = el('arena-reason').value.trim();
    if (!reason) {
      el('arena-reason').setCustomValidity('Write one constraint check first.');
      el('arena-reason').reportValidity();
      return;
    }
    prediction = { x: el('arena-x').valueAsNumber, y: el('arena-y').valueAsNumber, reason };
    match = QuestDuel.start(activeId, Number(ui.preset.value));
    const { arena, preset, run } = match;
    ui.setup.hidden = true;
    ui.play.hidden = false;
    el('arena-setting').textContent = `${preset.label} · Goal weights ${run.weights.join(' : ')} · Prediction ${pair(prediction)}`;
    ui.scene.dataset.theme = arena.palette;
    el('arena-your-name').textContent = `Your partner · ${arena.player}`;
    el('arena-rival-name').textContent = `Rival · ${arena.rival}`;
    el('arena-your-art').src = `assets/${arena.player.toLowerCase()}.png`;
    el('arena-rival-art').src = `assets/${arena.rival.toLowerCase()}.png`;
    el('arena-rival-rule').textContent = `Rival prioritises ${run.model.goals[arena.rivalGoal].name.toLowerCase()}. They advance after legal moves and complete their plan when you lock yours.`;
    el('arena-board-title').textContent = arena.field;
    el('arena-moves').replaceChildren(...Object.entries(arena.moves).map(([key, move]) => {
      const button = node('button', undefined, 'arena-move');
      button.type = 'button';
      button.append(node('span', move.label), node('small', describeMove(arena, move, run)));
      button.addEventListener('click', () => takeMove(key));
      return button;
    }));
    announce('Choose a move and watch the resource meters.');
    renderRound();
    el('arena-moves').querySelector('button').focus({ preventScroll: true });
  });
  el('arena-reset').addEventListener('click', () => {
    resetRound();
    renderSetup();
    ui.preset.focus({ preventScroll: true });
    el('arena-title').scrollIntoView({ block: 'nearest' });
  });

  function saveEvidence(reflection) {
    const { player, rival, optimal, outcome } = settlement;
    const { arena, preset, run } = match;
    const resources = run.model.resources.map((r, i) => `${r.name} ${player.resources[i]} / ${run.limits[i]} ${r.unit}`).join(', ');
    const goals = run.model.goals.map((g, i) => `${g.name} gap ${player.shortfalls[i]} ${g.unit}`).join(', ');
    const evidence = [
      `${arena.title}. ${preset.label}. Weights ${run.weights.join(':')}.`,
      `Prediction ${pair(prediction)}. Constraint check: ${prediction.reason}`,
      `Final plan ${pair(player)}. ${resources}. ${goals}.`,
      `Rival ${pair(rival)}, score ${number(rival.score)}. ${outcome}. Player score ${number(player.score)}. Certified minimum ${number(run.bestScore)}. ${optimal ? 'Optimal.' : 'Feasible with a gap to the optimum.'}`,
      `All optima: ${run.winners.map(pair).join(', ')}.`,
      'Turn trace:', ...trace,
      `Explanation: ${reflection || 'Pending.'}`
    ].join('\n');
    document.dispatchEvent(new CustomEvent('ecoquest:duel-complete', { detail: { id: activeId, presetIndex: match.presetIndex, evidence } }));
  }

  el('arena-lock').addEventListener('click', () => {
    if (!match?.turn || settlement) return;
    settlement = QuestDuel.finish(match);
    const { player, rival, optimal, outcome } = settlement;
    match = { ...match, rival };
    renderRound();
    ui.finish.hidden = false;
    el('arena-verdict').textContent = `${outcome} · ${optimal ? 'Mathematically optimal' : 'Feasible plan'}`;
    const proof = `You locked ${pair(player)} at ${number(player.score)}. Rival ${pair(rival)} scored ${number(rival.score)}. Checking all 81 pairs gives minimum ${number(match.run.bestScore)} at ${match.run.winners.map(pair).join(', ')}.`;
    el('arena-proof').textContent = proof;
    el('arena-prompt').textContent = match.arena.prompt;
    el('arena-reflection').value = '';
    el('arena-reflection').setCustomValidity('');
    el('arena-saved').textContent = '';
    announce(proof);
    effect('play', optimal ? '★' : '✦');
    saveEvidence('');
    el('arena-finish').scrollIntoView({ block: 'nearest' });
  });
  el('arena-map').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('ecoquest:duel-map', { detail: { id: activeId, run: match.run, plan: settlement.player } }));
  });
  el('arena-reflection').addEventListener('input', (event) => event.currentTarget.setCustomValidity(''));
  el('arena-analysis').addEventListener('submit', (event) => {
    event.preventDefault();
    const reflection = el('arena-reflection').value.trim();
    if (!reflection) {
      el('arena-reflection').setCustomValidity('Write a comparison using the result.');
      el('arena-reflection').reportValidity();
      return;
    }
    saveEvidence(reflection);
    el('arena-saved').textContent = 'Saved with your duel in Field notes.';
  });

  globalThis.QuestArena = { select };
})();
