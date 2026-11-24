/* School Eco Fair: a dependency-free, exhaustive integer goal-programming solver.
 * Browser: EcoFair.solve(config). Node: const {solve} = require('./solver.js').
 * No optimisation package or network connection is needed.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EcoFair = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DEFAULTS = Object.freeze({budget:260, hours:16, maxBatches:10,
    profitGoal:360, paperGoal:480, profitWeight:1, paperWeight:1});
  const DEFAULT_DOMAIN = Object.freeze({xMin:0, xMax:DEFAULTS.maxBatches, yMin:0, yMax:DEFAULTS.maxBatches});
  function validate(config, domain) {
    if (config === null || typeof config !== 'object' || Array.isArray(config))
      throw new Error('Settings must be an object.');
    if (domain === null || typeof domain !== 'object' || Array.isArray(domain))
      throw new Error('The search domain must be an object.');
    for (const k of Object.keys(config)) if (!(k in DEFAULTS)) throw new Error('Unknown setting: '+k);
    for (const k of Object.keys(domain)) if (!(k in DEFAULT_DOMAIN)) throw new Error('Unknown domain setting: '+k);
    const c = {...DEFAULTS, ...config};
    for (const [k,v] of Object.entries(c)) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1000000)
        throw new Error(k+' must be a finite number from 0 to 1,000,000.');
    }
    if (!Number.isInteger(c.maxBatches)) throw new Error('The display limit must be a whole number.');
    if (c.profitWeight+c.paperWeight === 0) throw new Error('At least one weight must be greater than zero.');
    // A bookmark uses at least 20 of the 600 sheets; no single product can
    // exceed 30 batches even if a caller expands display space dramatically.
    const reachableMax = Math.min(c.maxBatches, Math.floor(600 / 20));
    const d = {xMin:0, xMax:reachableMax, yMin:0, yMax:reachableMax, ...domain};
    for (const [k,v] of Object.entries(d)) {
      if (!Number.isInteger(v) || v < 0 || v > reachableMax) throw new Error(k+' must be a whole number from 0 to '+reachableMax+'.');
    }
    if (d.xMin>d.xMax || d.yMin>d.yMax) throw new Error('A domain minimum cannot exceed its maximum.');
    return {config:c, domain:d};
  }
  function evaluate(x,y,c) {
    const cost=20*x+30*y, effort=x+2*y, profit=30*x+40*y, paper=20*x+60*y;
    const reasons=[];
    if (x+y>c.maxBatches) reasons.push('Display limit');
    if (cost>c.budget) reasons.push('Budget');
    if (effort>c.hours) reasons.push('Effort');
    if (paper>600) reasons.push('Paper stock (600 sheets)');
    const profitDeficit=Math.max(0,c.profitGoal-profit), paperDeficit=Math.max(0,c.paperGoal-paper);
    const profitUnits=profitDeficit/40, paperUnits=paperDeficit/40;
    const profitPenalty=c.profitWeight*profitUnits, paperPenalty=c.paperWeight*paperUnits;
    return {x,y,cost,effort,profit,paper,profitDeficit,paperDeficit,profitUnits,paperUnits,
      profitPenalty,paperPenalty,score:profitPenalty+paperPenalty,feasible:reasons.length===0,reasons};
  }
  function solve(config={}, domain={}) {
    const validated=validate(config,domain), c=validated.config, d=validated.domain;
    const candidates=[];
    for (let x=d.xMin;x<=d.xMax;x++) for (let y=d.yMin;y<=d.yMax;y++) candidates.push(evaluate(x,y,c));
    const feasible=candidates.filter(r=>r.feasible);
    const bestScore=feasible.length?feasible.reduce((best,plan)=>Math.min(best,plan.score),Infinity):null;
    // Floating-point weights may produce tiny rounding differences; retain all numerical ties.
    const winners=bestScore===null?[]:feasible.filter(r=>Math.abs(r.score-bestScore)<=1e-9);
    return {config:c,domain:d,candidates,feasible,bestScore,winners,
      goalsJointlyAchievable:feasible.some(r=>r.profitDeficit===0 && r.paperDeficit===0)};
  }
  return Object.freeze({DEFAULTS,DEFAULT_DOMAIN,solve});
});
