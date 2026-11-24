// Orthographic projection of integer plans. Heights come from the displayed
// search trace; the camera never recalculates a score or fills the gaps.
function createScoreSpace({host, t, xLabel, yLabel, maxCount, maxScore, onInspect}) {
  const ns = 'http://www.w3.org/2000/svg';
  function html(tag, className, parent, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    parent.append(node);
    return node;
  }
  function mark(parent, tag, attrs, text) {
    const node = document.createElementNS(ns, tag);
    for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, val);
    if (text !== undefined) node.textContent = text;
    parent.append(node);
    return node;
  }
  const figure = html('figure', 'score-space', host);
  const axes = html('div', 'score-space-axes', figure);
  for (const [symbol, label] of [['x',xLabel], ['y',yLabel], ['Z',t('Penalty', '罚分')]]) {
    const axis = html('span', 'score-space-axis-key', axes);
    html('b', '', axis, symbol);
    html('span', '', axis, label);
  }
  const svg = mark(figure, 'svg', {class:'score-space-svg', role:'img',
    'aria-label':t('3D plot of the plans tested so far', '已检查方案的三维罚分图')});
  const legend = html('figcaption', 'score-space-legend', figure);
  for (const [kind,label] of [
    ['feasible', t('Feasible score','可行方案罚分')],
    ['best', t('Lowest so far','目前最低分')],
    ['now', t('Current plan','当前方案')],
    ['rejected', t('Rejected · no score','已跳过 · 无罚分')]
  ]) {
    const item = html('span','score-space-legend-item',legend);
    html('i','score-space-key-'+kind,item).setAttribute('aria-hidden','true');
    html('span','',item,label);
  }
  const tools = html('div','score-space-camera',figure);
  tools.setAttribute('role','group');
  tools.setAttribute('aria-label',t('Rotate the 3D plot','旋转三维图'));
  html('span','score-space-help',tools,t('Drag to rotate · select a mark to inspect', '拖动旋转 · 点选标记查看方案'));
  const orientations = [
    ['left','↶',t('Rotate left','向左旋转')], ['right','↷',t('Rotate right','向右旋转')],
    ['up','↑',t('Raise viewpoint','升高视角')], ['down','↓',t('Lower viewpoint','降低视角')],
    ['reset',t('Reset view','重置视角'),t('Reset view','重置视角')]
  ];
  const cameraButtons = {};
  const initialYaw = 34, initialPitch = 30;
  let yaw = initialYaw, pitch = initialPitch;
  for (const [name,icon,label] of orientations) {
    const button = html('button','score-space-camera-button',tools,icon);
    button.type = 'button';
    button.dataset.camera = name;
    button.setAttribute('aria-label',label);
    button.title = label;
    cameraButtons[name] = button;
    button.addEventListener('click',()=>{
      const turns={left:[-22.5,0],right:[22.5,0],up:[0,9],down:[0,-9]};
      if(name==='reset') rotate(initialYaw,initialPitch);
      else rotate(yaw+turns[name][0],pitch+turns[name][1]);
    });
  }

  const clamp = (value,low,high)=>Math.max(low,Math.min(high,value));
  const formatted = n=>String(Number(n.toFixed(3)));
  const pairKey = (x,y)=>x+','+y;
  let state, dragging, suppressClick=false;
  let lastWidth=0, lastHeight=0;
  function rotate(nextYaw,nextPitch) {
    yaw=(nextYaw%360+360)%360;
    pitch=clamp(nextPitch,16,66);
    draw();
  }

  // Flat floor positions encode quantities only. A rejected plan has no
  // numerical altitude; it gets a cross instead of a zero-height score.
  function shownPlans() {
    const {trace,index,method,winners}=state;
    const frame=trace[index], plans=new Map();
    for(let i=0;i<=index;i++) {
      const p=trace[i];
      if (p.y!==null) plans.set(pairKey(p.x,p.y),p);
    }
    if (method==='rows' && index===trace.length-1) {
      for(const [x,y] of winners) {
        if (!plans.has(pairKey(x,y))) {
          plans.set(pairKey(x,y),{x,y,score:frame.bestSoFar,feasible:true,recovered:true});
        }
      }
    }
    return Array.from(plans.values());
  }

  function draw() {
    if (!state || !state.trace.length) return;
    const box=svg.getBoundingClientRect();
    const width=Math.round(box.width),height=Math.round(box.height);
    if(!width || !height) return;
    lastWidth=width;lastHeight=height;
    svg.setAttribute('viewBox','0 0 '+width+' '+height);
    svg.dataset.yaw=formatted(yaw);svg.dataset.pitch=formatted(pitch);
    cameraButtons.up.disabled=pitch>=66;
    cameraButtons.down.disabled=pitch<=16;
    const {trace,index}=state,frame=trace[index];
    const points=shownPlans();
    const ceiling=Number.isFinite(maxScore) && maxScore>0 ? maxScore :
      Math.max(1,...trace.map(p=>p.score==null?0:p.score));
    const a=yaw*Math.PI/180,b=pitch*Math.PI/180;
    const cs=Math.cos(a),sn=Math.sin(a),tilt=Math.sin(b),rise=Math.cos(b);
    const divisor=Math.max(1,maxCount), vertical=0.76;
    function project(x,y,z) {
      const q=x/divisor-.5, r=y/divisor-.5, v=z/ceiling*vertical;
      const depth=q*sn+r*cs;
      return {x:q*cs-r*sn,y:depth*tilt-v*rise,depth:depth*rise+v*tilt};
    }
    const floor=[[0,0],[maxCount,0],[maxCount,maxCount],[0,maxCount]];
    const cube=floor.flatMap(([x,y])=>[project(x,y,0),project(x,y,ceiling)]);
    const xLeft=Math.min(...cube.map(p=>p.x)),xRight=Math.max(...cube.map(p=>p.x));
    const yTop=Math.min(...cube.map(p=>p.y)),yBottom=Math.max(...cube.map(p=>p.y));
    const gutter=width<480 ? 29 : 47, marginY=width<480 ? 30 : 33;
    const zoom=Math.min((width-2*gutter)/Math.max(.01,xRight-xLeft),
                        (height-2*marginY)/Math.max(.01,yBottom-yTop));
    // A wide projector can spread neighbouring lattice positions farther
    // apart without changing their vertical penalty scale or depth order.
    const horizontalZoom=Math.min((width-2*gutter)/Math.max(.01,xRight-xLeft),
      zoom*clamp(width/height*.84,1,1.62));
    function pos(x,y,z=0) {
      const p=project(x,y,z);
      return {x:width/2+(p.x-(xLeft+xRight)/2)*horizontalZoom,
              y:height/2+(p.y-(yTop+yBottom)/2)*zoom,depth:p.depth};
    }
    const scene=svg.ownerDocument.createDocumentFragment();
    const title=t('3D penalty landscape','三维罚分图');
    mark(scene,'title',{},title);
    mark(scene,'desc',{},t('Step ','步骤 ')+frame.step+' / '+trace.length+
      (frame.y===null?t(' · No feasible y in this row.',' · 此行没有可行的 y。'):
      ' · ('+frame.x+', '+frame.y+') · '+(frame.score==null?t('infeasible','不可行'):'Z = '+formatted(frame.score))));
    const base=mark(scene,'g',{'aria-hidden':'true'});
    function line(p,q,cls,parent=base) {
      return mark(parent,'line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,class:cls});
    }
    function label(p,content,cls,anchor='middle') {
      return mark(base,'text',{x:p.x,y:p.y,class:cls,'text-anchor':anchor},content);
    }
    mark(base,'polygon',{points:floor.map(([x,y])=>{const p=pos(x,y);return p.x+','+p.y}).join(' '),
      class:'ss-floor'});
    for(let i=0;i<=maxCount;i++) {
      line(pos(i,0),pos(i,maxCount),'ss-gridline');
      line(pos(0,i),pos(maxCount,i),'ss-gridline');
    }
    // Label the two outer floor edges nearest the viewer as the scene turns.
    // Tick values always refer to true x/y coordinates, even on the far edge.
    const nearX=sn>=0?maxCount:0, nearY=cs>=0?maxCount:0;
    const ticks=[...new Set([0,Math.floor(maxCount/2),maxCount])];
    const center=pos(maxCount/2,maxCount/2);
    function axisFoot(p,q,value) {
      const mid={x:(p.x+q.x)/2,y:(p.y+q.y)/2};
      const dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy)||1;
      let nx=-dy/len,ny=dx/len;
      if(nx*(mid.x-center.x)+ny*(mid.y-center.y)<0){nx=-nx;ny=-ny;}
      line(p,q,'ss-axis-line');
      for(const n of ticks) {
        const frac=n/divisor,at={x:p.x+dx*frac,y:p.y+dy*frac};
        // The two nearest edges meet in this corner. Draw its tick on x only.
        if(value==='y' && n===nearY) continue;
        label({x:at.x+nx*10,y:at.y+ny*10+3},String(n),'ss-tick');
      }
      label({x:mid.x+nx*23,y:mid.y+ny*23+3},value,'ss-axis-name');
    }
    axisFoot(pos(0,nearY),pos(maxCount,nearY),'x');
    axisFoot(pos(nearX,0),pos(nearX,maxCount),'y');

    const leftCorner=floor.reduce((previous,corner)=>{
      return pos(...corner).x<pos(...previous).x?corner:previous;
    });
    const start=pos(...leftCorner),top=pos(...leftCorner,ceiling);
    line(start,top,'ss-z-axis');
    label({x:top.x,y:top.y-10},'Z','ss-axis-name');
    for(const z of [ceiling/2,ceiling]) {
      const at=pos(...leftCorner,z);
      line({x:at.x-3,y:at.y},at,'ss-z-axis');
      label({x:at.x-6,y:at.y+3},formatted(z),'ss-tick','end');
    }

    if(frame.y===null) {
      const badRow=line(pos(frame.x,0),pos(frame.x,maxCount),'score-space-empty-row');
      badRow.dataset.x=frame.x;
      mark(base,'title',{},t('No feasible y for x = ','无可行 y，x = ')+frame.x);
    }
    const planned=points.map(point=>{
      const floorPoint=pos(point.x,point.y);
      return {point, floorPoint, head:pos(point.x,point.y,point.score??0)};
    });
    planned.sort((p,q)=>p.floorPoint.depth-q.floorPoint.depth);
    const rendered=mark(scene,'g',{class:'ss-marks'});
    let active;
    for(const item of planned) {
      const {point,head,floorPoint}=item;
      const current=point.x===frame.x && point.y===frame.y;
      const best=point.feasible && Math.abs(point.score-frame.bestSoFar)<1e-8;
      const kind=point.feasible?'feasible':'rejected';
      const group=mark(rendered,'g',{class:'score-space-point','data-x':point.x,'data-y':point.y,
        'data-score':point.score??'','data-kind':kind,'data-current':String(current),'data-best':String(best),
        'data-role':current?'current':best?'best':point.feasible?'candidate':'rejected',
        'data-recovered':String(!!point.recovered)});
      const pLabel='('+point.x+', '+point.y+') · '+(point.feasible?'Z = '+formatted(point.score):t('No score','无罚分'));
      mark(group,'title',{},pLabel);
      if(point.feasible) {
        line(floorPoint,head,'ss-stem',group);
        if(best) {
          const d=width<430?4.2:5.3;
          mark(group,'path',{d:'M '+head.x+' '+(head.y-d)+' l '+d+' '+d+' -'+d+' '+d+' -'+d+' -'+d+' Z',class:'ss-diamond'});
        } else {
          mark(group,'circle',{cx:head.x,cy:head.y,r:width<430?2.8:3.6,class:'ss-dot'});
        }
      } else {
        const d=width<430?2.7:3.5;
        mark(group,'path',{d:'M '+(head.x-d)+' '+(head.y-d)+' l '+(2*d)+' '+(2*d)+
          ' M '+(head.x+d)+' '+(head.y-d)+' l -'+(2*d)+' '+(2*d),class:'ss-cross'});
      }
      // The visible glyph is small enough to preserve all 121 positions. A
      // transparent hit target makes the same point easier to inspect on touch.
      mark(group,'circle',{cx:head.x,cy:head.y,r:width<430?6:7,class:'ss-hit'});
      if(current)active={head,point,pLabel,group};
    }
    if(active) {
      rendered.append(active.group);
      const {head,pLabel,group}=active;
      mark(group,'circle',{cx:head.x,cy:head.y,r:8.2,class:'ss-active-ring'});
      const bubble=mark(scene,'g',{class:'ss-bubble','pointer-events':'none','aria-hidden':'true'});
      const wide=Math.max(78,Array.from(pLabel).reduce((s,c)=>s+(c.charCodeAt(0)>255?12:6.5),0)+20);
      const right=head.x+wide+15<width-3;
      const x=clamp(right?head.x+12:head.x-wide-12,2,Math.max(2,width-wide-2));
      const y=clamp(head.y-32,3,height-25);
      line(head,{x:right?x:x+wide,y:y+16},'ss-bubble-line',bubble);
      mark(bubble,'rect',{x,y,width:wide,height:23,rx:4});
      mark(bubble,'text',{x:x+wide/2,y:y+15.5,'text-anchor':'middle'},pLabel);
    }
    svg.replaceChildren(scene);
  }

  // Keep vertical single-finger page scrolling available on small screens.
  svg.addEventListener('pointerdown',event=>{
    if(!event.isPrimary || event.button!==0) return;
    suppressClick=false;
    dragging={id:event.pointerId,x:event.clientX,y:event.clientY,yaw,pitch,moved:false};
  });
  svg.addEventListener('pointermove',event=>{
    if(!dragging || event.pointerId!==dragging.id) return;
    const dx=event.clientX-dragging.x,dy=event.clientY-dragging.y;
    if(!dragging.moved && Math.hypot(dx,dy)<5) return;
    if(!dragging.moved) svg.setPointerCapture(event.pointerId);
    dragging.moved=true;
    svg.classList.add('ss-dragging');
    rotate(dragging.yaw+dx*.53,dragging.pitch-dy*.28);
  });
  function endDrag(event) {
    if(!dragging || event.pointerId!==dragging.id) return;
    suppressClick=dragging.moved;
    dragging=null;
    svg.classList.remove('ss-dragging');
    if(svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  }
  svg.addEventListener('pointerup',endDrag);
  svg.addEventListener('pointercancel',endDrag);
  svg.addEventListener('pointerleave',event=>{
    if (dragging && !dragging.moved) endDrag(event);
  });
  svg.addEventListener('click',event=>{
    if(suppressClick){suppressClick=false;return;}
    const selected=event.target.closest('.score-space-point');
    if(selected && onInspect) onInspect(Number(selected.dataset.x),Number(selected.dataset.y));
  });
  const resized=()=>{
    const {width,height}=svg.getBoundingClientRect();
    if(Math.round(width)!==lastWidth || Math.round(height)!==lastHeight) draw();
  };
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(resized):null;
  if(observer) observer.observe(svg); else window.addEventListener('resize',resized);
  return {
    update(next) {state=next;draw();},
    destroy() {observer?.disconnect();window.removeEventListener('resize',resized);figure.remove();}
  };
}
