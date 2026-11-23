function codingStudio({host,part,level,result,t,term,el,button}){
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
