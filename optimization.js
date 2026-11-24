// Both engines expose the same classroom trace. The browser model is also usable
// when the site is opened from a file or the Python service is unavailable.
function optimizationLab({host, part, level, initialPair, model, result, t, term, unit, el, button, math, onComplete}) {
  const lab = el('section', undefined, host, 'opt-lab');
  const online = location.protocol === 'https:' || location.protocol === 'http:';
  const controls = el('div', undefined, lab, 'learn-controls');
  const methodLabel = el('label', t('Search method ', '搜索方法 '), controls);
  const method = el('select', undefined, methodLabel);
  for (const [value, label] of [
    ['rows', t('Row bounds · hand method', '逐行定界 · 手算方法')],
    ['enumeration', t('Full enumeration', '逐一枚举')]
  ]) el('option', label, method).value = value;
  const status = el('p', '', lab, 'opt-engine');
  status.setAttribute('role', 'status');
  const note = el('p', '', lab);
  const display = el('div', undefined, lab, 'opt-display');
  const board = el('div', undefined, display);
  const chart = el('div', undefined, display, 'opt-chart');
  const steps = el('div', undefined, lab, 'learn-controls');
  const back = button(t('Previous step','上一步'), () => move(index-1), steps);
  const play = button('', () => timer ? stop() : start(), steps);
  const next = button(t('Next step','下一步'), () => move(index+1), steps);
  button(t('Finish','看最终结果'), () => move(trace.length-1), steps);
  const inspect = el('details', undefined, lab, 'opt-inspect');
  el('summary', t('Test a particular plan', '检验你选的方案'), inspect);
  const picks = el('div', undefined, inspect, 'learn-controls');
  const quantities = ['x','y'].map((name,i) => {
    const field = el('label', name+' ', picks);
    const select = el('select', undefined, field);
    for (let n=0;n<=result.maxCount;n++) el('option', String(n), select);
    select.value=initialPair?.[i] ?? (part==='fair' ? [2,7][i] : 0);
    return select;
  });
  button(t('Find this pair in the search','在搜索中查看这一组'), () => {
    const target=(result.maxCount+1)*Number(quantities[0].value)+Number(quantities[1].value);
    if (method.value==='enumeration') move(target);
    else { method.value='enumeration'; loadMethod(target); }
  }, picks);
  const working = el('div', undefined, lab, 'opt-work');
  const mathBox = el('div', undefined, working, 'opt-calculation');
  const summary = el('div', undefined, working, 'opt-answer');
  const code = el('details', undefined, lab, 'opt-code');
  el('summary', t('Read the Python behind this calculation','看这一步背后的 Python'), code);
  el('p', t('The search tries a pair of quantities, checks supplies, and scores the remaining goal gaps only when the plan fits.', '程序取出一组数量，先查资源是否够用，再给可行方案的两个目标缺口打分。'), code);
  const snippet=el('pre',undefined,code); snippet.hidden=true;
  const sourceLink=el('a',t('Open the complete Python model','打开完整 Python 模型源码'),code);
  sourceLink.href='kernel/lesson_model.py'; sourceLink.target='_blank';sourceLink.rel='noopener';
  let sourceRead=false;
  code.addEventListener('toggle',async()=>{
    if(!code.open||sourceRead||!online)return;
    sourceRead=true;
    try{
      const response=await get('api/source.py','text');
      const lines=response.split('\n');
      const first=lines.findIndex(line=>line.startsWith('def goal_penalty('));
      if(first<0 || !lab.isConnected)return;
      let end=first+1;
      while(end<lines.length && (lines[end].startsWith(' ') || !lines[end].trim()))end++;
      snippet.textContent=lines.slice(first,end).join('\n').trimEnd();
      snippet.hidden=false;
    }catch{sourceRead=false;}
  });

  const cache=new Map(), details=new Map(), localTraces=new Map();
  const life=new AbortController();
  let index=0, timer, revision=0, frameRevision=0, engine='browser', trace=[], answer;
  const fmt=n=>Number.isFinite(n) ? +n.toFixed(3) : '—';
  const query=(path,extra)=>'api/'+path+'?'+new URLSearchParams({part,level,...extra});
  function localSolution(name) {
    if(localTraces.has(name))return localTraces.get(name);
    const rows=name==='rows' ? searchRows(model,result.limits,result.weights,QuestModels.evaluate) : null;
    let best=Infinity;
    const candidates=rows ? rows.rows.map(row=>row.point) : result.candidates;
    const frames=candidates.map((candidate,i)=>{
      if(candidate?.feasible)best=Math.min(best,candidate.score);
      return {step:i+1, x:rows?rows.rows[i].x:candidate.x, y:candidate?.y??null, feasible:!!candidate?.feasible,
        score:candidate?.feasible?candidate.score:null, bestSoFar:Number.isFinite(best)?best:null, bounds:rows?.rows[i].bounds};
    });
    const value={method:name,limits:result.limits,weights:result.weights,bestScore:result.bestScore,
      feasibleCount:result.feasible.length,winners:result.winners.map(p=>[p.x,p.y]),trace:frames};
    localTraces.set(name,value);
    return value;
  }
  function localDetail(x,y) {
    const p=result.candidates.find(p=>p.x===x&&p.y===y);
    return {x,y,feasible:p.feasible,score:p.feasible?p.score:null,
      resources:model.resources.map((r,j)=>({...r,used:p.resources[j],limit:result.limits[j],ok:p.resources[j]<=result.limits[j]})),
      goals:p.feasible?model.goals.map((g,j)=>({...g,coefX:g.x,coefY:g.y,value:p.values[j],gap:p.shortfalls[j],weight:result.weights[j]})):[]};
  }
  async function get(url,kind='json') {
    const request=new AbortController();
    const abort=()=>request.abort();
    if(life.signal.aborted)throw Error('View closed');
    life.signal.addEventListener('abort',abort,{once:true});
    const timeout=setTimeout(abort,4500);
    try {
      const res=await fetch(url,{signal:request.signal,cache:'no-cache'});
      if(!res.ok)throw Error('Service unavailable');
      return kind==='text'? await res.text():await res.json();
    } finally {clearTimeout(timeout);life.signal.removeEventListener('abort',abort);}
  }
  function alive(token){return token===revision && lab.isConnected;}
  function useLocal(){
    engine='browser';
    status.textContent=online?t('Browser calculation · Python service unavailable','浏览器计算 · 暂时无法连接 Python 服务'):t('Offline · calculated in this browser','离线 · 由浏览器计算');
    status.dataset.engine='browser';
    answer=localSolution(method.value);trace=answer.trace;draw();
  }
  async function loadMethod(start=0){
    stop();
    const token=++revision, name=method.value;
    index=start;engine='browser';answer=localSolution(name);trace=answer.trace;
    if(!online){useLocal();return;}
    status.dataset.engine='loading';
    status.textContent=t('Connecting to Python · browser preview','正在连接 Python · 先显示浏览器预览');
    draw();
    try {
      let payload=cache.get(name);
      if(!payload){
        payload=await get(query('solve',{method:name}));
        if(payload.part!==part || payload.level!==level || payload.method!==name ||
           payload.trace?.length!==(name==='rows'?result.maxCount+1:result.candidates.length) || !Array.isArray(payload.winners))throw Error('Unexpected model response');
        cache.set(name,payload);
      }
      if(!alive(token))return;
      engine='python';status.dataset.engine='python';status.textContent=t('Python · live model','Python · 实时模型');
      answer=payload;trace=answer.trace;draw();
    }catch{if(alive(token))useLocal();}
  }
  function stop(){clearInterval(timer);timer=null;play.textContent=t('Play','播放');}
  function start(){
    if(index===trace.length-1)index=0;
    play.textContent=t('Pause','暂停');draw();
    timer=setInterval(()=>{if(!lab.isConnected){stop();return;}move(index+1,false);},750);
  }
  function move(i,pause=true){if(pause)stop();index=Math.max(0,Math.min(trace.length-1,i));draw();}
  method.onchange=()=>loadMethod();

  function browserChart(){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 460 155');svg.setAttribute('role','img');
    svg.setAttribute('aria-label',t('Feasible scores and lowest score by step','每一步的可行分数和最低分'));chart.replaceChildren(svg);
    function shape(tag,attrs,label){
      const node=document.createElementNS(svg.namespaceURI,tag);
      for(const [key,val] of Object.entries(attrs))node.setAttribute(key,val);
      if(label!==undefined)node.textContent=label;
      svg.append(node);
    }
    const high=Math.max(1,...trace.map(p=>p.score??0)), X=i=>36+402*i/(trace.length-1), Y=n=>122-102*n/high,seen=trace.slice(0,index+1);
    shape('path',{d:'M36 15V122H441',fill:'none',stroke:'#718982'});
    for(const n of [0,high])shape('text',{x:4,y:Y(n)+4,'font-size':12},fmt(n));
    shape('text',{x:35,y:145,'font-size':12},'1');shape('text',{x:415,y:145,'font-size':12},trace.length);
    shape('text',{x:205,y:145,'font-size':12},t('Step','步骤'));
    const path=seen.flatMap((p,i)=>p.bestSoFar==null?[]:[(i?'H'+X(i)+'V':'M'+X(i)+',')+Y(p.bestSoFar)]).join(' ');
    shape('path',{d:path,fill:'none',stroke:'#087269','stroke-width':3});
    seen.forEach((p,i)=>{if(p.feasible)shape('circle',{cx:X(i),cy:Y(p.score),r:3,fill:'#a75018'});});
  }
  function paintMath(frame,detail){
    mathBox.replaceChildren();
    if(method.value==='rows'){
      if(frame.y===null){el('p',t('Even y = 0 breaks a resource limit in this row.','取 y = 0 时，这一行也已经超出资源上限。'),mathBox);return;}
      el('p',t('Fix x at ','固定 x = ')+frame.x+t('. The remaining resources allow these whole-number upper bounds for y.','，计算各项剩余资源允许的 y 的整数上限。'),mathBox);
      el('p',model.resources.map((r,j)=>term(r.name)+' '+frame.bounds[j]).join(' · '),mathBox);
      const caps=model.resources.map((r,j)=>r.y?'\\left\\lfloor\\frac{'+answer.limits[j]+'-'+r.x+'\\cdot '+frame.x+'}{'+r.y+'}\\right\\rfloor':String(result.maxCount));
      math(mathBox,'y_{\\max}=\\min\\left('+caps.join(',')+'\\right)='+frame.y);
    }
    if(!detail)return;
    const used=detail.resources.map(r=>term(r.name)+' '+r.used+'/'+r.limit+' '+unit(r.unit));
    el('p',used.join(' · '),mathBox);
    if(!detail.feasible){
      el('p',t('Skip before scoring. Over the limit: ','超限，跳过计分。超出上限的资源：')+detail.resources.filter(r=>!r.ok).map(r=>term(r.name)).join(', '),mathBox);
      return;
    }
    detail.goals.forEach((g,j)=>{
      el('small',term(g.name),mathBox);
      math(mathBox,'g_{'+(j+1)+'}='+g.coefX+'\\cdot '+frame.x+'+'+g.coefY+'\\cdot '+frame.y+'='+g.value+',\\quad d_{'+(j+1)+'}^{-}=\\max(0,'+g.target+'-'+g.value+')='+g.gap);
    });
    math(mathBox,'Z='+detail.goals.map(g=>g.weight+'\\cdot\\frac{'+g.gap+'}{'+g.scale+'}').join('+')+'='+fmt(detail.score));
  }
  function draw(){
    const token=++frameRevision,frame=trace[index], end=index===trace.length-1;
    back.disabled=index===0;next.disabled=end;
    if(end){stop();onComplete();}
    note.textContent=method.value==='rows'?t('Fix x. Each resource gives an upper bound on y. Try the largest y that fits them all.','先固定 x，算出每项资源允许的 y 上限，再试同时满足这些上限的最大 y。'):t('Try every pair. A plan can compete for the lowest score only if every resource fits.','依次检查每对数量，只有满足所有限制的方案才参加最低分比较。');
    board.replaceChildren();summary.replaceChildren();
    el('strong',t('Step ','步骤 ')+frame.step+' / '+trace.length,board);
    el('p',t('Current plan','当前方案')+'  '+(frame.y===null?'x = '+frame.x+' · '+t('No feasible y','本行无可行 y'):'('+frame.x+', '+frame.y+')'),board);
    el('p',t('Current score','当前分数')+'  '+fmt(frame.score),board);
    el('strong',t('Lowest so far','目前最低分')+'  '+fmt(frame.bestSoFar),board);
    if(end){
      el('h4',t('All minimum-score plans','所有最低分方案'),summary);
      el('p',answer.feasibleCount+' / '+result.candidates.length+' '+t('feasible plans','个方案可行'),summary);
      el('p','Z = '+fmt(answer.bestScore)+' · '+answer.winners.map(([x,y])=>'('+x+', '+y+')').join(' · '),summary);
      if(method.value==='rows')el('p',t('For each winning row, check smaller y values until the score increases. This recovers ties within a row.','在每个获胜行，从行末逐个减小 y，直到分数变大，以找全并列方案。'),summary);
      if(engine==='python' && Array.isArray(answer.distribution) && answer.distribution.length){
        const counts=el('details',undefined,summary,'opt-inspect');
        el('summary',t('How many plans share each score?','每个分数有多少个方案？'),counts);
        el('p',t('SQLite groups feasible plans by their total penalty. Here are the three lowest distinct scores, or all scores if fewer.','SQLite 按总罚分给可行方案分组。这里显示最低的三个不同分数；不足三组时显示全部。'),counts);
        const list=el('ul',undefined,counts);
        for(const group of answer.distribution.slice(0,3)){
          el('li','Z = '+fmt(group.score)+' · '+group.plans+t(group.plans===1?' plan':' plans',' 个方案'),list);
        }
      }
    }
    browserChart();
    if(engine==='python'){
      const img=new Image();
      img.alt=t('Python chart of the search through step ','Python 搜索过程图，展示至第 ')+frame.step;
      img.onload=()=>{if(token===frameRevision&&lab.isConnected)chart.replaceChildren(img);};
      img.src=query('chart.svg',{method:method.value,step:frame.step,lang:t('en','zh')});
    }
    if(frame.y===null){paintMath(frame,null);return;}
    const key=frame.x+','+frame.y;
    if(engine!=='python'){paintMath(frame,localDetail(frame.x,frame.y));return;}
    if(details.has(key)){paintMath(frame,details.get(key));return;}
    mathBox.replaceChildren();
    el('p',t('Checking this plan in Python…','Python 正在核对这一组方案…'),mathBox);
    get(query('step',{x:frame.x,y:frame.y})).then(data=>{
      if(data.x!==frame.x || data.y!==frame.y || data.part!==part || data.level!==level ||
          !Array.isArray(data.resources)||!Array.isArray(data.goals))throw Error('Unexpected step response');
      details.set(key,data);
      if(token===frameRevision&&lab.isConnected)paintMath(frame,data);
    }).catch(()=>{if(token===frameRevision&&lab.isConnected)useLocal();});
  }
  const debug=el('details',undefined,lab,'story-intro');
  el('summary',t('Debug a decision','调试一个判断'),debug);
  const mixed=result.candidates.find(p=>!p.feasible && p.resources.some((u,i)=>u<=result.limits[i]));
  if(mixed){
    el('p',t('This plan passes some resource checks and fails others. To accept a plan, should the passing checks be joined by AND or OR?','这个方案只有部分资源够用。要接纳一个方案，各项资源合格的条件应当用 AND 还是 OR 连接？')+' ('+mixed.x+', '+mixed.y+')',debug);
    el('p',model.resources.map((r,i)=>term(r.name)+' '+mixed.resources[i]+' / '+result.limits[i]).join(' · '),debug);
    const feedback=el('p','',debug);feedback.setAttribute('aria-live','polite');
    for(const op of ['AND','OR'])button(op,()=>{feedback.textContent=op==='AND'?t('Correct. Every hard limit must hold. This plan is rejected.','正确。每项硬约束都必须满足，这个方案应被淘汰。'):t('OR would accept a plan when just one check passes. Look at the limit it breaks and try again.','OR 只要一项合格就会放行。看看超出的资源上限，再试一次。');},debug);
  }
  if(initialPair)method.value='enumeration';
  loadMethod(initialPair ? (result.maxCount+1)*initialPair[0]+initialPair[1] : 0);
  return ()=>{life.abort();stop();revision++;frameRevision++;};
}
