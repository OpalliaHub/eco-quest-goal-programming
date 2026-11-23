function fullCodingStudio({host,part,level,result,t,term,el,button}){
  const key='ecoquest-blocks-v1-'+part+'-'+level;
  const lang=(pair)=>t(...pair);
  const label=id=>lang(BlockEngine.labels[id]);
  const section=el('section',undefined,host,'block-studio');
  const fresh=()=>({program:[...BlockEngine.starters[level]],attempts:[],explanation:'',pair:[1,8],expect:'skip',expectedScore:0});
  let data=fresh();
  try{
    const saved=JSON.parse(localStorage.getItem(key));
    if(saved&&Array.isArray(saved.program)&&saved.program.length<=14&&saved.program.every(id=>Object.hasOwn(BlockEngine.labels,id))&&Array.isArray(saved.attempts)&&Array.isArray(saved.pair))data={...data,...saved};
  }catch(_){}
  function save(){try{localStorage.setItem(key,JSON.stringify(data));}catch(_){}}
  el('h3',lang([['Repair the missing resource check','修复漏掉的资源检查'],['Debug the priority rule','调试目标优先级'],['Build the search from scratch','从空白搭建搜索程序']][level]),section);
  el('p',lang([['Run the starter. It scores a plan that breaks a limit. Inspect the failing pair, insert a check inside the loop, then run it again.','先运行起始程序。它给一个超限方案也打了分。查看失败的数对，在循环内插入检查，再运行。'],['Goal 1 now counts three times. Use a failing score to locate the faulty assignment. Check the same program on equal weights to expose lost ties.','目标一的权重变成了 3。用一个错误分数定位赋值错误，再用相同权重测试是否漏掉并列解。'],['Start with a loop. Test the limits, set both gaps, initialise the score to zero and add one penalty per goal. Then update the winner list. Choose a test pair and predict its output before running.','先放循环，检查资源并设置缺口。每个方案的分数从零开始，把两个目标的罚分逐项加入，再更新获胜名单。自己选一对数量做测试，先预测输出再运行。']][level]),section);
  const workspace=el('div',undefined,section,'block-columns');
  const palette=el('div',undefined,workspace,'block-panel');
  el('h4',t('Block library','积木盒'),palette);
  el('small',t('Click to insert at the chosen line.','点击积木，插入所选位置。'),palette);
  const programPanel=el('div',undefined,workspace,'block-panel');
  el('h4',t('My program','我的程序'),programPanel);
  const list=el('ol',undefined,programPanel,'program-lines');
  const insertion=el('label',t('Insert at ','插入位置 '),programPanel);
  const position=el('select',undefined,insertion);
  const status=el('p','',programPanel);status.setAttribute('role','status');
  let selected=level===0?1:data.program.length;
  const edit=(message)=>{save();draw();output.replaceChildren();status.textContent=message;};
  function draw(){
    list.replaceChildren();position.replaceChildren();selected=Math.min(selected,data.program.length);
    for(let i=0;i<=data.program.length;i++){const option=el('option',i===data.program.length?t('End','末尾'):t('Before line ','在第几行之前：')+(i+1),position);option.value=i;}
    position.value=selected;
    data.program.forEach((op,i)=>{
      const li=el('li',undefined,list);const text=el('span',label(op),li);text.className='block-text';
      const tools=el('span',undefined,li,'block-tools');
      function change(delta){[data.program[i],data.program[i+delta]]=[data.program[i+delta],data.program[i]];selected=i+delta;edit(t('Program changed. Run to test.','程序已修改，运行看看。'));}
      for(const [name,fn,disabled,hint] of [['↑',()=>change(-1),!i,t('Move up','上移')],['↓',()=>change(1),i===data.program.length-1,t('Move down','下移')],['×',()=>{data.program.splice(i,1);selected=i;edit(t('Block removed.','积木已移除。'));},false,t('Remove','移除')]]){
        const b=button(name,fn,tools,disabled);b.setAttribute('aria-label',hint+' '+(i+1));
      }
    });
    if(!data.program.length)el('li',t('Choose a loop to start.','选择循环积木开始。'),list);
  }
  position.onchange=()=>{selected=Number(position.value);};
  const groups=[['loop','shortLoop'],['guard','loose'],['gaps','raw'],...(level===2?[['zero','add1','add2']]:[['weighted','equal']]),['keep','first']];
  for(const group of groups){
    const family=el('div',undefined,palette,'block-family');
    for(const op of group)button(label(op),()=>{if(data.program.length>=14){status.textContent=t('Remove a block before adding another.','请先移除一个积木。');return;}
      data.program.splice(selected,0,op);selected++;edit(t('Block inserted. Run to test.','已插入积木，运行看看。'));},family);
  }
  const testBox=el('fieldset',undefined,section);el('legend',t('My test case','我设计的测试'),testBox);
  el('p',t('Pick two counts. Predict whether the program should skip the pair or give it a score.','选两个数量，预测正确的程序应当跳过这个方案，还是给它打分。'),testBox);
  const productZH={fair:['书签批次','笔记本批次'],garden:['橙橙果种植床','桃桃果种植床'],center:['舒适补给包','野外补给包'],field:['河岸调查轮次','林地调查轮次'],cards:['入门牌组','战术牌组']};
  const picks=el('div',undefined,testBox,'learn-controls');
  for(let j=0;j<2;j++){const l=el('label',t(result.model.products[j],productZH[part][j])+' ',picks);const s=el('select',undefined,l);for(let i=0;i<9;i++)el('option',String(i),s);s.value=data.pair[j];s.onchange=()=>{data.pair[j]=Number(s.value);save();output.replaceChildren();};}
  const ex=el('select',undefined,picks);ex.setAttribute('aria-label',t('Expected behaviour','预测程序行为'));
  for(const [v,l] of [['skip',t('Expect skip','预计跳过')],['score',t('Expect score','预计得分')]]){el('option',l,ex).value=v;}ex.value=data.expect;
  const scoreLabel=el('label',t('Expected score ','预计分数 '),picks),num=el('input',undefined,scoreLabel);num.type='number';num.step='any';num.value=data.expectedScore;
  scoreLabel.hidden=data.expect!=='score';ex.onchange=()=>{data.expect=ex.value;scoreLabel.hidden=data.expect!=='score';save();output.replaceChildren();};
  num.oninput=()=>{data.expectedScore=num.value;save();output.replaceChildren();};
  const controls=el('div',undefined,section,'learn-controls');
  const output=el('div',undefined,section,'studio-output');output.setAttribute('aria-live','polite');
  const messages={domain:t('Loop covers the domain','循环覆盖全部数量'),guard:t('Hard resource limits','硬约束检查'),gaps:t('Nonnegative shortfalls','缺口不小于零'),score:t('Weighted score','加权分数'),best:t('Minimum and every tie','最低分和全部并列方案')};
  const errors={loop:t('Begin with a loop block.','第一行需要一个循环。'),nested:t('Place a single pair loop at the start.','数对循环只放在开头一次。'),gaps:t('This line reads gaps before they have a value.','这一行读缺口时，缺口还没有赋值。'),score:t('This line reads a score before it has a value.','这一行读分数时，分数还没有赋值。')};
  function describe(s){return !s?t('Unvisited','未访问'):s.skipped?t('Skipped','跳过'):s.score===null?t('No score assigned','未赋分'):'Z = '+Number(s.score.toFixed(4));}
  function run(){
    output.replaceChildren();
    if(data.expect==='score'&&(num.value===''||!Number.isFinite(num.valueAsNumber))){status.textContent=t('Enter the score you predict.','请先输入你预测的分数。');return;}
    const actual=BlockEngine.execute(data.program,result.model,result.limits,result.weights);
    const checks=BlockEngine.tests(actual,result);
    const transfer=QuestModels.solve('fair');
    const transferRun=BlockEngine.execute(data.program,transfer.model,transfer.limits,transfer.weights);
    const transferCheck=BlockEngine.tests(transferRun,transfer).every(q=>q.ok)&&!transferRun.error;
    const personal=actual.cases[data.pair], predicted=!!personal&&!actual.error&&(data.expect==='skip'?personal.skipped:!personal.skipped&&personal.score!==null&&Math.abs(personal.score-Number(data.expectedScore))<1e-8);
    const attempt={program:[...data.program],pair:[...data.pair],expected:data.expect==='skip'?'skip':Number(data.expectedScore),actual:describe(personal),personalPass:predicted,checks,transferCheck,error:actual.error,winners:actual.winners,best:actual.best};
    data.attempts.push(attempt);if(data.attempts.length>20)data.attempts.splice(1,1);save();
    status.textContent=t('Run complete.','运行结束。');el('h4',t('Your program output','你的程序输出'),output);
    if(actual.error)el('p',t('Line ','第 ')+actual.error[1]+' · '+errors[actual.error[0]],output);
    el('p',(predicted?'✓ ':'✗ ')+t('My prediction','我的预测')+' ('+data.pair+') → '+describe(personal),output);
    const summary=actual.winners.slice(0,8).map(p=>'('+p+')').join(' · ');
    el('p',t('Minimum','最低分')+' '+(actual.best===null?'—':Number(actual.best.toFixed(4)))+' · '+t('Winners','获胜方案')+' '+(summary||'—')+(actual.winners.length>8?' …':''),output);
    const trace=el('div',undefined,output,'studio-trace');
    function inspect(pair){
      trace.replaceChildren();const state=actual.cases[pair];el('strong',t('Inspect pair ','逐行查看方案 ')+'('+pair+')',trace);
      const ref=result.candidates.find(p=>p.x===pair[0]&&p.y===pair[1]);
      el('p',result.model.resources.map((r,j)=>term(r.name)+' '+ref.resources[j]+'/'+result.limits[j]).join(' · '),trace);
      el('p',t('Expected','正确结果')+' '+(ref.feasible?'Z = '+Number(ref.score.toFixed(4)):t('Skip','跳过'))+' · '+t('Your output','实际输出')+' '+describe(state),trace);
      for(const s of state?.steps||[])el('div',s.line+'. '+label(s.op)+' → '+(s.skipped?t('skip','跳过'):s.op==='guard'||s.op==='loose'?t('continue','继续'):s.op==='gaps'||s.op==='raw'?'['+s.gaps.join(', ')+']':s.op==='keep'||s.op==='first'?t('best ','最低 ')+Number(s.best.toFixed(4)):'Z = '+Number(s.score.toFixed(4))),trace);
    }
    inspect(data.pair);
    for(const c of checks){const line=el('div',undefined,output,'check-row');el('span',(c.ok?'✓ ':'✗ ')+messages[c.id],line);if(c.pair)button(t('Inspect ','查看 ')+ '('+c.pair+')',()=>inspect(c.pair),line);}
    el('p',(transferCheck?'✓ ':'✗ ')+t('Transfer test: same blocks on the equal-weight fair (three ties)','迁移测试：相同积木运行等权市集（三个并列解）'),output);
  }
  button(t('Run my blocks','运行我的积木'),run,controls);
  button(t('Restore starter','恢复起始程序'),()=>{if(confirm(t('Replace the current blocks? Previous test runs will remain.','替换当前积木？将保留测试历史。'))){data.program=[...BlockEngine.starters[level]];selected=Math.min(1,data.program.length);edit(t('Starter restored.','已恢复起始程序。'));}},controls);
  const l=el('label',t('Which test made you change a block, and why?','哪个测试让你修改积木？为什么？'),section);
  const reflection=el('textarea',undefined,l);reflection.value=data.explanation;reflection.oninput=()=>{data.explanation=reflection.value;save();};
  button(t('Export my program and run history','导出我的程序和运行记录'),()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({part,level:level+1,limits:result.limits,weights:result.weights,...data},null,2)],{type:'application/json'}));const a=document.createElement('a');a.download='ecoquest-code-'+part+'-'+(level+1)+'.json';a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},section);
  draw();
}

// The first lesson exposes one editable instruction. Both runs use the same
// interpreter as the full editor. Guided attempts never replace saved projects.
const guidedSessions = new Map();
function codingStudio(context) {
  const {host,part,level,result,t,term,unit,math,products,el,button}=context;
  const key=part+'-'+level;
  const initial=()=>({step:0, prediction:null, choice:null, failed:false, attempts:[], full:level>0});
  if(!guidedSessions.has(key)) guidedSessions.set(key,initial());
  let session=guidedSessions.get(key);
  const view=el('div',undefined,host,'guided-studio');
  const sample=part==='fair' && level===0 ? result.candidates.find(p=>p.x===1&&p.y===8)
    :result.candidates.find(p=>!p.feasible && p.resources.some((v,i)=>v<=result.limits[i]));
  const control=part==='fair' && level===0?result.candidates.find(p=>p.x===2&&p.y===7):result.winners[0];
  const displayPair=p=>[p.x,p.y].map((v,i)=>t(result.model.products[i]+' × '+v,products[i]+' × '+v)).join(t(' and ','，'));
  const score=v=>Number(v.toFixed(3));
  const run=(id,p)=>{
    const code=[...BlockEngine.starters[0]];
    if(id)code.splice(1,0,id);
    const row=BlockEngine.execute(code,result.model,result.limits,result.weights).cases[[p.x,p.y]];
    const output=row.skipped?'skip':score(row.score);
    session.attempts.push({program:code,input:[p.x,p.y],prediction:p===sample?session.prediction:null,output});
    return output;
  };
  const outcome=v=>v==='skip'?t('Skipped','跳过'):t('Scored ','得分 ')+v;
  const steps=[t('Predict','先判断'),t('Run','看程序'),t('Edit','补积木'),t('Retest','再验证')];
  function render(){
    view.replaceChildren();
    const helper=el('div',undefined,view,'first-tools');
    const guide=el('a',t('Teacher walkthrough ↗','教师图解教程 ↗'),helper);
    guide.href='first-lesson.html#'+t('en','zh');guide.target='_blank';guide.rel='noopener';
    button(session.full?t('Try the one-block lesson','进入一块积木入门课'):t('Open full editor','打开完整编辑器'),()=>{session.full=!session.full;render();},helper);
    if(session.full){fullCodingStudio({...context,host:view});return;}
    const panel=el('section',undefined,view,'first-panel');
    panel.setAttribute('aria-label',t('One-block lesson','一块积木入门课'));
    const progress=el('ol',undefined,panel,'first-steps');steps.forEach((s,i)=>{const li=el('li',(i+1)+' '+s,progress);if(i===session.step)li.setAttribute('aria-current','step');});
    const focus=el('div',undefined,panel,'first-focus');
    function heading(en,zh){el('h3',t(en,zh),focus);}
    function action(en,zh,fn){const b=button(t(en,zh),fn,focus);b.classList.add('first-action');return b;}
    function next(i){session.step=i;render();}
    const badIndex=sample.resources.findIndex((v,i)=>v>result.limits[i]);
    const resource=result.model.resources[badIndex];
    function resourceList(p) {
      const details=el('details',undefined,focus);
      el('summary',t('See all resource checks','查看各项资源用量'),details);
      for(const [i,r] of result.model.resources.entries()){
        const used=p.resources[i],limit=result.limits[i];
        el('p',term(r.name)+' · '+used+' / '+limit+' '+unit(r.unit)+' · '+(used>limit?t('over','超限'):t('fits','够用')),details);
      }
    }
    if(session.step===0){
      heading('Should this plan reach the scoring step?','这个方案能进入打分环节吗？');
      el('p',t('You are writing the instruction that checks whether a plan fits the available resources. Try this plan first.','你来教电脑判断资源够不够。先替它看一眼这个方案。'),focus);
      el('p',displayPair(sample),focus);
      const box=el('div',undefined,focus,'first-equation');
      el('strong',term(resource.name)+' ('+unit(resource.unit)+')',box);
      math(box,resource.x+'\\times '+sample.x+'+'+resource.y+'\\times '+sample.y+'='+sample.resources[badIndex]+'>'+result.limits[badIndex]);
      resourceList(sample);
      el('p',t('Point to the amount needed and the amount available. Pick what a correct program should do.','左边是需要的数量，右边是现有的上限。请选：正确的程序下一步该怎么做？'),focus);
      for(const [v,en,zh] of [['skip','Skip this plan','跳过这个方案'],['score','Give it a score','给它打分']])action(en,zh,()=>{session.prediction=v;run(null,sample);next(1);});
    }else if(session.step===1){
      heading('The starter gives the plan a score','起始程序竟然给它打了分');
      el('p',t('Your prediction: ','你的判断：')+(session.prediction==='skip'?t('skip','跳过'):t('score','打分')),focus);
      el('p',t('Actual starter output: ','起始程序实际输出：')+outcome(session.attempts[0].output),focus,'first-equation');
      el('p',t('The plan breaks a limit. Follow the arrows. Which instruction is missing before scoring?','这个方案已经超限。顺着箭头看，打分之前少了什么检查？'),focus);
      el('p',t('Take a plan → [empty slot] → calculate its score','取一个方案 → 【空位】 → 算分数'),focus,'first-line');
      action('Fill the empty slot','去补上这一行',()=>next(2));
    }else if(session.step===2){
      heading('Put one rule before scoring','在打分前补一条规则');
      el('p',t('Each button is a block you can insert. Pick one and see what your program does with the same plan.','下面两个按钮就是可插入的积木。选一块放进空位，程序会立即用原方案再跑一次。'),focus);
      el('p',t('Take a plan → [insert here] → calculate its score','取一个方案 → 【在这里插入】 → 算分数'),focus,'first-line');
      if(session.failed)el('p',t('It still gives a score. At least one limit was met, so “all limits exceeded” never triggered. Try the other rule.','还是得到了分数。因为有些资源够用，“全部超限”没有触发。试试另一条规则。')+' '+outcome(session.attempts.at(-1).output),focus,'first-result');
      for(const [op,en,zh] of [['loose','Skip if every limit is exceeded','全部资源都超限才跳过'],['guard','Skip if any limit is exceeded','有一项资源超限就跳过']])action(en,zh,()=>{
        session.choice=op;if(run(op,sample)==='skip'){next(3);}else{session.failed=true;render();}
      });
    }else{
      heading('Does the repair keep a legal plan?','修好之后，合规方案还能留下吗？');
      el('p',displayPair(sample)+' → '+outcome('skip'),focus,'first-result');
      el('p',t('Take a plan → if any limit is exceeded, skip → otherwise score','取一个方案 → 有一项资源超限就跳过 → 否则继续打分'),focus,'first-line');
      el('p',t('Your new instruction stops this plan before scoring. Next, try ','你补上的指令让超限方案在打分前停下。现在换成：')+displayPair(control),focus);
      resourceList(control);
      const second=session.attempts.find(a=>a.input[0]===control.x&&a.input[1]===control.y);
      if(!second){action('Run the legal plan','运行这个合规方案',()=>{run(session.choice,control);render();});}
      else{
        el('p',displayPair(control)+' → '+outcome(second.output),focus,'first-result');
        el('p',t('This score measures remaining gaps in the two goals. Smaller is better. Only plans that fit every limit can compete.','分数衡量两个目标还有多少缺口，越小越好。只有各项资源都够用的方案才有资格比较。'),focus);
        el('p',t('Explain to your partner: which line stopped the first plan? Why did the second plan reach scoring?','请向同桌解释：第一组在哪一行停下？第二组为什么能继续打分？'),focus);
        action('Save my test record','保存本次测试记录',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({part,level:level+1,lesson:'one-block',attempts:session.attempts},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='one-block-'+part+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
        action('Try again from the start','从头再做一遍',()=>{session=initial();session.full=false;guidedSessions.set(key,session);render();});
      }
    }
    const teacher=el('details',undefined,panel);el('summary',t('Teacher prompt','教师提问提示'),teacher);
    const prompts=[['Ask learners to name the resource that runs out. Give them time to predict before clicking.','先请学生指出哪项资源不够，等他们作出判断再点按钮。'],['Ask a learner to read the arrows aloud. The empty slot is where a decision should go.','请学生从左到右读一遍。空位正是程序需要作判断的位置。'],['Invite two learners to try different rules. Compare the output on exactly the same input.','让两名学生各提一条规则，追问同一输入为何会得到不同输出。'],['Ask why testing only the rejected plan would miss a program that skips everything.','追问：如果只测超限方案，怎样发现一个“什么都跳过”的错误程序？']];
    el('p',t(...prompts[session.step]),teacher);
  }
  render();
}
