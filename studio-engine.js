// This interpreter executes the student's ordered blocks on raw mission data.
// The reference solver is used separately by the classroom test panel.
const BlockEngine = (() => {
  const labels = {
    loop:['For each pair (x, y) from 0 to the scenario maximum','遍历从 0 到情景上限的每一对 (x, y)'],
    shortLoop:['For each pair (x, y) from 0 to one below the scenario maximum','遍历从 0 到情景上限减一的每一对 (x, y)'],
    guard:['Skip if ANY resource is over its limit','若任一资源超限，跳过这个方案'],
    loose:['Skip if ALL resources are over their limits','若全部资源都超限，跳过这个方案'],
    gaps:['Set each gap to max(0, target − output)','把每个缺口设为 max(0, 目标 − 产出)'],
    raw:['Set each gap to target − output','把每个缺口设为 目标 − 产出'],
    zero:['Set score to 0','将分数设为 0'],
    add1:['Add weight₁ × gap₁ ÷ scale₁ to score','给分数加上 权重₁ × 缺口₁ ÷ 尺度₁'],
    add2:['Add weight₂ × gap₂ ÷ scale₂ to score','给分数加上 权重₂ × 缺口₂ ÷ 尺度₂'],
    weighted:['Set score to the sum of weighted, scaled gaps','按权重和尺度加总两个缺口，赋值给分数'],
    equal:['Set score to the sum of scaled gaps, with equal weights','按相同权重加总两个换算后的缺口'],
    keep:['Update minimum and keep every tied pair','更新最低分，并保留全部并列方案'],
    first:['Update minimum and keep only the first tied pair','更新最低分，只保留第一个并列方案']
  };
  const starters=[
    ['loop','gaps','weighted','keep'],
    ['loop','guard','gaps','equal','first'],
    []
  ];
  const near=(a,b)=>Math.abs(a-b)<1e-9;
  function execute(program,model,limits,weights){
    const result={best:null,winners:[],cases:{},error:null};
    if(!['loop','shortLoop'].includes(program[0])){result.error=['loop',1];return result;}
    const models = typeof module === 'object' && module.exports ? require('./scenarios.js') : globalThis.QuestModels;
    const limit = models.domainMax(model, limits);
    const max = program[0] === 'loop' ? limit : limit - 1;
    for(let x=0;x<=max;x++)for(let y=0;y<=max;y++){
      const linear=a=>a.x*x+a.y*y;
      const costs=model.resources.map(linear);
      const exceeds=costs.map((v,i)=>v>limits[i]);
      const values=model.goals.map(linear);
      const state={x,y,steps:[],gaps:null,score:null,skipped:false,scored:false};
      result.cases[[x,y]]=state;
      for(let i=1;i<program.length;i++){
        const op=program[i];
        switch(op){
          case 'guard': case 'loose':
            state.skipped=op==='guard'?exceeds.some(Boolean):exceeds.every(Boolean);
            break;
          case 'gaps': case 'raw':
            state.gaps=model.goals.map((g,j)=>op==='gaps'?Math.max(0,g.target-values[j]):g.target-values[j]);
            break;
          case 'zero':
            state.score=0;break;
          case 'add1': case 'add2': {
            if(!state.gaps){result.error=['gaps',i+1];return result;}
            if(state.score===null){result.error=['score',i+1];return result;}
            const j=op==='add1'?0:1;
            state.score+=weights[j]*state.gaps[j]/model.goals[j].scale;
            state.scored=true;
            break;
          }
          case 'weighted': case 'equal':
            if(!state.gaps){result.error=['gaps',i+1];return result;}
            state.score=state.gaps.reduce((z,d,j)=>z+d*(op==='weighted'?weights[j]:1)/model.goals[j].scale,0);
            state.scored=true;
            break;
          case 'keep': case 'first':
            if(state.score===null){result.error=['score',i+1];return result;}
            if(result.best===null||state.score<result.best-1e-9){result.best=state.score; result.winners=[[x,y]];}
            else if(op==='keep'&&near(state.score,result.best)&&!result.winners.some(p=>p[0]===x&&p[1]===y))result.winners.push([x,y]);
            break;
          default:result.error=['nested',i+1];return result;
        }
        state.steps.push({line:i+1,op,skipped:state.skipped,gaps:state.gaps,score:state.score,best:result.best});
        if(state.skipped)break;
      }
    }
    return result;
  }
  function tests(run,reference){
    const {candidates,winners,bestScore}=reference;
    const checks=[
      ['domain',p=>!!run.cases[[p.x,p.y]]],
      ['guard',p=>{
        const state=run.cases[[p.x,p.y]];
        return p.feasible ? state?.skipped===false : state?.skipped && !state.scored;
      }],
      ['gaps',p=>!p.feasible||p.shortfalls.every((d,i)=>d===run.cases[[p.x,p.y]]?.gaps?.[i])],
      ['score',p=>!p.feasible||(typeof run.cases[[p.x,p.y]]?.score==='number'&&near(p.score,run.cases[[p.x,p.y]].score))]
    ];
    const rows=checks.map(([id,check])=>{const failed=candidates.find(p=>!check(p));return {id,ok:!failed,pair:failed?[failed.x,failed.y]:null};});
    const expected=winners.map(p=>[p.x,p.y]);
    const actual=new Set(run.winners.map(String)),wanted=new Set(expected.map(String));
    const missing=expected.find(p=>!actual.has(String(p))),extra=run.winners.find(p=>!wanted.has(String(p)));
    rows.push({id:'best',ok:run.best!==null&&near(run.best,bestScore)&&!missing&&!extra,pair:missing||extra||null});
    return rows;
  }
  return {execute,tests,labels,starters};
})();
if(typeof module==='object')module.exports=BlockEngine;
