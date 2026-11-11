/* Translate interface text while keeping model identifiers and recorded evidence stable. */
(function () {
  const dictionary = {
    'Missions':'任务','Model guide':'建模指南','Field notes':'学习记录','Skip to the quest':'跳到任务',
    'Start the quest':'开始冒险','THE SCHOOL ECO FAIR':'校园环保市集','TRAINER MISSIONS':'训练家任务',
    'Five places to plan':'五个规划主题','Eco Fair':'环保市集','Berry Garden':'树果园','Center Supplies':'中心补给','Field Survey':'野外调查','TCG Club':'卡牌社团',
    'Campus eco fair':'校园环保市集','A garden for two goals':'双目标树果园','Pokémon Center supplies':'宝可梦中心补给','A survey of two habitats':'双栖息地调查','Pokémon TCG club deck planning':'宝可梦卡牌社团牌组规划',
    'Plan a fair, grow berries, pack supplies, survey habitats and prepare TCG decks. Every team has two goals and limited resources.':'规划环保市集、种植树果、准备补给、调查栖息地、组建卡牌牌组。每个团队都有两个目标和有限资源。',
    'Produce reclaimed-paper bookmarks and notebooks for a school stall. Balance fundraising surplus and paper reuse.':'用再生纸制作书签和笔记本，平衡筹款盈余与纸张再利用。',
    'Bulbasaur helps plan Oran and Pecha Berry beds. Balance harvest and habitat while sharing water, care time and space.':'妙蛙种子帮忙规划橙橙果与桃桃果种植床。在用水、照料时间和空间有限时，平衡收成与栖息地目标。',
    'Prepare visitor comfort packs and trail packs. Decide how much to emphasise readiness at the Center or on the trail.':'准备舒适补给包和野外补给包，决定如何平衡中心与野外的准备度。',
    'Choose riverside and woodland survey rounds. Plan for useful photographs and coverage of different habitats.':'安排河岸与林地调查，兼顾有效照片数量和栖息地覆盖。',
    'Prepare guided decks and tactics decks for a school club. Count Pokémon, Trainer and Energy cards and decide what practice the club needs most.':'为社团准备入门牌组与战术牌组，根据宝可梦卡、训练家卡与能量卡库存，平衡两种练习需求。',
    'Choose a partner':'选择伙伴','Pikachu':'皮卡丘','Bulbasaur':'妙蛙种子','Squirtle':'杰尼龟',
    'Partners set the weights of the two goals in Free Lab.':'伙伴决定自由实验室中两个目标的权重。',
    'Open Free Lab':'打开自由实验室','View the model':'查看数学模型','Play the planning duel':'开始规划对战',
    'Stall Check':'摊位检查','Check the hard limits':'检查硬约束','Partner Switch':'更换伙伴','Change the goal weights':'改变目标权重','Both Goals':'双目标达成','Test a resource upgrade':'测试资源升级',
    'Can this plan fit?':'这个方案可行吗？','Your team proposes 1 bookmark batch and 8 notebook batches. Which hard limit does it break?':'团队计划制作 1 批书签和 8 批笔记本。违反了哪项硬约束？',
    'Make a prediction':'先作预测','Test prediction':'检验预测','Display space':'陈列空间','Budget':'预算','Production effort':'制作工时','Paper stock':'纸张库存','Cost':'费用','Funds':'筹款盈余','Paper reuse':'纸张再利用',
    'PLAN FIRST':'先作规划','PARTNER ARENA':'伙伴对战区','Stall Showdown':'市集摊位对战','Berry Bed Clash':'树果种植对战','Supply Draft':'补给包规划对战','Survey Route Duel':'调查路线对战',
    'Scenario setting':'情景条件','Original stall':'原始摊位','More budget and effort':'增加预算和工时','Resource limits and goal equations':'资源约束与目标方程','Predict your plan':'预测你的方案','Predicted x':'预测 x','Predicted y':'预测 y','Your constraint check':'你的约束检验',
    'Choose whole numbers from 0 to 8. Write one constraint check before making a move.':'选择 0 至 8 的整数。行动前先写一项约束检验。',
    'Start duel':'开始对战','Return to setup':'返回设置','Make bookmarks':'制作书签','Make notebooks':'制作笔记本','Build a mixed bundle':'制作混合组合','Your plan':'你的方案','Turn trace':'回合记录',
    'MATH GUIDE':'数学指南','What makes a good plan?':'什么是好方案？','Check limits, then score goals':'先检查约束，再计算目标分数','Fictional quantities per unit':'每单位的课堂假设数据','Measure':'项目','Limit or target':'上限或目标',
    'TRAINER JOURNAL':'训练家日志','Defend your recommendation':'解释你的推荐方案','Your explanation':'你的解释','Download field notes':'下载学习记录',
    'Restart':'重新开始','TURN':'回合','Attach Lightning':'附加雷能量','Attach Water':'附加水能量','Charge':'充电','Pika Punch':'皮卡拳','End turn':'结束回合','Lightning':'雷能量','Water':'水能量',
    'Goal 1':'目标一','Goal 2':'目标二','Feasible plans':'可行方案','Minimum score':'最小分数','Both goals possible?':'两个目标能同时实现吗？','Yes':'是','No':'否',
    'Bookmark batches':'书签批次','Notebook batches':'笔记本批次','Oran Berry beds':'橙橙果种植床','Pecha Berry beds':'桃桃果种植床','Comfort packs':'舒适补给包','Trail packs':'野外补给包','Riverside rounds':'河岸调查轮次','Woodland rounds':'林地调查轮次','Guided decks':'入门牌组','Tactics decks':'战术牌组'
  };
  const originals = new WeakMap();
  let chinese = false;
  const replacements = Object.entries(dictionary).sort((a,b)=>b[0].length-a[0].length);
  function translate() {
    observer.disconnect();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement || node.parentElement.closest('#learning,script,style,textarea,pre')) continue;
      const prior = originals.get(node);
      const original = prior && node.data === prior.output ? prior.original : node.data;
      let output = original;
      if (chinese) {
        const exact = dictionary[original.trim()];
        if (exact) output = original.replace(original.trim(),exact);
        else for (const [english,zh] of replacements) output = output.split(english).join(zh);
      }
      if(node.data !== output) node.data = output;
      originals.set(node,{original,output});
    }
    document.documentElement.lang = chinese ? 'zh-CN' : 'en';
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }
  const observer = new MutationObserver(translate);
  document.addEventListener('ecoquest:language',event=>{const next=event.detail==='zh';if(next!==chinese){chinese=next;translate();}});
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
})();
