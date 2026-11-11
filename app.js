'use strict';

const $ = (id) => document.getElementById(id);
const make = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const partnerWeights = {
  pikachu: [3, 1],
  bulbasaur: [1, 3],
  squirtle: [1, 1]
};
const resourceOptions = {
  neither: [260, 16, 10, 600],
  budget: [270, 16, 10, 600],
  effort: [260, 17, 10, 600],
  both: [270, 17, 10, 600]
};
const missions = {
  limits: {
    label: 'ECO FAIR · STALL CHECK',
    card: ['Stall Check', 'Check the hard limits'],
    title: 'Can this plan fit?',
    question: 'Your team proposes 1 bookmark batch and 8 notebook batches. Which hard limit does it break?',
    settings: 'HKD 260 budget · 16 person-hours · 10 display batches · 600 sheets',
    options: [
      ['display', 'Display space'],
      ['budget', 'Budget'],
      ['effort', 'Production effort'],
      ['paper', 'Paper stock']
    ],
    config: () => ({}),
    startPlan: (run) => run.candidates.find(({ x, y }) => x === 1 && y === 8),
    check: (answer, run, plan) => ({
      correct: answer === 'effort' && plan.reasons.length === 1 && plan.reasons[0] === 'Effort',
      detail: 'Plan (1, 8) needs 17 person-hours. Its HKD 260 cost, 9 display batches and 500 sheets fit the other limits.'
    })
  },
  weights: {
    label: 'ECO FAIR · PARTNER SWITCH',
    card: ['Partner Switch', 'Change the goal weights'],
    title: 'Pikachu backs fundraising',
    question: 'Pikachu triples the funds weight. Which of the three equal-weight optima will win with the new weights?',
    settings: 'Funds weight 3 · Paper weight 1 · Same hard limits',
    options: [
      ['0,8', '(0, 8)'],
      ['2,7', '(2, 7)'],
      ['4,6', '(4, 6)']
    ],
    config: () => ({ weights: [3, 1] }),
    startPlan: (run, answer) => run.candidates.find(({ x, y }) => [x, y].join(',') === answer),
    check: (answer, run) => ({
      correct: run.winners.length === 1 && [run.winners[0].x, run.winners[0].y].join(',') === answer,
      detail: 'Plan (4, 6) meets the funds goal and misses paper by 40 sheets. The three scores are 3, 2 and 1 in the order shown. All 57 feasible plans remain feasible.'
    })
  },
  resources: {
    label: 'ECO FAIR · BOTH GOALS',
    card: ['Both Goals', 'Test a resource upgrade'],
    title: 'The final resource upgrade',
    question: 'Which upgrade lets a feasible plan meet both targets when the weights are equal?',
    settings: 'Start at HKD 260 and 16 person-hours. Test the option you choose.',
    options: [
      ['neither', 'Keep the original limits'],
      ['budget', 'Raise budget to HKD 270'],
      ['effort', 'Raise effort to 17 person-hours'],
      ['both', 'Raise both limits']
    ],
    config: (answer) => ({ limits: resourceOptions[answer] }),
    startPlan: (run) => run.winners[0],
    check: (answer, run) => ({
      correct: run.goalsJointlyAchievable,
      detail: run.goalsJointlyAchievable
        ? 'Plan (3, 7) costs HKD 270 and uses 17 person-hours. It yields HKD 370 and reuses 480 sheets.'
        : 'This setting has no feasible plan that meets both targets. Inspect an optimal plan and try another upgrade.'
    })
  },
  beds: {
    label: 'BERRY GARDEN · FIND THE BOTTLENECK',
    card: ['One More Bed', 'Test a space constraint'],
    title: 'One more garden bed?',
    question: 'A donor raises water to 20 L and care time to 18 hours. Which bed limit makes both goals possible?',
    settings: 'Harvest target 32 crates · Habitat target 16 points · Equal weights',
    options: [['seven', 'Keep the 7-bed limit'], ['eight', 'Open an eighth bed']],
    config: (answer) => ({ limits: [20, 18, answer === 'eight' ? 8 : 7] }),
    check: (answer, run) => ({
      correct: run.goalsJointlyAchievable,
      detail: run.goalsJointlyAchievable
        ? 'Two plans meet both goals: (4, 4) and (5, 3). Each uses eight beds. Inspect both plans and check their water and care use.'
        : 'With seven beds, the best plan (4, 3) yields 29 crates and 16 habitat points. Extra water and care leave the bed limit in place.'
    })
  },
  readiness: {
    label: 'CENTER SUPPLIES · CHOOSE A PRIORITY',
    card: ['Ready at the Center', 'Test a weighted compromise'],
    title: 'The Center expects visitors',
    question: 'The Center triples the weight on Center readiness. Which plan now has the lowest score?',
    settings: '18 material units · 18 packing blocks · 8 shelf spaces · Weights 3 : 1',
    options: [['3,4', '(3, 4)'], ['4,3', '(4, 3)'], ['4,4', '(4, 4)']],
    config: () => ({ weights: [3, 1] }),
    startPlan: (run, answer) => run.candidates.find(({ x, y }) => [x, y].join(',') === answer),
    check: (answer, run) => ({
      correct: run.winners.length === 1 && [run.winners[0].x, run.winners[0].y].join(',') === answer,
      detail: '(4, 3) scores 2.25 using shortfalls of 2 and 3 points. Equal weights favour (3, 4). Plan (4, 4) needs 20 units of materials and 20 packing blocks.'
    })
  },
  battery: {
    label: 'FIELD SURVEY · COMPARE UPGRADES',
    card: ['Time or Battery', 'Compare one change at a time'],
    title: 'What should the survey team take?',
    question: 'Choose one upgrade. Which gives the lower minimum score with equal weights?',
    settings: 'Start with 125 minutes and 17 battery units. Compare the same score across both runs.',
    options: [['time', 'Add 15 minutes'], ['battery', 'Add 3 battery units']],
    config: (answer) => ({ limits: answer === 'time' ? [140, 17, 7] : [125, 20, 7] }),
    check: (answer, run) => ({
      correct: answer === 'battery' && Math.abs(run.bestScore - 1.4) < 1e-9,
      detail: 'Extra battery gives score 1.4 at (5, 2). Extra time gives score 1.6 at (1, 5). Each upgrade leaves one target unmet.'
    })
  },
  inventory: {
    label: 'TCG CLUB · CARD INVENTORY',
    card: ['Deck Box Challenge', 'Check card counts before scoring'],
    title: 'How many practice decks can you prepare?',
    question: 'Which feasible mix has the lowest score at equal weights? Count each card category separately.',
    settings: '180 Trainer cards · 112 Energy cards · 145 Pokémon cards · 8 boxes',
    options: [['2,4', '(2, 4)'], ['3,3', '(3, 3)'], ['4,3', '(4, 3)'], ['6,0', '(6, 0)']],
    config: () => ({}),
    startPlan: (run, answer) => run.candidates.find(({ x, y }) => [x, y].join(',') === answer),
    check: (answer, run) => ({
      correct: run.winners.length === 1 && [run.winners[0].x, run.winners[0].y].join(',') === answer,
      detail: '(2, 4) uses 176 Trainer, 84 Energy and 100 Pokémon cards. It scores 2.6. Plan (4, 3) needs 192 Trainer cards, above the stock of 180.'
    })
  }
};
const moduleMissions = {
  fair: ['limits', 'weights', 'resources'],
  garden: ['beds'],
  center: ['readiness'],
  field: ['battery'],
  cards: ['inventory']
};
const totalBadges = Object.keys(missions).length;
const modelFor = () => QuestModels.models[moduleId];

const storageKey = 'int6064-eco-quest-v2';
function readJournal() {
  const empty = { partner: 'squirtle', earned: {}, attempts: {}, reasoning: '', lastLab: null, battle: null, duels: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved || typeof saved !== 'object') return empty;
    return {
      partner: Object.hasOwn(partnerWeights, saved.partner) ? saved.partner : empty.partner,
      earned: saved.earned && typeof saved.earned === 'object' ? saved.earned : {},
      attempts: saved.attempts && typeof saved.attempts === 'object' ? saved.attempts : {},
      reasoning: typeof saved.reasoning === 'string' ? saved.reasoning.slice(0, 1500) : '',
      lastLab: typeof saved.lastLab === 'string' ? saved.lastLab : null,
      battle: typeof saved.battle === 'string' ? saved.battle : null,
      duels: saved.duels && typeof saved.duels === 'object' ? saved.duels : {}
    };
  } catch {
    return empty;
  }
}

const journal = readJournal();
let moduleId = 'fair';
let mode = 'limits';
let currentRun;
let selection;
let selectedPlan;
let encounterTimer;
let planCells = new Map();
let persistenceAvailable = true;

function saveJournal() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(journal));
  } catch {
    persistenceAvailable = false;
  }
  updateBadges();
}

function updateBadges() {
  const count = Object.keys(missions).filter((id) => journal.earned[id]).length;
  $('progress').textContent = `${count} / ${totalBadges} badges`;
  for (const button of document.querySelectorAll('[data-mission]')) {
    const medal = button.querySelector('.medal');
    const earned = Boolean(journal.earned[button.dataset.mission]);
    medal.textContent = earned ? '★' : '◇';
    medal.classList.toggle('earned', earned);
    medal.setAttribute('aria-label', earned ? 'Badge earned' : 'Badge not earned');
  }
  const store = persistenceAvailable ? 'Progress is saved in this browser.' : 'Download your notes before closing this tab.';
  $('journal-status').textContent = `${count} of ${totalBadges} badges earned. ${store}`;
}

function applyPartnerWeights() {
  const [funds, paper] = partnerWeights[journal.partner];
  $('weight-0').value = funds;
  $('weight-1').value = paper;
}

function updatePartnerButtons() {
  for (const button of document.querySelectorAll('[data-partner]')) {
    button.setAttribute('aria-pressed', button.dataset.partner === journal.partner);
  }
}

function hideOutput() {
  $('feedback').hidden = true;
  $('results').hidden = true;
  $('encounter').hidden = true;
  clearTimeout(encounterTimer);
  currentRun = undefined;
}

function showMode(next) {
  mode = next;
  const lab = next === 'lab';
  for (const button of document.querySelectorAll('[data-mission]')) {
    button.setAttribute('aria-pressed', button.dataset.mission === next);
  }
  $('free-lab').setAttribute('aria-pressed', lab);
  $('prediction-form').hidden = lab;
  $('lab-form').hidden = !lab;
  hideOutput();
  if (lab) {
    $('mission-label').textContent = 'FREE LAB';
    $('mission-title').textContent = 'Your own experiment';
    $('mission-question').textContent = 'Change one input and compare the result with your previous run.';
    const names = modelFor().goals.map(({name}) => name);
    $('mission-settings').textContent = `Goal 1 is ${names[0]}. Goal 2 is ${names[1]}. The targets and fixed limits stay in place.`;
    return;
  }
  const mission = missions[next];
  $('mission-label').textContent = mission.label;
  $('mission-title').textContent = mission.title;
  $('mission-question').textContent = mission.question;
  $('mission-settings').textContent = mission.settings;
  $('answers').replaceChildren(...mission.options.map(([value, title]) => {
    const label = make('label', undefined, 'choice');
    const input = make('input');
    input.type = 'radio';
    input.name = 'prediction';
    input.value = value;
    input.required = true;
    label.append(input, make('span', title));
    return label;
  }));
}

function feedback(message, retry = false) {
  const output = $('feedback');
  output.hidden = false;
  output.textContent = message;
  output.classList.toggle('retry', retry);
}

const format = (value) => Number(value.toFixed(3)).toString();
const coordinates = (plan) => `(${plan.x}, ${plan.y})`;
const isOptimal = (run, plan) => run.winners.includes(plan);

function scenario(run) {
  const limits = run.model.resources.filter(({ editable }) => editable)
    .map((entry) => `${entry.name} ${run.limits[run.model.resources.indexOf(entry)]} ${entry.unit}`);
  return [...limits, `Weights ${run.weights.join(' : ')}`].join(' · ');
}

function addModelRow(table, values, head = false) {
  const row = make('tr');
  values.forEach((value, index) => {
    const cell = make(head || index === 0 ? 'th' : 'td', value);
    if (head || index === 0) cell.scope = head ? 'col' : 'row';
    row.append(cell);
  });
  table.append(row);
}

function inputField(id, label, value, max, fixed = false) {
  const field = make('label', label);
  const input = make('input');
  input.id = id;
  input.type = 'number';
  input.min = 0;
  input.max = max;
  input.step = 1;
  input.value = value;
  input.required = true;
  input.readOnly = fixed;
  field.append(input);
  return field;
}

function showModule(id) {
  moduleId = id;
  const model = modelFor();
  for (const button of document.querySelectorAll('[data-module]')) {
    button.setAttribute('aria-pressed', button.dataset.module === id);
  }
  QuestArena.select(id);
  $('scenario-title').textContent = model.title;
  $('scenario-purpose').textContent = model.purpose;
  $('card-library').hidden = id !== 'cards';
  $('battle').hidden = id !== 'cards';
  $('axis-y').textContent = `↑ ${model.products[1]} (y)`;
  $('axis-x').textContent = `${model.products[0]} (x) →`;
  $('model-heading').textContent = model.title;
  $('variables').textContent = `x counts ${model.products[0].toLowerCase()}. y counts ${model.products[1].toLowerCase()}. Choose whole numbers from 0 to 8.`;
  $('model-notes').textContent = model.detail;
  $('formula').textContent = `Score = weight 1 × (${model.goals[0].name.toLowerCase()} shortfall ÷ ${model.goals[0].scale}) + weight 2 × (${model.goals[1].name.toLowerCase()} shortfall ÷ ${model.goals[1].scale})`;
  const table = $('data-table');
  const caption = make('caption', 'Fictional quantities per unit');
  const head = make('thead');
  const body = make('tbody');
  addModelRow(head, ['Measure', 'x', 'y', 'Limit or target'], true);
  model.resources.forEach((r) => addModelRow(body, [r.name, r.x, r.y, `≤ ${r.limit} ${r.unit}`]));
  model.goals.forEach((g, i) => addModelRow(body, [`Goal ${i + 1} · ${g.name}`, g.x, g.y, `≥ ${g.target} ${g.unit}`]));
  table.replaceChildren(caption, head, body);
  $('lab-inputs').replaceChildren(
    ...model.resources.map((r, i) => inputField(`limit-${i}`, `${r.name} (${r.unit})${r.editable ? '' : ' · fixed'}`, r.limit, 1000, !r.editable)),
    ...model.goals.map((g, i) => inputField(`weight-${i}`, `Weight for ${g.name.toLowerCase()}`, 1, 20))
  );
  applyPartnerWeights();
  $('mission-list').replaceChildren(...moduleMissions[id].map((missionId, i) => {
    const button = make('button', undefined, 'mission-card');
    button.type = 'button';
    button.dataset.mission = missionId;
    const description = make('span');
    const [title, subtitle] = missions[missionId].card;
    description.append(make('strong', title), make('small', subtitle));
    button.append(make('span', String(i + 1).padStart(2, '0'), 'mission-number'), description, make('span', '◇', 'medal'));
    button.addEventListener('click', () => showMode(missionId));
    return button;
  }));
  showMode(moduleMissions[id][0]);
  updateBadges();
}

function goalLine(title, output, target, deficit, unit) {
  const line = make('div', undefined, 'goal-line');
  const bar = make('progress');
  bar.max = target;
  bar.value = Math.min(target, output);
  bar.setAttribute('aria-label', title);
  bar.setAttribute('aria-valuetext', `${output} of ${target} ${unit}`);
  line.append(make('strong', title), make('span', `${output} / ${target} ${unit}`), bar,
    make('span', deficit === 0 ? 'Goal met' : `Shortfall ${deficit} ${unit}`, 'gap'));
  return line;
}

function inspect(plan, focus = false) {
  if (!currentRun) return;
  selectedPlan = plan;
  if (moduleId === 'cards') resetEncounter(plan);
  const { model, limits, weights } = currentRun;
  if (selection) {
    selection.tabIndex = -1;
    selection.setAttribute('aria-pressed', 'false');
  }
  selection = planCells.get(`${plan.x},${plan.y}`);
  selection.tabIndex = 0;
  selection.setAttribute('aria-pressed', 'true');
  if (focus) selection.focus({ preventScroll: true });
  $('plan-title').textContent = `Plan ${coordinates(plan)}`;
  $('plan-status').textContent = plan.feasible
    ? isOptimal(currentRun, plan) ? 'Feasible and optimal' : 'Feasible'
    : `Infeasible · ${plan.reasons.join(', ')}`;
  const details = model.resources.map((r, i) => [r.name, `${plan.resources[i]} / ${limits[i]} ${r.unit}`]);
  $('plan-details').replaceChildren(...details.flatMap(([label, value]) => [make('dt', label), make('dd', value)]));
  $('goal-bars').replaceChildren(...model.goals.map((g, i) => goalLine(g.name, plan.values[i], g.target, plan.shortfalls[i], g.unit)));
  $('plan-score').textContent = plan.feasible
    ? `Score ${format(plan.score)} = ${weights[0]} × ${format(plan.scaled[0])} + ${weights[1]} × ${format(plan.scaled[1])}`
    : 'The solver excludes this plan before comparing scores.';
}

function resetEncounter(plan) {
  clearTimeout(encounterTimer);
  $('encounter').hidden = false;
  $('encounter-title').textContent = 'Deck box showdown';
  $('encounter-result').textContent = `Current plan ${coordinates(plan)}. Predict what will happen in the trial.`;
  $('encounter-scene').classList.remove('play');
  $('encounter-scene').dataset.theme = 'cards';
}

$('encounter-play').addEventListener('click', () => {
  if (!currentRun || !selectedPlan) return;
  const plan = selectedPlan;
  const scene = $('encounter-scene');
  const goalsMet = plan.shortfalls.every((gap) => gap === 0);
  clearTimeout(encounterTimer);
  scene.classList.remove('play');
  void scene.offsetWidth;
  scene.dataset.outcome = plan.feasible ? goalsMet ? 'success' : 'partial' : 'blocked';
  $('encounter-burst').textContent = plan.feasible ? goalsMet ? '★' : '✦' : '×';
  scene.classList.add('play');
  const message = plan.feasible
    ? currentRun.model.goals.map((g, i) => `${g.name} shortfall ${plan.shortfalls[i]} ${g.unit}`).join(' · ')
    : `Hard limit blocks this plan: ${plan.reasons.join(', ')}.`;
  $('encounter-result').textContent = `Plan ${coordinates(plan)}. ${goalsMet && plan.feasible ? 'Both goals met! ' : ''}${message}`;
  encounterTimer = setTimeout(() => scene.classList.remove('play'), 670);
});

function drawGrid(run) {
  const cells = [];
  const lookup = new Map(run.candidates.map((plan) => [`${plan.x},${plan.y}`, plan]));
  const movement = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  planCells = new Map();
  selection = undefined;
  for (let y = 8; y >= 0; y--) {
    cells.push(make('span', y, 'grid-label'));
    for (let x = 0; x <= 8; x++) {
      const key = `${x},${y}`;
      const plan = lookup.get(key);
      const optimal = isOptimal(run, plan);
      const kind = optimal ? 'best' : plan.feasible ? 'feasible' : 'blocked';
      const status = optimal ? 'Optimal' : plan.feasible ? 'Feasible' : 'Infeasible';
      const button = make('button', optimal ? '★' : plan.feasible ? '·' : '×', `cell ${kind}`);
      button.type = 'button';
      button.tabIndex = -1;
      button.setAttribute('aria-label', `Plan ${coordinates(plan)}. ${status}.`);
      button.setAttribute('aria-pressed', 'false');
      button.title = `${coordinates(plan)} · ${status}`;
      button.addEventListener('click', () => inspect(plan));
      button.addEventListener('keydown', (event) => {
        const step = movement[event.key];
        if (!step) return;
        event.preventDefault();
        const next = lookup.get(`${x + step[0]},${y + step[1]}`);
        if (next) inspect(next, true);
      });
      planCells.set(key, button);
      cells.push(button);
    }
  }
  cells.push(make('span', '', 'grid-label'));
  for (let x = 0; x <= 8; x++) cells.push(make('span', x, 'grid-label'));
  $('grid').replaceChildren(...cells);
}

function renderResults(run, plan) {
  currentRun = run;
  $('results').hidden = false;
  $('run-settings').textContent = scenario(run);
  const stats = [
    [`${run.feasible.length} / ${run.candidates.length}`, 'Feasible plans'],
    [format(run.bestScore), 'Minimum score'],
    [run.goalsJointlyAchievable ? 'Yes' : 'No', 'Both goals possible?']
  ];
  $('result-stats').replaceChildren(...stats.map(([value, label]) => {
    const box = make('div', undefined, 'stat');
    box.append(make('strong', value), make('span', label));
    return box;
  }));
  drawGrid(run);
  $('ties').replaceChildren(...run.winners.map((winner) => {
    const button = make('button', coordinates(winner));
    button.type = 'button';
    button.addEventListener('click', () => inspect(winner));
    return button;
  }));
  inspect(plan);
  const mapLink = make('a', 'View plan map ↓');
  mapLink.href = '#results';
  const trialLink = make('a', moduleId === 'cards' ? 'Partner trial ↓' : 'Play the planning duel ↑');
  trialLink.href = moduleId === 'cards' ? '#encounter' : '#arena';
  $('feedback').append(document.createTextNode(' '), mapLink, document.createTextNode(' · '), trialLink);
}

function evidence(run) {
  const optima = run.winners.map(coordinates).join(', ');
  return `${scenario(run)}. ${run.feasible.length} feasible out of ${run.candidates.length}. Optimal plans ${optima}. Minimum score ${format(run.bestScore)}. Both goals possible: ${run.goalsJointlyAchievable ? 'yes' : 'no'}.`;
}

$('prediction-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const mission = missions[mode];
  const answer = new FormData(event.currentTarget).get('prediction');
  const choice = mission.options.find(([key]) => key === answer);
  if (!choice) return;
  const { limits, weights } = mission.config(answer);
  const run = QuestModels.solve(moduleId, limits, weights);
  const plan = mission.startPlan ? mission.startPlan(run, answer) : run.winners[0];
  const outcome = mission.check(answer, run, plan);
  const firstWin = outcome.correct && !journal.earned[mode];
  if (outcome.correct) journal.earned[mode] = true;
  journal.attempts[mode] = `Prediction: ${choice[1]}. ${outcome.correct ? 'Correct' : 'Revise'}. ${outcome.detail} ${evidence(run)}`;
  saveJournal();
  feedback(`${firstWin ? '★ Badge earned!' : outcome.correct ? 'Correct.' : 'Try again.'} ${outcome.detail}`, !outcome.correct);
  renderResults(run, plan);
});

$('lab-form').addEventListener('input', hideOutput);
$('lab-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const limits = modelFor().resources.map((_, i) => $(`limit-${i}`).valueAsNumber);
  const weights = modelFor().goals.map((_, i) => $(`weight-${i}`).valueAsNumber);
  try {
    const run = QuestModels.solve(moduleId, limits, weights);
    journal.lastLab = `${modelFor().name}. ${evidence(run)}`;
    saveJournal();
    feedback('All 81 plans checked. Select a square to inspect the calculation.');
    renderResults(run, run.winners[0]);
  } catch (error) {
    hideOutput();
    feedback(error.message, true);
  }
});
for (const button of document.querySelectorAll('[data-module]')) {
  button.addEventListener('click', () => showModule(button.dataset.module));
}
for (const button of document.querySelectorAll('[data-partner]')) {
  button.addEventListener('click', () => {
    journal.partner = button.dataset.partner;
    applyPartnerWeights();
    updatePartnerButtons();
    saveJournal();
    if (mode === 'lab') hideOutput();
  });
}
$('free-lab').addEventListener('click', () => showMode('lab'));
$('reasoning').addEventListener('input', (event) => {
  journal.reasoning = event.currentTarget.value;
  saveJournal();
});
$('journal-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const missionNotes = Object.entries(missions).map(([id, mission]) => {
    const badge = journal.earned[id] ? ' · Badge earned' : '';
    return `${mission.label}${badge}\n${journal.attempts[id] || 'No attempt recorded.'}`;
  });
  const duelNotes = Object.entries(QuestDuel.arenas).flatMap(([id, arena]) => {
    const notes = arena.presets.map((_, i) => journal.duels[`${id}:${i}`]).filter((note) => typeof note === 'string');
    return notes.length ? notes : typeof journal.duels[id] === 'string' ? [journal.duels[id]] : [];
  });
  const text = ['Eco Quest | INT6064 field notes', ...missionNotes, ...duelNotes,
    `Last Free Lab run\n${journal.lastLab || 'No run recorded.'}`,
    `Battle drill\n${journal.battle || 'No battle completed.'}`,
    `Team reasoning\n${journal.reasoning.trim() || 'Add your explanation before sharing.'}`].join('\n\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = make('a');
  link.href = url;
  link.download = 'eco-quest-field-notes.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.addEventListener('ecoquest:duel-complete', (event) => {
  const { id, presetIndex, evidence } = event.detail;
  journal.duels[`${id}:${presetIndex}`] = evidence;
  saveJournal();
});
document.addEventListener('ecoquest:duel-map', (event) => {
  const { id, run, plan } = event.detail;
  if (id !== moduleId) return;
  feedback('The plan map uses the conditions from your locked duel.');
  renderResults(run, plan);
  $('results').scrollIntoView();
});
document.addEventListener('ecoquest:battle-complete', (event) => {
  journal.battle = event.detail;
  saveJournal();
});
$('reasoning').value = journal.reasoning;
updatePartnerButtons();
showModule('fair');
