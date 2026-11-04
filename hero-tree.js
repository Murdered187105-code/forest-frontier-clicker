// Прокачка героя: окно с 10 орбитами (клик по аватару), бонусы к характеристикам и редактор древа.
// Редактор доступен только локально (кнопка ✎ в окне или F4); на опубликованном сайте игроки видят только прокачку.
(()=>{
const RANKS_KEY='forest-frontier-hero-tree-v1',DRAFT_KEY='forest-frontier-hero-tree-draft-v1';
const ORBITS=10,ORBIT_BASE=60,ORBIT_STEP=105,MARGIN=120,SIZE=2*(ORBIT_BASE+ORBIT_STEP*ORBITS+MARGIN),C=SIZE/2;
const STATS={damageBonus:{label:'Урон удара',unit:''},attackSpeed:{label:'Скорость атаки',unit:'%'},critChance:{label:'Шанс крита',unit:' п.п.'},critDamage:{label:'Урон крита',unit:'%'},maxMana:{label:'Максимум маны',unit:''},manaRegen:{label:'Восстановление маны',unit:' / с'},goldBonus:{label:'Золото за убийство',unit:'%'}};
const ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X'];
const ICONS=['⚔','🗡','💥','🛡','⚡','🎯','🌪','🏹','💧','🔮','💰','✦','🔥','❄','☠','👑','❤','⭐',...['sword','crosshair','sword-burst','sword-swift','mana-drop','mana-cycle','coins-up','laurel-star','sword-plain','hourglass','slashes','mana-hand','boots-swift','blade-whetstone','daggers-three','book-star','sword-rock','fist-gem','hourglass-cycle','mana-drops-up','sword-fire','sword-ice','sword-sun','sword-moon','book-crystal','mana-moon','chain-lightning','poison-dagger','spirit-flame','stars-cycle','eye-gem','gems-four','swords-crossed','dagger-gem','fist-swift','hourglass-slashes','sword-ring','laurel-red-star','sword-lightning','swords-whirl'].map(name=>`assets/hero-icons/${name}.webp`)];
const editable=!window.IS_PUBLIC_SITE;
const clone=value=>JSON.parse(JSON.stringify(value));
const esc=text=>String(text??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>'node-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const fmt=value=>Number(Number(value).toFixed(2)).toLocaleString('ru-RU');
const orbitRadius=orbit=>ORBIT_BASE+ORBIT_STEP*orbit;

function normalize(data){
 const branches=(Array.isArray(data?.branches)&&data.branches.length?data.branches:[{id:'might',name:'Сила',color:'#ff9b3e'},{id:'agility',name:'Ловкость',color:'#76d76b'},{id:'wisdom',name:'Мудрость',color:'#5eaeff'}])
  .map(b=>({id:String(b.id),name:String(b.name??b.id),color:/^#[0-9a-f]{6}$/i.test(b.color)?b.color:'#ffcf6a'}));
 const nodes=(Array.isArray(data?.nodes)?data.nodes:[]).map(n=>({id:String(n.id||uid()),branch:branches.some(b=>b.id===n.branch)?n.branch:branches[0].id,
  orbit:clamp(Math.round(Number(n.orbit)||1),1,ORBITS),angle:Math.round(((Number(n.angle)||0)+540)%360-180),name:String(n.name??'Новая ячейка'),icon:String(n.icon??'✦'),desc:String(n.desc??''),
  maxRank:clamp(Math.round(Number(n.maxRank)||1),1,99),cost:clamp(Math.round(Number(n.cost)||1),1,99),
  stats:Object.fromEntries(Object.entries(n.stats||{}).filter(([key,value])=>STATS[key]&&Number.isFinite(Number(value))).map(([key,value])=>[key,Number(value)])),
  ability:n.ability&&(n.ability.name||n.ability.desc)?{name:String(n.ability.name||''),desc:String(n.ability.desc||'')}:null,
  requires:Array.isArray(n.requires)?n.requires.map(String):[],requireMode:n.requireMode==='any'?'any':'all',requireLevel:n.requireLevel==='max'?'max':'one'}));
 const ids=new Set(nodes.map(n=>n.id));nodes.forEach(n=>n.requires=n.requires.filter(id=>ids.has(id)&&id!==n.id));
 return {version:1,branches,nodes};
}
function loadTree(){if(editable){try{const draft=localStorage.getItem(DRAFT_KEY);if(draft)return normalize(JSON.parse(draft));}catch{}}return normalize(window.HERO_TREE);}
let tree=loadTree(),ranks={},dirty=editable&&!!localStorage.getItem(DRAFT_KEY);
try{ranks=JSON.parse(localStorage.getItem(RANKS_KEY))||{};}catch{ranks={};}
const saveRanks=()=>{try{localStorage.setItem(RANKS_KEY,JSON.stringify(ranks));}catch{}};
const nodeById=id=>tree.nodes.find(n=>n.id===id);
const branchOf=node=>tree.branches.find(b=>b.id===node.branch)||tree.branches[0];
const rankOf=node=>clamp(Number(ranks[node.id])||0,0,node.maxRank);
const pos=node=>{const r=orbitRadius(node.orbit),a=node.angle*Math.PI/180;return {x:C+Math.cos(a)*r,y:C+Math.sin(a)*r};};
function requirementState(node){
 const checks=node.requires.map(id=>{const other=nodeById(id),r=rankOf(other);return {node:other,ok:node.requireLevel==='max'?r>=other.maxRank:r>=1};});
 return {checks,met:!checks.length||(node.requireMode==='any'?checks.some(c=>c.ok):checks.every(c=>c.ok))};
}
function learnState(node){
 const rank=rankOf(node);
 if(rank>=node.maxRank)return {ok:false,reason:'Максимальный уровень'};
 if(!requirementState(node).met)return {ok:false,reason:'Сначала изучи требуемые ячейки'};
 if(heroPoints<node.cost)return {ok:false,reason:'Нужно очков прокачки: '+node.cost};
 return {ok:true,reason:'Изучить · '+node.cost+' '+(node.cost===1?'очко':'очка')};
}
// Сумма бонусов древа: игра добавляет её к характеристикам как ещё один источник, наравне с экипировкой.
function bonus(){const total={};for(const node of tree.nodes){const r=rankOf(node);if(!r)continue;for(const [key,value] of Object.entries(node.stats))total[key]=(total[key]||0)+value*r;}return total;}
const spent=()=>tree.nodes.reduce((sum,node)=>sum+rankOf(node)*node.cost,0);
window.heroTreeBonus=bonus;

// ---------- Окно ----------
const style=document.createElement('style');
style.textContent=`
#heroTreeDialog{width:min(1180px,calc(100% - 20px));max-height:94dvh;overflow:auto}
.ht-bar,.ht-editbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:10px}
.ht-points{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#ffcf6a}
.ht-points small{color:#8fb8aa;font-weight:600;margin-left:8px}
.ht-tools,.ht-editbar>div{display:flex;flex-wrap:wrap;gap:6px}
html body #heroTreeDialog .ht-bar button,html body #heroTreeDialog .ht-editbar button{padding:6px 11px;font-size:12px}
html body #heroTreeDialog button.ht-primary,html body #heroTreeDialog button.ht-edit-toggle.on{color:#062018!important;border:0!important;background:linear-gradient(135deg,#d4ff7a,#5fe6b6)!important}
.ht-editbar[hidden]{display:none}
.ht-editbar{padding:8px 10px;border-radius:12px;background:#2a1f0f99;border:1px dashed #d9a84e88}
.ht-state{font-size:12px;font-weight:700;color:#9ff28f}.ht-state.dirty{color:#edc77b}.ht-state.warn{color:#ff9ab0}
.ht-body{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:12px;align-items:stretch}
@media(max-width:880px){.ht-body{grid-template-columns:1fr}}
.ht-view{position:relative;height:min(66dvh,640px);min-height:360px;overflow:hidden;border-radius:14px;border:1px solid #6a5530;background:radial-gradient(circle at 50% 50%,#3a2f1655,transparent 65%),linear-gradient(#18140e,#0f0d09);cursor:grab;touch-action:none;user-select:none}
.ht-view.dragging{cursor:grabbing}.ht-view.editing{border-color:#d9a84e;box-shadow:inset 0 0 0 1px #d9a84e55}
.ht-world{position:absolute;left:0;top:0;width:${SIZE}px;height:${SIZE}px;transform-origin:0 0}
.ht-lines{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.ht-hint{position:absolute;left:10px;bottom:8px;font-size:10.5px;color:#d9a84e;opacity:.7;pointer-events:none}
.ht-hero{position:absolute;left:${C}px;top:${C}px;width:104px;height:104px;margin:-52px;border-radius:50%;border:3px solid #ffcf6a;background:radial-gradient(circle at 40% 35%,#4a6a5a,#0c1d22);box-shadow:0 0 34px #ff9f2e77,inset 0 0 18px #000;overflow:hidden}
.ht-hero svg{width:100%;height:100%;display:block}
html body #heroTreeDialog .ht-node{position:absolute;width:58px;height:58px;margin:-29px 0 0 -29px;padding:0!important;display:grid;place-items:center;border-radius:50%!important;border:2px solid #7a6136!important;background:radial-gradient(circle at 40% 35%,#3a2e1c,#120e08)!important;box-shadow:0 3px 8px #000a!important;color:#f6e7c4;cursor:pointer;filter:none!important;transition:box-shadow .2s,border-color .2s}
html body #heroTreeDialog .ht-node.on{border-color:var(--c)!important;box-shadow:0 0 16px color-mix(in srgb,var(--c) 60%,transparent),0 3px 8px #000a!important}
html body #heroTreeDialog .ht-node.ready{border-color:#ffcf6a!important;animation:ht-ready 1.6s ease-in-out infinite}
@keyframes ht-ready{50%{box-shadow:0 0 18px #ffcf6aaa,0 3px 8px #000a}}
html body #heroTreeDialog .ht-node.locked{opacity:.45}
html body #heroTreeDialog .ht-node.selected{outline:2px solid #fff6;outline-offset:5px}
.ht-view.editing .ht-node{cursor:move!important}
.ht-ring{position:absolute;inset:-7px;width:calc(100% + 14px);height:calc(100% + 14px);rotate:-90deg;pointer-events:none}
.ht-icon{font-size:25px;line-height:1;pointer-events:none}.ht-icon img{width:34px;height:34px;object-fit:contain}
.ht-lbl{position:absolute;top:100%;left:50%;translate:-50% 0;margin-top:9px;white-space:nowrap;font-size:11px;font-weight:700;color:#f0e2c0;line-height:1.25;text-align:center;text-shadow:0 1px 3px #000,0 0 6px #000;pointer-events:none}
.ht-lbl i{display:block;font-style:normal;font-size:10px;color:#ffcf6a}
.ht-lock{position:absolute;right:-6px;top:-6px;font-size:13px;pointer-events:none}
.ht-panel{padding:14px;border-radius:14px;background:#061214cc;border:1px solid #7fe6c222;overflow:auto;max-height:min(66dvh,640px)}
.ht-panel h3{margin:0 0 4px;font-size:17px;color:#f6e7c4;display:flex;align-items:center;gap:8px}
.ht-panel h3 img{display:block;width:26px;height:26px;object-fit:contain}
.ht-panel .ht-sub{font-size:11px;font-weight:800;letter-spacing:1.5px;margin-bottom:10px}
.ht-panel p{font-size:12.5px;line-height:1.5;margin:6px 0}
.ht-rows{display:flex;flex-direction:column;gap:4px;margin:8px 0}
.ht-row{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;padding:5px 8px;border-radius:8px;background:#0a1c1e}
.ht-row b{color:#ffcf6a}.ht-ok{color:#9ff28f}.ht-no{color:#ff9ab0}
.ht-ability{margin:8px 0;padding:8px 10px;border-radius:10px;border:1px solid #bc79ff66;background:#1f1230aa}
.ht-ability b{color:#e2c6ff;font-size:13px}.ht-ability p{margin:3px 0 0;font-size:12px}
html body #heroTreeDialog .ht-learn{width:100%;margin-top:10px;padding:10px}
html body #heroTreeDialog .ht-learn:not(:disabled){color:#2a1d07!important;border:0!important;background:linear-gradient(#fff1c4,#d9a84e 60%,#b07f2c)!important}
.ht-field{display:flex;flex-direction:column;gap:4px;font-size:11.5px;font-weight:700;color:#8fb8aa;margin-bottom:8px}
.ht-field input,.ht-field select,.ht-field textarea{font:600 13px Manrope,sans-serif;padding:7px 9px}
.ht-field textarea{min-height:52px;resize:vertical}
.ht-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ht-icons{display:flex;flex-wrap:wrap;gap:3px}
html body #heroTreeDialog .ht-icons button{width:30px;height:30px;padding:0;font-size:16px}
.ht-icons img{display:block;width:24px;height:24px;margin:auto;object-fit:contain;pointer-events:none}
html body #heroTreeDialog .ht-icons button.on{border-color:#ffcf6a!important;background:#3a2e1c!important}
.ht-stat{display:grid;grid-template-columns:1fr 70px 28px;gap:4px;margin-bottom:4px}
.ht-stat select,.ht-stat input{font:600 12px Manrope,sans-serif;padding:5px 6px}
html body #heroTreeDialog .ht-stat button,html body #heroTreeDialog .ht-small{padding:4px 8px;font-size:11.5px}
.ht-req{max-height:150px;overflow:auto;display:flex;flex-direction:column;gap:2px;padding:4px;border-radius:8px;background:#0a1c1e}
.ht-req label{display:flex;gap:6px;align-items:center;font-size:12px;font-weight:600;color:#e4f6ee;padding:2px 4px}
.ht-req input{accent-color:#ffcf6a}
.ht-section{margin-top:12px;padding-top:10px;border-top:1px solid #7fe6c222;font-size:11px;letter-spacing:2px;font-weight:800;color:#8ff2c9}
html body #heroTreeDialog .ht-danger{color:#ffc2d0!important;background:#2a0e1a!important;border-color:#ff6f9a66!important}
#heroXpBar{cursor:pointer}
#heroXpBar:hover{box-shadow:0 0 16px #9ff28f77}
`;
document.head.append(style);

const dialog=document.createElement('dialog');dialog.id='heroTreeDialog';dialog.setAttribute('aria-labelledby','heroTreeTitle');
dialog.innerHTML=`<div class="equipment-heading"><div><div class="talents-eyebrow">ПРОКАЧКА ГЕРОЯ</div><h2 id="heroTreeTitle">Путь героя</h2></div><button type="button" data-a="close" aria-label="Закрыть">×</button></div>
<div class="ht-bar"><span class="ht-points"></span><div class="ht-tools"><button type="button" data-a="zoomOut" title="Отдалить">−</button><button type="button" data-a="zoomIn" title="Приблизить">+</button><button type="button" data-a="center">⟲ К центру</button><button type="button" data-a="reset">Сбросить прокачку</button>${editable?'<button type="button" data-a="edit" class="ht-edit-toggle">✎ Редактор</button>':''}</div></div>
<div class="ht-editbar" hidden><span class="ht-state"></span><div><button type="button" data-a="add">+ Ячейка</button><button type="button" data-a="save" class="ht-primary">Сохранить в файл</button><button type="button" data-a="revert">Отменить изменения</button><button type="button" data-a="export">Экспорт</button><button type="button" data-a="import">Импорт</button></div></div>
<div class="ht-body"><div class="ht-view"><div class="ht-world"><svg class="ht-lines" viewBox="0 0 ${SIZE} ${SIZE}"></svg><div class="ht-hero"></div><div class="ht-nodes"></div></div><span class="ht-hint">ЛКМ — перемещение · колесо мыши — масштаб</span></div><aside class="ht-panel"></aside></div>
<input type="file" accept=".json,application/json" hidden>`;
document.body.append(dialog);
const $q=selector=>dialog.querySelector(selector);
const viewport=$q('.ht-view'),world=$q('.ht-world'),lines=$q('.ht-lines'),nodesLayer=$q('.ht-nodes'),panel=$q('.ht-panel');
dialog.addEventListener('keydown',event=>{if(event.target.matches('input,textarea,select'))event.stopPropagation();});

let view={x:0,y:0,s:1},selected=null,editing=false;
function applyView(){world.style.transform=`translate(${view.x}px,${view.y}px) scale(${view.s})`;}
function centerView(){
 const box=viewport.getBoundingClientRect();if(!box.width)return;
 view.s=clamp(Math.min(box.width,box.height)/(2*(orbitRadius(4)+90)),.3,1.4);view.x=box.width/2-C*view.s;view.y=box.height/2-C*view.s;applyView();
}
function zoomAt(factor,mx,my){const s=clamp(view.s*factor,.25,2.5);view.x=mx-(mx-view.x)*s/view.s;view.y=my-(my-view.y)*s/view.s;view.s=s;applyView();}
function iconHtml(icon){return /^(assets\/|https?:)/.test(icon)?`<img src="${esc(icon)}" alt="">`:esc(icon);}

function draw(){
 const ring=(node,rank,color)=>{const r=33,c=2*Math.PI*r,f=rank/node.maxRank;return `<svg class="ht-ring" viewBox="0 0 74 74"><circle cx="37" cy="37" r="${r}" fill="none" stroke="#7a613644" stroke-width="3"/>${f?`<circle cx="37" cy="37" r="${r}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${c*f} ${c}"/>`:''}</svg>`;};
 let svg='<defs><filter id="htGlow"><feGaussianBlur stdDeviation="3"/></filter></defs>';
 for(let k=1;k<=ORBITS;k++){const r=orbitRadius(k);svg+=`<circle cx="${C}" cy="${C}" r="${r}" fill="none" stroke="#d9a84e" stroke-opacity="${(.3-k*.018).toFixed(3)}" stroke-width="1.5" ${k>1?'stroke-dasharray="5 8"':''}/><text x="${C}" y="${C-r-7}" text-anchor="middle" fill="#d9a84e" fill-opacity=".55" font-size="12" font-weight="800" letter-spacing="2" font-family="Manrope,sans-serif">${ROMAN[k-1]}</text>`;}
 for(const node of tree.nodes){
  const to=pos(node),color=branchOf(node).color,lit=rankOf(node)>0;
  const sources=node.requires.length?node.requires.map(id=>pos(nodeById(id))):node.orbit===1?[{x:C,y:C}]:[];
  for(const from of sources)svg+=lit?`<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-width="7" opacity=".55" filter="url(#htGlow)"/><line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#ffe7a8" stroke-width="2.5"/>`
   :`<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#7a6136" stroke-width="2" ${node.requireMode==='any'?'stroke-dasharray="6 6"':''}/>`;
 }
 lines.innerHTML=svg;
 nodesLayer.innerHTML=tree.nodes.map(node=>{
  const p=pos(node),rank=rankOf(node),color=branchOf(node).color,req=requirementState(node),state=learnState(node);
  const cls=['ht-node',rank?'on':'',!req.met&&!rank?'locked':'',state.ok&&!editing?'ready':'',node.id===selected?'selected':''].join(' ');
  return `<button type="button" class="${cls}" data-id="${esc(node.id)}" style="left:${p.x}px;top:${p.y}px;--c:${color}" aria-label="${esc(node.name)} ${rank} из ${node.maxRank}">${ring(node,rank,color)}<span class="ht-icon">${iconHtml(node.icon)}</span><span class="ht-lbl">${esc(node.name)}<i>${rank} / ${node.maxRank}</i></span>${!req.met&&!rank?'<span class="ht-lock">🔒</span>':''}</button>`;
 }).join('');
 $q('.ht-points').innerHTML=`${HERO_POINT_ICON}Очки прокачки: ${heroPoints}<small>вложено в героя: ${spent()}</small>`;
 viewport.classList.toggle('editing',editing);
 $q('.ht-editbar').hidden=!editing;$q('[data-a=edit]')?.classList.toggle('on',editing);
 if(editing)showState();
}

function statLines(node,rank){return Object.entries(node.stats).map(([key,value])=>`<div class="ht-row"><span>${STATS[key].label}</span><b>+${fmt(value*Math.max(1,rank))}${STATS[key].unit}${rank>1?'':' / ур.'}</b></div>`).join('');}
function renderPanel(){
 if(editing){renderEditor();return;}
 const node=nodeById(selected);
 if(!node){
  const total=bonus(),rows=Object.entries(total).map(([key,value])=>`<div class="ht-row"><span>${STATS[key].label}</span><b>+${fmt(value)}${STATS[key].unit}</b></div>`).join('');
  panel.innerHTML=`<h3>Бонусы героя</h3><div class="ht-sub" style="color:#8ff2c9">ИЗ ДРЕВА ПРОКАЧКИ</div><div class="ht-rows">${rows||'<p>Пока ничего не изучено.</p>'}</div><p style="color:#8fb8aa">Нажми на ячейку, чтобы посмотреть её и изучить. От героя в центре расходятся три ветки: ${tree.branches.map(b=>`<b style="color:${b.color}">${esc(b.name)}</b>`).join(', ')}.</p>`;
  return;
 }
 const rank=rankOf(node),branch=branchOf(node),req=requirementState(node),state=learnState(node);
 const reqHtml=req.checks.length?`<div class="ht-section">ТРЕБОВАНИЯ · ${node.requireMode==='any'?'ЛЮБАЯ ИЗ':'ВСЕ'} · ${node.requireLevel==='max'?'ПОЛНОСТЬЮ':'ХОТЯ БЫ 1 УР.'}</div><div class="ht-rows">${req.checks.map(c=>`<div class="ht-row"><span>${esc(c.node.name)}</span><b class="${c.ok?'ht-ok':'ht-no'}">${c.ok?'✓':rankOf(c.node)+' / '+(node.requireLevel==='max'?c.node.maxRank:1)}</b></div>`).join('')}</div>`:'';
 panel.innerHTML=`<h3><span>${iconHtml(node.icon)}</span>${esc(node.name)}</h3><div class="ht-sub" style="color:${branch.color}">${esc(branch.name).toUpperCase()} · ОРБИТА ${ROMAN[node.orbit-1]} · УРОВЕНЬ ${rank} / ${node.maxRank}</div>
 ${node.desc?`<p>${esc(node.desc)}</p>`:''}
 ${Object.keys(node.stats).length?`<div class="ht-section">ЗА КАЖДЫЙ УРОВЕНЬ</div><div class="ht-rows">${statLines(node,1)}</div>`:''}
 ${rank&&Object.keys(node.stats).length?`<div class="ht-section">СЕЙЧАС ДАЁТ</div><div class="ht-rows">${statLines(node,rank)}</div>`:''}
 ${node.ability?`<div class="ht-ability"><b>✦ ${esc(node.ability.name||'Способность')}</b>${node.ability.desc?`<p>${esc(node.ability.desc)}</p>`:''}</div>`:''}
 ${reqHtml}
 <button type="button" class="ht-learn" data-a="learn" ${state.ok?'':'disabled'}>${esc(state.reason)}</button>`;
}

function learn(node){
 if(!learnState(node).ok)return;
 heroPoints-=node.cost;ranks[node.id]=rankOf(node)+1;saveRanks();render();draw();renderPanel();
}
async function resetHero(){
 const refund=spent();
 if(!refund){$q('.ht-points').animate([{opacity:1},{opacity:.4},{opacity:1}],{duration:400});return;}
 if(!await gameConfirm({title:'Сбросить прокачку героя?',text:`Вернётся очков прокачки: ${HERO_POINT_ICON}<b>${refund}</b>`,ok:'Сбросить'}))return;
 heroPoints+=refund;ranks={};saveRanks();render();draw();renderPanel();
}

// ---------- Перемещение и масштаб ----------
const pointers=new Map();let drag=null,pinch=null;
viewport.addEventListener('pointerdown',event=>{
 if(event.pointerType==='mouse'&&event.button!==0)return;
 try{viewport.setPointerCapture(event.pointerId);}catch{}pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
 if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={dist:Math.hypot(a.x-b.x,a.y-b.y),s:view.s};drag=null;return;}
 const nodeEl=event.target.closest('.ht-node');
 drag={startX:event.clientX,startY:event.clientY,vx:view.x,vy:view.y,moved:false,nodeId:nodeEl?.dataset.id||null,mode:editing&&nodeEl?'node':'pan'};
 if(drag.mode==='pan')viewport.classList.add('dragging');
});
viewport.addEventListener('pointermove',event=>{
 if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
 if(pinch&&pointers.size===2){const [a,b]=[...pointers.values()],box=viewport.getBoundingClientRect();zoomAt(pinch.s*Math.hypot(a.x-b.x,a.y-b.y)/pinch.dist/view.s,(a.x+b.x)/2-box.left,(a.y+b.y)/2-box.top);return;}
 if(!drag)return;
 const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(Math.hypot(dx,dy)>4)drag.moved=true;if(!drag.moved)return;
 if(drag.mode==='pan'){view.x=drag.vx+dx;view.y=drag.vy+dy;applyView();return;}
 // Перетаскивание ячейки в редакторе: прилипает к ближайшей орбите, угол — с шагом 1°.
 const box=viewport.getBoundingClientRect(),wx=(event.clientX-box.left-view.x)/view.s-C,wy=(event.clientY-box.top-view.y)/view.s-C,node=nodeById(drag.nodeId);
 node.orbit=clamp(Math.round((Math.hypot(wx,wy)-ORBIT_BASE)/ORBIT_STEP),1,ORBITS);node.angle=Math.round(Math.atan2(wy,wx)*180/Math.PI);
 selected=node.id;draw();
});
const endPointer=event=>{
 pointers.delete(event.pointerId);if(pointers.size<2)pinch=null;
 if(!drag||pointers.size)return;viewport.classList.remove('dragging');
 const done=drag;drag=null;
 if(done.mode==='node'&&done.moved){commit();renderPanel();return;}
 if(!done.moved&&done.nodeId){selected=done.nodeId;draw();renderPanel();}
 else if(!done.moved&&!done.nodeId&&selected){selected=null;draw();renderPanel();}
};
viewport.addEventListener('pointerup',endPointer);viewport.addEventListener('pointercancel',endPointer);
viewport.addEventListener('wheel',event=>{event.preventDefault();const box=viewport.getBoundingClientRect();zoomAt(Math.exp(-event.deltaY*.0015),event.clientX-box.left,event.clientY-box.top);},{passive:false});

dialog.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button||viewport.contains(button))return;
 const box=viewport.getBoundingClientRect();
 switch(button.dataset.a){
  case 'close':dialog.close();break;
  case 'zoomIn':zoomAt(1.25,box.width/2,box.height/2);break;
  case 'zoomOut':zoomAt(.8,box.width/2,box.height/2);break;
  case 'center':centerView();break;
  case 'reset':resetHero();break;
  case 'learn':learn(nodeById(selected));break;
  case 'edit':editing=!editing;draw();renderPanel();break;
  case 'add':addNode();break;
  case 'save':saveFile();break;
  case 'revert':(async()=>{if(dirty&&!await gameConfirm({title:'Отменить изменения древа?',text:'Все правки пропадут, вернётся версия из файла.',ok:'Отменить правки'}))return;try{localStorage.removeItem(DRAFT_KEY);}catch{}tree=normalize(window.HERO_TREE);dirty=false;selected=null;draw();renderPanel();})();break;
  case 'export':download('hero-tree.json',JSON.stringify(tree,null,1),'application/json');break;
  case 'import':$q('input[type=file]').click();break;
 }
});

// ---------- Редактор древа ----------
function commit(){if(!editable)return;try{localStorage.setItem(DRAFT_KEY,JSON.stringify(tree));}catch{}dirty=true;draw();render();}
function showState(){const el=$q('.ht-state');el.textContent=dirty?'Есть изменения, не сохранённые в файл (в игре уже действуют)':'Всё сохранено в hero-tree-data.js';el.className='ht-state'+(dirty?' dirty':'');}
function addNode(){
 const base=nodeById(selected),branch=base?base.branch:tree.branches[0].id;
 const node={id:uid(),branch,orbit:base?clamp(base.orbit+1,1,ORBITS):1,angle:base?base.angle:-90,name:'Новая ячейка',icon:'✦',desc:'',maxRank:1,cost:1,stats:{},ability:null,requires:base?[base.id]:[],requireMode:'all',requireLevel:'one'};
 tree.nodes.push(node);selected=node.id;commit();renderPanel();$q('[data-f=name]')?.select();
}
function field(label,html,hint=''){return `<label class="ht-field"><span>${label}</span>${html}${hint?`<span style="font-weight:600;color:#6f948a">${hint}</span>`:''}</label>`;}
function renderEditor(){
 const node=nodeById(selected);
 if(!node){
  panel.innerHTML=`<h3>Редактор древа</h3><p style="color:#8fb8aa">Перетаскивай ячейки мышью — они прилипают к орбитам. Нажми на ячейку, чтобы изменить её характеристики, способность и требования. «+ Ячейка» добавляет новую рядом с выбранной.</p>
  <div class="ht-section">ВЕТКИ</div>${tree.branches.map((b,i)=>`<div class="ht-pair" style="margin-bottom:6px">${field('Название',`<input data-branch="${i}" data-bf="name" value="${esc(b.name)}" maxlength="20">`)}${field('Цвет',`<input type="color" data-branch="${i}" data-bf="color" value="${b.color}">`)}</div>`).join('')}`;
  return;
 }
 const others=tree.nodes.filter(n=>n.id!==node.id);
 panel.innerHTML=`<h3>Ячейка</h3>
 ${field('Название',`<input data-f="name" value="${esc(node.name)}" maxlength="30">`)}
 ${field('Иконка',`<div class="ht-icons">${ICONS.map(i=>`<button type="button" data-icon="${i}" class="${i===node.icon?'on':''}">${iconHtml(i)}</button>`).join('')}</div><input data-f="icon" value="${esc(node.icon)}" placeholder="эмодзи или assets/…">`)}
 ${field('Описание',`<textarea data-f="desc" maxlength="200">${esc(node.desc)}</textarea>`)}
 <div class="ht-pair">${field('Ветка',`<select data-f="branch">${tree.branches.map(b=>`<option value="${b.id}" ${b.id===node.branch?'selected':''}>${esc(b.name)}</option>`).join('')}</select>`)}${field('Орбита',`<input data-f="orbit" type="number" min="1" max="${ORBITS}" value="${node.orbit}">`)}</div>
 ${field('Угол на орбите: <b data-angle-label>'+node.angle+'°</b>',`<input data-f="angle" type="range" min="-180" max="180" value="${node.angle}">`)}
 <div class="ht-pair">${field('Макс. уровень',`<input data-f="maxRank" type="number" min="1" max="99" value="${node.maxRank}">`)}${field('Цена за уровень',`<input data-f="cost" type="number" min="1" max="99" value="${node.cost}">`,'очков талантов')}</div>
 <div class="ht-section">ХАРАКТЕРИСТИКИ ЗА УРОВЕНЬ</div>
 <div data-stats>${Object.entries(node.stats).map(([key,value])=>`<div class="ht-stat"><select data-stat-key="${key}">${Object.entries(STATS).map(([k,s])=>`<option value="${k}" ${k===key?'selected':''}>${s.label}</option>`).join('')}</select><input type="number" step="0.1" data-stat-value="${key}" value="${value}"><button type="button" data-stat-del="${key}">✕</button></div>`).join('')}</div>
 <button type="button" class="ht-small" data-a2="addStat" ${Object.keys(node.stats).length>=Object.keys(STATS).length?'disabled':''}>+ Характеристика</button>
 <div class="ht-section">НОВАЯ СПОСОБНОСТЬ</div>
 ${field('Название способности',`<input data-f="abilityName" value="${esc(node.ability?.name||'')}" placeholder="пусто — без способности">`)}
 ${field('Описание способности',`<textarea data-f="abilityDesc">${esc(node.ability?.desc||'')}</textarea>`)}
 <div class="ht-section">ОТКРЫВАЕТСЯ ПОСЛЕ</div>
 <div class="ht-pair">${field('Условие',`<select data-f="requireMode"><option value="all" ${node.requireMode==='all'?'selected':''}>Все выбранные</option><option value="any" ${node.requireMode==='any'?'selected':''}>Любая из выбранных</option></select>`)}${field('Прокачка',`<select data-f="requireLevel"><option value="one" ${node.requireLevel==='one'?'selected':''}>Хотя бы 1 уровень</option><option value="max" ${node.requireLevel==='max'?'selected':''}>Полностью</option></select>`)}</div>
 <input data-req-filter placeholder="Поиск ячейки…" style="width:100%;margin-bottom:4px;font:600 12px Manrope,sans-serif;padding:6px 8px">
 <div class="ht-req">${others.map(o=>`<label data-req-row="${esc(o.name.toLowerCase())}"><input type="checkbox" data-req="${esc(o.id)}" ${node.requires.includes(o.id)?'checked':''}> <span style="color:${branchOf(o).color}">●</span> ${esc(o.name)} <span style="color:#6f948a">· ${ROMAN[o.orbit-1]}</span></label>`).join('')||'<span style="color:#6f948a;font-size:12px">Других ячеек пока нет</span>'}</div>
 <span class="se-hint" style="font-size:10.5px;color:#6f948a">Без отметок ячейка доступна сразу (на I орбите — связана с героем).</span>
 <div class="ht-pair" style="margin-top:12px"><button type="button" class="ht-small" data-a2="deselect">Готово</button><button type="button" class="ht-small ht-danger" data-a2="delete">Удалить ячейку</button></div>`;
}
panel.addEventListener('input',event=>{
 const t=event.target;
 if(t.dataset.branch!==undefined){tree.branches[t.dataset.branch][t.dataset.bf]=t.value;commit();return;}
 if(t.dataset.reqFilter!==undefined){const q=t.value.trim().toLowerCase();panel.querySelectorAll('[data-req-row]').forEach(r=>r.hidden=!r.dataset.reqRow.includes(q));return;}
 const node=nodeById(selected);if(!node||!editing)return;
 const f=t.dataset.f;
 if(f==='name'||f==='desc'||f==='icon')node[f]=t.value;
 else if(f==='orbit')node.orbit=clamp(Math.round(Number(t.value)||1),1,ORBITS);
 else if(f==='angle'){node.angle=Number(t.value);panel.querySelector('[data-angle-label]').textContent=node.angle+'°';}
 else if(f==='maxRank'||f==='cost')node[f]=clamp(Math.round(Number(t.value)||1),1,99);
 else if(f==='abilityName'||f==='abilityDesc'){const a=node.ability||{name:'',desc:''};a[f==='abilityName'?'name':'desc']=t.value;node.ability=a.name||a.desc?a:null;}
 else if(t.dataset.statValue)node.stats[t.dataset.statValue]=Number(t.value)||0;
 else return;
 commit();
});
panel.addEventListener('change',event=>{
 const t=event.target,node=nodeById(selected);if(!node||!editing)return;
 if(t.dataset.f==='branch'||t.dataset.f==='requireMode'||t.dataset.f==='requireLevel'){node[t.dataset.f]=t.value;commit();}
 else if(t.dataset.req){const id=t.dataset.req;node.requires=t.checked?[...new Set([...node.requires,id])]:node.requires.filter(x=>x!==id);commit();}
 else if(t.dataset.statKey){const old=t.dataset.statKey,key=t.value;if(node.stats[key]!==undefined&&key!==old){t.value=old;return;}const value=node.stats[old];delete node.stats[old];node.stats[key]=value;commit();renderEditor();}
});
panel.addEventListener('click',async event=>{
 const b=event.target.closest('button');if(!b)return;const node=nodeById(selected);
 if(b.dataset.icon&&node){node.icon=b.dataset.icon;commit();renderEditor();return;}
 if(b.dataset.statDel&&node){delete node.stats[b.dataset.statDel];commit();renderEditor();return;}
 if(b.dataset.a2==='addStat'&&node){const key=Object.keys(STATS).find(k=>node.stats[k]===undefined);if(key){node.stats[key]=1;commit();renderEditor();}return;}
 if(b.dataset.a2==='deselect'){selected=null;draw();renderPanel();return;}
 if(b.dataset.a2==='delete'&&node){if(!await gameConfirm({title:'Удалить ячейку?',text:`Ячейка «${node.name}» пропадёт из древа.`,ok:'Удалить'}))return;tree.nodes=tree.nodes.filter(n=>n.id!==node.id);tree.nodes.forEach(n=>n.requires=n.requires.filter(id=>id!==node.id));if(ranks[node.id]){heroPoints+=ranks[node.id]*node.cost;delete ranks[node.id];saveRanks();}selected=null;commit();renderPanel();}
});
$q('input[type=file]').addEventListener('change',async event=>{
 const file=event.target.files[0];event.target.value='';if(!file)return;
 try{const data=JSON.parse(await file.text());if(!Array.isArray(data.nodes))throw 0;tree=normalize(data);selected=null;commit();renderPanel();}
 catch{const el=$q('.ht-state');el.textContent='Не удалось прочитать файл — нужен JSON из экспорта редактора';el.className='ht-state warn';}
});
function download(name,text,type='text/javascript'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function saveFile(){
 try{
  const response=await fetch('/api/hero-tree',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(tree)});
  if(!response.ok)throw new Error(response.status);
  window.HERO_TREE=clone(tree);try{localStorage.removeItem(DRAFT_KEY);}catch{}dirty=false;showState();
 }catch{
  download('hero-tree-data.js','// Древо прокачки героя. Этот файл перезаписывает редактор древа (кнопка ✎ в окне героя или F4).\nwindow.HERO_TREE='+JSON.stringify(tree,null,1)+';\n');
  const el=$q('.ht-state');el.textContent='Сервер сохранения не запущен: скачан hero-tree-data.js — положи его в папку игры.';el.className='ht-state warn';
 }
}

function open(edit=false){
 hideItemTooltip?.(true);
 const avatar=document.querySelector('#heroXpBar svg');$q('.ht-hero').innerHTML=avatar?avatar.outerHTML:'';
 editing=edit&&editable;draw();renderPanel();if(!dialog.open)dialog.showModal();requestAnimationFrame(centerView);
}
document.getElementById('heroXpBar').addEventListener('click',()=>open());
document.getElementById('heroXpBar').title='Прокачка героя';
if(editable){
 addEventListener('keydown',event=>{if(event.code==='F4'){event.preventDefault();dialog.open?dialog.close():open(true);}});
 const admin=document.getElementById('adminPanel');
 if(admin){const b=document.createElement('button');b.type='button';b.textContent='🌳 Редактор древа героя (F4)';b.style.cssText='width:100%;margin-top:10px';b.addEventListener('click',()=>{admin.close();open(true);});admin.append(b);}
}
window.heroTree={open,ranks:()=>({...ranks}),setRanks:value=>{ranks={...value};saveRanks();if(dialog.open){draw();renderPanel();}},spent,refresh:()=>{if(dialog.open){draw();renderPanel();}}};
})();
