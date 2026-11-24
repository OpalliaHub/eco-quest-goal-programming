const assert=require('node:assert/strict');
const Q=require('./scenarios.js'), E=require('./studio-engine.js');
const correct=['loop','guard','gaps','weighted','keep'];
const accumulator=['loop','guard','gaps','zero','add1','add2','keep'];
for(const part of Object.keys(Q.models))for(let level=0;level<3;level++){
  const limits=Q.defaults(part);
  if(level===2){const j=Q.models[part].resources.findIndex(r=>r.editable);limits[j]+=Math.ceil(limits[j]/5);}
  const ref=Q.solve(part,limits,level===1?[3,1]:[1,1]);
  for(const program of [correct,accumulator]){
    const run=E.execute(program,ref.model,limits,ref.weights);
    assert.equal(run.error,null);assert(E.tests(run,ref).every(test=>test.ok));
  }
}
const fair=Q.solve('fair');const run=p=>E.execute(p,fair.model,fair.limits,fair.weights);
const bad=run(E.starters[0]);assert.equal(bad.cases['1,8'].skipped,false);
const repaired=run(correct);assert.equal(repaired.cases['1,8'].skipped,true);
const lateCheck=run(['loop','gaps','weighted','guard','keep']);
assert.equal(lateCheck.cases['1,8'].score,0.25);
assert.deepEqual(lateCheck.winners,repaired.winners);
assert.equal(E.tests(lateCheck,fair).find(test=>test.id==='guard').ok,false);
const initialisedFirst=run(['loop','zero','guard','gaps','add1','add2','keep']);
assert(E.tests(initialisedFirst,fair).every(test=>test.ok));
assert.deepEqual(repaired.winners,[[0,8],[2,7],[4,6]]);
assert.equal(repaired.cases['2,7'].score,1);
assert.deepEqual(run(['loop','weighted']).error,['gaps',2]);
assert.deepEqual(run(['loop','gaps','add1']).error,['score',3]);
assert.equal(E.tests(run(['loop','guard','gaps','weighted','first']),fair).at(-1).ok,false);
console.log('All 15 settings passed for both learner implementations. Mixed-limit, unassigned-variable, score and tie checks passed.');

// Every supported guided lab answer and all eight duel presets use the same
// hard constraints as their scenario. Test expected classroom examples directly.
const standalone = require('./solver.js');
const duels = require('./duel-model.js');
const battle = require('./battle-model.js');
const pair = p => [p.x, p.y];
const winners = r => r.winners.map(pair);
function expectSetting(part, limits, weights, expectedScore, expectedPairs) {
  const answer = Q.solve(part, limits, weights);
  assert(Math.abs(answer.bestScore - expectedScore) < 1e-9);
  assert.deepEqual(winners(answer), expectedPairs);
  return answer;
}
for (const [budget, hours, best, pairs] of [
  [260,16,1,[[0,8],[2,7],[4,6]]], [270,16,1,[[0,8],[2,7],[4,6]]],
  [260,17,.25,[[1,8]]], [270,17,0,[[3,7]]],
]) expectSetting('fair',[budget,hours,10,600],[1,1],best,pairs);
expectSetting('garden',[20,18,7],[1,1],.6,[[4,3]]);
expectSetting('garden',[20,18,8],[1,1],0,[[4,4],[5,3]]);
expectSetting('center',undefined,[3,1],2.25,[[4,3]]);
expectSetting('field',[140,17,7],[1,1],1.6,[[1,5]]);
expectSetting('field',[125,20,7],[1,1],1.4,[[5,2]]);
expectSetting('cards',undefined,[1,1],2.6,[[2,4]]);
expectSetting('cards',[192,112,145,8],[1,1],1.4,[[4,3]]);

assert.equal(fair.maxCount,10);
assert.equal(fair.feasible.length,60);
for(const [x,y] of [[9,0],[9,1],[10,0]]) assert(!repaired.cases[[x,y]].skipped);
assert.equal(repaired.cases['10,0'].score,8.5);
assert(repaired.cases['10,1'].skipped);
assert(!E.tests(run(['shortLoop','guard','gaps','weighted','keep']),fair)[0].ok);
assert.equal(standalone.solve({maxBatches:12}).domain.xMax,12);
assert.equal(standalone.solve({maxBatches:5}).domain.yMax,5);
assert.throws(() => standalone.solve({maxBatches:1000000}, {xMax:1000000, yMax:1000000}),
              /from 0 to 30/);
assert.equal(standalone.solve({maxBatches:1000000}).candidates.length,31*31);

for(const [part, arena] of Object.entries(duels.arenas)) {
  for(let preset=0;preset<arena.presets.length;preset++) {
    const initial = duels.start(part,preset);
    // A nonnegative linear resource model permits building each eligible
    // target plan from zero without crossing a limit on the way.
    for(const target of initial.run.feasible) {
      let match = initial;
      for(const action of [...Array(target.x).fill('x'),...Array(target.y).fill('y')]) {
        const moved = duels.step(match,action);
        assert(moved.match, moved.reason);
        match = moved.match;
      }
      const end = duels.finish(match);
      assert.deepEqual(pair(end.player),pair(target));
      assert.equal(end.optimal,initial.run.winners.includes(target));
    }
  }
}
let stall = duels.start('fair',0);
for(let n=0;n<10;n++) stall=duels.step(stall,'x').match;
assert.equal(stall.player.score,8.5);
assert.match(duels.step(stall,'x').reason,/11 > 10/);
assert.deepEqual(pair(duels.step(duels.start('fair',0),'mix').match.player),[1,1]);
assert(duels.step(duels.start('center',0),'toX').reason);
const supply = duels.step(duels.start('center',0),'y').match;
assert.deepEqual(pair(duels.step(supply,'toX').match.player),[1,0]);
assert(duels.step(duels.start('field',0),'reroute').reason);
const survey = duels.step(duels.start('field',0),'x').match;
assert.deepEqual(pair(duels.step(survey,'reroute').match.player),[0,1]);

for (const difficulty of ['foundation','standard','challenge']) {
  const victories = [];
  function visit(state) {
    if(state.status === 'won') victories.push(state);
    if(state.status !== 'playing') return;
    for(const action of ['charge','pass','lightning','water','punch']) {
      const frames = battle.act(state,action).frames;
      if(frames.length) visit(frames[frames.length-1].state);
    }
  }
  visit(battle.initial(difficulty));
  assert(victories.length>0);
  assert(victories.every(s=>s.turn===3 && s.hp===20));
  const savedWater=victories.some(s=>battle.shortfalls(s)[1]===0);
  assert.equal(savedWater,difficulty!=='challenge');
}
console.log('Passed the fair boundary, guided upgrades, every reachable plan in eight duel presets and all legal action sequences in three card battles.');
