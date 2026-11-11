(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const stage = el('battle-stage');
  const buttons = [...document.querySelectorAll('[data-action]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const eventLog = [];
  let difficulty = 'standard';
  let state = BattleDrill.initial(difficulty);
  const difficultyLabel = document.createElement('label');
  difficultyLabel.textContent = 'Battle challenge / 对战难度 ';
  const difficultySelect = document.createElement('select');
  difficultySelect.setAttribute('aria-label', 'Battle challenge / 对战难度');
  for (const [value, label] of [['foundation', 'Foundation / 基础 · 1 starting Lightning'], ['standard', 'Intermediate / 进阶 · build from zero'], ['challenge', 'Challenge / 挑战 · empty reserve']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = label; difficultySelect.append(option);
  }
  difficultySelect.value = difficulty; difficultyLabel.append(difficultySelect);
  el('battle-title').after(difficultyLabel);
  const difficultyBrief = document.createElement('p'); difficultyLabel.after(difficultyBrief);
  function describeChallenge() {
    difficultyBrief.textContent = difficulty === 'foundation' ? '基础：开局已附加 1 张雷能量。尽早获胜并保留水能量。 / Start with 1 Lightning attached. Win early and preserve Water.' : difficulty === 'standard' ? '进阶：从零附加能量开始，利用充电在第 2 回合进攻。 / Start with no attached Energy. Use Charge to attack on turn 2.' : '挑战：开局附加 1 张雷能量，牌库雷能量为零。比较保留水能量与及时进攻的冲突。 / Start with 1 Lightning attached and no reserve. Compare preserving Water with attacking on time.';
  }
  difficultySelect.onchange = () => { difficulty = difficultySelect.value; el('battle-reset').click(); describeChallenge(); };
  describeChallenge();
  let busy = false;

  function paint() {
    el('pika-hp').value = state.hp;
    el('bulba-hp').value = state.rivalHp;
    el('pika-hp-label').textContent = `${state.hp} / 60 HP`;
    el('bulba-hp-label').textContent = `${state.rivalHp} / 70 HP`;
    el('battle-turn').textContent = `TURN ${state.turn}`;
    el('battle-hand').textContent = `${state.handLightning} Lightning, ${state.handWater} Water`;
    el('battle-energy').textContent = `${state.lightning} Lightning, ${state.water} Water`;
    el('battle-deck').textContent = `${state.deckLightning} Lightning`;
    stage.classList.toggle('won', state.status === 'won');
    for (const button of buttons) button.disabled = busy || state.status !== 'playing';
    el('battle-reset').disabled = busy;
    difficultySelect.disabled = busy;
  }

  function message(text, retry = false) {
    el('battle-message').textContent = text;
    el('battle-message').classList.toggle('retry', retry);
  }

  function addLog(text) {
    eventLog.push(text);
    const item = document.createElement('li');
    item.textContent = text;
    el('battle-log').append(item);
  }

  function animate(effect) {
    const delay = effect === 'energy' || effect === 'punch' || effect === 'seed' ? 500 : 140;
    if (reducedMotion.matches) return Promise.resolve();
    stage.classList.add(effect);
    el('pika-hit').textContent = effect === 'seed' ? '−20' : '+1 Energy';
    el('bulba-hit').textContent = effect === 'punch' ? '−50' : '';
    return new Promise((resolve) => setTimeout(() => {
      stage.classList.remove(effect);
      resolve();
    }, delay));
  }

  function outcome() {
    const [hpGap, waterGap] = BattleDrill.shortfalls(state);
    if (state.status === 'lost') {
      return 'Pikachu was Knocked Out. Try a different first-turn plan. How early could you meet the attack cost?';
    }
    if (state.status !== 'won') return '';
    return `Pikachu won on turn ${state.turn}. HP shortfall ${hpGap}. Water shortfall ${waterGap}.` +
      (hpGap + waterGap === 0 ? ' Both goals met!' : ' Compare a line that saves the Water Energy.');
  }

  async function takeTurn(action) {
    if (busy) return;
    const result = BattleDrill.act(state, action);
    if (!result.frames.length) {
      message(result.message, true);
      return;
    }
    busy = true;
    paint();
    for (const frame of result.frames) {
      state = frame.state;
      addLog(frame.message);
      message(frame.message);
      paint();
      await animate(frame.effect);
    }
    busy = false;
    paint();
    const summary = outcome();
    if (summary) {
      message(summary, state.status === 'lost');
      document.dispatchEvent(new CustomEvent('ecoquest:battle-complete', {
        detail: [summary, ...eventLog].join('\n')
      }));
    }
  }

  for (const button of buttons) button.addEventListener('click', () => takeTurn(button.dataset.action));
  el('battle-reset').addEventListener('click', () => {
    state = BattleDrill.initial(difficulty);
    eventLog.length = 0;
    el('battle-log').replaceChildren();
    message('Predict which move gives Pikachu enough Energy to attack on turn 2.');
    paint();
  });
  paint();
})();
