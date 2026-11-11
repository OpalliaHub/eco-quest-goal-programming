/* Bilingual, finite-domain weighted goal programming walkthrough. */
(function () {
  'use strict';
  const host = document.getElementById('learning');
  let language = 'en';
  try { language = localStorage.getItem('ecoquest-language') || 'en'; } catch (_) {}
  let part = 'fair', level = 0, step = 0, phase = 0, timer;
  let plan = [0, 0], prediction = '', reflection = '', submitted = false;
  const names = {
    fair: ['Campus Eco Fair', '校园环保市集'], garden: ['Berry Garden', '树果园'],
    center: ['Pokémon Center Supplies', '宝可梦中心补给'], field: ['Field Survey', '野外调查'],
    cards: ['TCG Deck Workshop', '宝可梦卡牌工作坊']
  };
  const products = {
    fair: ['书签批次', '笔记本批次'], garden: ['橙橙果种植床', '桃桃果种植床'],
    center: ['舒适补给包', '野外补给包'], field: ['河岸调查轮次', '林地调查轮次'], cards: ['入门牌组', '战术牌组']
  };
  const terms = {'Survey time':'调查时间','Camera battery':'相机电量','Round limit':'调查轮数','Useful photos':'有效照片','Habitat coverage':'栖息地覆盖','Trainer cards':'训练家卡','Energy cards':'能量卡','Pokémon cards':'宝可梦卡','Deck boxes':'牌组盒','Beginner practice':'入门练习','Tactics practice':'战术练习','Cost':'费用','Production effort':'制作工时','Display space':'陈列空间','Paper stock':'纸张库存','Water':'用水','Care time':'照料时间','Garden space':'种植空间','Materials':'材料','Packing time':'打包时间','Shelf space':'货架空间','Funds':'筹款盈余','Paper reuse':'纸张再利用','Harvest':'收成','Habitat':'栖息地','Center readiness':'中心准备度','Trail readiness':'野外准备度'};
  const t = (en, zh) => language === 'zh' ? zh : en;
  const term = value => language === 'zh' ? (terms[value] || value) : value;
  const n = value => Number(value.toFixed(3));
  const el = (tag, text, parent, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    if (parent) parent.append(node);
    return node;
  };
  const button = (text, handler, parent, disabled = false) => {
    const node = el('button', text, parent, 'button outline');
    node.type = 'button'; node.disabled = disabled; node.onclick = handler;
    return node;
  };
  function settings() {
    const limits = QuestModels.defaults(part);
    if (level === 2) {
      const editable = QuestModels.models[part].resources.findIndex(r => r.editable);
      limits[editable] += Math.max(1, Math.ceil(limits[editable] / 5));
    }
    return { limits, weights: level === 1 ? [3, 1] : [1, 1] };
  }
  function run() {
    const s = settings();
    return QuestModels.solve(part, s.limits, s.weights);
  }
  function reset() {
    clearInterval(timer); timer = undefined;
    step = 0; phase = 0; plan = [0, 0]; prediction = ''; reflection = ''; submitted = false;
    render();
  }
  function next() {
    if (phase < 3) phase++;
    else if (step < 80) { step++; phase = 0; }
    else { clearInterval(timer); timer = undefined; }
    render();
  }
  function render() {
    host.replaceChildren();
    const header = el('div', undefined, host, 'learn-controls');
    el('h2', t('Goal Programming Academy', '目标规划训练学院'), header);
    button(language === 'en' ? '中文' : 'English', () => {
      language = language === 'en' ? 'zh' : 'en';
      try { localStorage.setItem('ecoquest-language', language); } catch (_) {}
      render();
    }, header);
    host.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.dispatchEvent(new CustomEvent('ecoquest:language', {detail:language}));
    el('p', t('Five parts, three challenges each. Predict, build a plan, inspect the algorithm, then defend your decision.', '五个主题，每个主题三道分级挑战。先预测，再搭建方案，观察算法，最后解释自己的决策。'), host);
    const tabs = el('div', undefined, host, 'learn-controls');
    for (const [id, label] of Object.entries(names)) {
      const b = button(t(...label), () => { part = id; reset(); }, tabs);
      b.setAttribute('aria-pressed', String(id === part));
    }
    const levels = el('div', undefined, host, 'learn-controls');
    [t('Foundation · balance two goals','基础 · 平衡两个目标'),t('Intermediate · priorities','进阶 · 改变目标权重'),t('Challenge · resource upgrade','挑战 · 资源升级')].forEach((label, i) => {
      const b = button(label, () => { level = i; reset(); }, levels);
      b.setAttribute('aria-pressed', String(level === i));
    });
    const result = run(), model = result.model;
    if (part === 'cards') button(t('Open three playable card battles','打开三道可操作卡牌对战'), () => { document.querySelector('[data-module=cards]').click(); document.getElementById('battle').scrollIntoView({behavior:'smooth'}); }, host);
    const chosen = result.candidates.find(p => p.x === plan[0] && p.y === plan[1]);
    el('h3', t(...names[part]) + ' — ' + t('Mission ', '任务 ') + (level + 1), host);
    el('p', level === 0 ? t('Find a feasible plan with the smallest total weighted shortfall. Explain whether both targets can be met.', '寻找加权偏差总和最小的可行方案，说明两个目标能否同时达成。') : level === 1 ? t('Goal 1 now has weight 3. Predict whether the best plan changes. Explain why the feasible set stays the same.', '目标一的权重变为 3。预测最优方案是否变化，并解释为什么可行域保持相同。') : t('The first editable resource has been increased by 20%, rounded up. Compare the best score with the original resources. Is this resource the bottleneck?', '第一个可调整资源增加 20% 并向上取整。与原资源下的最优分数比较，这项资源是否为瓶颈？'), host);
    el('p', t('Decision variables: ', '决策变量：') + ['x', 'y'].map((v, i) => `${v} = ${language === 'zh' ? products[part][i] : model.products[i]}`).join('；') + t('. Both are integers from 0 to 8.', '。两者均为 0 至 8 的整数。'), host);
    const table = el('table', undefined, host, 'learn-table');
    model.resources.forEach((r, i) => {
      const row = el('tr', undefined, table);
      el('th', term(r.name), row); el('td', `${r.x}x + ${r.y}y ≤ ${result.limits[i]} ${r.unit}`, row);
      el('td', `${chosen.resources[i]} / ${result.limits[i]} ${chosen.resources[i] <= result.limits[i] ? '✓' : '✕'}`, row);
    });
    model.goals.forEach((g, i) => el('p', `${t('Goal','目标')} ${i + 1}: ${term(g.name)} = ${g.x}x + ${g.y}y ≥ ${g.target} ${g.unit}; ${t('scale','尺度')} s${i+1} = ${g.scale}; w${i+1} = ${result.weights[i]}`, host));
    el('p', t('All quantities are fictional classroom data. We penalise only shortfalls; exceeding a target carries no penalty.', '所有数值均为课堂假设。本模型只惩罚未达到目标的负偏差，超过目标不罚分。'), host);
    const label = el('label', t('Predict a plan and justify one constraint before exploring', '探索前先预测一个方案，并写出一项约束检验'), host);
    const input = el('textarea', undefined, label); input.value = prediction;
    input.oninput = () => { prediction = input.value; };
    const actions = el('div', undefined, host, 'learn-controls');
    for (let i = 0; i < 2; i++) {
      button(`+ ${i === 0 ? 'x' : 'y'}`, () => { plan[i]++; submitted = false; render(); }, actions, plan[i] >= 8 || !result.candidates.find(p => p.x === plan[0]+(i===0?1:0) && p.y === plan[1]+(i===1?1:0))?.feasible);
      button(`− ${i === 0 ? 'x' : 'y'}`, () => { plan[i]--; submitted = false; render(); }, actions, plan[i] === 0);
    }
    el('p', `${t('Your plan','你的方案')} (${plan.join(', ')}) · Z = ${n(chosen.score)}`, host);
    const tokens = el('div', undefined, host, 'learn-tokens');
    for (let i=0;i<plan[0]+plan[1];i++) el('span', i<plan[0] ? '⚡ x' : '🌿 y', tokens);
    button(t('Check my plan','检查我的方案'), () => { submitted = true; render(); }, actions);
    if (submitted) el('p', prediction.trim() ? (Math.abs(chosen.score-result.bestScore)<1e-9 ? t('Optimal! Explain the remaining shortfalls and any tied plans.','达到最优！请解释剩余偏差及并列最优方案。') : t('Feasible, but a lower score is possible. Use the walkthrough to find a better plan.','方案可行，但存在更低分数。使用下方演示寻找更好的方案。')) : t('Write your prediction and a constraint check first.','请先填写预测及约束检验。'), host, 'learn-feedback');
    el('h3', t('Watch the algorithm run','观察算法如何运行'), host);
    el('p', t('Exact enumeration on the bounded integer domain: visit all 81 pairs. The four stages show real solver values. This is a small-instance goal-programming algorithm, not a simplex demonstration.', '在有界整数域内穷举求解：遍历全部 81 个数对。四个阶段展示求解器的真实计算值。这是适用于小规模目标规划的枚举算法演示。'), host);
    const controls = el('div', undefined, host, 'learn-controls');
    button(t('Next step','下一步'), next, controls, step === 80 && phase === 3);
    button(timer ? t('Pause','暂停') : t('Play','播放'), () => {
      if (timer) { clearInterval(timer); timer = undefined; } else timer = setInterval(next, 650);
      render();
    }, controls, step === 80 && phase === 3);
    button(t('Restart trace','重播算法'), () => { clearInterval(timer); timer=undefined; step=0;phase=0;render(); }, controls);
    button(t('Show completed search','查看完整搜索'), () => { clearInterval(timer);timer=undefined;step=80;phase=3;render(); }, controls);
    const slider = el('input', undefined, controls); slider.type='range';slider.min=0;slider.max=323;slider.value=step*4+phase;
    slider.setAttribute('aria-label',t('Algorithm step','算法步骤'));
    slider.oninput=()=>{clearInterval(timer);timer=undefined;step=Math.floor(Number(slider.value)/4);phase=Number(slider.value)%4;render();};
    const current = result.candidates[step];
    const processed = result.candidates.slice(0, step + (phase === 3 ? 1 : 0)).filter(p=>p.feasible);
    const incumbent = processed.length ? Math.min(...processed.map(p=>p.score)) : null;
    const stages = [t('1 · Enumerate pair','1 · 枚举数对'),t('2 · Check hard limits','2 · 检验硬约束'),t('3 · Calculate deviations','3 · 计算目标偏差'),t('4 · Compare weighted score','4 · 比较加权分数')];
    const status = el('div', undefined, host, 'learn-trace'); status.setAttribute('aria-live',timer?'off':'polite');
    el('h4', `${stages[phase]} — (${current.x}, ${current.y}) [${step+1}/81]`, status);
    if (phase>=1) model.resources.forEach((r,i)=>el('p',`${r.x} × ${current.x} + ${r.y} × ${current.y} = ${current.resources[i]} ${current.resources[i]<=result.limits[i]?'≤':'>'} ${result.limits[i]} ${current.resources[i]<=result.limits[i]?'✓':'✕'}`,status));
    if (phase>=2 && current.feasible) model.goals.forEach((g,i)=>el('p',`g${i+1} = ${g.x} × ${current.x} + ${g.y} × ${current.y} = ${current.values[i]}; d${i+1}⁻ = max(0, ${g.target} − ${current.values[i]}) = ${current.shortfalls[i]}; d${i+1}⁺ = ${Math.max(0,current.values[i]-g.target)}`, status));
    if (phase>=2 && !current.feasible) el('p',t('Reject this pair. Infeasible plans never compete for the optimum.','淘汰此数对。不可行方案不参与最优解比较。'),status);
    if (phase===3 && current.feasible) el('p',`Z = ${result.weights[0]} × ${current.shortfalls[0]}/${model.goals[0].scale} + ${result.weights[1]} × ${current.shortfalls[1]}/${model.goals[1].scale} = ${n(current.score)}`,status);
    el('p',t('Best score among completed feasible pairs: ','已完成检验的可行方案中最小分数：')+(incumbent===null?'—':n(incumbent)),status);
    const grid = el('div',undefined,host,'learn-grid');
    result.candidates.forEach((p,i)=>{
      const seen = i<step || (i===step && phase===3);
      const cell = button(`${p.x},${p.y}`,()=>{clearInterval(timer);timer=undefined;step=i;phase=0;render();},grid);
      cell.className='learn-cell';
      cell.dataset.state = !seen?'pending':!p.feasible?'rejected':Math.abs(p.score-incumbent)<1e-9?'best':'feasible';
      cell.setAttribute('aria-current',String(i===step));
      cell.title=seen ? (p.feasible?`Z = ${n(p.score)}`:t('Infeasible','不可行')):t('Not yet evaluated','尚未检验');
    });
    el('p',t('Grey = unvisited · red = rejected · blue = feasible · gold = best so far. Click a pair to replay its calculation.','灰色＝未访问 · 红色＝不可行 · 蓝色＝可行 · 金色＝目前最优。点击任意数对重看计算。'),host);
    el('pre','for x = 0…8\n  for y = 0…8\n    if any resource > limit: continue\n    d[i] = max(0, target[i] − value[i])\n    Z = Σ weight[i] × d[i] / scale[i]\n    if Z < best: replace winners\n    else if |Z − best| ≤ 1e−9: keep tie',host);
    if(step===80 && phase===3){
      el('p',`${t('Global optimum in this domain','当前整数域的全局最优')} Z = ${n(result.bestScore)}; ${result.winners.map(p=>`(${p.x}, ${p.y})`).join(', ')}`,host);
      const original=QuestModels.solve(part);
      el('p',`${t('Original baseline score','原始条件分数')} = ${n(original.bestScore)}; ${t('current score','当前分数')} = ${n(result.bestScore)}.`,host);
    }
    const reflectionLabel=el('label',t('Explain your decision, the weights and a modelling limitation','解释你的决策、目标权重和一项模型局限'),host);
    const notes=el('textarea',undefined,reflectionLabel);notes.value=reflection;notes.oninput=()=>{reflection=notes.value;};
    button(t('Download this mission evidence','下载本题学习记录'),()=>{
      const record={part,level:level+1,settings:settings(),prediction,plan,score:chosen.score,reflection,traceCompleted:step===80&&phase===3};
      const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
      const a=el('a');a.href=url;a.download=`ecoquest-${part}-${level+1}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    },host);
  }
  render();
})();
