// Точный разрез (слот 4, клавиша 4): за ману игрок оставляет на враге несколько отметок, проводя курсором через него
// без нажатия кнопки мыши. Сила каждой отметки — множитель ×1–×5 от скорости мыши. Урон не наносится сразу:
// когда размещены все отметки, разрезы срабатывают по очереди с шагом 0,2 с и бьют только того врага, на котором оставлены.
// Таланты: «Серия разрезов» добавляет отметки, «Перекрёстный разрез» усиливает серию за каждое пересечение отметок.
// Все числа навыка и талантов — в precise-cut-data.js.
(()=>{
const CFG=Object.assign({mana:25,unlockCost:35,baseCuts:3,icon:'assets/precision-cut-icon-v1.png',
 series:{name:'Серия разрезов',cutsPerRank:1,costs:[1,2,3,4,5,6,7]},cross:{name:'Перекрёстный разрез',bonusPerCross:.1,costs:[1]}},window.PRECISE_CUT||{});
const CUT_KEY='forest-frontier-cut-v1',CUT_MANA=CFG.mana,CUT_UNLOCK_COST=CFG.unlockCost;
const CUT_MIN_PATH=18,SAMPLE_STALE=150,SPEED_WINDOW=120,FIRE_STEP=200,FX_MS=500,FINAL_WAIT=700;
// Область попадания — эллипс внутри изображения врага (доли его ширины и высоты).
const HIT={cx:.5,cy:.48,rx:.43,ry:.45};
const SERIES_MAX=CFG.series.costs.length,CROSS_MAX=CFG.cross.costs.length;

let cutUnlocked=false,seriesRank=0,crossRank=0;
try{const saved=JSON.parse(localStorage.getItem(CUT_KEY));cutUnlocked=saved?.unlocked===true;
 if(Number.isInteger(saved?.series))seriesRank=Math.max(0,Math.min(SERIES_MAX,saved.series));
 if(Number.isInteger(saved?.cross))crossRank=Math.max(0,Math.min(CROSS_MAX,saved.cross));}catch{}
function saveCut(){try{localStorage.setItem(CUT_KEY,JSON.stringify({unlocked:cutUnlocked,series:seriesRank,cross:crossRank}));}catch{}}
const cutsTotal=()=>CFG.baseCuts+seriesRank*CFG.series.cutsPerRank;
const spentOn=(costs,rank)=>costs.slice(0,rank).reduce((sum,cost)=>sum+cost,0);
const cutSpent=()=>spentOn(CFG.series.costs,seriesRank)+spentOn(CFG.cross.costs,crossRank);
const cutSpentMax=()=>spentOn(CFG.series.costs,SERIES_MAX)+spentOn(CFG.cross.costs,CROSS_MAX);

// active — навык включён (идёт набор отметок или их срабатывание); firing — отметки уже срабатывают.
// runTotal и runCross фиксируются при активации: прокачка во время серии действует только на следующую.
let active=false,firing=false,token=0,marks=[],timers=[],runTotal=CFG.baseCuts,runCross=false,crossings={};
// Состояние текущего прохода курсора: armed — курсор побывал вне врага после прошлого разреза.
// live — линия, которая прямо сейчас тянется за курсором по врагу.
let armed=true,passPath=0,lastPoint=null,samples=[],live=null;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const quietFx=()=>!settings.animations||matchMedia('(prefers-reduced-motion: reduce)').matches;
const enemyKey=()=>(window.dungeonApi?.active()?'dg:':'')+zone+':'+zoneKills+':'+kills;
const enemySprite=()=>document.querySelector('#monster > svg:not(.slash-effect)')||$('monster');
const modalOpen=()=>!!document.querySelector('dialog[open]');
const canStrikeEnemy=()=>!locked&&hp>0&&!modalOpen();
const formatMultiplier=value=>'×'+Number(value.toFixed(2)).toLocaleString('ru-RU');
function speedMultiplier(speed){return speed<=2400?Math.max(1,speed/800):Math.min(5,3+(speed-2400)/1200);}
function arenaPoint(clientX,clientY){
 const arena=$('arena'),zoom=arena.currentCSSZoom||1,box=arena.getBoundingClientRect();
 return {x:(clientX-box.left)/zoom,y:(clientY-box.top)/zoom,zoom};
}

const style=document.createElement('style');
style.textContent=`
#cutSkill .cut-icon{width:62%;height:62%;pointer-events:none}
#cutSkill .cut-icon-img{position:absolute;inset:2px;width:calc(100% - 4px);height:calc(100% - 4px);border-radius:50%;object-fit:cover;pointer-events:none}
.talent-skill-icon .cut-icon-img,.detail-root .cut-icon-img{width:100%;height:100%;border-radius:50%;object-fit:cover;pointer-events:none}
#cutSkill .cut-count{position:absolute;left:50%;top:50%;z-index:3;translate:-50% -50%;padding:1px 6px;border-radius:9px;background:#08141ccc;font-size:13px;font-weight:800;line-height:1.2;color:#f2faff;text-shadow:0 0 6px #7fc8ff;box-shadow:0 0 8px #9fd6ff66;pointer-events:none}
#cutSkill .cut-count:empty{display:none}
#cutSkill.skill-running{filter:none;box-shadow:0 0 0 2px #d8efff,0 0 18px #9fd6ff}
#cutSkill.mana-insufficient .cut-icon{opacity:.45}
.cut-mark,.cut-fx{position:absolute;z-index:6;pointer-events:none;transform:translate(-50%,-50%) rotate(var(--angle))}
.cut-mark{height:3px;border-radius:2px;background:linear-gradient(90deg,transparent,#fff 10%,#fff 90%,transparent);opacity:var(--opacity);filter:brightness(var(--bright));box-shadow:0 0 var(--glow) #bfe4ff,0 0 calc(var(--glow) / 2.5) #fff}
.cut-mark.cut-settle{transition:width .14s ease-out}
.cut-fx{height:0}
.cut-fx>span{position:absolute;left:0;right:0;top:50%;border-radius:50%}
.cut-spark{position:absolute;z-index:7;width:4px;height:4px;margin:-2px;border-radius:50%;background:#fff;box-shadow:0 0 6px #bfe4ff,0 0 2px #fff;pointer-events:none}
.cut-cursor{position:fixed;left:0;top:0;z-index:40;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,#fff 0 35%,#e6f5ff 50%,transparent 72%);box-shadow:0 0 10px 4px #bfe4ff88,0 0 22px 8px #9fd6ff33}
.cut-cursor[hidden]{display:none}
.cut-mark.cut-wound{height:2px;background:linear-gradient(90deg,transparent,#fff 18%,#fff 82%,transparent)}
.cut-open-glow{height:34px;margin-top:-17px;background:radial-gradient(ellipse at center,#fff,#e6f5ffcc 30%,#bfe4ff44 58%,transparent 72%);filter:blur(2px) brightness(var(--bright))}
.cut-open{height:3px;margin-top:-1.5px;background:linear-gradient(90deg,transparent,#fff 15%,#fff 85%,transparent);box-shadow:0 0 var(--glow) #fff}
/* Множитель перекрестий под врагом */
.cut-multiplier{position:absolute;z-index:8;translate:-50% -50%;font-size:38px;font-weight:900;line-height:1;color:#fff;text-shadow:0 0 10px #bfe4ffcc,0 0 22px #7fc8ff88,0 2px 3px #000a;pointer-events:none;white-space:nowrap}
.cut-multiplier[hidden]{display:none}
.cut-ring{position:absolute;z-index:7;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;border:2px solid #f2faff;box-shadow:0 0 12px #bfe4ff,inset 0 0 8px #bfe4ff88;pointer-events:none}
/* Вспышка в точке пересечения отметок */
.cut-cross-flash{position:absolute;z-index:8;width:0;height:0;pointer-events:none}
.cut-cross-flash>span{position:absolute;left:0;top:0;translate:-50% -50%;border-radius:50%}
.cut-cross-flash .core{width:8px;height:8px;background:#fff;box-shadow:0 0 6px #fff}
.cut-cross-flash .halo{width:30px;height:30px;background:radial-gradient(circle,#e6f5ffcc,#9fd6ff55 45%,transparent 70%)}
.cut-cross-flash .ray{width:34px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#fff,transparent)}
.cut-cross-flash .ray.v{rotate:90deg}
/* Таланты ветки */
#talentTreeContent .cut-talent .talent-node>svg{width:38px;height:38px;transition:opacity .2s,filter .2s}
#talentTreeContent .cut-talent:not(.talent-invested) .talent-node>svg{opacity:.45;filter:grayscale(.6)}
#talentTreeContent .cut-talent.talent-invested .talent-node>svg{filter:drop-shadow(0 0 6px #bfe4ff)}
#talentTreeContent .cut-talent .cut-plus{position:absolute;left:50%;top:50%;translate:-50% -50%;z-index:2;font-size:30px;font-weight:900;line-height:1;color:#f2faff;text-shadow:0 0 8px #7fc8ff,0 1px 2px #000;pointer-events:none}
#talentTreeContent .cut-talent.cut-talent-flash .talent-node{animation:cut-talent-flash .6s ease-out}
@keyframes cut-talent-flash{0%{box-shadow:0 0 0 0 #fff,0 0 0 #bfe4ff}35%{box-shadow:0 0 0 6px #ffffff88,0 0 34px #bfe4ff}100%{box-shadow:0 0 0 14px #fff0,0 0 0 #bfe4ff00}}
`;
document.head.append(style);

// Рисованная иконка — пока нет картинки assets/precision-cut-icon-v1.png; когда файл появится, он подхватится везде.
const CUT_ICON='<svg class="cut-icon" viewBox="0 0 48 48" aria-hidden="true"><defs><filter id="cutIconGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#cutIconGlow)" stroke-linecap="round"><path d="M9 33 39 9" stroke="#bfe4ff" stroke-width="4"/><path d="M9 33 39 9" stroke="#fff" stroke-width="1.8"/><path d="M7 41 33 20" stroke="#bfe4ff" stroke-width="3" opacity=".8"/><path d="M7 41 33 20" stroke="#fff" stroke-width="1.4"/><path d="M17 41 41 22" stroke="#bfe4ff" stroke-width="2.4" opacity=".6"/><path d="M17 41 41 22" stroke="#fff" stroke-width="1.1"/></g></svg>';
let iconReady=false;
const iconHtml=()=>iconReady?`<img class="cut-icon cut-icon-img" src="${CFG.icon}" alt="">`:CUT_ICON;
function refreshIcons(){
 button.querySelector('.cut-icon').outerHTML=iconHtml();
 $('cutTreeIcon').innerHTML=iconHtml();
 const root=document.querySelector('#talentTreeContent .detail-root.cut-root');if(root)root.innerHTML=iconHtml();
}

// Слот 4: пустой слот превращается в кнопку навыка; до изучения он выглядит пустым (как остальные свободные слоты).
const emptySlot=[...document.querySelectorAll('.skill-bar .skill-slot')].find(slot=>slot.querySelector('.skill-number')?.textContent==='4');
const button=document.createElement('button');button.type='button';button.className='skill-slot';button.id='cutSkill';
button.innerHTML=CUT_ICON+'<span class="cut-count"></span><span class="skill-placeholder skill-empty-mark" aria-hidden="true">+</span><span class="skill-number">4</span><span class="skill-mana-cost" aria-label="Стоимость: '+CUT_MANA+' маны">'+CUT_MANA+'</span>';
emptySlot.replaceWith(button);
const cursor=document.createElement('div');cursor.className='cut-cursor';cursor.hidden=true;cursor.setAttribute('aria-hidden','true');document.body.append(cursor);
const multiplierLabel=document.createElement('div');multiplierLabel.className='cut-multiplier';multiplierLabel.hidden=true;multiplierLabel.setAttribute('aria-hidden','true');$('arena').append(multiplierLabel);

function updateCutUI(){
 const collecting=active&&!firing,total=active?runTotal:cutsTotal();
 button.classList.toggle('skill-unlocked',cutUnlocked);button.classList.toggle('skill-running',active);
 button.classList.toggle('mana-insufficient',cutUnlocked&&!active&&mana<CUT_MANA);
 button.disabled=!cutUnlocked||active||locked;
 button.querySelector('.cut-count').textContent=collecting?(total-marks.length)+'/'+total:'';
 button.title=cutUnlocked?'Точный разрез · '+CUT_MANA+' маны · '+cutsTotal()+' отложенных разрезов · урон ×1–×5 от скорости мыши':'';
 button.setAttribute('aria-label','Точный разрез'+(collecting?' — осталось разрезов: '+(total-marks.length)+' из '+total:''));
 setSkillHidden(button,!cutUnlocked,4);
 updateCutTalentSection();
}

function useCut(){
 renderMana();checkBossTimer();
 if(!cutUnlocked||active||rapidActive||powerActive||aimActive||locked||hp<=0||modalOpen())return;
 if(mana<CUT_MANA){showManaWarning(button);return;}
 mana=Number((mana-CUT_MANA).toFixed(6));renderMana();saveProgress();
 active=true;firing=false;marks=[];token++;armed=true;resetPass();samples=[];lastPoint=null;live?.el.remove();live=null;
 runTotal=cutsTotal();runCross=crossRank>0;crossings={};
 resetMultiplier();
 $('message').textContent='Точный разрез: проведи курсором через врага '+runTotal+' раз. Чем быстрее взмах — тем сильнее разрез.';
 updateCutUI();
}
function resetPass(){passPath=0;}

// Длина части отрезка a→b внутри эллипса и точка середины этой части (в координатах экрана).
function insideSegment(ax,ay,bx,by,e){
 const px=(ax-e.cx)/e.rx,py=(ay-e.cy)/e.ry,dx=(bx-ax)/e.rx,dy=(by-ay)/e.ry;
 const A=dx*dx+dy*dy,B=2*(px*dx+py*dy),C=px*px+py*py-1;
 if(A===0)return C<=0?{length:0,mid:{x:ax,y:ay}}:null;
 const disc=B*B-4*A*C;if(disc<0)return null;
 const root=Math.sqrt(disc),t0=Math.max(0,(-B-root)/(2*A)),t1=Math.min(1,(-B+root)/(2*A));
 if(t1<=t0)return null;
 const tm=(t0+t1)/2;
 return {length:(t1-t0)*Math.hypot(bx-ax,by-ay),mid:{x:ax+(bx-ax)*tm,y:ay+(by-ay)*tm},enter:{x:ax+(bx-ax)*t0,y:ay+(by-ay)*t0},exit:{x:ax+(bx-ax)*t1,y:ay+(by-ay)*t1}};
}
function hitEllipse(){
 const r=enemySprite().getBoundingClientRect();
 return {cx:r.left+r.width*HIT.cx,cy:r.top+r.height*HIT.cy,rx:r.width*HIT.rx,ry:r.height*HIT.ry,rect:r};
}
const insideEllipse=(x,y,e)=>((x-e.cx)/e.rx)**2+((y-e.cy)/e.ry)**2<=1;

// Скорость — путь курсора за последние 120 мс в пикселях в секунду; образец сбрасывается после паузы дольше 150 мс.
function currentSpeed(now){
 const recent=samples.filter(s=>now-s.t<=SPEED_WINDOW);if(recent.length<2)return 0;
 let distance=0;for(let i=1;i<recent.length;i++)distance+=Math.hypot(recent[i].x-recent[i-1].x,recent[i].y-recent[i-1].y);
 const elapsed=recent[recent.length-1].t-recent[0].t;return elapsed>0?distance/elapsed*1000:0;
}

function onPointerMove(event){
 const now=performance.now();
 const collecting=active&&!firing&&marks.length<runTotal;
 cursor.hidden=!collecting||modalOpen();
 if(collecting){cursor.style.transform=`translate(${event.clientX}px,${event.clientY}px)`;}
 // Последний разрез дорисовывается за курсором, пока тот не покинет врага.
 if(!collecting&&!live){lastPoint=null;return;}
 const point={x:event.clientX,y:event.clientY,t:now};
 if(!lastPoint||now-lastPoint.t>SAMPLE_STALE){endLive(lastPoint);samples=[point];lastPoint=point;resetPass();return;}
 samples.push(point);if(samples.length>40)samples.shift();
 if(!canStrikeEnemy()){endLive(lastPoint);lastPoint=point;resetPass();return;}
 const e=hitEllipse(),part=insideSegment(lastPoint.x,lastPoint.y,point.x,point.y,e),inside=insideEllipse(point.x,point.y,e);
 if(part&&armed&&collecting){
  passPath+=part.length;
  if(!live)live=startLive(part.enter||lastPoint);
 }
 if(collecting&&armed&&live&&passPath>=CUT_MIN_PATH){
  registerMark(currentSpeed(now),e);
  armed=false;
 }
 // Линия разреза тянется от точки входа во врага за курсором.
 if(live)drawLive(inside?point:(part?.exit||point));
 // После разреза новый засчитывается, только когда курсор выйдет за пределы врага.
 if(!inside){endLive(part?.exit||point);armed=true;resetPass();}
 lastPoint=point;
}

// Живой след: бледная линия от точки входа до курсора. Засчитанный разрез становится отметкой, незасчитанный гаснет.
function startLive(from){
 const el=document.createElement('div');el.className='cut-mark cut-live cut-wound';
 el.style.cssText='--opacity:.35;--bright:.8;--glow:6px';$('arena').append(el);
 return {el,start:{x:from.x,y:from.y},mark:null};
}
function lineGeometry(a,b){
 const p=arenaPoint(a.x,a.y),q=arenaPoint(b.x,b.y);
 return {x:(p.x+q.x)/2,y:(p.y+q.y)/2,length:Math.max(2,Math.hypot(q.x-p.x,q.y-p.y)),angle:Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI};
}
function placeLine(el,g){el.style.left=g.x+'px';el.style.top=g.y+'px';el.style.width=g.length+'px';el.style.setProperty('--angle',g.angle+'deg');}
function drawLive(end){
 const g=lineGeometry(live.start,end);placeLine(live.el,g);
 if(live.mark)Object.assign(live.mark,{x:g.x,y:g.y,angle:g.angle,length:Math.max(g.length,2)});
}
// Курсор покинул врага: засчитанный разрез фиксируется по траектории и вытягивается до длины, заданной скоростью.
function endLive(end){
 if(!live)return;
 const current=live;live=null;
 if(!current.mark){current.el.animate([{opacity:.35},{opacity:0}],{duration:180,fill:'forwards'}).onfinish=()=>current.el.remove();return;}
 if(end)drawLiveFor(current,end);
 const mark=current.mark,length=Math.max(mark.length,mark.targetLength);
 if(!quietFx())current.el.classList.add('cut-settle');
 current.el.style.width=length+'px';mark.length=length;
 settleMark(mark);
}
function drawLiveFor(current,end){
 const g=lineGeometry(current.start,end);placeLine(current.el,g);
 Object.assign(current.mark,{x:g.x,y:g.y,angle:g.angle,length:g.length});
}

function registerMark(speed,e){
 const multiplier=Number(speedMultiplier(speed).toFixed(2)),intensity=clamp(speed/4800,0,1);
 const zoom=$('arena').currentCSSZoom||1,enemyWidth=e.rect.width/zoom;
 const referenceLength=Math.max(220,enemyWidth*1.65),targetLength=referenceLength*(.7+.7*intensity);
 const el=live.el;el.classList.remove('cut-live');
 const mark={multiplier,intensity,angle:0,x:0,y:0,length:0,targetLength,brightness:.65+.85*intensity,opacity:.5+.45*intensity,glow:8+22*intensity,enemy:enemyKey(),el,settled:false};
 el.style.setProperty('--opacity',mark.opacity);el.style.setProperty('--bright',mark.brightness);el.style.setProperty('--glow',mark.glow+'px');
 live.mark=mark;
 marks.push(mark);
 $('message').textContent='Разрез '+marks.length+' из '+runTotal+' · сила ×'+multiplier.toLocaleString('ru-RU');
 // Если курсор задержался на враге после последней отметки, она фиксируется сама.
 if(marks.length===runTotal){const current=token;timers.push(setTimeout(()=>{if(current===token&&live?.mark===mark)endLive(null);},FINAL_WAIT));}
 updateCutUI();
}

// ── Пересечения отметок ──
function segmentEnds(mark){
 const rad=mark.angle*Math.PI/180,hx=Math.cos(rad)*mark.length/2,hy=Math.sin(rad)*mark.length/2;
 return [{x:mark.x-hx,y:mark.y-hy},{x:mark.x+hx,y:mark.y+hy}];
}
// Точка пересечения видимых отрезков или null: параллельные, совпадающие и касающиеся только концами не считаются.
function crossPoint(a,b){
 const [p,p2]=segmentEnds(a),[q,q2]=segmentEnds(b),r={x:p2.x-p.x,y:p2.y-p.y},s={x:q2.x-q.x,y:q2.y-q.y};
 const denom=r.x*s.y-r.y*s.x;if(Math.abs(denom)<1e-9)return null;
 const qp={x:q.x-p.x,y:q.y-p.y},t=(qp.x*s.y-qp.y*s.x)/denom,u=(qp.x*r.y-qp.y*r.x)/denom,eps=1e-4;
 if(t<=eps||t>=1-eps||u<=eps||u>=1-eps)return null;
 return {x:p.x+t*r.x,y:p.y+t*r.y};
}
const crossMultiplier=enemy=>1+CFG.cross.bonusPerCross*(crossings[enemy]||0);
// Отметка зафиксирована: считаем её пересечения с уже лежащими отметками на том же враге.
function settleMark(mark){
 if(mark.settled)return;mark.settled=true;
 if(runCross){
  const before=crossMultiplier(mark.enemy);
  for(const other of marks){
   if(other===mark||!other.settled||other.enemy!==mark.enemy)continue;
   const point=crossPoint(mark,other);if(!point)continue;
   crossings[mark.enemy]=(crossings[mark.enemy]||0)+1;
   crossFlash(point);
  }
  showMultiplier(crossMultiplier(mark.enemy),before);
 }
 // Урон начинается, только когда размещены и зафиксированы все отметки серии.
 if(!firing&&marks.length===runTotal&&marks.every(m=>m.settled))startFiring();
}
function crossFlash(point){
 if(quietFx())return;
 const flash=document.createElement('div');flash.className='cut-cross-flash';flash.style.left=point.x+'px';flash.style.top=point.y+'px';
 flash.innerHTML='<span class="halo"></span><span class="ray"></span><span class="ray v"></span><span class="core"></span>';$('arena').append(flash);
 flash.animate([{opacity:0,transform:'scale(.4)'},{opacity:1,transform:'scale(1.1)',offset:.25},{opacity:0,transform:'scale(1)'}],{duration:360,easing:'ease-out',fill:'forwards'}).onfinish=()=>flash.remove();
}

// ── Число множителя под врагом ──
let shownMultiplier=1,multiplierFade=null;
function placeMultiplier(){
 const r=enemySprite().getBoundingClientRect(),zoom=$('arena').currentCSSZoom||1,box=$('arena').getBoundingClientRect();
 const x=(r.left+r.width/2-box.left)/zoom,y=Math.min((r.bottom-box.top)/zoom+42,box.height/zoom-30);
 multiplierLabel.style.left=x+'px';multiplierLabel.style.top=y+'px';
}
function resetMultiplier(){
 multiplierFade?.cancel();multiplierFade=null;multiplierLabel.getAnimations().forEach(a=>a.cancel());
 document.querySelectorAll('.cut-ring,.cut-cross-flash').forEach(el=>el.remove());
 shownMultiplier=1;multiplierLabel.textContent=formatMultiplier(1);multiplierLabel.style.opacity='';multiplierLabel.style.filter='';
 multiplierLabel.hidden=!runCross;if(runCross)placeMultiplier();
}
function showMultiplier(value,before){
 placeMultiplier();multiplierLabel.textContent=formatMultiplier(value);
 if(value<=shownMultiplier+1e-9){shownMultiplier=value;return;}
 const crossedWhole=Math.floor(value+1e-9)>Math.floor(Math.max(before,shownMultiplier)+1e-9);shownMultiplier=value;
 if(quietFx())return;
 multiplierLabel.animate([{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(1.28)',filter:'brightness(1.6) drop-shadow(0 0 12px #bfe4ff)',offset:.4},{transform:'scale(1)',filter:'brightness(1)'}],{duration:380,easing:'ease-out'});
 // Достигнут новый целый множитель (×2, ×3…) — из центра числа расходится световое кольцо.
 if(crossedWhole){
  const ring=document.createElement('span');ring.className='cut-ring';ring.style.left=multiplierLabel.style.left;ring.style.top=multiplierLabel.style.top;$('arena').append(ring);
  ring.animate([{opacity:1,transform:'scale(.6)'},{opacity:0,transform:'scale(3.4)'}],{duration:750,easing:'ease-out',fill:'forwards'}).onfinish=()=>ring.remove();
 }
}
function fadeMultiplier(){
 if(multiplierLabel.hidden)return;
 if(quietFx()){multiplierLabel.hidden=true;return;}
 multiplierFade=multiplierLabel.animate([{opacity:1,filter:'blur(0)'},{opacity:0,filter:'blur(4px)'}],{duration:650,easing:'ease-out',fill:'forwards'});
 multiplierFade.onfinish=()=>{multiplierLabel.hidden=true;multiplierFade.cancel();multiplierFade=null;};
}

function startFiring(){
 firing=true;cursor.hidden=true;const current=token;
 marks.forEach((mark,i)=>timers.push(setTimeout(()=>{if(current===token)fireMark(mark,i===marks.length-1);},FIRE_STEP*(i+1))));
 timers.push(setTimeout(()=>{if(current===token)finishCut();},FIRE_STEP*marks.length+FX_MS));
 updateCutUI();
}
// Урон каждого разреза: обычный удар × множитель скорости × множитель перекрестий всей серии на этом враге.
function fireMark(mark,last){
 const sameEnemy=mark.enemy===enemyKey()&&!locked&&hp>0;
 if(sameEnemy)attack(true,mark.multiplier*(runCross?crossMultiplier(mark.enemy):1),true);
 if(sameEnemy&&!quietFx())strikeFx(mark);
 if(last)fadeMultiplier();
 const el=mark.el;if(!el)return;
 el.animate([{opacity:mark.opacity},{opacity:0}],{duration:quietFx()?250:FX_MS,easing:'ease-out',fill:'forwards'}).onfinish=()=>el.remove();
}
const spark=(x,y,dx,dy,duration)=>{
 const el=document.createElement('span');el.className='cut-spark';el.style.left=x+'px';el.style.top=y+'px';$('arena').append(el);
 el.animate([{opacity:1,transform:'translate(0,0) scale(1)'},{opacity:0,transform:`translate(${dx}px,${dy}px) scale(.3)`}],{duration,easing:'cubic-bezier(.15,.7,.4,1)',fill:'forwards'}).onfinish=()=>el.remove();
};
// Удар: тонкий надрез раскрывается светлой линзой и снова смыкается, от линии разлетаются белые искры (12 + множитель × 2).
// Ширина раскрытия и сила свечения растут со скоростью взмаха.
function strikeFx(mark){
 const fx=document.createElement('div');fx.className='cut-fx';
 fx.style.cssText=`left:${mark.x}px;top:${mark.y}px;width:${mark.length}px;--angle:${mark.angle}deg;--bright:${mark.brightness};--glow:${mark.glow}px`;
 fx.innerHTML='<span class="cut-open-glow"></span><span class="cut-open"></span>';$('arena').append(fx);setTimeout(()=>fx.remove(),FX_MS+80);
 const [glow,open]=fx.children,width=3+6*mark.intensity,ease={duration:FX_MS,easing:'ease-out',fill:'forwards'};
 glow.animate([{opacity:0,transform:'scaleY(.4)'},{opacity:.9,transform:'scaleY(1)',offset:.3},{opacity:0,transform:'scaleY(1.6)'}],ease);
 open.animate([{transform:'scaleY(1)',opacity:1},{transform:`scaleY(${width})`,opacity:1,offset:.3},{transform:'scaleY(.2)',opacity:0}],{...ease,easing:'cubic-bezier(.3,0,.4,1)'});
 const rad=mark.angle*Math.PI/180,ux=Math.cos(rad),uy=Math.sin(rad),count=12+Math.round(mark.multiplier*2);
 for(let i=0;i<count;i++){const along=(Math.random()-.5)*mark.length*.8,side=Math.random()<.5?-1:1,spread=25+Math.random()*(40+60*mark.intensity);
  spark(mark.x+ux*along,mark.y+uy*along,-uy*side*spread+ux*(Math.random()-.5)*30,ux*side*spread+uy*(Math.random()-.5)*30,FX_MS*(.6+Math.random()*.4));}
}
function finishCut(){
 active=false;firing=false;marks=[];timers=[];cursor.hidden=true;updateCutUI();
}
// Отмена: снимает отметки и делает недействительными все отложенные срабатывания.
function cancelCut(){
 token++;timers.forEach(clearTimeout);timers=[];
 marks.forEach(mark=>mark.el?.remove());document.querySelectorAll('.cut-mark,.cut-fx,.cut-spark,.cut-ring,.cut-cross-flash').forEach(el=>el.remove());
 multiplierFade?.cancel();multiplierFade=null;multiplierLabel.hidden=true;
 live?.el.remove();live=null;marks=[];active=false;firing=false;cursor.hidden=true;lastPoint=null;samples=[];resetPass();updateCutUI();
}
// Сброс боя (переход на этап, вход и выход из подземелья, отступление) отменяет навык.
const originalClearBattle=clearBattle;
clearBattle=function(){originalClearBattle();cancelCut();};

document.addEventListener('pointermove',onPointerMove,{passive:true});
document.addEventListener('mouseout',event=>{if(!event.relatedTarget){cursor.hidden=true;lastPoint=null;}});
addEventListener('blur',()=>{cursor.hidden=true;lastPoint=null;});
button.addEventListener('click',useCut);
document.addEventListener('keydown',event=>{if((event.code==='Digit4'||event.code==='Numpad4')&&!event.repeat)useCut();});
setInterval(()=>{updateCutUI();if(modalOpen())cursor.hidden=true;},100);

function unlockCut(){
 if(cutUnlocked||gold<CUT_UNLOCK_COST)return;
 gold=Number((gold-CUT_UNLOCK_COST).toFixed(2));cutUnlocked=true;saveCut();saveProgress();render();updateCutUI();
 $('message').textContent='Точный разрез открыт! Используй четвёртый слот навыка или клавишу 4.';
}

// ── Древо талантов: ветка «Точный разрез» на месте «Навыка 4», в категории ближнего боя ──
const sections=[...document.querySelectorAll('#talentsDialog .talent-section')];
const section=sections[3];
section.querySelector('.talent-skill-icon').innerHTML=CUT_ICON;section.querySelector('.talent-skill-icon').id='cutTreeIcon';
section.querySelector('h3').textContent='Точный разрез';
section.querySelector('small').id='cutTreePoints';
section.querySelector('.talent-preview .root-node').textContent='4';
section.querySelector('p').textContent='Серия разрезов · Перекрёстный разрез';
section.classList.remove('skill-soon');
const melee=TALENT_CATEGORIES.find(c=>c.id==='melee'),ranged=TALENT_CATEGORIES.find(c=>c.id==='ranged');
if(melee&&ranged){ranged.skills=ranged.skills.filter(i=>i!==3);melee.skills.push(3);melee.box.querySelector('.talent-category-row').append(section);}
talentTreeNames[3]='Точный разрез';
function updateCutTalentSection(){
 section.classList.toggle('skill-open',cutUnlocked);
 $('cutTreePoints').textContent=cutUnlocked?cutSpent()+' / '+cutSpentMax():'Не открыт';
 section.style.setProperty('--talent-progress',cutSpent()/cutSpentMax()*100+'%');
}
function tooltipShell(anchor,heading){
 hideItemTooltip(true);(anchor.closest('dialog[open]')||document.body).append(itemTooltip);itemTooltip.replaceChildren();itemTooltip.className='item-tooltip skill-info-tooltip';
 const title=document.createElement('h3');title.textContent=heading;itemTooltip.append(title);
}
function tooltipText(anchor,text,stateText){
 const description=document.createElement('p');description.textContent=text;
 const state=document.createElement('p');state.className='skill-info-state';state.textContent=stateText;
 itemTooltip.append(description,state);itemTooltip.hidden=false;if(itemTooltip.showPopover&&!itemTooltip.matches(':popover-open'))itemTooltip.showPopover();placeItemTooltip(anchor);
}
function showCutInfo(anchor){
 const total=cutsTotal();
 tooltipShell(anchor,'⟋ Точный разрез');
 itemTooltip.append(tooltipRow('💧','Мана',String(CUT_MANA)),tooltipRow('⟋','Разрезов',total+' отложенных'),tooltipRow('✦','Урон','×1–×5 от скорости мыши'),tooltipRow('⚔','Срабатывание','по очереди через 0,2 с'));
 if(crossRank>0)itemTooltip.append(tooltipRow('✕','Перекрестие','+'+String(CFG.cross.bonusPerCross).replace('.',',')+' к множителю серии'));
 tooltipText(anchor,'Проведи курсором через врага — кнопку мыши нажимать не нужно. Каждый взмах оставляет белую отметку; чем быстрее движение, тем длиннее и ярче разрез и выше его урон (×1 до 800 пикс./с, ×3 при 2400, ×5 от 4800). После каждого разреза выведи курсор за пределы врага. Когда оставлены все '+total+' отметок, они срабатывают одна за другой через 0,2 секунды и бьют только того врага, на котором были оставлены. Разрезы не критуют.'+(crossRank>0?' Каждое пересечение двух отметок на одном враге усиливает всю серию.':''),
  cutUnlocked?'Навык открыт · слот 4 или клавиша 4':gold<CUT_UNLOCK_COST?'Открывается за '+CUT_UNLOCK_COST+' золота · у тебя '+gold:'Нажми, чтобы открыть за '+CUT_UNLOCK_COST+' золота');
}
// Таланты ветки: «Серия разрезов» (7 уровней по нарастающей цене) и «Перекрёстный разрез» (1 уровень).
const TALENTS=[
 {key:'series',cfg:CFG.series,max:SERIES_MAX,rank:()=>seriesRank,raise:()=>seriesRank++,
  icon:'<svg viewBox="0 0 48 48" aria-hidden="true"><g stroke-linecap="round"><path d="M8 18 40 8" stroke="#bfe4ff" stroke-width="4"/><path d="M8 18 40 8" stroke="#fff" stroke-width="1.8"/><path d="M8 29 40 19" stroke="#bfe4ff" stroke-width="4"/><path d="M8 29 40 19" stroke="#fff" stroke-width="1.8"/><path d="M8 40 40 30" stroke="#bfe4ff" stroke-width="4"/><path d="M8 40 40 30" stroke="#fff" stroke-width="1.8"/></g></svg>',
  info:()=>{const r=seriesRank,next=CFG.series.costs[r];return {rows:[['◇','Уровень таланта',r+' / '+SERIES_MAX],['⟋','Разрезов за активацию',String(cutsTotal())],['✦','Следующий уровень',r<SERIES_MAX?'+'+CFG.series.cutsPerRank+' разрез · '+next+' очк.':'—']],
   text:'Каждый уровень добавляет ещё один разрез в серию: от '+CFG.baseCuts+' до '+(CFG.baseCuts+SERIES_MAX*CFG.series.cutsPerRank)+' за активацию. Стоимость уровней: '+CFG.series.costs.join(', ')+' очков талантов. Количество разрезов фиксируется при активации — прокачка во время серии действует со следующей.'};}},
 {key:'cross',cfg:CFG.cross,max:CROSS_MAX,rank:()=>crossRank,raise:()=>crossRank++,
  icon:'<svg viewBox="0 0 48 48" aria-hidden="true"><g stroke-linecap="round"><path d="M9 39 39 9" stroke="#bfe4ff" stroke-width="4"/><path d="M9 39 39 9" stroke="#fff" stroke-width="1.8"/><path d="M9 9 39 39" stroke="#bfe4ff" stroke-width="4"/><path d="M9 9 39 39" stroke="#fff" stroke-width="1.8"/></g><circle cx="24" cy="24" r="5" fill="#fff"/><path d="M24 14v20M14 24h20" stroke="#fff" stroke-width="1.2" opacity=".8"/></svg>',
  info:()=>({rows:[['◇','Уровень таланта',crossRank+' / '+CROSS_MAX],['✕','За пересечение','+'+String(CFG.cross.bonusPerCross).replace('.',',')+' к множителю'],['◎','Пример','3 пересечения → ×'+String(1+3*CFG.cross.bonusPerCross).replace('.',',')]],
   text:'Каждое пересечение двух отметок на одном враге добавляет +'+String(CFG.cross.bonusPerCross).replace('.',',')+' к общему множителю всей серии: множитель = 1 + '+String(CFG.cross.bonusPerCross).replace('.',',')+' × число пересечений. Он умножает урон каждого разреза поверх множителя скорости. Параллельные линии и касание концами не считаются. Под врагом показывается текущий множитель.'})}
];
function talentState(talent){
 const rank=talent.rank(),cost=talent.cfg.costs[rank];
 if(rank>=talent.max)return {text:'Максимальный уровень'};
 if(!cutUnlocked)return {text:'Сначала открой Точный разрез'};
 if(talentPoints<cost)return {text:'Нужно очков талантов: '+cost+' · у тебя '+talentPoints};
 return {text:'Нажми для прокачки · '+cost+' очк. талантов',ready:true};
}
function showTalentInfo(talent,anchor){
 const info=talent.info();tooltipShell(anchor,talent.cfg.name);
 itemTooltip.append(...info.rows.map(([icon,label,value])=>tooltipRow(icon,label,value)));
 tooltipText(anchor,info.text,talentState(talent).text);
}
function talentNode(talent){
 const node=document.createElement('button');node.type='button';node.className='detail-talent rapid-damage-talent cut-talent';
 const icon=document.createElement('span');icon.className='talent-node';const label=document.createElement('span');node.append(icon,label);
 const refresh=()=>{
  const rank=talent.rank(),ready=talentState(talent).ready;
  icon.innerHTML=talent.icon+(ready?'<span class="cut-plus" aria-hidden="true">+</span>':'');
  label.textContent=talent.cfg.name+' · '+rank+' / '+talent.max;node.classList.toggle('talent-invested',rank>0);
  node.setAttribute('aria-label',talent.cfg.name+' '+rank+' из '+talent.max);
 };
 refresh();node._refresh=refresh;
 const info=()=>showTalentInfo(talent,node);
 node.addEventListener('mouseenter',info);node.addEventListener('mouseleave',hideItemTooltip);node.addEventListener('focus',info);node.addEventListener('blur',hideItemTooltip);
 node.addEventListener('click',()=>{
  if(!talentState(talent).ready){info();return;}
  talentPoints-=talent.cfg.costs[talent.rank()];talent.raise();saveCut();saveProgress();render();updateCutUI();
  document.querySelectorAll('#talentTreeContent .cut-talent').forEach(n=>n._refresh?.());
  if(!quietFx()){node.classList.remove('cut-talent-flash');void node.offsetWidth;node.classList.add('cut-talent-flash');}
  info();
 });
 return node;
}
// В древе навыка — корень с иконкой, первая линия с двумя талантами, остальные места пока не настроены.
const originalOpenTree=openTalentTree;
openTalentTree=function(index){
 originalOpenTree(index);
 if(index!==3)return;
 const old=$('talentTreeContent').querySelector('.detail-root'),root=old.cloneNode(false);
 root.removeAttribute('title');root.classList.add('cut-root');root.innerHTML=iconHtml();root.classList.toggle('talent-learned',cutUnlocked);root.setAttribute('aria-label','Точный разрез');
 const info=()=>showCutInfo(root);
 root.addEventListener('mouseenter',info);root.addEventListener('mouseleave',hideItemTooltip);root.addEventListener('focus',info);root.addEventListener('blur',hideItemTooltip);
 root.addEventListener('click',()=>{unlockCut();root.classList.toggle('talent-learned',cutUnlocked);document.querySelectorAll('#talentTreeContent .cut-talent').forEach(n=>n._refresh?.());info();});
 old.replaceWith(root);
 const slots=$('talentTreeContent').querySelectorAll('.detail-talent');
 TALENTS.forEach((talent,i)=>slots[i]?.replaceWith(talentNode(talent)));
};
// Вложенные в ветку очки входят в общий счётчик и возвращаются при сбросе ветки или всех талантов.
const originalSpent=spentTalentPoints;
spentTalentPoints=function(index=null){return originalSpent(index)+(index===null||index===3?cutSpent():0);};
const originalReset=resetTalentPoints;
resetTalentPoints=function(index=null){
 const ours=(index===null||index===3)&&cutSpent()>0;
 originalReset(index);
 if(!ours)return;
 seriesRank=0;crossRank=0;saveCut();saveProgress();updateCutUI();
 if($('talentTreeDialog').open&&activeTalentTree===3)openTalentTree(3);
 updateTalentResetButtons();
};
// Админ-панель: быстро открыть навык для проверки.
$('adminUnlockAim').insertAdjacentHTML('afterend','<button id="adminUnlockCut" type="button">Открыть Точный разрез</button>');
$('adminUnlockCut').addEventListener('click',()=>{cutUnlocked=true;saveCut();updateCutUI();adminCommit('Точный разрез открыт.');});
// Сброс прогресса закрывает навык и таланты; «Вернуть прогресс» в течение минуты возвращает их.
let cutBackup=null;
$('confirmReset').addEventListener('click',()=>{cutBackup={until:Date.now()+60000,unlocked:cutUnlocked,series:seriesRank,cross:crossRank};cancelCut();cutUnlocked=false;seriesRank=0;crossRank=0;saveCut();updateCutUI();});
$('undoReset').addEventListener('click',()=>{if(cutBackup&&Date.now()<cutBackup.until){cutUnlocked=cutBackup.unlocked;seriesRank=cutBackup.series;crossRank=cutBackup.cross;saveCut();updateCutUI();}cutBackup=null;});

// Картинка иконки: если файл есть, она заменяет рисованную иконку в слоте, в списке веток и в корне древа.
const probe=new Image();probe.onload=()=>{iconReady=true;refreshIcons();};probe.src=CFG.icon;

window.cutApi={unlocked:()=>cutUnlocked,active:()=>active};
updateCutUI();
})();
