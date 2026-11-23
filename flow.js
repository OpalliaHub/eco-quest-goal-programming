// Pointer capture keeps the same drag behaviour for a mouse, pen and touch.
// Each workspace owns its sources and drop targets, including after a redraw.
function flowDrag(root, apply) {
  const sources = new WeakMap();
  const slots = new WeakMap();
  let drag, hover, ghost, animation, suppressClick = false;
  function mark(target) {
    if (hover === target) return;
    hover?.classList.remove('flow-over');
    hover = target;
    hover?.classList.add('flow-over');
  }
  function paint() {
    if (!drag || !root.isConnected) { clear(); return; }
    const {x,y} = drag;
    ghost.style.transform = 'translate('+ (x+12) +'px,'+ (y+12) +'px)';
    const hit = document.elementFromPoint(x,y)?.closest('[data-flow-slot]');
    mark(hit && slots.has(hit) ? hit : null);
    const edge = 54;
    if (y < edge) window.scrollBy(0,-9);
    else if (y > innerHeight-edge) window.scrollBy(0,9);
    animation = requestAnimationFrame(paint);
  }
  function clear() {
    cancelAnimationFrame(animation);
    mark(null);
    ghost?.remove();
    ghost = null;
    root.classList.remove('flow-dragging');
    if (drag?.source.hasPointerCapture(drag.id)) drag.source.releasePointerCapture(drag.id);
    drag = null;
  }
  function source(node, payload) {
    node.dataset.flowSource = '';
    sources.set(node,payload);
  }
  function slot(node, index) {
    node.dataset.flowSlot = index;
    slots.set(node,index);
  }
  root.addEventListener('pointerdown',event=>{
    const handle = event.target.closest('[data-flow-source]');
    if (!handle || !sources.has(handle) || drag || event.button !== 0 || !event.isPrimary) return;
    suppressClick = false;
    drag = {id:event.pointerId,source:handle,fromX:event.clientX,fromY:event.clientY,x:event.clientX,y:event.clientY};
    handle.setPointerCapture(event.pointerId);
  });
  root.addEventListener('pointermove',event=>{
    if (!drag || event.pointerId !== drag.id) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (ghost || Math.hypot(drag.x-drag.fromX,drag.y-drag.fromY)<6) return;
    ghost = document.createElement('div');
    ghost.className = 'flow-ghost';
    ghost.textContent = drag.source.textContent;
    ghost.setAttribute('aria-hidden','true');
    root.append(ghost);
    root.classList.add('flow-dragging');
    paint();
  });
  root.addEventListener('pointerup',event=>{
    if (!drag || event.pointerId !== drag.id) return;
    const handle = drag.source;
    const target = document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-flow-slot]');
    const moved = !!ghost;
    clear();
    if (!moved) return;
    suppressClick = true;
    setTimeout(()=>{suppressClick=false;},0);
    if (target && slots.has(target)) apply(sources.get(handle),slots.get(target));
  });
  root.addEventListener('pointercancel',clear);
  root.addEventListener('lostpointercapture',event=>{if(drag?.id===event.pointerId)clear();});
  root.addEventListener('click',event=>{
    if (suppressClick && event.detail) {event.preventDefault();event.stopImmediatePropagation();}
  },true);
  root.addEventListener('keydown',event=>{if(event.key==='Escape' && drag)clear();});
  return {source,slot};
}

const flowFamilies = [
  {key:'plans', name:['Try a plan','取一个方案'], hint:['Which quantities will you try?','要尝试哪些数量组合？'],ops:['loop','shortLoop']},
  {key:'limits',name:['Check supplies','查资源'], hint:['Can we make this plan with what we have?','手里的资源够做这个方案吗？'],ops:['guard','loose']},
  {key:'score',name:['Score the gaps','算缺口'],hint:['How far are we from each goal?','两个目标分别还差多少？'],ops:['gaps','raw','weighted','equal','zero','add1','add2']},
  {key:'best',name:['Keep the best','留最佳方案'],hint:['Which plans share the lowest score?','哪些方案并列最低分？'],ops:['keep','first']}
];
const flowFamily = Object.fromEntries(flowFamilies.flatMap(f=>f.ops.map(op=>[op,f])));

function flowEditor({section,level,t,el,button,label,data,onEdit}) {
  let selected = level===0 ? Math.min(1,data.program.length) : data.program.length;
  let pending = null, undo = null;
  const workspace = el('div',undefined,section,'block-columns flow-workspace');
  const dragger = flowDrag(workspace,place);
  const palette = el('section',undefined,workspace,'flow-library');
  const board = el('section',undefined,workspace,'flow-board');
  el('h4',t('Block library','积木盒'),palette);
  el('p',t('Open a module. Drag an instruction to a dotted line, or select a line and click an instruction.','展开一个模块，把指令拖到虚线处。也可以先点虚线，再点一条指令。'),palette);
  const excluded = level===2 ? ['weighted','equal'] : ['zero','add1','add2'];
  for (const family of flowFamilies) {
    const drawer = el('details',undefined,palette,'flow-drawer '+family.key);
    drawer.open = family.key===['limits','score','plans'][level];
    const summary = el('summary',t(...family.name),drawer);
    summary.title = t(...family.hint);
    el('p',t(...family.hint),drawer);
    for (const op of family.ops.filter(id=>!excluded.includes(id))) {
      const tile = button(label(op),()=>place({op},selected),drawer);
      tile.classList.add('flow-tile');
      tile.dataset.op = op;
      dragger.source(tile,{op});
    }
  }
  el('h4',t('My program','我的程序'),board);
  el('p',t('Read downwards. Drag a line to move one instruction. Drag a module heading to move its instructions together.','从上往下读。拖动一行可以移动一条指令，拖动模块标题可以整组移动。'),board);
  const canvas = el('div',undefined,board,'flow-canvas');
  const toolbar = el('div',undefined,board,'flow-toolbar');
  const back = button(t('Undo edit','撤销编辑'),()=>{
    if (!undo) return;
    data.program=undo.program;
    selected=undo.selected;
    undo=null;
    commit(t('Edit undone.','已撤销上一次编辑。'));
  },toolbar);
  const status=el('p','',board,'flow-status');
  status.setAttribute('role','status');
  function commit(message,focus=false) {
    pending=null;
    onEdit();
    draw();
    status.textContent=message;
    if (focus) canvas.querySelector('[aria-pressed="true"]')?.focus();
  }
  function remember(){undo={program:[...data.program],selected};}
  function place(payload,at) {
    if (!Number.isInteger(at) || at<0 || at>data.program.length) return;
    if (payload.op) {
      if(data.program.length>=14){status.textContent=t('Remove a block before adding another.','请先移除一个积木。');return;}
      remember();
      data.program.splice(at,0,payload.op);
      selected=at+1;
    } else {
      const {start,count}=payload;
      if (at>=start && at<=start+count) {
        pending=null;draw();status.textContent=t('The block is already here.','这块积木已经在这里。');return;
      }
      remember();
      const moved=data.program.splice(start,count);
      const dest=at>start?at-count:at;
      data.program.splice(dest,0,...moved);
      selected=dest+count;
    }
    commit(t('Program changed. Run it to test your edit.','程序已修改，运行看看。'),true);
  }
  function addSlot(parent,index) {
    const caption=data.program.length===0 ? t('Drop your first block here','把第一块积木拖到这里') : t('Insert here','在这里插入');
    const slot=button(caption,()=>{
      if(pending){place(pending,index);return;}
      selected=index;
      for(const target of canvas.querySelectorAll('[data-flow-slot]'))target.setAttribute('aria-pressed',String(Number(target.dataset.flowSlot)===selected));
      status.textContent=t('Position selected. Choose an instruction in the library.','位置已选好，点积木盒里的指令即可插入。');
    },parent);
    slot.className='flow-slot';
    slot.setAttribute('aria-label',caption+' · '+(index===data.program.length?t('end','末尾'):t('before line ','在第几行之前：')+(index+1)));
    slot.setAttribute('aria-pressed',String(index===selected));
    dragger.slot(slot,index);
  }
  function handle(node,start,count) {
    const payload={start,count};
    dragger.source(node,payload);
    node.onclick=()=>{
      pending=payload;
      status.textContent=t('Choose a dotted line to move the selection there.','已选中。点一条虚线，将它移到那里。');
      canvas.querySelector('[data-flow-slot="'+start+'"]')?.focus();
    };
  }
  function draw() {
    canvas.replaceChildren();
    selected=Math.min(selected,data.program.length);
    back.disabled=undo===null;
    addSlot(canvas,0);
    for(let start=0;start<data.program.length;){
      const family=flowFamily[data.program[start]];
      let end=start+1;
      while(end<data.program.length && flowFamily[data.program[end]]===family)end++;
      const module=el('section',undefined,canvas,'flow-module '+family.key);
      const head=button(t(...family.name),()=>{},module);
      head.className='flow-heading';
      head.setAttribute('aria-label',t('Move module: ','移动模块：')+t(...family.name));
      handle(head,start,end-start);
      for(let i=start;i<end;i++){
        const row=el('div',undefined,module,'flow-row');
        row.dataset.line=i+1;
        const tile=button((i+1)+'. '+label(data.program[i]),()=>{},row);
        tile.className='flow-instruction';
        handle(tile,i,1);
        const remove=button('×',()=>{remember();data.program.splice(i,1);selected=i;commit(t('Instruction removed.','已删除指令。'),true);},row);
        remove.className='flow-remove';
        remove.setAttribute('aria-label',t('Remove line ','删除第几行：')+(i+1));
        if(i+1<end)addSlot(module,i+1);
      }
      addSlot(canvas,end);
      start=end;
    }
  }
  draw();
  return {status,reset(){pending=null;undo=null;selected=Math.min(1,data.program.length);draw();}};
}
