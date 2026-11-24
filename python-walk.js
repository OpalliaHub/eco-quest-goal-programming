// Replay selected line events captured by Python for the current solver visit.
function createPythonWalk({host,t,term,getTrace,onOpen}) {
  function add(tag, parent, cls, text) {
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=text;
    parent.append(node);
    return node;
  }
  const root=add('details',host,'python-walk');
  root.dataset.pythonFlow='';
  add('summary',root,'',t('Step through Python','逐行看 Python'));
  const pane=add('div',root,'pw-pane');
  const status=add('div',pane,'pw-status');
  status.setAttribute('role','status');
  const retry=add('button',pane,'pw-button',t('Try again','重试'));
  retry.type='button';retry.hidden=true;
  const flow=add('div',pane,'pw-flow');
  const route=add('nav',flow,'pw-route');
  route.setAttribute('aria-label',t('Stages of this Python visit','本次 Python 执行的阶段'));
  const stageMap={visit:'visit',resource:'check',guard:'check',reject:'check',goal:'score',sum:'score',decision:'decision'};
  const stages=[
    ['visit',t('Pick a plan','取方案')],['check',t('Check limits','查资源')],
    ['score',t('Score gaps','算缺口')],['decision',t('Keep the best','留最优')]
  ];
  const stageButtons=new Map();
  let current,trace,eventIndex=0,timer=null,ticket=0,requested='',destroyed=false;
  for (const [name,label] of stages) {
    const b=add('button',route,'pw-stage',label);
    b.type='button';b.dataset.pythonStage=name;
    b.addEventListener('click',()=>{
      if(!trace)return;
      const i=trace.events.findIndex(e=>stageMap[e.kind]===name);
      if(i>=0){stop();eventIndex=i;paint();}
    });
    stageButtons.set(name,b);
  }
  const card=add('section',flow,'pw-card');
  const navigation=add('div',flow,'pw-controls');
  const count=add('span',navigation,'pw-counter');
  function button(name,label,click) {
    const b=add('button',navigation,'pw-button',label);
    b.type='button';b.setAttribute('data-python-'+name,'');b.addEventListener('click',click);
    return b;
  }
  const prev=button('prev',t('Previous line','上一处'),()=>move(-1));
  const next=button('next',t('Next line','下一处'),()=>move(1));
  const play=button('play','',()=>{
    if(timer){stop();return;}
    if(eventIndex===trace.events.length-1)eventIndex=0;
    timer=setInterval(()=>{
      if(!root.open || !root.isConnected){stop();return;}
      if(eventIndex<trace.events.length-1)eventIndex++;
      if(eventIndex===trace.events.length-1)stop();
      paint();
    },1300);
    play.textContent=t('Pause lines','暂停');
    paint();
  });
  const raw=add('details',flow,'pw-raw');
  add('summary',raw,'',t('Show JSON for this visit','查看本次执行的 JSON'));
  const rawText=add('pre',raw,'');
  raw.addEventListener('toggle',()=>{
    rawText.textContent=raw.open && trace?JSON.stringify(trace,null,2):'';
  });

  function stop() {
    clearInterval(timer);timer=null;
    play.textContent=t('Play lines','播放代码');
  }
  function move(change) {
    stop();
    if(!trace)return;
    eventIndex=Math.min(trace.events.length-1,Math.max(0,eventIndex+change));
    paint();
  }
  const num=v=>v==null?'—':String(v);
  const pair=(x,y)=>'('+x+', '+y+')';
  function explanation(event) {
    const v=event.values;
    switch(event.kind){
      case 'visit':
        return v.y===null
          ?t('Try row x = '+v.x+'. No nonnegative y fits the row bounds.',
             '检查 x = '+v.x+' 这一行。没有非负整数 y 满足所有行界。')
          :t('Try '+pair(v.x,v.y)+'. Carry in the lowest score from earlier visits.',
             '检查 '+pair(v.x,v.y)+'，同时读入前面步骤找到的最低分。');
      case 'resource':
        return term(v.resource)+' · '+v.used+(v.ok?' ≤ ':' > ')+v.limit+' · '+
          (v.ok?t('within the limit','符合上限'):t('over the limit','超过上限'));
      case 'guard':
        return v.feasible?t('Every resource fits. Continue to the two goals.','每项资源都够用，继续计算两个目标的缺口。'):
          t('At least one resource is over its limit. Follow the return path.','至少一项资源超限，程序将提前返回。');
      case 'reject':
        return t('Return before assigning a penalty. The score is None.','程序在计分前返回，score 的值是 None。');
      case 'goal':
        return term(v.goal)+' · '+t('shortfall','缺口')+' = max(0, '+v.target+' − '+v.value+') = '+v.gap+
          ' · '+t('penalty','罚分')+' = '+v.weight+' × '+v.gap+' ÷ '+v.scale+' = '+num(v.penalty);
      case 'sum':
        return t('Add this goal’s penalty to the running total.','把这一项目标的罚分加入当前总分。')+'  Z = '+num(v.score);
      case 'decision':
        if(v.decision==='skip')return t('Skip the comparison. This visit has no eligible score.','跳过比较。这一步没有可比较的罚分。');
        if(v.decision==='tie')return t('Keep this pair as another winner. The minimum stays at ','把这个方案也记为并列最优。目前最低分仍为 ')+num(v.after)+t('.','。');
        if(v.decision==='lower')return v.before===null?
          t('Record the first eligible score.','记录第一个可行方案的罚分。'):
          t('Replace the previous minimum with the lower score.','发现更低罚分，更新最低分和获胜名单。');
        return t('Keep the earlier winner. This score is higher.','这个方案的罚分较高，保留原来的最优方案。');
      default:return event.function;
    }
  }
  function paint() {
    if(!trace)return;
    const e=trace.events[eventIndex];
    for(const [name,b] of stageButtons) {
      const present=trace.events.some(item=>stageMap[item.kind]===name);
      b.disabled=!present;
      b.setAttribute('aria-current',stageMap[e.kind]===name?'step':'false');
      b.title=present?b.textContent:t('This stage did not run for this visit','本次执行跳过此阶段');
    }
    count.textContent=t('Event ','执行片段 ')+(eventIndex+1)+' / '+trace.events.length;
    prev.disabled=eventIndex===0;next.disabled=eventIndex===trace.events.length-1;
    card.dataset.eventKind=e.kind;card.replaceChildren();
    add('strong',card,'pw-explain',explanation(e));
    const file=add('div',card,'pw-source');
    const source=add('div',file,'pw-filename');
    const lines=e.code.split('\n');
    add('span',source,'',trace.source+' · '+e.function+'()');
    const range=String(e.line)+(lines.length>1?'–'+(e.line+lines.length-1):'');
    add('span',source,'',t('Line ','行 ')+range);
    const code=add('pre',file,'pw-code');
    add('code',code,'',e.code);
    const locals=add('dl',card,'pw-locals');
    const fields=Object.entries(e.values).filter(([key])=>!['resource','goal','decision','x','y'].includes(key) || e.kind==='visit' && (key==='x'||key==='y'));
    for (const [key,value] of fields) {
      const item=add('div',locals,'');add('dt',item,'',key);
      const formatted=value===null?'None':value===true?'True':value===false?'False':
        Array.isArray(value)?'['+value.join(', ')+']':String(value);
      add('dd',item,'',formatted);
    }
  }
  function message(mode,text) {
    root.dataset.pythonState=mode;status.textContent=text;
    retry.hidden=mode!=='error';flow.hidden=mode!=='ready';
  }
  async function refresh() {
    const key=++ticket;
    stop();trace=undefined;eventIndex=0;raw.open=false;rawText.textContent='';
    if(!root.open || !current || destroyed)return;
    const {engine,method,frame}=current;
    if(engine!=='python'){
      message('offline',t('Live Python line events are available when the classroom Python service is connected. The browser can still replay the search.',
        '连接课堂 Python 服务后即可查看真实的逐行执行记录。此时仍可在浏览器回放搜索。'));return;
    }
    message('loading',t('Reading this Python visit…','正在读取这一步的 Python 执行记录…'));
    try {
      const data=await getTrace(method,frame.step);
      if(key!==ticket || !root.open || destroyed)return;
      if(data.method!==method || data.step!==frame.step || !data.events?.length ||
          data.result?.x!==frame.x || data.result?.y!==frame.y)throw Error('Mismatched trace');
      trace=data;
      const where=frame.y===null?'x = '+frame.x:pair(frame.x,frame.y);
      message('ready',t('Search step ','搜索步骤 ')+frame.step+' / '+data.total+' · '+where);
      paint();
    } catch {
      if(key!==ticket || !root.open || destroyed)return;
      message('error',t('The Python service could not return the line events for this step.','Python 服务未能返回这一步的逐行执行记录。'));
    }
  }
  retry.addEventListener('click',refresh);
  root.addEventListener('toggle',()=>{
    if(root.open)onOpen?.();
    refresh();
  });
  return {
    update(nextFrame) {
      current=nextFrame;
      const {engine,method,frame}=current;
      const key=[engine,method,frame.step,frame.x,frame.y].join('/');
      if(requested===key)return;
      requested=key;
      if(root.open)refresh();
    },
    destroy() {destroyed=true;ticket++;stop();root.remove();}
  };
}
