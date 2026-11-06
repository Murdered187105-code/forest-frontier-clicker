// Навык «Вихрь» (ближний бой, переключаемый). Пока включён, сжигает ману и держит меч справа от врага.
// Рукоять можно взять мышью и крутить меч вокруг неё: у него есть вес, раскрученный меч после отпускания крутится сам.
// Лезвие, вошедшее во врага на скорости, наносит урон обычного удара. Новое попадание — только после выхода из врага.
(()=>{
const KEY='forest-frontier-sword-spin-v1',NAME='Вихрь',ICON='assets/sword-spin-icon.webp',SWORD='assets/sword-spin.webp';
const MANA_PER_SECOND=2.5,AUTO_MANA_FACTOR=1,MIN_MANA=1;
// Множитель расхода маны в автоматическом режиме (сейчас расход тот же, что в ручном).
const manaRate=()=>MANA_PER_SECOND*(auto?AUTO_MANA_FACTOR:1),manaText=()=>String(manaRate()).replace('.',',');
// Физика меча: тяга к курсору, предел ускорения (время разгона), сопротивление в руке и без неё, предел скорости (рад/с).
const PULL=40,MAX_ACCEL=38,DAMP_HELD=2.6,DAMP_FREE=.55,MAX_SPEED=14,MIN_HIT_SPEED=3,MAX_LEAD=Math.PI*1.2;
// Картинка меча: ширина к высоте; доли высоты, считая от острия: центр рукояти и начало лезвия.
const ART_RATIO=354/1457,ART_PIVOT=1266/1457,ART_BLADE=1031/1457;
const HIT={cx:.5,cy:.48,rx:.43,ry:.45},GRAB_RADIUS=44,TAU=Math.PI*2;
// Автоматический режим: меч разгоняется сам (с тем же пределом ускорения) до скорости на 50% ниже предела ручного.
const AUTO_SPEED=MAX_SPEED*.5;
const wrap=a=>{a=(a+Math.PI)%TAU;return a<0?a+TAU-Math.PI:a-Math.PI;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// auto — выбранный режим вращения; в старых сохранениях его нет, значит ручной.
let unlocked=false,auto=false;
try{const saved=JSON.parse(localStorage.getItem(KEY));unlocked=saved?.unlocked===true;auto=saved?.auto===true;}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({unlocked,auto}));}catch{}};

const style=document.createElement('style');
style.textContent=`
#spinSkill{cursor:pointer}
#spinSkill:disabled{cursor:default}
#spinSkill .spin-icon{position:absolute;inset:3px;width:calc(100% - 6px);height:calc(100% - 6px);border-radius:50%;object-fit:contain;pointer-events:none}
#spinSkill.mana-insufficient .spin-icon{filter:saturate(.4) brightness(.7)}
#spinCanvas{position:absolute;left:0;top:0;width:100%;height:100%;z-index:4;pointer-events:none}
.talent-skill-icon .spin-tree-img,.detail-root .spin-tree-img{width:100%;height:100%;border-radius:50%;object-fit:cover;pointer-events:none}
#talentTreeDialog .spin-mode{display:flex;flex-direction:column;align-items:center;gap:6px;margin:12px 0 4px;text-align:center}
#talentTreeDialog .spin-mode-label{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#b9ad8a}
#talentTreeDialog .spin-mode-buttons{display:flex;gap:0}
#talentTreeDialog .spin-mode-buttons button{min-width:118px;padding:6px 12px;font:700 13px Manrope,Segoe UI,sans-serif;cursor:pointer}
#talentTreeDialog .spin-mode-buttons button:first-child{border-radius:6px 0 0 6px!important}
#talentTreeDialog .spin-mode-buttons button:last-child{border-radius:0 6px 6px 0!important}
#talentTreeDialog .spin-mode-buttons button[aria-pressed=true]{background:linear-gradient(#e9c56b,#b98a32)!important;color:#2a1b00!important;border-color:#f3d891!important}
#talentTreeDialog .spin-mode small{max-width:300px;color:#b9ad8a;font-size:12px;line-height:1.35}
`;
document.head.append(style);

// ── Кнопка навыка (скрытый запас и слоты панели ведёт skill-dock.js) ──
const button=document.createElement('button');button.type='button';button.className='skill-slot';button.id='spinSkill';
button.innerHTML=`<img class="spin-icon" src="${ICON}" alt=""><span class="skill-placeholder skill-empty-mark" aria-hidden="true">+</span><span class="skill-number">5</span><span class="skill-mana-cost"></span>`;
document.querySelector('.skill-bar').append(button);
const burn=manaBurnFx(button,MANA_PER_SECOND),costLabel=button.querySelector('.skill-mana-cost');

const arena=$('arena');
const canvas=document.createElement('canvas');canvas.id='spinCanvas';arena.append(canvas);
const ctx=canvas.getContext('2d');
const art=new Image();art.src=SWORD;

let on=false,show=0,grabbed=false,everGrabbed=false,touching=false,running=false,last=0,tickTimer=0,saveTimer=0,manaUiTimer=0,time=0;
let angle=-Math.PI/2,vel=0,target=angle,mouseAngle=0,mouse={x:-1e4,y:-1e4},pivot=null,enemy=null,enemyId='',trail=[],sparks=[];

const quietFx=()=>!settings.animations||matchMedia('(prefers-reduced-motion: reduce)').matches;
const modalOpen=()=>!!document.querySelector('dialog[open]');
const paused=()=>modalOpen()||arena.classList.contains('dungeon-calm');
const enemyKey=()=>(window.dungeonApi?.active()?'dg:':'')+zone+':'+zoneKills+':'+kills;
const enemySprite=()=>document.querySelector('#monster > svg:not(.slash-effect)')||$('monster');
function toArena(clientX,clientY){const zoom=arena.currentCSSZoom||1,box=arena.getBoundingClientRect();return {x:(clientX-box.left)/zoom,y:(clientY-box.top)/zoom};}
function readEnemy(){
 const zoom=arena.currentCSSZoom||1,box=arena.getBoundingClientRect(),r=enemySprite().getBoundingClientRect();
 return {cx:(r.left+r.width*HIT.cx-box.left)/zoom,cy:(r.top+r.height*HIT.cy-box.top)/zoom,rx:r.width*HIT.rx/zoom,ry:r.height*HIT.ry/zoom};
}
// Длина меча зависит от врага: у боссов меч длиннее. Рукоять стоит справа, чтобы лезвие доставало до врага.
function placeSword(snap){
 const e=readEnemy(),length=clamp(e.rx*2.2,220,340),width=arena.clientWidth||arena.getBoundingClientRect().width;
 const next={x:Math.min(width-46,e.cx+e.rx+length*.5),y:e.cy+8,length};
 if(snap||!pivot)pivot=next;else pivot.target=next;
 if(pivot===next)pivot.target=next;
}

function setOn(value,noCooldown=false){
 if(on===value)return;on=value;burn.setOn(on,noCooldown);button.setAttribute('aria-pressed',on);
 if(on){angle=-Math.PI/2;vel=0;touching=false;trail=[];enemyId=enemyKey();placeSword(true);tickTimer=0;
  if(!quietFx())burst(pivot.x,pivot.y,22,'255,214,140',220);start();}
 else{grabbed=false;document.body.style.cursor='';saveProgress();}
 updateUI();
}
function toggle(){
 if(on){setOn(false);return;}
 renderMana();checkBossTimer();
 if(!unlocked||locked||hp<=0||modalOpen()||!burn.ready())return;
 if(mana<MIN_MANA){showManaWarning(button);return;}
 setOn(true);
}
function updateUI(){
 button.classList.toggle('skill-unlocked',unlocked);
 button.classList.toggle('mana-insufficient',unlocked&&!on&&mana<MIN_MANA);
 button.disabled=!unlocked;
 costLabel.textContent=manaText()+'/с';costLabel.setAttribute('aria-label','Стоимость: '+manaText()+' маны в секунду');
 button.title=unlocked?NAME+' · '+(auto?'автоматический':'ручной')+' режим · '+manaText()+' маны в секунду · '+(on?'выключить':'включить'):'';
 button.setAttribute('aria-label',NAME+(on?' — включён':''));
 setSkillHidden(button,!unlocked,5);
 updateSection();
}

// ── Эффекты ──
function burst(x,y,n,rgb,speed){for(let i=0;i<n;i++){const a=Math.random()*TAU,s=speed*(.3+Math.random()*.7);sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.3,max:.65,size:1.5+Math.random()*2.5,rgb});}}
function fitCanvas(){
 const zoom=arena.currentCSSZoom||1,box=arena.getBoundingClientRect(),w=box.width/zoom,h=box.height/zoom,dpr=Math.min(2,devicePixelRatio||1)*zoom,pw=Math.round(w*dpr),ph=Math.round(h*dpr);
 if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
}
function drawTrail(){
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(let i=1;i<trail.length;i++){
  const a=trail[i-1],b=trail[i],diff=wrap(b.a-a.a);if(Math.abs(diff)<.004)continue;
  const fade=1-(time-b.t)/.28,alpha=fade*fade*Math.min(.3,b.speed*.03)*show;
  ctx.fillStyle=`rgba(255,214,140,${alpha})`;ctx.beginPath();ctx.arc(pivot.x,pivot.y,pivot.length,a.a,a.a+diff,diff<0);ctx.arc(pivot.x,pivot.y,pivot.length*.35,a.a+diff,a.a,diff>=0);ctx.closePath();ctx.fill();
 }
 ctx.restore();
}
function drawSword(){
 if(!art.complete||!art.naturalWidth)return;
 const scale=.5+.5*show,height=pivot.length/ART_PIVOT,width=height*ART_RATIO;
 ctx.save();ctx.translate(pivot.x,pivot.y);ctx.rotate(angle+Math.PI/2);ctx.scale(scale,scale);ctx.globalAlpha=show;
 ctx.shadowColor='#ffd27a';ctx.shadowBlur=grabbed?24:12;
 ctx.drawImage(art,-width/2,-pivot.length,width,height);
 ctx.restore();
 if(on&&show>=1&&!grabbed&&!auto){
  const pulse=.5+.5*Math.sin(time*4),hover=overHilt();
  ctx.save();ctx.strokeStyle=`rgba(255,233,168,${hover?.95:.3+pulse*.45})`;ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.lineDashOffset=-time*18;ctx.beginPath();ctx.arc(pivot.x,pivot.y,GRAB_RADIUS-4+(hover?3:pulse*3),0,TAU);ctx.stroke();ctx.setLineDash([]);
  if(!everGrabbed){ctx.font='800 13px Manrope,Segoe UI,sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#000b';ctx.fillStyle='#ffe9a8';ctx.strokeText('Возьмись за рукоять',pivot.x,pivot.y+62);ctx.fillText('Возьмись за рукоять',pivot.x,pivot.y+62);}
  ctx.restore();
 }
}
// Повтор удара для «Фантомного клинка»: фиолетовый меч проходит то же место с той же скоростью.
const ECHO_LEAD=.1,ECHO_MS=.3;
let echoes=[],ghostArt=null;
function ghostSword(){
 if(ghostArt||!art.complete||!art.naturalWidth)return ghostArt;
 const c=document.createElement('canvas');c.width=art.naturalWidth;c.height=art.naturalHeight;const g=c.getContext('2d');
 g.drawImage(art,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='rgba(150,100,255,.72)';g.fillRect(0,0,c.width,c.height);
 return ghostArt=c;
}
function drawEchoes(){
 echoes=echoes.filter(e=>time-e.t<ECHO_MS);const sprite=ghostSword();
 for(const e of echoes){
  const age=time-e.t,a=e.angle+e.dir*e.speed*(age-ECHO_LEAD),alpha=Math.sin(Math.PI*age/ECHO_MS)*.85,from=a-e.dir*.55,back=e.dir<0;
  if(!e.hit&&age>=ECHO_LEAD){e.hit=true;burst(e.x,e.y,14,'168,120,255',220);}
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(168,120,255,${alpha*.28})`;
  ctx.beginPath();ctx.arc(e.px,e.py,e.length,from,a,back);ctx.arc(e.px,e.py,e.length*.35,a,from,!back);ctx.closePath();ctx.fill();ctx.restore();
  if(!sprite)continue;
  const height=e.length/ART_PIVOT,width=height*ART_RATIO;
  ctx.save();ctx.translate(e.px,e.py);ctx.rotate(a+Math.PI/2);ctx.globalAlpha=alpha;ctx.shadowColor='#a878ff';ctx.shadowBlur=20;ctx.drawImage(sprite,-width/2,-e.length,width,height);ctx.restore();
 }
}
function drawSparks(){
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(const p of sparks){ctx.fillStyle=`rgba(${p.rgb},${Math.min(1,p.life/p.max*1.4)})`;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,TAU);ctx.fill();}
 ctx.restore();
}

// ── Попадания ──
function checkBlade(speed){
 enemy=readEnemy();
 const c=Math.cos(angle),s=Math.sin(angle),from=pivot.length*(1-ART_BLADE/ART_PIVOT);
 let inside=null,near=false;
 for(let i=0;i<=16;i++){
  const r=from+(pivot.length-from)*i/16,x=pivot.x+c*r,y=pivot.y+s*r,d=((x-enemy.cx)/enemy.rx)**2+((y-enemy.cy)/enemy.ry)**2;
  if(d<1&&!inside)inside={x,y};if(d<1.3)near=true;
 }
 if(inside&&!touching){
  touching=true;
  if(speed>=MIN_HIT_SPEED&&!locked&&hp>0){
   attack(true,1,true);
   const copy={angle,dir:Math.sign(vel)||1,speed,x:inside.x,y:inside.y,px:pivot.x,py:pivot.y,length:pivot.length,hit:false};
   window.phantomApi?.echo(()=>{copy.t=time;echoes.push(copy);start();},ECHO_LEAD*1000);
   if(!quietFx()){burst(inside.x,inside.y,16,'255,214,140',300);burst(inside.x,inside.y,6,'255,255,255',200);}
  }
 }else if(!near)touching=false;
}

// ── Рукоять и мышь ──
const overHilt=()=>{if(!on||auto||show<.8||!pivot)return false;const p=toArena(mouse.x,mouse.y);return Math.hypot(p.x-pivot.x,p.y-pivot.y)<GRAB_RADIUS;};
addEventListener('pointerdown',event=>{
 mouse={x:event.clientX,y:event.clientY};
 if(event.button!==0||paused()||!overHilt())return;
 grabbed=true;everGrabbed=true;
 const p=toArena(mouse.x,mouse.y);mouseAngle=Math.atan2(p.y-pivot.y,p.x-pivot.x);target=angle+wrap(mouseAngle-angle);
 try{document.documentElement.setPointerCapture(event.pointerId);}catch{}
 event.preventDefault();event.stopPropagation();
},true);
addEventListener('pointermove',event=>{mouse={x:event.clientX,y:event.clientY};},{capture:true,passive:true});
const release=()=>{grabbed=false;};
addEventListener('pointerup',release,true);addEventListener('pointercancel',release,true);addEventListener('blur',release);

// ── Кадр ──
// Мана считается по реальному времени: на медленном компьютере навык стоит столько же.
function burnMana(dt){
 if(!on)return;
 // Навык вынесли из слота: кнопки выключения больше нет, поэтому он выключается сам.
 if(!button.closest('.skill-bar')){setOn(false);return;}
 if(paused())return;
 tickTimer+=dt;saveTimer+=dt;manaUiTimer+=dt;
 regenerateMana();mana=Math.max(0,Number((mana-manaRate()*dt).toFixed(6)));
 if(manaUiTimer>=.1){manaUiTimer=0;renderMana();}
 if(tickTimer>=1){tickTimer-=1;burn.tick(manaRate());}
 if(saveTimer>=3){saveTimer=0;saveProgress();}
 if(mana<=0){renderMana();setOn(false);showManaWarning(button);}
}
function step(dt){
 time+=dt;const hold=paused();
 if(hold&&grabbed)grabbed=false;
 show=clamp(show+(on?dt/.3:-dt/.2),0,1);
 if(show>0&&pivot){
  // Новый враг: рукоять плавно переезжает. Размер врага читается, только когда он уже появился.
  if(on&&!locked&&enemyKey()!==enemyId){enemyId=enemyKey();touching=false;placeSword(false);}
  if(pivot.target){const k=Math.min(1,dt*8);pivot.x+=(pivot.target.x-pivot.x)*k;pivot.y+=(pivot.target.y-pivot.y)*k;pivot.length+=(pivot.target.length-pivot.length)*k;}
  const before=angle,driving=on&&auto&&!hold;
  if(driving){
   // Меч крутится сам в ту сторону, куда уже вращался, и разгоняется постепенно, как от руки.
   grabbed=false;const goal=(Math.sign(vel)||1)*AUTO_SPEED;
   vel+=clamp(goal-vel,-MAX_ACCEL*dt,MAX_ACCEL*dt);
  }else if(grabbed){
   // Обороты мыши копятся: если курсор крутится быстрее меча, меч продолжает разгоняться в ту же сторону, а не дёргается назад.
   const p=toArena(mouse.x,mouse.y),dx=p.x-pivot.x,dy=p.y-pivot.y;
   if(Math.hypot(dx,dy)>=12){const now=Math.atan2(dy,dx);target+=wrap(now-mouseAngle);mouseAngle=now;}
   target=angle+clamp(target-angle,-MAX_LEAD,MAX_LEAD);
   vel+=clamp((target-angle)*PULL,-MAX_ACCEL,MAX_ACCEL)*dt;
  }
  if(!driving)vel*=Math.exp(-dt*(grabbed?DAMP_HELD:DAMP_FREE));
  const limit=on&&auto?AUTO_SPEED:MAX_SPEED;vel=clamp(vel,-limit,limit);angle+=vel*dt;
  const speed=Math.abs(wrap(angle-before))/Math.max(dt,.001);
  if(!quietFx()){trail.push({a:angle,t:time,speed});trail=trail.filter(p=>time-p.t<.28);}else trail=[];
  if(on&&show>=1&&!hold)checkBlade(speed);
 }
 sparks=sparks.filter(p=>(p.life-=dt)>0);for(const p of sparks){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;}
 document.body.style.cursor=grabbed?'grabbing':!hold&&overHilt()?'grab':'';
}
function frame(now){
 // После скрытой вкладки время не навёрстывается (потолок 1 с). Физика идёт мелкими шагами: при редких кадрах лезвие не «перепрыгнет» врага.
 const dt=clamp((now-last)/1000,0,1);last=now;
 burnMana(dt);
 const steps=Math.max(1,Math.ceil(dt/.016));for(let i=0;i<steps;i++)step(dt/steps);
 fitCanvas();
 if(show>0&&pivot&&!arena.classList.contains('dungeon-calm')){if(trail.length)drawTrail();drawSword();}
 drawEchoes();drawSparks();
 if(on||show>0||sparks.length||echoes.length)requestAnimationFrame(frame);else{running=false;fitCanvas();document.body.style.cursor='';}
}
function start(){if(running)return;running=true;last=performance.now();requestAnimationFrame(frame);}

button.addEventListener('click',toggle);
setInterval(updateUI,200);

// ── Окно талантов: свободная ветка «Навык 5» становится веткой навыка и переезжает в ближний бой ──
const treeImg=`<img class="spin-tree-img" src="${ICON}" alt="">`;
const section=document.querySelector('#talentsDialog .talent-section.skill-5');
section.classList.remove('skill-soon');
const icon=section.querySelector('.talent-skill-icon');icon.id='spinTreeIcon';icon.innerHTML=treeImg;
section.querySelector('h3').textContent=NAME;section.querySelector('small').id='spinTreePoints';
section.querySelector('.talent-preview .root-node').textContent='5';
section.querySelector('p').textContent='Меч на рукояти · переключаемый';
const melee=TALENT_CATEGORIES.find(c=>c.id==='melee'),owner=TALENT_CATEGORIES.find(c=>c.skills.includes(4));
if(melee&&owner&&owner!==melee){owner.skills=owner.skills.filter(i=>i!==4);melee.skills.push(4);melee.box.querySelector('.talent-category-row').append(section);}
talentTreeNames[4]=NAME;
section.setAttribute('aria-label','Открыть древо: '+NAME);
function updateSection(){
 section.classList.toggle('skill-open',unlocked);
 $('spinTreePoints').textContent=unlocked?'Открыт':'Не открыт';
}
function showInfo(anchor){
 hideItemTooltip(true);(anchor.closest('dialog[open]')||document.body).append(itemTooltip);itemTooltip.replaceChildren();itemTooltip.className='item-tooltip skill-info-tooltip';
 const title=document.createElement('h3');title.textContent=NAME;
 const text=document.createElement('p');text.textContent='Переключаемый навык: пока он включён, справа от врага стоит меч. В ручном режиме возьмись за рукоять и крути меч мышью, курсор может быть в любом месте экрана. У меча есть вес: он разгоняется постепенно, а раскрученный продолжает вращаться сам. В автоматическом режиме меч крутится сам, но его наибольшая скорость на 50% ниже. Режим переключается в этом окне, под значком навыка. Лезвие, попавшее во врага на скорости, наносит урон обычного удара, без критов. Снова ударить можно, когда лезвие вышло из врага. Когда мана кончается, навык выключается.';
 const state=document.createElement('p');state.className='skill-info-state';state.textContent=unlocked?'Навык открыт · '+skillDockHint('spin'):skillUnlockHint();
 itemTooltip.append(title,tooltipRow('🌀','Режим',auto?'автоматический · скорость −50%':'ручной'),tooltipRow('💧','Мана',manaText()+' в секунду'),tooltipRow('⚔','Урон за попадание','как обычный удар'),tooltipRow('⏱','Перезарядка','5 с после выключения'),text,state);
 itemTooltip.hidden=false;if(itemTooltip.showPopover&&!itemTooltip.matches(':popover-open'))itemTooltip.showPopover();placeItemTooltip(anchor);
}
function unlock(){
 if(unlocked||!spendSkillUnlock())return;
 unlocked=true;save();saveProgress();render();updateUI();
 $('message').textContent=NAME+' открыт! Перетащи его в слот наверху древа талантов.';
}
const originalOpenTree=openTalentTree;
openTalentTree=function(index){
 originalOpenTree(index);
 $('talentTreeDialog').querySelector('.spin-mode')?.remove();
 if(index!==4)return;
 const old=$('talentTreeContent').querySelector('.detail-root'),root=old.cloneNode(false);
 root.removeAttribute('title');root.innerHTML=treeImg;root.classList.toggle('talent-learned',unlocked);root.setAttribute('aria-label',NAME);
 const info=()=>showInfo(root);
 root.addEventListener('mouseenter',info);root.addEventListener('mouseleave',hideItemTooltip);root.addEventListener('focus',info);root.addEventListener('blur',hideItemTooltip);
 root.addEventListener('click',()=>{unlock();root.classList.toggle('talent-learned',unlocked);info();renderMode();});
 old.replaceWith(root);
 renderMode();
};
// Переключатель режима в окне древа, над полем веток. Появляется, когда навык открыт.
function setMode(value){if(auto===value)return;auto=value;save();updateUI();const box=$('talentTreeDialog').querySelector('.spin-mode');if(box)fillMode(box);}
function fillMode(box){
 box.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.mode==='auto')===auto)));
 box.querySelector('small').textContent=auto?'Меч крутится сам. Наибольшая скорость вращения на 50% ниже.':'Крути меч мышью за рукоять. Полная скорость вращения.';
}
function renderMode(){
 let box=$('talentTreeDialog').querySelector('.spin-mode');
 if(!unlocked){box?.remove();return;}
 if(!box){
  box=document.createElement('div');box.className='spin-mode';box.setAttribute('role','group');box.setAttribute('aria-label','Режим навыка '+NAME);
  box.innerHTML='<span class="spin-mode-label">Режим вращения</span><div class="spin-mode-buttons"><button type="button" data-mode="manual">Ручной</button><button type="button" data-mode="auto">Автоматический</button></div><small></small>';
  box.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode==='auto')));
  $('talentTreeContent').before(box);
 }
 fillMode(box);
}

// Сброс боя (этап, вход и выход из подземелья, отступление) выключает навык: меч привязан к текущему врагу.
const originalClearBattle=clearBattle;
clearBattle=function(){originalClearBattle();setOn(false,true);};
// Админ-панель.
$('adminUnlockAim').insertAdjacentHTML('afterend','<button id="adminUnlockSpin" type="button">Открыть '+NAME+'</button>');
$('adminUnlockSpin').addEventListener('click',()=>{unlocked=true;save();updateUI();adminCommit(NAME+' открыт.');});
// Сброс прогресса закрывает навык, «Вернуть прогресс» в течение минуты возвращает его.
let backup=null;
$('confirmReset').addEventListener('click',()=>{backup={until:Date.now()+60000,unlocked};setOn(false,true);unlocked=false;save();updateUI();});
$('undoReset').addEventListener('click',()=>{if(backup&&Date.now()<backup.until){unlocked=backup.unlocked;save();updateUI();}backup=null;});

window.spinApi={unlocked:()=>unlocked,active:()=>on,toggle,auto:()=>auto,setAuto:setMode,state:()=>({on,auto,angle,vel,grabbed,show,pivot:pivot&&{x:pivot.x,y:pivot.y,length:pivot.length}})};
updateUI();
})();
