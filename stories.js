/* Short scenario introductions aligned with the numerical models. */
window.QuestStories = {
  fair: {
    partner: 'pikachu', who: ['Pikachu', '皮卡丘'],
    title: ['Our stall opens on Friday!', '星期五，环保小摊要开张啦！'],
    story: ['Pikachu is preparing the school eco fair. The class has used paper to turn into bookmarks and notebooks. You are the stall planner. Decide how many batches of each product to make before the fair opens.', '皮卡丘正在筹备校园环保市集。班里收集了一批旧纸，可以做成书签和笔记本。你是小摊的策划员，要在开市前决定两种产品各做多少批。'],
    wish: ['“I want to raise funds for our next school activity. Bulbasaur also wants us to reuse plenty of paper. Can you help us balance both wishes?”', '“我想为下一次校园活动筹钱！妙蛙种子又希望我们多利用旧纸。你能帮我们同时照顾这两个愿望吗？”'],
    unit: ['One batch contains 10 items. x = 2 means 20 bookmarks; y = 3 means 30 notebooks.', '每批有 10 件。x＝2 表示制作 2 批、共 20 个书签；y＝3 表示制作 3 批、共 30 本笔记本。'],
    need: ['Your supplies are money, production time, display space and used paper. A notebook batch reuses more paper but needs more time and money.', '你需要预算、制作工时、摊位空间和旧纸。每批笔记本能再利用更多纸，但也更花时间和钱。'],
    icons: ['🔖','📓']
  },
  garden: {
    partner: 'bulbasaur', who: ['Bulbasaur','妙蛙种子'],
    title: ['A berry garden for everyone', '给大家种一座树果园'],
    story: ['Bulbasaur has a small school garden. You can plant Oran Berry beds or Pecha Berry beds. Choose how many beds of each kind to plant for the next harvest.', '妙蛙种子得到了一小块校园花园。你可以种橙橙果，也可以种桃桃果。你要决定两种树果各占几块种植床，为下一次收获做好计划。'],
    wish: ['“Oran beds give us more fruit. Pecha beds earn more habitat points in our classroom model. I want a good harvest and a welcoming garden!”', '“在我们的课堂模型里，橙橙果的收成更多，桃桃果的栖息地得分更高。我既想收获树果，也想让花园更适合小伙伴居住！”'],
    unit: ['x counts Oran beds; y counts Pecha beds. One bed is one equal-sized planting area. (2, 3) uses five beds.', 'x 是橙橙果种植床的数量，y 是桃桃果种植床的数量。每块种植床面积相同。(2, 3) 表示总共种 5 块床。'],
    need: ['Share the water, care time and planting space. Harvest is counted in crates; habitat points are fictional classroom estimates.', '你要分配用水、照料时间和种植空间。收成以箱计；栖息地得分是为了练习而设定的估计值。'],
    icons:['🫐','🍑']
  },
  center: {
    partner:'squirtle', who:['Squirtle','杰尼龟'],
    title:['Help pack the Pokémon Center shelves', '帮宝可梦中心装满补给架'],
    story:['A school outing is coming. Squirtle is packing comfort packs for visitors at the Center and trail packs for the walking team. You decide how many of each to prepare.', '学校快要组织郊游了。杰尼龟正在准备两类补给包：给留在中心的伙伴用的舒适包，以及给出发队伍用的野外包。两种各准备多少，由你决定。'],
    wish:['“Please prepare enough for both teams! Comfort packs help the Center more; trail packs help the walking team more.”', '“两队伙伴都需要照顾！舒适包更能提高中心准备度，野外包更能提高出行准备度。”'],
    unit:['x counts comfort packs; y counts trail packs. (2, 3) means two comfort packs and three trail packs, five packs in total.', 'x 是舒适包的数量，y 是野外包的数量。(2, 3) 就是 2 个舒适包和 3 个野外包，一共 5 个包。'],
    need:['Materials, packing time and shelf space are limited. Readiness points describe the usefulness of each pack in this classroom model.', '材料、打包时间和货架空间有限。准备度得分表示补给包在课堂模型中的帮助程度。'],
    icons:['🎒','🧰']
  },
  field: {
    partner:'pikachu', who:['Pikachu','皮卡丘'],
    title:['Which path shall we survey?', '今天走哪条调查路线？'],
    story:['Pikachu is making a school nature album. You can send the team on riverside rounds and woodland rounds. Plan the number of rounds before the camera battery runs out.', '皮卡丘要制作校园自然观察相册。队伍可以去河岸，也可以去林地。你要在相机没电、活动结束之前，安排两种路线各调查几轮。'],
    wish:['“The riverside usually gives more useful photos. Woodland rounds cover more habitats. I want a rich album, not just many similar pictures!”', '“河岸路线预计能拍到更多有效照片，林地路线能覆盖更多栖息地。我希望相册既有照片数量，也有丰富的观察内容！”'],
    unit:['x counts riverside rounds; y counts woodland rounds. Each round follows one complete route. (2, 3) schedules five rounds.', 'x 是河岸调查的轮数，y 是林地调查的轮数。每轮走完一条完整路线。(2, 3) 表示安排 5 轮调查。'],
    need:['Watch the time, camera battery and round limit. Photo counts and habitat scores are estimates to discuss and revise.', '注意调查时间、相机电量和轮数上限。预计照片数和栖息地得分可以在真实调查后重新修订。'],
    icons:['🌊','🌳']
  },
  cards: {
    partner:'pikachu', who:['Pikachu','皮卡丘'],
    title:['Open our school card club!', '宝可梦卡牌社团开课啦！'],
    story:['Pikachu is welcoming new card players and experienced classmates. Prepare guided decks for beginners and tactics decks for advanced practice. Your club must share one card inventory.', '皮卡丘的卡牌社团迎来了新手和有经验的同学。你要为新手准备入门牌组，也要为进阶练习准备战术牌组。大家只能使用社团现有的卡牌库存。'],
    wish:['“I want beginners to feel confident and experienced players to practise tactics. How many of each deck should we prepare?”', '“我希望新同学能顺利入门，也希望老同学有机会练习战术。两种牌组各准备多少比较合适呢？”'],
    unit:['x counts complete guided decks; y counts complete tactics decks. Every deck has 60 cards. (2, 3) means five decks containing 300 cards in total.', 'x 是完整入门牌组的数量，y 是完整战术牌组的数量。每副牌组 60 张卡。(2, 3) 表示 5 副牌组，共 300 张卡。'],
    need:['Count Trainer, Energy and Pokémon cards separately, and provide a deck box for every deck. Practice points are fictional teaching estimates.', '训练家卡、能量卡和宝可梦卡要分别清点，每副牌组还需要一个牌盒。练习得分是课堂假设。'],
    icons:['🃏','🎴']
  }
};
