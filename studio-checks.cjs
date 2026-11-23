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
assert.deepEqual(repaired.winners,[[0,8],[2,7],[4,6]]);
assert.equal(repaired.cases['2,7'].score,1);
assert.deepEqual(run(['loop','weighted']).error,['gaps',2]);
assert.deepEqual(run(['loop','gaps','add1']).error,['score',3]);
assert.equal(E.tests(run(['loop','guard','gaps','weighted','first']),fair).at(-1).ok,false);
console.log('All 15 settings passed for both learner implementations. Mixed-limit, unassigned-variable, score and tie checks passed.');
