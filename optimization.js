function optimizationLab({host, model, result, t, term, el, button, math, onComplete}) {
  const lab = el('section', undefined, host, 'opt-lab');
  const answer = searchRows(model, result.limits, result.weights, QuestModels.evaluate);
  const controls = el('div', undefined, lab, 'learn-controls');
  const method = el('select', undefined, controls);
  method.setAttribute('aria-label', t('Search method','搜索方法'));
  for (const label of [t('Row bounds · hand method','逐行定界 · 手算方法'), t('Full enumeration','逐一枚举')]) el('option',label,method);
  const note = el('p',undefined,lab);
  const display = el('div',undefined,lab,'opt-display');
  const board = el('div',undefined,display);
  const chart = el('div',undefined,display);
  const steps = el('div',undefined,lab,'learn-controls');
  const back = button(t('Previous step','上一步'),()=>move(index-1),steps);
  const play = button('',()=>clock ? stop() : start(),steps);
  const next = button(t('Next step','下一步'),()=>move(index+1),steps);
  button(t('Finish','看最终结果'),()=>move(frames().length-1),steps);
  const working = el('div',undefined,lab,'opt-work');
  let index=0, clock=null;
  const bounded=()=>method.selectedIndex===0;
  const frames=()=>bounded()?answer.rows.map(row=>row.point):result.candidates;
  function stop(){clearInterval(clock);clock=null;play.textContent=t('Play','播放');}
  function start(){
    if(index===frames().length-1) index=0;
    play.textContent=t('Pause','暂停'); draw();
    clock=setInterval(()=>{if(!lab.isConnected){stop();return;}index++;draw();},650);
  }
  function move(i){stop();index=i;draw();}
  method.onchange=()=>move(0);
  function draw(){
    const list=frames(), p=list[index], seen=list.slice(0,index+1);
    let best=Infinity;
    const history=seen.map(item=>{if(item?.feasible) best=Math.min(best,item.score);return best;});
    if(index===list.length-1){stop();onComplete();}
    back.disabled=index===0;next.disabled=index===list.length-1;
    note.textContent=bounded()?t('Fix x. The resources give the largest y you can afford. Both outputs increase with y, so this endpoint gives the lowest score in its row.','先固定 x，用每项剩余资源算出还能放多少个 y，取最小上限。增加 y 会提高两项目标的完成量，因此行末一定取得本行最低分。'):t('Visit every pair. Only feasible pairs can improve the best score.','依次检查每对数量。只有满足所有限制的方案才可能刷新最低分。');
    board.replaceChildren();chart.replaceChildren();working.replaceChildren();
    el('strong',t('Step ','步骤 ')+(index+1)+' / '+list.length,board);
    el('p',t('Current plan','当前方案')+'  '+(p?'('+p.x+', '+p.y+')':t('No feasible y','本行无可行 y')),board);
    el('p',t('Current score','当前分数')+'  '+(p?.feasible?Number(p.score.toFixed(3)):'—'),board);
    el('strong',t('Lowest so far','目前最低分')+'  '+Number(best.toFixed(3)),board);
    const ns='http://www.w3.org/2000/svg', svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 460 155');svg.setAttribute('role','img');
    svg.setAttribute('aria-label',t('Score by step','分数随步骤变化'));chart.append(svg);
    function shape(tag,props,label){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(props)) n.setAttribute(k,v);n.textContent=label||'';svg.append(n);}
    const high=Math.max(...list.filter(p=>p?.feasible).map(p=>p.score)), X=i=>37+401*i/(list.length-1), Y=v=>122-104*v/(high||1);
    shape('path',{d:'M37 15V122H442',fill:'none',stroke:'#718982'});
    for(const v of [0,high])shape('text',{x:4,y:Y(v)+4,'font-size':12},String(v));
    shape('text',{x:37,y:145,'font-size':12},'1');
    shape('text',{x:414,y:145,'font-size':12},String(list.length));
    shape('text',{x:209,y:145,'font-size':12},t('Step','步骤'));
    const pts=history.map((v,i)=>X(i)+','+Y(v)).join(' ');
    shape('polyline',{points:pts,fill:'none',stroke:'#087269','stroke-width':3});
    seen.forEach((v,i)=>{if(v?.feasible)shape('circle',{cx:X(i),cy:Y(v.score),r:3,fill:'#a75018'});});
    el('small',t('Orange dots: feasible scores. Green line: lowest score so far.','橙点表示可行方案的分数，绿线表示截至该步的最低分。'),chart);
    if(bounded()){
      const row=answer.rows[index];
      if(row.point){
        el('p',t('After setting aside resources for x = ','先为 x = ')+row.x+t(', the maximum y allowed by each limit is shown below. Round down because you need whole batches.',' 预留资源。各项资源还能支持的 y 数量如下，只能取整数，所以小数向下取整。'),working);
        el('p',model.resources.map((r,j)=>term(r.name)+' '+row.bounds[j]).join(' · '),working);
        const caps=model.resources.map((r,j)=>r.y?'\\left\\lfloor\\frac{'+result.limits[j]+'-'+r.x+'\\cdot '+row.x+'}{'+r.y+'}\\right\\rfloor':'8');
        math(working,'y_{\\max}=\\min\\left(8,'+caps.join(',')+'\\right)='+row.y);
      }else el('p',t('Already over a resource limit at y = 0.','取 y = 0 时就已超出资源上限。'),working);
    }
    if(p?.feasible){
      model.goals.forEach((g,j)=>{el('small',term(g.name),working);math(working,'g_{'+(j+1)+'}='+g.x+'\\cdot '+p.x+'+'+g.y+'\\cdot '+p.y+'='+p.values[j]+',\\quad d_{'+(j+1)+'}^{-}=\\max(0,'+g.target+'-'+p.values[j]+')='+p.shortfalls[j]);});
      math(working,'Z='+model.goals.map((g,j)=>result.weights[j]+'\\cdot\\frac{'+p.shortfalls[j]+'}{'+g.scale+'}').join('+')+'='+Number(p.score.toFixed(3)));
    }else if(p) el('p',t('Over the limit: ','超限项目：')+p.reasons.map(term).join(', '),working);
    if(index===list.length-1){
      const winners=bounded()?answer.winners:result.winners;
      el('h4',t('All minimum-score plans','所有最低分方案'),working);
      el('p',winners.map(v=>'('+v.x+', '+v.y+')').join(' · '),working);
      if(bounded())el('p',t('In each winning row, move left from its endpoint while the score stays equal. This includes ties inside a row.','在每个获胜行，从行末逐个减小 y，直到分数变大。这样也能找到行内的并列方案。'),working);
    }
  }
  const debug=el('details',undefined,lab,'story-intro');
  el('summary',t('Debug a decision','调试一个判断'),debug);
  const mixed=result.candidates.find(v=>!v.feasible && v.resources.some((u,i)=>u<=result.limits[i]));
  if(mixed){
    el('p',t('This plan passes some checks and fails others. Which operator should connect the checks?','这个方案通过了部分检查，却超出另一项限制。应该用哪个运算连接这些检查？')+' ('+mixed.x+', '+mixed.y+')',debug);
    el('p',model.resources.map((r,i)=>term(r.name)+' '+mixed.resources[i]+' / '+result.limits[i]).join(' · '),debug);
    const feedback=el('p','',debug);feedback.setAttribute('aria-live','polite');
    for(const op of ['AND','OR'])button(op,()=>{feedback.textContent=op==='AND'?t('Correct. Every hard limit must hold. This plan is rejected.','正确。每一项硬约束都必须满足，因此淘汰这个方案。'):t('OR accepts a plan as soon as one check passes. Look at the limit it breaks and try again.','OR 只要一项合格就放行。看看这个方案超出了哪项上限，再试一次。');},debug);
  }
  stop();draw();
}
