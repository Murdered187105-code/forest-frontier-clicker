// «Улучшение»: предмет кладётся в центр звёздного циферблата, игрок выбирает редкость выше.
// Зона успеха раскрывается от нижней точки циферблата, её ширина равна шансу. Острие стартует сверху,
// делает несколько оборотов и останавливается в случайном месте: попало в зону — предмет заменяется
// случайным предметом выбранной редкости, нет — предмет уничтожается.
// Шанс — произведение шансов каждой ступени, и каждая следующая ступень труднее предыдущей,
// поэтому «легендарный → божественный» всегда тяжелее, чем «обычный → необычный».
// В центр можно сложить до STACK_MAX предметов одной редкости: второй увеличивает шанс на 75% от текущего,
// третий — на 50%, каждый следующий — в 1,5 раза меньше. При успехе вся стопка превращается в один предмет, при неудаче сгорает.
// Исход записывается в сохранение сразу при запуске, анимация лишь показывает его.
(()=>{
const RANKS=['Common','Uncommon','Rare','Epic','Legendary','Divine'];
// Шанс подняться с этой редкости на следующую.
const STEP_CHANCE={Common:.30,Uncommon:.22,Rare:.15,Epic:.10,Legendary:.06};
const SPIN_MS=4200,SPIN_MS_REDUCED=400,TURNS=5,STACK_MAX=8;
const rank=rarity=>RANKS.indexOf(rarity);
const color=rarity=>rarityFlashColors[rarity]||'#cfe0ff';
const reducedMotion=()=>!settings.animations||matchMedia('(prefers-reduced-motion: reduce)').matches;
// Прибавка k-го добавленного предмета: 75%, 50%, 33%, 22%… — каждая следующая в 1,5 раза меньше.
const STACK_FIRST=.75,STACK_DECAY=2/3;
const stackStep=k=>STACK_FIRST*STACK_DECAY**(k-1);
function stackBonus(count){let m=1;for(let k=1;k<count;k++)m*=1+stackStep(k);return m;}
// Шанс никогда не превышает MAX_CHANCE, сколько бы предметов ни лежало в центре.
const MAX_CHANCE=.75;
function chance(from,to,count=1){let p=1;for(let r=rank(from);r<rank(to);r++)p*=STEP_CHANCE[RANKS[r]]||0;return Math.min(MAX_CHANCE,p*stackBonus(count));}
const pct=x=>{const v=x*100;return (v>=1?Math.round(v):Number(v.toFixed(v>=.1?1:v>=.01?2:3))).toLocaleString('ru-RU')+'%';};
const isEquipped=item=>Object.values(equipped).includes(item);
const usable=item=>inventoryItems.includes(item)&&!isEquipped(item)&&rank(item.rarity)>=0&&rank(item.rarity)<RANKS.length-1;
const hasPool=rarity=>lootPool().some(item=>item.rarity===rarity);

const style=document.createElement('style');
style.textContent=`
#openUpgrade svg{width:24px;height:24px}
html body #upgradeDialog{width:min(620px,calc(100% - 24px));max-height:92dvh;overflow:auto;padding:22px;color:#e6f2ff!important;
 background:radial-gradient(1px 1px at 12% 18%,#fff9,transparent),radial-gradient(1px 1px at 72% 14%,#fff8,transparent),radial-gradient(1.5px 1.5px at 38% 42%,#fffa,transparent),radial-gradient(1px 1px at 85% 60%,#fff7,transparent),radial-gradient(1px 1px at 22% 78%,#fff8,transparent),radial-gradient(ellipse at 50% 0,#1d3358,#0a1222 70%)!important;
 border:1px solid #7fa6e088!important;box-shadow:inset 0 0 0 5px #0a1222,inset 0 0 0 6px #9cc8ff33,0 24px 70px #000d!important}
html body #upgradeDialog:before{display:none}
html body #upgradeDialog .equipment-heading{border-bottom:1px solid #7fa6e044}
html body #upgradeDialog h2{color:#e6f2ff;text-shadow:0 0 16px #9cc8ff66}
html body #upgradeDialog .talents-eyebrow{color:#7fa6e0}
html body #upgradeDialog .equipment-heading>button{color:#cfe0ff!important;background:#0e1830!important;border-color:#7fa6e055!important;box-shadow:none}
.upg-intro{margin:12px 0 8px;font-size:13px;line-height:1.5;text-align:center;color:#9cb4d8}
.upg-wheel{position:relative;width:min(300px,100%);aspect-ratio:1;margin:0 auto}
.upg-wheel svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.upg-tip{transform-box:view-box;transform-origin:150px 150px}
.upg-slot{position:absolute;left:50%;top:50%;width:28%;aspect-ratio:1;translate:-50% -50%;display:grid;place-items:center;border-radius:50%;z-index:2;
 background:radial-gradient(circle,#1b2c4c,#0e1830);box-shadow:0 0 0 2px #7fa6e0aa,0 0 0 6px #0a1222,0 0 0 7px #7fa6e055;color:#9cb4d8;font-size:11px;text-align:center}
.upg-slot.filled{cursor:pointer;box-shadow:0 0 0 2px var(--rc),0 0 0 6px #0a1222,0 0 0 7px #7fa6e055,0 0 16px color-mix(in srgb,var(--rc) 45%,transparent)}
.upg-slot img{width:76%;height:76%;object-fit:contain;filter:drop-shadow(0 0 6px var(--rc))}
.upg-slot small{padding:0 8px}
.upg-slot img{grid-area:1/1;position:relative}
.upg-slot img.upg-under{width:60%;height:60%;opacity:.55;transform:rotate(calc(var(--i)*-14deg)) translate(calc(var(--i)*-7px),-3px);filter:brightness(.7)}
.upg-count{position:absolute;right:-6px;bottom:-4px;min-width:26px;padding:2px 6px;border-radius:999px;font-size:12px;font-weight:700;color:#0a1222;background:var(--rc);box-shadow:0 0 0 2px #0a1222,0 0 8px var(--rc)}
.upg-stack-info{margin:10px 0 0;font-size:12px;text-align:center;color:#9cb4d8}
.upg-burst{position:absolute;left:50%;top:50%;width:30%;aspect-ratio:1;translate:-50% -50%;border-radius:50%;pointer-events:none;z-index:3}
.upg-targets{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:12px 0 8px;min-height:30px}
html body #upgradeDialog .upg-target{border-radius:999px;padding:5px 11px;font:inherit;font-size:12px;cursor:pointer;background:#0008!important;color:var(--rc)!important;border:1px solid color-mix(in srgb,var(--rc) 50%,transparent)!important;box-shadow:none!important}
html body #upgradeDialog .upg-target b{margin-left:5px;color:#fff}
html body #upgradeDialog .upg-target[aria-pressed=true]{background:color-mix(in srgb,var(--rc) 25%,#000a)!important;border-color:var(--rc)!important;box-shadow:0 0 10px color-mix(in srgb,var(--rc) 40%,transparent)!important}
html body #upgradeDialog .upg-target:disabled{opacity:.4;cursor:default}
.upg-hint{font-size:12px;color:#9cb4d8}
.upg-actions{display:flex;flex-direction:column;align-items:center;gap:6px}
html body #upgradeDialog .upg-go{min-width:200px;border-radius:10px;padding:10px 18px;font:inherit;font-weight:700;cursor:pointer;border:0!important;color:#fff!important;background:linear-gradient(#4d7dc8,#22407a)!important;box-shadow:0 0 14px #9cc8ff55!important}
html body #upgradeDialog .upg-go:disabled{opacity:.45;cursor:default}
.upg-result{min-height:20px;font-size:13px;text-align:center;color:#cfe0ff}
.upg-grid-title{margin:14px 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7fa6e0}
.upg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:6px}
.upg-item{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 4px;border-radius:10px;cursor:pointer;background:#0e1830;border:1px solid color-mix(in srgb,var(--rc) 55%,transparent);font-size:9.5px;text-align:center;color:#cfe0ff}
.upg-item img{width:40px;height:40px;object-fit:contain}
.upg-item strong{font-weight:600;line-height:1.15;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.upg-item.selected{outline:2px solid var(--rc);outline-offset:1px;background:color-mix(in srgb,var(--rc) 18%,#0e1830)}
.upg-item.locked{opacity:.35;cursor:default}
.upg-empty{grid-column:1/-1;margin:6px 0;font-size:12px;color:#9cb4d8;text-align:center}
`;
document.head.append(style);

// Кнопка в левом меню — сразу под «Магазином».
const openButton=document.createElement('button');
openButton.className='feature-button';openButton.id='openUpgrade';openButton.type='button';
openButton.setAttribute('aria-label','Улучшение');openButton.setAttribute('aria-haspopup','dialog');
openButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/><path d="M12 6.5l2 4.5h-4z" fill="currentColor"/><circle cx="12" cy="13.5" r="2"/></svg><span class="feature-label">Улучшение</span>';
$('openShop').after(openButton);

const dialog=document.createElement('dialog');
dialog.id='upgradeDialog';dialog.setAttribute('aria-labelledby','upgradeTitle');
dialog.innerHTML=`<div class="equipment-heading"><div><div class="talents-eyebrow">ЗВЁЗДНЫЙ ЦИФЕРБЛАТ</div><h2 id="upgradeTitle">Улучшение</h2></div><button id="closeUpgrade" type="button" aria-label="Закрыть улучшение">×</button></div>
<p class="upg-intro">Положи предмет в центр и выбери редкость. Попадёт острие в светлую зону — получишь случайный предмет этой редкости. Промахнётся — предмет уничтожится.</p>
<div class="upg-wheel"><svg viewBox="0 0 300 300" aria-hidden="true"><g class="upg-face"></g><g class="upg-zone"></g><g class="upg-tip"><path d="M150 32L161 60L150 54L139 60Z" fill="#fff" stroke="#3a5a8a" stroke-width="1.2" style="filter:drop-shadow(0 0 5px #9cc8ff)"/></g></svg><div class="upg-slot" id="upgradeSlot" role="button" tabindex="0"></div></div>
<p class="upg-stack-info" id="upgradeStackInfo"></p>
<div class="upg-targets" id="upgradeTargets"></div>
<div class="upg-actions"><button class="upg-go" id="upgradeGo" type="button">Крутить колесо</button><div class="upg-result" id="upgradeResult" role="status"></div></div>
<div class="upg-grid-title">Предметы инвентаря</div>
<div class="upg-grid" id="upgradeGrid"></div>`;
document.body.append(dialog);

const NS='http://www.w3.org/2000/svg';
// Углы: 0 — верх, по часовой стрелке; 180 — нижняя точка циферблата.
const pt=(r,a)=>[150+r*Math.sin(a*Math.PI/180),150-r*Math.cos(a*Math.PI/180)];
const arc=(r,a0,a1)=>{const [x0,y0]=pt(r,a0),[x1,y1]=pt(r,a1);return `M${x0} ${y0}A${r} ${r} 0 ${a1-a0>180?1:0} 1 ${x1} ${y1}`;};
const el=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);parent.append(e);return e;};
const face=dialog.querySelector('.upg-face'),zoneG=dialog.querySelector('.upg-zone'),tip=dialog.querySelector('.upg-tip');
el('circle',{cx:150,cy:150,r:140,fill:'#0e1830',stroke:'#7fa6e055','stroke-width':1.5},face);
for(let i=0;i<60;i++){const [x0,y0]=pt(i%5?128:122,i*6),[x1,y1]=pt(134,i*6);el('line',{x1:x0,y1:y0,x2:x1,y2:y1,stroke:i%5?'#7fa6e066':'#cfe0ff','stroke-width':i%5?1:2},face);}

const stackInfo=$('upgradeStackInfo'),slot=$('upgradeSlot'),targetsEl=$('upgradeTargets'),goButton=$('upgradeGo'),resultEl=$('upgradeResult'),grid=$('upgradeGrid'),wheel=dialog.querySelector('.upg-wheel');
// stack — предметы в центре (одной редкости), current — первый из них; target — выбранная редкость;
// spinning — идёт показ уже записанного исхода.
let stack=[],current=null,target=null,spinning=false,shownWidth=0,zoneRaf=0,timers=[],anims=[];

function drawZone(width){
 zoneG.replaceChildren();if(!current||!target||width<=0)return;
 const c=color(target),a0=180-width/2,a1=180+width/2;
 el('path',{d:arc(126,a0,a1),fill:'none',stroke:c,'stroke-width':14,style:`filter:drop-shadow(0 0 8px ${c})`},zoneG);
 el('path',{d:arc(126,a0,a1),fill:'none',stroke:'#fff','stroke-width':2},zoneG);
 // Очень узкую зону отмечаем засечками по краям, чтобы её было видно.
 if(width<4)for(const a of[a0,a1]){const [x0,y0]=pt(114,a),[x1,y1]=pt(138,a);el('line',{x1:x0,y1:y0,x2:x1,y2:y1,stroke:c,'stroke-width':1.5},zoneG);}
 const label=el('text',{x:150,y:268,'text-anchor':'middle','font-size':12,'font-weight':700,fill:c},zoneG);label.textContent=pct(chance(current.rarity,target,stack.length));
}
// Зона раскрывается от нижней точки в обе стороны.
function growZone(){
 cancelAnimationFrame(zoneRaf);
 const to=current&&target?chance(current.rarity,target,stack.length)*360:0,from=0,t0=performance.now();
 if(reducedMotion()){shownWidth=to;drawZone(to);return;}
 const step=now=>{const f=Math.min(1,(now-t0)/450);shownWidth=from+(to-from)*(1-Math.pow(1-f,3));drawZone(shownWidth);if(f<1)zoneRaf=requestAnimationFrame(step);};
 zoneRaf=requestAnimationFrame(step);
}
function defaultTarget(item){for(let r=rank(item.rarity)+1;r<RANKS.length;r++)if(hasPool(RANKS[r]))return RANKS[r];return null;}

function renderSlot(){
 slot.classList.toggle('filled',!!current);slot.replaceChildren();
 if(!current){const t=document.createElement('small');t.textContent='Выбери предмет из инвентаря';slot.append(t);slot.removeAttribute('aria-label');return;}
 slot.style.setProperty('--rc',color(current.rarity));
 // Сложенные предметы лежат веером за первым, сверху — счётчик.
 stack.slice(1,4).reverse().forEach((item,i,list)=>{const g=document.createElement('img');g.src=item.image;g.alt='';g.className='upg-under';g.style.setProperty('--i',list.length-i);slot.append(g);});
 const img=document.createElement('img');img.src=current.image;img.alt='';slot.append(img);
 if(stack.length>1){const n=document.createElement('span');n.className='upg-count';n.textContent='×'+stack.length;slot.append(n);}
 slot.setAttribute('aria-label',(stack.length>1?`${stack.length} предмета, `:'')+current.name+' · '+rarityLabel(current.rarity)+' — убрать последний');
}
function renderStackInfo(){
 if(!current){stackInfo.textContent=`Можно сложить до ${STACK_MAX} предметов одной редкости: каждый следующий повышает шанс.`;return;}
 const fmt=x=>x.toLocaleString('ru-RU',{maximumFractionDigits:2});
 const capped=target&&chance(current.rarity,target,stack.length)>=MAX_CHANCE;
 const next=capped?` Шанс уже максимальный — ${pct(MAX_CHANCE)}.`:stack.length<STACK_MAX?` Следующий предмет той же редкости: шанс +${fmt(100*stackStep(stack.length))}% от текущего.`:' Больше предметов не поместится.';
 stackInfo.textContent=(stack.length>1?`Предметов в центре: ${stack.length}, шанс ×${fmt(stackBonus(stack.length))}.`:'Предметов в центре: 1.')+next;
}
function renderTargets(){
 targetsEl.replaceChildren();
 if(!current){const t=document.createElement('span');t.className='upg-hint';t.textContent='Сначала положи предмет в центр';targetsEl.append(t);return;}
 for(let r=rank(current.rarity)+1;r<RANKS.length;r++){
  const rarity=RANKS[r],b=document.createElement('button');
  b.type='button';b.className='upg-target';b.style.setProperty('--rc',color(rarity));
  b.innerHTML=`${rarityLabel(rarity)}<b>${pct(chance(current.rarity,rarity,stack.length))}</b>`;
  b.setAttribute('aria-pressed',String(rarity===target));b.disabled=spinning||!hasPool(rarity);
  b.addEventListener('click',()=>{if(spinning)return;target=rarity;renderTargets();renderStackInfo();renderGo();growZone();});
  targetsEl.append(b);
 }
}
function renderGo(){goButton.disabled=spinning||!current||!target||!usable(current);goButton.textContent=spinning?'Крутится…':'Крутить колесо';}
function renderGrid(){
 grid.replaceChildren();
 const items=inventoryItems.filter(item=>!isEquipped(item)).map((item,index)=>({item,index})).sort((a,b)=>rank(b.item.rarity)-rank(a.item.rarity)||a.index-b.index);
 if(!items.length){const p=document.createElement('p');p.className='upg-empty';p.textContent='Инвентарь пуст. Надетые предметы не улучшаются.';grid.append(p);return;}
 for(const {item} of items){
  const chosen=stack.includes(item),ok=canPick(item);
  const cell=document.createElement('div');
  cell.className='upg-item'+(chosen?' selected':'')+(ok?'':' locked');cell.style.setProperty('--rc',color(item.rarity));
  cell.setAttribute('role','button');cell.tabIndex=ok?0:-1;cell.setAttribute('aria-pressed',String(chosen));
  cell.setAttribute('aria-label',item.name+' · '+rarityLabel(item.rarity)+(item.rarity==='Divine'?' — выше божественного улучшать некуда':''));
  const img=document.createElement('img');img.src=item.image;img.alt='';
  const name=document.createElement('strong');name.textContent=item.name;
  cell.append(img,name);addLevelPlate(cell,item);attachItemTooltip(cell,item);
  const pick=()=>{if(!canPick(item))return;hideItemTooltip(true);toggle(item);};
  cell.addEventListener('click',pick);
  cell.addEventListener('keydown',e=>{if(e.key==='Enter'||e.code==='Space'){e.preventDefault();pick();}});
  grid.append(cell);
 }
}
// Взять можно предмет из стопки (чтобы убрать) или ещё один той же редкости, пока стопка не полна.
function canPick(item){
 if(spinning||!usable(item))return false;
 if(stack.includes(item))return true;
 return !stack.length||(stack[0].rarity===item.rarity&&stack.length<STACK_MAX);
}
function setStack(list){
 const lead=current;stack=list;current=stack[0]||null;
 // Редкость цели сбрасывается, только когда меняется редкость центра.
 if(!current)target=null;else if(!lead||lead.rarity!==current.rarity||!target)target=defaultTarget(current);
}
function render(){if(!spinning)setStack(stack.filter(usable));renderSlot();renderStackInfo();renderTargets();renderGo();renderGrid();}
function toggle(item){setStack(stack.includes(item)?stack.filter(x=>x!==item):[...stack,item]);resultEl.textContent='';render();growZone();}
const unplace=()=>{if(!spinning&&stack.length)toggle(stack[stack.length-1]);};
slot.addEventListener('click',unplace);
slot.addEventListener('keydown',e=>{if(e.key==='Enter'||e.code==='Space'){e.preventDefault();unplace();}});

function burst(c,fail){
 const b=document.createElement('div');b.className='upg-burst';b.style.boxShadow=`0 0 0 3px ${c},0 0 40px ${c}`;wheel.append(b);
 const a=b.animate([{scale:.6,opacity:1},{scale:fail?1.4:3,opacity:0}],{duration:fail?500:800,easing:'ease-out'});a.onfinish=()=>b.remove();
}
function spin(){
 if(spinning||!current||!target||!usable(current))return;
 const sources=stack.filter(usable);if(!sources.length)return;
 const source=sources[0],goal=target,p=chance(source.rarity,goal,sources.length),land=Math.random()*360,win=Math.abs(land-180)<=p*180;
 const pool=lootPool().filter(item=>item.rarity===goal);if(!pool.length)return;
 // Исход и сохранение — сразу, до анимации: закрытие окна или перезагрузка его не меняют.
 let reward=null;
 for(const item of sources)inventoryItems.splice(inventoryItems.indexOf(item),1);
 if(win){const tpl={...pool[Math.floor(Math.random()*pool.length)]};reward=window.rollItemStats?window.rollItemStats(tpl):tpl;inventoryItems.push(reward);}
 persistLoot();
 spinning=true;hideItemTooltip(true);resultEl.textContent='Крутится…';render();
 const quick=reducedMotion(),to=360*TURNS+land;
 const a=tip.animate([{transform:'rotate(0deg)'},{transform:`rotate(${to}deg)`}],{duration:quick?SPIN_MS_REDUCED:SPIN_MS,easing:'cubic-bezier(.08,.7,.12,1)',fill:'forwards'});anims.push(a);
 a.onfinish=()=>{
  tip.style.transform=`rotate(${land}deg)`;a.cancel();
  if(win){
   burst(color(goal));stack=[reward];current=reward;target=defaultTarget(reward);
   resultEl.innerHTML='Успех! Получен <b></b>';const b=resultEl.querySelector('b');b.textContent=reward.name;b.style.color=color(reward.rarity);
   renderSlot();slot.querySelector('img')?.animate([{scale:.5},{scale:1.15},{scale:1}],{duration:500,easing:'ease-out'});
  }else{
   burst('#ff4a4a',true);resultEl.textContent=sources.length>1?`Неудача — уничтожено предметов: ${sources.length}.`:`Неудача — предмет уничтожен: ${source.name}.`;
   slot.querySelectorAll('img').forEach(img=>img.animate([{transform:'none',filter:'none'},{transform:'translateX(-4px) rotate(-6deg)',offset:.15},{transform:'translateX(4px) rotate(6deg)',offset:.3},{transform:'translateY(30px) rotate(20deg) scale(.6)',opacity:0,filter:'grayscale(1)'}],{duration:900,easing:'ease-in',fill:'forwards'}));
   stack=[];current=null;target=null;
  }
  // Острие доезжает вперёд до верха: следующее вращение снова начнётся сверху.
  timers.push(setTimeout(()=>{
   const back=tip.animate([{transform:`rotate(${land}deg)`},{transform:'rotate(360deg)'}],{duration:quick?150:700,easing:'ease-in-out'});anims.push(back);
   back.onfinish=()=>{tip.style.transform='rotate(0deg)';spinning=false;render();growZone();};
  },quick?150:win?600:850));
 };
}
goButton.addEventListener('click',spin);

// Закрытие окна только сбрасывает показ: исход уже записан.
function reset(){
 timers.forEach(clearTimeout);timers=[];anims.forEach(a=>a.cancel());anims=[];cancelAnimationFrame(zoneRaf);
 spinning=false;stack=[];current=null;target=null;tip.style.transform='rotate(0deg)';resultEl.textContent='';zoneG.replaceChildren();
 wheel.querySelectorAll('.upg-burst').forEach(b=>b.remove());
}
$('closeUpgrade').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{hideItemTooltip(true);reset();});
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
openButton.addEventListener('click',()=>{reset();render();dialog.showModal();});
window.upgradeWheel={chance,stackBonus,STEP_CHANCE,STACK_MAX};
})();
