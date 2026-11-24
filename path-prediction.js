// Learners predict a branch of the selected search. The reference trace
// supplies both the current best and the next candidate's actual outcome.
function createPathPrediction({host, t, term, model, result, el, button, pause, advance, record}) {
  const panel = el('details', undefined, host, 'opt-inspect step-prediction');
  panel.dataset.challenge = 'predict';
  el('summary', t('Predict the next step', '预测程序的下一步'), panel);
  const feedback = el('p', '', panel, 'prediction-feedback');
  feedback.setAttribute('role','status');
  const prompt = el('p', '', panel, 'prediction-prompt');
  const data = el('details', undefined, panel, 'prediction-data');
  el('summary', t('See the inputs', '查看这一步的输入'), data);
  const inputs = el('div', undefined, data);
  const choices = el('div', undefined, panel, 'prediction-choices');
  const labels = {
    skip: t('Skip scoring', '跳过打分'),
    lower: t('Set a new minimum', '更新最低分'),
    tie: t('Keep a tie', '保留并列解'),
    keep: t('Keep the previous winners', '保留原有获胜名单')
  };
  let current, last = null;
  for (const [key,label] of Object.entries(labels)) {
    const choice = button(label, () => predict(key), choices);
    choice.dataset.predict = key;
  }
  panel.addEventListener('toggle', () => { if (panel.open) pause(); });

  function outcome(frame, before) {
    if (!frame.feasible) return 'skip';
    if (before === null || frame.score < before - 1e-9) return 'lower';
    return Math.abs(frame.score - before) < 1e-9 ? 'tie' : 'keep';
  }

  function predict(choice) {
    const {trace, method, index} = current;
    const frame = trace[index + 1];
    if (!frame) return;
    const before = trace[index].bestSoFar;
    const actual = outcome(frame, before);
    const correct = choice === actual;
    const pair = frame.y === null ? 'x = '+frame.x : '('+frame.x+', '+frame.y+')';
    let why;
    if (actual === 'skip') {
      if (frame.y === null) why=t('No quantity of y fits this row.', '这一行没有可行的 y。');
      else {
        const failed = model.resources.filter((r,i)=>r.x*frame.x+r.y*frame.y > result.limits[i]);
        why=t('Over its limit: ','超限资源：')+failed.map(r=>term(r.name)).join('、')+'.';
      }
    } else {
      const comparison = before===null ? t('the first eligible score','首个有效罚分') :
        frame.score + (actual==='tie'?' = ':actual==='lower'?' < ':' > ') + before;
      why=t('Score comparison: ','罚分比较：')+comparison+'.';
    }
    last = {method, step:frame.step, message:(correct?t('Correct. ','正确。'):t('Compare again. ','再比较一下。'))+
      pair+' · '+labels[actual]+'. '+why, correct};
    record({method,step:frame.step,x:frame.x,y:frame.y,before,score:frame.score,choice,actual,correct});
    advance(index+1);
  }

  function update(state) {
    current=state;
    const {trace,index,method}=state, frame=trace[index], next=trace[index+1];
    const matched=last && last.method===method && last.step===frame.step;
    if(!matched)last=null;
    feedback.hidden=!matched;
    if(matched){feedback.textContent=last.message;feedback.dataset.correct=String(last.correct);}
    else {feedback.textContent='';delete feedback.dataset.correct;}
    choices.hidden=!next;data.hidden=!next;
    if(!next){prompt.textContent=t('Search complete. Step back to make another prediction.','搜索结束。退回一步还可以再预测。');return;}
    const at=next.y===null ? 'x = '+next.x : '('+next.x+', '+next.y+')';
    prompt.textContent=t('Next: ','下一步：')+at+' · '+t('Best so far: ','目前最低分：')+
      (frame.bestSoFar??'—')+t('. What will the program do?', '。程序会怎样处理？');
    inputs.replaceChildren();
    if(next.y===null){
      el('p',next.bounds.map((limit,i)=>term(model.resources[i].name)+' '+(limit<0
        ? t('already exceeded at y = 0','在 y = 0 时已超限')
        : 'y ≤ '+limit)).join(' · '),inputs);
      return;
    }
    el('p',model.resources.map((r,i)=>term(r.name)+' '+(r.x*next.x+r.y*next.y)+' / '+result.limits[i]).join(' · '),inputs);
    el('p',model.goals.map((g,i)=>term(g.name)+' '+(g.x*next.x+g.y*next.y)+' / '+g.target+
      t(' (weight ','（权重 ')+result.weights[i]+t(', scale ','，尺度 ')+g.scale+t(')','）')).join(' · '),inputs);
  }
  return {update};
}
