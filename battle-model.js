/* Deterministic training drill using the attacks printed on cards MEW 025 and 001. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BattleDrill = factory();
})(globalThis, function () {
  'use strict';

  const initial = (difficulty = 'standard') => ({
    turn: 1, hp: 60, rivalHp: 70, handLightning: difficulty === 'challenge' ? 1 : 2, handWater: 1,
    deckLightning: difficulty === 'challenge' ? 0 : 1, lightning: difficulty === 'standard' ? 0 : 1, water: 0, attached: false, status: 'playing'
  });

  function act(state, action) {
    const reject = (message) => ({ message, frames: [] });
    if (state.status !== 'playing') return reject('Restart the drill to try another line.');
    const next = { ...state };
    const frames = [];
    const frame = (effect, message) => frames.push({ effect, message, state: { ...next } });

    if (action === 'lightning' || action === 'water') {
      const hand = action === 'lightning' ? 'handLightning' : 'handWater';
      const label = action === 'lightning' ? 'Lightning' : 'Water';
      if (next.attached) return reject('You already attached one Energy from your hand this turn.');
      if (next[hand] === 0) return reject(`No ${label} Energy remains in your hand.`);
      next[hand] -= 1;
      next[action] += 1;
      next.attached = true;
      frame('energy', `Turn ${next.turn}. Attached one ${label} Energy from hand.`);
      return { frames };
    }

    if (action === 'charge') {
      if (!next.lightning) return reject('Charge requires one attached Lightning Energy.');
      if (next.deckLightning) {
        next.deckLightning -= 1;
        next.lightning += 1;
        frame('energy', `Turn ${next.turn}. Charge attached one Lightning Energy from the deck and ended your turn.`);
      } else {
        frame('pass', `Turn ${next.turn}. The reserve is empty. Charge ended your turn.`);
      }
    } else if (action === 'punch') {
      if (next.lightning < 2 || next.lightning + next.water < 3)
        return reject('Pika Punch requires two Lightning Energy and a third Energy of any type.');
      next.rivalHp = Math.max(0, next.rivalHp - 50);
      if (next.rivalHp === 0) next.status = 'won';
      frame('punch', `Turn ${next.turn}. Pika Punch dealt 50 damage.`);
      if (next.status === 'won') return { frames };
    } else if (action === 'pass') {
      frame('pass', `Turn ${next.turn}. You ended the turn without attacking.`);
    } else {
      return reject('Choose a battle action.');
    }

    next.hp = Math.max(0, next.hp - 20);
    const beforeHeal = next.rivalHp;
    next.rivalHp = Math.min(70, next.rivalHp + 20);
    if (next.hp === 0) next.status = 'lost';
    const healing = next.rivalHp - beforeHeal;
    frame('seed', `Bulbasaur used Leech Seed. Pikachu lost 20 HP${healing ? ` and Bulbasaur healed ${healing} HP` : ''}.`);
    if (next.status === 'playing') {
      next.turn += 1;
      next.attached = false;
      frame('turn', `Turn ${next.turn}. You may attach one Energy from your hand.`);
    }
    return { frames };
  }

  function shortfalls(state) {
    return [Math.max(0, 20 - state.hp), Math.max(0, 1 - state.handWater)];
  }

  return { initial, act, shortfalls };
});
