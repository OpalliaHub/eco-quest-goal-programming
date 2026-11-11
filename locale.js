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
  Object.assign(dictionary, {
  "Build a stall that balances funds and paper reuse. A mixed bundle reserves one batch of each product in a single move.": "搭建一个兼顾筹款与纸张再利用的摊位。选择混合组合，会同时增加一批书签和一批笔记本。",
  "Plant one bed at a time. Both settings have 20 L of water and 18 care hours. Only the bed permit changes.": "每次种植一块床。两种设置都有 20 升水和 18 小时照料时间，只改变可使用的床数。",
  "Reserve packs on the shelf, or swap one draft pack for the other type. A swap revises your plan and recalculates its resource use.": "选择要放上货架的补给包，也可以把一个包换成另一类。交换后会重新计算资源用量。",
  "Pick one upgrade and schedule your routes. You can reroute the last planned leg before sending out the team.": "选择一种资源升级，再安排调查路线。出发前可以修改最后一轮路线。",
  "Each batch contains 10 items. The model assumes all products sell and excludes wages from surplus.": "每批包含 10 件产品。模型假设所有产品都能售出，盈余计算不包括工资。",
  "The estimated harvest and habitat points are classroom assumptions. Real growing conditions would change the coefficients.": "收成和栖息地得分为课堂假设，真实种植条件会改变这些系数。",
  "These are fictional supply packs. Readiness points are modelled estimates assigned by the class.": "这些是虚构的补给包，准备度得分由课堂讨论设定。",
  "Photo yield and habitat points are forecasts. A later model could use observations from a pilot survey.": "照片数量和栖息地得分是预测值，后续可使用试调查的真实数据修订模型。",
  "Each template uses 60 cards. The activity models inventory and fictional practice points. The table gives category totals rather than a playable deck list.": "每副牌组有 60 张卡。本活动使用库存和假设的练习得分建模，表中统计的是卡牌类别数量。",
  "State your weights, your plan, both shortfalls and one assumption. Download your reasoning, mission evidence and the latest duel for each setting.": "写出目标权重、选择的方案、两个目标还差多少，以及一项模型假设。你可以下载解释和学习记录。",
  "The search keeps every feasible plan with the lowest score. If a goal has weight zero, check both shortfalls separately even when the score is zero.": "搜索会保留所有分数最低的可行方案。如果某个目标权重为零，即使总分为零，也要分别检查两个目标的偏差。",
  "One More Bed": "多一块种植床",
  "Test a space constraint": "检验空间约束",
  "One more garden bed?": "再加一块种植床？",
  "A donor raises water to 20 L and care time to 18 hours. Which bed limit makes both goals possible?": "现在用水增加到 20 升，照料时间增加到 18 小时。需要多少块种植床才能同时实现两个目标？",
  "Keep the 7-bed limit": "维持 7 块床",
  "Open an eighth bed": "开放第 8 块床",
  "Ready at the Center": "中心准备就绪",
  "Test a weighted compromise": "比较不同权重下的折中方案",
  "The Center expects visitors": "中心即将迎来访客",
  "The Center triples the weight on Center readiness. Which plan now has the lowest score?": "中心准备度的权重提高到 3 倍。现在什么方案的分数最低？",
  "Time or Battery": "时间还是电量",
  "Compare one change at a time": "每次只比较一项变化",
  "What should the survey team take?": "调查队应该增加哪种资源？",
  "Choose one upgrade. Which gives the lower minimum score with equal weights?": "选择一种升级。两个目标同等重要时，哪种升级的最优分数更低？",
  "Add 15 minutes": "增加 15 分钟",
  "Add 3 battery units": "增加 3 单位电量",
  "Deck Box Challenge": "牌组盒挑战",
  "Check card counts before scoring": "计算分数前先清点卡牌",
  "How many practice decks can you prepare?": "可以准备多少副练习牌组？",
  "Which feasible mix has the lowest score at equal weights? Count each card category separately.": "同等权重下，哪个可行组合的分数最低？请分别清点每类卡牌。",
  "Plant Oran": "种植橙橙果",
  "Plant Pecha": "种植桃桃果",
  "Draft comfort pack": "安排舒适包",
  "Draft trail pack": "安排野外包",
  "Swap trail for comfort": "把野外包换成舒适包",
  "Swap comfort for trail": "把舒适包换成野外包",
  "Schedule riverside": "安排河岸调查",
  "Schedule woodland": "安排林地调查",
  "Reroute the last leg": "修改最后一轮路线",
  "person-hours": "人时",
  "time blocks": "时段",
  "sheets": "张纸",
  "crates": "箱",
  "points": "分",
  "minutes": "分钟",
  "batches": "批",
  "hours": "小时",
  "beds": "块床",
  "packs": "个包",
  "rounds": "轮",
  "photos": "张照片",
  "boxes": "个盒",
  "Trainer cards": "训练家卡",
  "Energy cards": "能量卡",
  "Pokémon cards": "宝可梦卡",
  "bookmark": "书签",
  "notebook": "笔记本",
  "counts": "表示数量",
  "Choose whole numbers from 0 to 8.": "请选择 0 到 8 的整数。",
  "Care time": "照料时间",
  "Garden space": "种植空间",
  "Harvest": "收成",
  "Habitat": "栖息地",
  "Materials": "材料",
  "Packing time": "打包时间",
  "Shelf space": "货架空间",
  "Survey time": "调查时间",
  "Camera battery": "相机电量",
  "Round limit": "轮数上限",
  "Useful photos": "有效照片",
  "Center readiness": "中心准备度",
  "Trail readiness": "野外准备度",
  "Beginner practice": "入门练习",
  "Tactics practice": "战术练习",
  "Deck boxes": "牌组盒",
  "Seven-bed permit": "允许使用 7 块床",
  "Open the eighth bed": "开放第 8 块床",
  "Equal readiness weights": "准备度权重相同",
  "Extra time": "增加时间",
  "Extra battery": "增加电量",
  "For each goal, calculate": "对每个目标计算",
  "shortfall": "目标差额",
  "target": "目标值",
  "output": "实际完成量",
  "A smaller weighted score is better.": "加权分数越小越好。",
  "weight": "权重",
  "Score": "分数",
  "Clamp each gap at zero.": "负的差额按零计算。",
  "gap": "差额"
});
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
