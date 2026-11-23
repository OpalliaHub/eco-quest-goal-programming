/* Bilingual, finite-domain weighted goal programming walkthrough. */
(function () {
  'use strict';
  const host = document.getElementById('learning');
  let language = 'zh';
  try { language = localStorage.getItem('ecoquest-language') || 'zh'; } catch (_) {}
  const requestedLanguage=new URLSearchParams(location.search).get('lang');
  if (['en','zh'].includes(requestedLanguage)) language=requestedLanguage;
  let part = 'fair', level = 0, step = 0, phase = 0, timer;
  let screen = 'home', stage = 'story', activeDuelPart = null;
  let showMath = false, introAnswer = '', introOpen = true;
  const units = {HKD:'港元','person-hours':'人时',batches:'批',sheets:'张',L:'升',hours:'小时',beds:'块',crates:'箱',points:'分',units:'单位','time blocks':'时段',packs:'个',minutes:'分钟',rounds:'轮',photos:'张',cards:'张',boxes:'个'};
  const unit = value => language === 'zh' ? (units[value] || value) : value;
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
  function math(parent,tex){const box=el('div',undefined,parent,'quest-equation');katex.render(tex,box,{throwOnError:true});}
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
    showMath = false; step = 0; phase = 0; plan = [0, 0]; prediction = ''; reflection = ''; submitted = false;
    render();
  }
  function next() {
    if (phase < 3) phase++;
    else if (step < 80) { step++; phase = 0; }
    else { clearInterval(timer); timer = undefined; }
    render();
  }
  function introduction() {
    const intro = el('details', undefined, host, 'story-intro');
    intro.open = introOpen;
    intro.ontoggle = () => { introOpen = intro.open; };
    el('summary', t('Start here · What is goal programming?', '先看这里 · 什么是目标规划？'), intro);
    el('p', t('Imagine planning a school stall. You want to raise money AND reuse paper, but you have limited time and supplies. Goal programming helps you choose a feasible plan that comes as close as possible to several wishes.', '想象你要办一个校园小摊：既想筹钱，又想多利用旧纸，但时间和材料有限。目标规划就是帮助你在有限资源内，选出一个尽量接近多个愿望的方案。'), intro);
    const cards = el('div', undefined, intro, 'story-cards');
    [
      [t('🧱 Must obey', '🧱 必须遵守'),t('A HKD 260 budget is a hard limit. A plan costing HKD 280 is rejected.', '预算只有 260 港元，这是硬约束。需要 280 港元的方案不能选。')],
      [t('🎯 Hope to achieve', '🎯 希望做到'),t('Raising HKD 360 is a goal. Raising HKD 320 leaves a shortfall of HKD 40, but the plan can still be feasible.', '希望筹得 360 港元，这是目标。只筹得 320 港元，就还差 40 港元，但方案仍可能可行。')],
      [t('⚖️ Make a choice', '⚖️ 比较与选择'),t('Compare the shortfalls of feasible plans. Weights tell the model which shortfall matters more.', '比较可行方案距离目标还差多少。权重告诉模型，你更重视哪一个目标。')]
    ].forEach(([title,text])=>{const card=el('div',undefined,cards);el('h3',title,card);el('p',text,card);});
    el('p',t('Quick check: your budget is 260, your fundraising target is 360. Which plan must be rejected?', '小检查：预算是 260，筹款目标是 360。哪种方案一定要淘汰？'),intro);
    button(t('Spend 280, raise 400', '花费 280，筹得 400'),()=>{introAnswer='right';render();},intro);
    button(t('Spend 240, raise 320', '花费 240，筹得 320'),()=>{introAnswer='retry';render();},intro);
    if(introAnswer) el('p',introAnswer==='right'?t('Correct! Exceeding the budget breaks a hard constraint. A missed fundraising target is a shortfall to compare.', '答对了！超预算违反硬约束；没有达到筹款目标，则是需要比较的目标偏差。'):t('This plan fits the budget. Its fundraising shortfall is 40. Try the plan that exceeds the budget.', '这个方案符合预算，只是筹款还差 40。再找一找超出预算的方案。'),intro);
  }
  function storyScene(model, chosen, result) {
    const story = QuestStories[part];
    const scene = el('article',undefined,host,'story-scene '+part);
    const portrait = el('img',undefined,scene,'story-partner');
    portrait.src='assets/'+story.partner+'.png';portrait.alt=t(...story.who);
    const body=el('div',undefined,scene);
    el('h3',t(...story.title),body);
    el('p',t(...story.story),body);
    el('blockquote',t(...story.wish),body);
    el('p',t(...story.need),body);
    el('h4',t('Your job', '你要做什么'),body);
    el('p',t(...story.unit),body);
    const variables=el('div',undefined,host,'story-cards');
    model.products.forEach((product,i)=>{
      const card=el('div',undefined,variables);
      el('h3',`${story.icons[i]} ${i===0?'x':'y'} = ${language==='zh'?products[part][i]:product}`,card);
      el('p',t('Your current choice: ', '你现在安排了：')+plan[i],card);
      el('p',t('One unit uses ', '每增加 1 单位，需要 ')+model.resources.map(r=>`${i===0?r.x:r.y} ${unit(r.unit)} ${term(r.name)}`).join(' · '),card);
    });
    el('p',t('Available resources: ', '本关可用资源：')+model.resources.map((r,i)=>`${term(r.name)} ${result.limits[i]} ${unit(r.unit)}`).join(' · '),host);
    el('h4',t('Watch your two wishes', '看看两个愿望完成了多少'),host);
    model.goals.forEach((goal,i)=>{
      const box=el('div',undefined,host,'story-goal');
      el('p',`${term(goal.name)} ${chosen.values[i]} / ${goal.target} ${unit(goal.unit)} · ${t('Still needed','还差')} ${chosen.shortfalls[i]}`,box);
      const bar=el('progress',undefined,box);bar.max=goal.target;bar.value=Math.min(goal.target,chosen.values[i]);bar.setAttribute('aria-label',term(goal.name));
    });
  }
  const stages = {story:['Meet the mission','故事与任务'],build:['Build your plan','搭建方案'],code:['Code your solver','搭建求解程序'],algorithm:['Watch the algorithm','观察算法'],duel:['Play a challenge','互动对战'],reflect:['Explain your choice','解释与反思']};
  function navigate(id, page='story') {
    location.hash = id === 'home' ? 'home' : `part/${id}/${page}`;
  }
  function route() {
    const bits = location.hash.slice(1).split('/');
    clearInterval(timer); timer=undefined;
    if(bits[0]==='part' && names[bits[1]]) {
      screen='part';
      if(part!==bits[1]) {part=bits[1];level=0;step=0;phase=0;plan=[0,0];prediction='';reflection='';submitted=false;}
      stage=stages[bits[2]]?bits[2]:'story';
    } else {screen='home';}
    render(); window.scrollTo({top:0,behavior:'instant'});
  }
  function cover() {
    const hero=el('section',undefined,host,'portal-cover');
    const copy=el('div',undefined,hero);
    el('p','INT6064 · ECO QUEST',copy,'kicker');
    el('h1',t('Small plans. Big adventures.','小小规划，\n开启大冒险。'),copy);
    el('p',t('A Pokémon-themed learning platform for high-school students. Learn how goal programming balances several wishes when resources are limited. No coding experience needed.','面向高中生的宝可梦主题学习平台。在资源有限的情况下，学会用目标规划兼顾多个愿望。无需编程基础，从生活中的选择开始。'),copy);
    button(t('Start with Part 01 →','从 Part 01 开始 →'),()=>navigate('fair'),copy);
    button(t('Start the one-block lesson','从一块积木开始'),()=>{
      level=0;
      const firstLesson=guidedSessions.get('fair-0');
      if(firstLesson) firstLesson.full=false;
      navigate('fair','code');
    },copy);
    const walkthrough=el('a',t('Teacher walkthrough','教师图解教程'),copy,'first-cover-link');
    walkthrough.href='first-lesson.html#'+language;
    const art=el('div',undefined,hero,'portal-art');
    for(const id of ['bulbasaur','pikachu','squirtle']) {const img=el('img',undefined,art);img.src=`assets/${id}.png`;img.alt=id;}
    const background=el('div',undefined,host,'portal-background');
    el('h2',t('Welcome to the campus adventure','欢迎来到校园冒险计划'),background);
    el('p',t('Pikachu and friends are preparing a school eco festival. They need a fair, a berry garden, supplies, a field survey and a card club. You are the planner: decide how to share limited money, time and materials while helping everyone reach their goals.','皮卡丘和伙伴们正在筹备校园环保节：办市集、种树果、准备补给、调查自然，还有卡牌社团活动。你是小队的规划员，要分配有限的钱、时间与材料，帮助伙伴们尽量实现各自的目标。'),background);
    el('p',t('Each part is independent. Meet the mission, plan by hand, build and test your own block program, compare searches, play a challenge and explain your revision. Choose one of three difficulty levels inside each part.','每个 Part 都可以独立进入。听故事、手算方案、搭建并测试自己的积木程序，再对照算法、参加对战、解释修改。进入后可选择基础、进阶或挑战难度。'),background);
    el('h2',t('Choose your next adventure','选择你的冒险 Part'),host);
    const cards=el('div',undefined,host,'portal-parts');
    const summaries={fair:['Make recycled paper products and balance fundraising with paper reuse.','制作再生纸产品，兼顾筹款和旧纸再利用。'],garden:['Allocate garden beds to balance berry harvest and habitat.','安排种植床，兼顾树果收成与栖息地。'],center:['Pack supplies for the center and the outdoor team.','分配补给包，兼顾中心准备度与野外需求。'],field:['Plan survey rounds for useful photos and habitat coverage.','安排调查轮次，兼顾有效照片与栖息地覆盖。'],cards:['Build practice decks, then try resource-aware card battles.','配置练习牌组，再体验考虑资源限制的卡牌对战。']};
    Object.keys(names).forEach((id,i)=>{
      const card=el('a',undefined,cards,'portal-part');card.href=`#part/${id}/story`;
      const img=el('img',undefined,card);img.src=`assets/${QuestStories[id].partner}.png`;img.alt='';
      el('span',`PART 0${i+1}`,card,'kicker');el('h3',t(...names[id]),card);el('p',t(...summaries[id]),card);
      el('span',t('3 levels · enter →','3 个难度 · 进入 →'),card,'portal-enter');
    });
    introOpen=false;introduction();
  }
  function stageMarker(name) {const mark=el('span',undefined,host);mark.dataset.stageMarker=name;mark.hidden=true;}
  function arrangeStages() {
    let active=null;
    for(const node of [...host.children]) {
      if(node.dataset.stageMarker){active=node.dataset.stageMarker;node.remove();continue;}
      if(active){node.dataset.lessonStage=active;node.hidden=active!==stage;}
    }
    const nav=el('nav',undefined,host,'portal-next');nav.setAttribute('aria-label',t('Lesson navigation','学习步骤导航'));
    const keys=Object.keys(stages), index=keys.indexOf(stage);
    if(index>0) button(t('← Previous','← 上一步'),()=>navigate(part,keys[index-1]),nav);
    if(index<keys.length-1) button(t('Next: ','下一步：')+t(...stages[keys[index+1]]),()=>navigate(part,keys[index+1]),nav);
    else button(t('Choose another part →','选择其他 Part →'),()=>navigate('home'),nav);
  }
  let closeAlgorithm;
  function render() {
    closeAlgorithm?.();
    closeAlgorithm=undefined;
    host.replaceChildren();
    const header = el('div', undefined, host, 'learn-controls');
    el('h2', t('Goal Programming Academy', '目标规划训练学院'), header);
    button(language === 'en' ? '中文' : 'English', () => {
      language = language === 'en' ? 'zh' : 'en';
      try { localStorage.setItem('ecoquest-language', language); } catch (_) {}
      const url=new URL(location.href);
      if(url.searchParams.has('lang')){
        url.searchParams.set('lang',language);
        try{history.replaceState(history.state,'',url);}catch(_){}
      }
      render();
    }, header);
    host.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.dispatchEvent(new CustomEvent('ecoquest:language', {detail:language}));
    const legacy=document.getElementById('legacy-activities');
    legacy.querySelector('.portal-next')?.remove();
    legacy.hidden=screen==='home'||stage!=='duel';
    document.body.dataset.page=screen;
    if(screen==='home'){cover();return;}
    const crumb=el('div',undefined,host,'portal-breadcrumb');
    button(t('← All parts','← 返回首页'),()=>navigate('home'),crumb);
    el('span',`PART 0${Object.keys(names).indexOf(part)+1} / ${t(...names[part])}`,crumb);
    const steps=el('nav',undefined,host,'portal-steps');steps.setAttribute('aria-label',t('Learning steps','学习步骤'));
    Object.entries(stages).forEach(([id,label],i)=>{const b=button(`${i+1}. ${t(...label)}`,()=>navigate(part,id),steps);b.setAttribute('aria-current',id===stage?'step':'false');});
    el('h2',t(...stages[stage]),host);
    const levels = el('div', undefined, host, 'learn-controls');
    levels.hidden = stage === 'duel';
    [t('Foundation · balance two goals','基础 · 平衡两个目标'),t('Intermediate · priorities','进阶 · 改变目标权重'),t('Challenge · resource upgrade','挑战 · 资源升级')].forEach((label, i) => {
      const b = button(label, () => { level = i; reset(); }, levels);
      b.setAttribute('aria-pressed', String(level === i));
    });
    const result = run(), model = result.model;
    stageMarker('story');
    const chosen = result.candidates.find(p => p.x === plan[0] && p.y === plan[1]);
    storyScene(model, chosen, result);
    el('h3', t(...names[part]) + ' — ' + t('Mission ', '任务 ') + (level + 1), host);
    el('p', level === 0 ? t('Find a feasible plan with the smallest total weighted shortfall. Explain whether both targets can be met.', '寻找加权偏差总和最小的可行方案，说明两个目标能否同时达成。') : level === 1 ? t('Goal 1 now has weight 3. Predict whether the best plan changes. Explain why the feasible set stays the same.', '目标一的权重变为 3。预测最优方案是否变化，并解释为什么可行域保持相同。') : t('The first editable resource has been increased by 20%, rounded up. Compare the best score with the original resources. Is this resource the bottleneck?', '第一个可调整资源增加 20% 并向上取整。与原资源下的最优分数比较，这项资源是否为瓶颈？'), host);
    el('p', t('Decision variables: ', '决策变量：') + ['x', 'y'].map((v, i) => `${v} = ${language === 'zh' ? products[part][i] : model.products[i]}`).join('；') + t('. Both are integers from 0 to 8.', '。两者均为 0 至 8 的整数。'), host);
    stageMarker('build');
    const modelDetails = el('details', undefined, host, 'story-intro');
    modelDetails.open=true;
    el('summary',t('Translate the story into a mathematical model','把故事写成数学模型'),modelDetails);
    const table = el('table', undefined, modelDetails, 'learn-table');
    model.resources.forEach((r, i) => {
      const row = el('tr', undefined, table);
      el('th', term(r.name), row); math(el('td',undefined,row),r.x+'x+'+r.y+'y\\le '+result.limits[i]);
      el('td', `${chosen.resources[i]} / ${result.limits[i]} ${chosen.resources[i] <= result.limits[i] ? '✓' : '✕'}`, row);
    });
    model.goals.forEach((g,i)=>{el('small',term(g.name)+' · '+unit(g.unit),modelDetails);math(modelDetails,'g_{'+(i+1)+'}='+g.x+'x+'+g.y+'y,\\quad T_{'+(i+1)+'}='+g.target);});
    el('p', t('All quantities are fictional classroom data. We penalise only shortfalls; exceeding a target carries no penalty.', '所有数值均为课堂假设。本模型只惩罚未达到目标的负偏差，超过目标不罚分。'), host);
    el('p',t('Choose the two batch counts below. Before checking, point to the resource closest to its limit.','用下方按钮选择两种数量。检查前，先指出哪项资源最接近上限。'),host);
    const actions = el('div', undefined, host, 'learn-controls');
    for (let i = 0; i < 2; i++) {
      button(`${t('Add','增加')} ${language==='zh'?products[part][i]:model.products[i]} (+${i===0?'x':'y'})`, () => { plan[i]++; submitted = false; render(); }, actions, plan[i] >= 8 || !result.candidates.find(p => p.x === plan[0]+(i===0?1:0) && p.y === plan[1]+(i===1?1:0))?.feasible);
      button(`− ${i === 0 ? 'x' : 'y'}`, () => { plan[i]--; submitted = false; render(); }, actions, plan[i] === 0);
    }
    el('p', `${t('Your plan','你的方案')} (${plan.join(', ')}) · Z = ${n(chosen.score)}`, host);
    model.goals.forEach((g,i)=>{const box=el('div',undefined,host,'story-goal');el('p',`${term(g.name)}: ${chosen.values[i]} / ${g.target} ${unit(g.unit)} · ${t('Shortfall','还差')} ${chosen.shortfalls[i]}`,box);const bar=el('progress',undefined,box);bar.max=g.target;bar.value=Math.min(g.target,chosen.values[i]);bar.setAttribute('aria-label',term(g.name));});
    math(host,'Z='+model.goals.map((g,i)=>result.weights[i]+'\\cdot\\frac{'+chosen.shortfalls[i]+'}{'+g.scale+'}').join('+')+'='+n(chosen.score));
    el('p',t('Each fraction counts units of missing output. Smaller totals mean closer to the two targets.','每个分数都把还差的数量换成可比较的单位，总分越小，整体越接近两个目标。'),host);
    const tokens = el('div', undefined, host, 'learn-tokens');
    for (let i=0;i<plan[0]+plan[1];i++) el('span', (i<plan[0] ? QuestStories[part].icons[0]+' x' : QuestStories[part].icons[1]+' y'), tokens);
    button(t('Check my plan','检查我的方案'), () => { prediction = plan.join(', '); submitted = true; render(); }, actions);
    if (submitted) el('p', (Math.abs(chosen.score-result.bestScore)<1e-9 ? t('Optimal! Explain the remaining shortfalls and any tied plans.','达到最优！请解释剩余偏差及并列最优方案。') : t('Feasible, but a lower score is possible. Use the walkthrough to find a better plan.','方案可行，但存在更低分数。使用下方演示寻找更好的方案。')), host, 'learn-feedback');
    if(part==='fair' && level===0){
      const hint=el('details',undefined,host,'story-intro');
      el('summary',t('Try this by hand: can you beat one point?','纸笔挑战：有没有比 1 分更好的方案？'),hint);
      el('p',t('Fix two bookmark batches. They use two of sixteen hours. Fourteen hours remain, and each notebook batch needs two. Try seven notebook batches.','先做两批书签，占去 16 小时中的 2 小时。还剩 14 小时，每批笔记本要 2 小时，试做 7 批。'),hint);
      math(hint,'2+2\\cdot7=16,\\quad20\\cdot2+30\\cdot7=250\\le260');
      el('p',t('Nine batches fit ten spaces. They reuse 460 sheets from the stock of 600. The two outputs are 340 dollars and 460 sheets.','共 9 批，放得进 10 个位置，用纸 460 张也在 600 张库存内。两个成果是筹得 340 港元、利用 460 张纸。'),hint);
      math(hint,'Z=\\frac{360-340}{40}+\\frac{480-460}{40}=1');
      el('p',t('To prove this is best, count output in scoring units. Either product earns 1.25 combined output units per hour. Sixteen hours can produce at most 20 units. The two targets ask for 21.','要证明这已经最好，可以把两种成果先分别换成计分单位。每批书签一小时获得 1.25 单位，两小时做一批笔记本获得 2.5 单位。因此每小时都只得到 1.25 单位。16 小时最多得到 20 单位，而目标需要 21 单位。'),hint);
      math(hint,'\\frac{P}{40}+\\frac{R}{40}=1.25(x+2y)\\le20,\\qquad\\frac{360}{40}+\\frac{480}{40}=21');
      el('p',t('At least one unit is missing. Extra output beyond either target earns no credit. The row search finds every plan attaining this bound.','所以总缺口至少为 1，超出一项目标也不能抵消另一个缺口。用下一页的逐行定界找出所有达到 1 分的方案。'),hint);
    }
    stageMarker('code');
    if(stage==='code')codingStudio({host,part,level,result,t,term,unit,math,products:products[part],el,button});
    stageMarker('algorithm');
    if(stage==='algorithm'){
      const pair=location.hash.split('/').slice(3);
      const initialPair=pair.length===2 && pair.every(n=>/^[0-8]$/.test(n)) ? pair.map(Number) : null;
      closeAlgorithm=optimizationLab({host,part,level,initialPair,model,result,t,term,unit,el,button,math,onComplete:()=>{step=80;phase=3;}});
    }
    stageMarker('reflect');
    const reflectionLabel=el('label',t('Explain your decision, the weights and a modelling limitation','解释你的决策、目标权重和一项模型局限'),host);
    const notes=el('textarea',undefined,reflectionLabel);notes.value=reflection;notes.oninput=()=>{reflection=notes.value;};
    button(t('Download this mission evidence','下载本题学习记录'),()=>{
      const record={part,level:level+1,settings:settings(),prediction,plan,score:chosen.score,reflection,traceCompleted:step===80&&phase===3};
      const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
      const a=el('a');a.href=url;a.download=`ecoquest-${part}-${level+1}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    },host);
    stageMarker('duel');
    el('p',t('Apply your planning skills in a playable challenge below. Choose a setting, predict a plan, then observe how each move uses resources and changes your goals.','在下方互动挑战中运用你的规划知识。选择情景、预测方案，再观察每一步如何消耗资源、改变目标进度。'),host);
    arrangeStages();
    if(stage==='duel'){
      if(activeDuelPart!==part){document.querySelector(`[data-module=${part}]`).click();activeDuelPart=part;}
      const next=host.querySelector('.portal-next');legacy.append(next);
    }
  }
  window.addEventListener('hashchange',route);
  route();
})();
