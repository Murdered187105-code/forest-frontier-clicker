// Инкрустация: гнёзда под самоцветы у редких предметов и выше, камни и вкладка «Ювелир» в кузнице.
// Число гнёзд выпадает один раз при получении предмета (предметы из старых сохранений получают его при первой загрузке)
// и хранится в item.sockets: массив, где null — пустое гнездо, иначе id камня.
// Бонусы камней из надетых предметов подключаются в bonusSources() через window.gemBonus.
// Запас камней хранится отдельно, в GEM_KEY. Инкрустация навсегда: извлечённый камень уничтожается.
(()=>{
const RANKS=['Common','Uncommon','Rare','Epic','Legendary','Divine'];
// Камни выпадают только из сундука босса подземелья: от 1 до 3 случайных.
const GEM_KEY='forest-frontier-gems-v1',CHEST_GEMS=[1,3];
// Сколько гнёзд может быть у предмета каждого типа. Пояс в правилах не назван — гнёзд у него нет.
const SOCKET_LIMIT={head:2,accessory:1,ring:1,chest:3,legs:2,boots:2,weapon:2,shoulders:2,gloves:1,belt:0};
// Шанс выпадения числа гнёзд (остаток — без гнёзд); больше лимита типа не бывает.
const SOCKET_ODDS=[[3,.10],[2,.25],[1,.50]],WEAPON_ODDS=[[2,.10],[1,.25]];
// Бонусы порядка одной выпавшей характеристики редкого предмета; рубин заметно слабее прочих.
const GEMS={
 ruby:{name:'Рубин',stat:'damageBonus',value:.5,color:'#ff4f5e',dark:'#8a1020'},
 sapphire:{name:'Сапфир',stat:'maxMana',value:8,color:'#4fa3ff',dark:'#123f8a'},
 emerald:{name:'Изумруд',stat:'critChance',value:2,color:'#3fdc84',dark:'#0e6a38'},
 topaz:{name:'Топаз',stat:'attackSpeed',value:5,color:'#ffd24a',dark:'#8a6510'},
 amethyst:{name:'Аметист',stat:'manaRegen',value:.05,color:'#c77dff',dark:'#5a1a8a'}};
const GEM_IDS=Object.keys(GEMS);
const statLabel=key=>{const spec=ITEM_STAT_SPECS.find(s=>s[0]===key)||[key,key,''];return [spec[1],spec[2]];};
function gemText(id){const g=GEMS[id],[label,suffix]=statLabel(g.stat);return `${label} +${formatStat(g.value)}${suffix}`;}

function socketable(item){return !!item&&!item.adminOnly&&RANKS.indexOf(item.rarity)>=RANKS.indexOf('Rare')&&(SOCKET_LIMIT[item.slot]||0)>0;}
function rollSockets(item){
 if(!socketable(item))return [];
 const limit=SOCKET_LIMIT[item.slot],roll=Math.random();let acc=0,count=0;
 for(const [n,p] of item.slot==='weapon'?WEAPON_ODDS:SOCKET_ODDS){acc+=p;if(roll<acc){count=n;break;}}
 return Array(Math.min(limit,count)).fill(null);
}
// Сохранённые гнёзда проверяются: лишние отбрасываются, неизвестные камни становятся пустыми гнёздами.
function ensureSockets(item){
 if(!item||typeof item!=='object')return false;
 if(!Array.isArray(item.sockets)){item.sockets=rollSockets(item);return true;}
 const limit=socketable(item)?SOCKET_LIMIT[item.slot]:0,clean=item.sockets.slice(0,limit).map(g=>GEMS[g]?g:null);
 const changed=clean.length!==item.sockets.length||clean.some((g,i)=>g!==item.sockets[i]);item.sockets=clean;return changed;
}
const allItems=()=>[...inventoryItems,...Object.values(equipped).filter(Boolean)];

// Запас камней.
let stock=Object.fromEntries(GEM_IDS.map(id=>[id,0]));
try{const saved=JSON.parse(localStorage.getItem(GEM_KEY));if(saved&&typeof saved==='object')for(const id of GEM_IDS)if(Number.isSafeInteger(saved[id])&&saved[id]>0)stock[id]=saved[id];}catch{}
function saveStock(){try{localStorage.setItem(GEM_KEY,JSON.stringify(stock));}catch{}}

// Любое получение предмета заканчивается persistLoot — новые предметы получают гнёзда здесь, до записи.
const basePersist=persistLoot;
persistLoot=function(...args){allItems().forEach(ensureSockets);return basePersist.apply(this,args);};
window.persistLoot=persistLoot;
// Бонус камней из надетых предметов — ещё один источник характеристик.
window.gemBonus=()=>{const sum={};for(const item of Object.values(equipped))for(const id of item?.sockets||[])if(GEMS[id]){const g=GEMS[id];sum[g.stat]=Number(((sum[g.stat]||0)+g.value).toFixed(2));}return sum;};

// Огранённый камень или пустая оправа; uid нужен для уникального id градиента.
let uid=0;
function gemSvg(id){
 if(!GEMS[id])return '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="#0a0603" stroke="#c9a35a" stroke-width="1.4"/><circle cx="10" cy="10" r="4.5" fill="none" stroke="#c9a35a55" stroke-dasharray="2 2"/></svg>';
 const g=GEMS[id],k='gemGrad'+(++uid);
 return `<svg viewBox="0 0 20 20" aria-hidden="true"><defs><radialGradient id="${k}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="${g.color}"/><stop offset="1" stop-color="${g.dark}"/></radialGradient></defs><circle cx="10" cy="10" r="8.6" fill="#2a1d10" stroke="#e2b45a" stroke-width="1.2"/><path d="M10 3.2L15.8 7.2L13.9 14.6H6.1L4.2 7.2Z" fill="url(#${k})" stroke="${g.dark}" stroke-width=".6"/><path d="M10 3.2L10 8.6L15.8 7.2M10 8.6L4.2 7.2M10 8.6L6.1 14.6M10 8.6L13.9 14.6" stroke="#fff6" stroke-width=".5" fill="none"/></svg>`;
}

const style=document.createElement('style');
style.textContent=`
.item-sockets{position:absolute;z-index:1;display:flex;flex-direction:column;gap:2px;translate:-50% -50%;opacity:.55;pointer-events:none}
.item-sockets:not([style]){visibility:hidden}
.item-sockets svg{width:19px;height:19px;display:block;filter:drop-shadow(0 1px 2px #000)}
.equipment-slot>.item-sockets{gap:1px}
.equipment-slot>.item-sockets svg{width:17px;height:17px}
.tooltip-gems{margin-top:6px;padding-top:6px;border-top:1px solid #ffffff14}
.tooltip-gems-title{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--rc,#c9a35a);margin-bottom:2px}
.tooltip-gem{display:flex;align-items:center;gap:8px;font-size:12px;padding:2px 0}
.tooltip-gem svg{width:24px;height:24px;flex:none}
.tooltip-gem.empty{opacity:.55}
.jewel-layout{display:grid;grid-template-columns:minmax(220px,280px) 1fr;gap:16px;align-items:start}
@media(max-width:620px){.jewel-layout{grid-template-columns:1fr}}
.jewel-bench{position:relative;aspect-ratio:1;width:min(280px,100%);margin:0 auto;border-radius:50%;background:radial-gradient(circle,#2a1d10,#130c06 70%);border:3px double #c9a35a;box-shadow:inset 0 0 30px #000,0 0 24px #f5d68a1a}
.jewel-bench>img{position:absolute;left:50%;top:50%;width:40%;height:40%;object-fit:contain;translate:-50% -50%;filter:drop-shadow(0 6px 8px #000c)}
.jewel-bench .jewel-cap{position:absolute;left:12%;right:12%;bottom:9%;text-align:center;font-size:11px;line-height:1.2;color:#ffe7a3}
.jewel-bench .jewel-empty{position:absolute;inset:0;display:grid;place-items:center;padding:20%;text-align:center;font-size:12px;color:#c9a35a99}
html body #anvilDialog .jewel-sock{position:absolute;width:52px;height:52px;translate:-50% -50%;border-radius:50%;display:grid;place-items:center;padding:0;cursor:pointer;background:radial-gradient(circle,#0b0703,#2a1d10)!important;border:2px solid #c9a35a!important;box-shadow:0 0 0 3px #130c06,inset 0 0 10px #000!important;transition:box-shadow .2s}
html body #anvilDialog .jewel-sock svg{width:34px;height:34px}
html body #anvilDialog .jewel-sock.ready{box-shadow:0 0 0 3px #130c06,0 0 14px #ffe7a3!important}
html body #anvilDialog .jewel-sock:disabled{cursor:default;opacity:.7}
html body #anvilDialog .jewel-sock.pending{box-shadow:0 0 0 3px #130c06,0 0 0 5px #ffe7a3,0 0 16px #ffe7a3!important}
html body #anvilDialog .jewel-sock.pending svg{opacity:.6;animation:jewel-pending 1.1s ease-in-out infinite alternate}
@keyframes jewel-pending{to{opacity:1;transform:scale(1.08)}}
.jewel-confirm{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 12px;margin:12px 0 0;padding:10px 12px;border-radius:12px;background:#0b170fcc;border:1px solid #ffe7a366;font-size:12.5px;text-align:center}
.jewel-confirm[hidden]{display:none}
.jewel-confirm>div{display:flex;gap:6px}
html body #anvilDialog .jewel-ok,html body #anvilDialog .jewel-cancel{min-height:34px;padding:0 16px;border-radius:999px;font:inherit;font-weight:700;font-size:12.5px;cursor:pointer}
html body #anvilDialog .jewel-ok{color:#3a2405!important;background:linear-gradient(180deg,#fff0b8,#e2b45a 45%,#a8762c)!important;border:0!important}
html body #anvilDialog .jewel-cancel{color:#f5d68a!important;background:#132519!important;border:1px solid #c9a35a66!important;box-shadow:none!important}
.jewel-sock .jewel-plus{font-size:20px;line-height:1;color:#c9a35a88}
.jewel-gems{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
html body #anvilDialog .jewel-gem{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:10px;text-align:left;cursor:pointer;font:inherit;font-size:12px;color:#efe6cd!important;background:#0b170fcc!important;border:1px solid #c9a35a44!important;box-shadow:none!important}
html body #anvilDialog .jewel-gem[aria-pressed=true]{border-color:#ffe7a3!important;background:#c9a35a2a!important}
.jewel-gem svg{width:24px;height:24px;flex:none}
.jewel-gem b{display:block;font-size:12.5px}
.jewel-gem small{display:block;color:#cbbf9e;font-size:10.5px}
.jewel-gem .jewel-count{margin-left:auto;font-weight:700;color:#ffe7a3}
.dg-reward .dg-gem svg{width:46px;height:46px;display:block;filter:drop-shadow(0 0 8px #fff3)}
.jewel-status{min-height:18px;margin:8px 0 0;font-size:12px;text-align:center}
.jewel-grid .anvil-item .jewel-worn{position:absolute;right:4px;bottom:4px;font-size:9px;padding:0 5px;border-radius:999px;background:#c9a35a;color:#2a1a00}
`;
document.head.append(style);

// Гнёзда на карточке предмета — полупрозрачным столбиком по центру картинки, картинка не сжимается.
// addLevelPlate вызывается у всех карточек предметов, поэтому гнёзда добавляются вместе с ней.
// Карточки уже позиционированы (на них абсолютная плашка уровня); место столбика пересчитывается при смене размера картинки.
const socketRows=new WeakMap();
// Столбик гнёзд стоит ровно в центре картинки (она вписана по центру рамки, object-fit: contain).
const placeSockets=image=>{
 const row=socketRows.get(image);if(!row?.isConnected||!image.offsetWidth)return;
 row.style.left=image.offsetLeft+image.offsetWidth/2+'px';row.style.top=image.offsetTop+image.offsetHeight/2+'px';
};
const socketObserver=new ResizeObserver(entries=>entries.forEach(entry=>placeSockets(entry.target)));
// Столбик гнёзд поверх картинки image внутри позиционированного блока card (старый столбик убирается).
function attachSockets(card,image,item){
 card.querySelector(':scope>.item-sockets')?.remove();
 if(!item?.sockets?.length||!image)return;
 const row=document.createElement('div');row.className='item-sockets';row.innerHTML=item.sockets.map(gemSvg).join('');row.setAttribute('aria-hidden','true');
 image.after(row);socketRows.set(image,row);socketObserver.observe(image);
 if(!image.complete)image.addEventListener('load',()=>placeSockets(image),{once:true});
}
const baseLevelPlate=addLevelPlate;
addLevelPlate=function(card,item){
 const out=baseLevelPlate.apply(this,arguments);
 attachSockets(card,card.querySelector(':scope>img'),item);
 return out;
};
window.addLevelPlate=addLevelPlate;
// Слоты экипировки рисуются без addLevelPlate — гнёзда добавляются после каждой перерисовки.
const baseRenderEquipment=renderEquipment;
renderEquipment=function(...args){
 const out=baseRenderEquipment.apply(this,args);
 document.querySelectorAll('.equipment-slot').forEach(slot=>attachSockets(slot,slot.querySelector(':scope>.equipped-picture'),equipped[slot.dataset.slot]));
 return out;
};
window.renderEquipment=renderEquipment;

// Раздел «Гнёзда» в подсказке — перед ценой продажи.
function gemsBlock(item){
 const block=document.createElement('div');block.className='tooltip-gems';
 const title=document.createElement('div');title.className='tooltip-gems-title';title.textContent=`Гнёзда ${item.sockets.filter(Boolean).length}/${item.sockets.length}`;block.append(title);
 for(const id of item.sockets){const row=document.createElement('div');row.className='tooltip-gem'+(id?'':' empty');row.innerHTML=gemSvg(id);row.append(id?`${GEMS[id].name}: ${gemText(id)}`:'Пустое гнездо');block.append(row);}
 return block;
}
const baseShowTooltip=showItemTooltip;
showItemTooltip=function(anchor,item){
 const out=baseShowTooltip.apply(this,arguments);
 if(item?.sockets?.length&&!itemTooltip.hidden&&!itemTooltip.querySelector('.tooltip-gems')){const block=gemsBlock(item),price=itemTooltip.querySelector('.tooltip-price');if(price)price.before(block);else itemTooltip.append(block);placeItemTooltip(anchor);}
 return out;
};
window.showItemTooltip=showItemTooltip;

// ── Вкладка «Ювелир» в кузнице ───────────────────────────────────
// Выбираешь предмет с гнёздами, камень из запаса и пустое гнездо — камень встаёт туда предварительно,
// и только кнопка «Инкрустировать» вставляет его навсегда. Вставленный камень можно лишь извлечь, и тогда он уничтожается.
// pending — {item,index}: гнездо, куда предварительно положен камень armed.
let panel=null,pickedItem=null,armed=GEM_IDS[0],note='',pending=null,busy=false;
const isWorn=item=>Object.values(equipped).includes(item);
function afterChange(item){
 persistLoot();
 // Камни в надетом предмете сразу меняют характеристики героя.
 if(isWorn(item))renderEquipment();
}
const noGem=()=>`Нет камня «${GEMS[armed].name}». Камни выпадают из сундука босса подземелья.`;
// Нажатие на гнездо: пустое — положить камень предварительно (повторное нажатие убирает), занятое — извлечь с уничтожением.
async function clickSocket(item,index){
 if(busy||!item.sockets||index>=item.sockets.length)return;
 const id=item.sockets[index];
 if(id){
  busy=true;
  const ok=await gameConfirm({title:'Извлечь камень?',text:`${GEMS[id].name} (${gemText(id)}) будет <b>уничтожен</b> — вернуть его в запас нельзя. Гнездо станет пустым.`,ok:'Извлечь и уничтожить'});
  busy=false;
  if(!ok||item.sockets[index]!==id)return;
  item.sockets[index]=null;pending=null;note=`${GEMS[id].name} извлечён и уничтожен.`;afterChange(item);renderJeweler();return;
 }
 if(pending&&pending.item===item&&pending.index===index){pending=null;note='';renderJeweler();return;}
 if(!(stock[armed]>0)){pending=null;note=noGem();renderJeweler();return;}
 pending={item,index};note='';renderJeweler();
}
// Кнопка «Инкрустировать»: камень списывается из запаса и остаётся в гнезде навсегда.
function confirmInlay(){
 if(!pending)return;
 const {item,index}=pending;
 if(!allItems().includes(item)||item.sockets?.[index]!==null){pending=null;renderJeweler();return;}
 if(!(stock[armed]>0)){pending=null;note=noGem();renderJeweler();return;}
 stock[armed]--;item.sockets[index]=armed;pending=null;note=`${GEMS[armed].name} инкрустирован: ${gemText(armed)}.`;
 saveStock();afterChange(item);renderJeweler();
}
// Сундук босса подземелья: CHEST_GEMS случайных камней сразу в запас (или ровно fixed штук). Возвращает [[id,количество],…] для карточек награды.
function grantChestGems(fixed){
 const [lo,hi]=CHEST_GEMS,count=Number.isInteger(fixed)?fixed:lo+Math.floor(Math.random()*(hi-lo+1)),won={};
 for(let i=0;i<count;i++){const id=GEM_IDS[Math.floor(Math.random()*GEM_IDS.length)];won[id]=(won[id]||0)+1;stock[id]++;}
 saveStock();if(panel&&!panel.hidden)renderJeweler();
 return GEM_IDS.filter(id=>won[id]).map(id=>[id,won[id]]);
}
function renderBench(box){
 box.replaceChildren();
 if(!pickedItem){const empty=document.createElement('div');empty.className='jewel-empty';empty.textContent='Выбери ниже предмет с гнёздами';box.append(empty);return;}
 const img=document.createElement('img');img.src=pickedItem.image;img.alt='';
 const cap=document.createElement('div');cap.className='jewel-cap';cap.textContent=pickedItem.name;cap.style.color=rarityFlashColors[pickedItem.rarity];
 box.append(img,cap);
 const n=pickedItem.sockets.length,spread=n===3?60:70;
 pickedItem.sockets.forEach((id,i)=>{
  const angle=(-90+(n===1?0:(i-(n-1)/2)*spread))*Math.PI/180;
  const preview=!id&&pending?.item===pickedItem&&pending.index===i;
  const b=document.createElement('button');b.type='button';b.className='jewel-sock'+(preview?' pending':!id&&!pending&&stock[armed]>0?' ready':'');
  b.style.left=50+Math.cos(angle)*36+'%';b.style.top=50+Math.sin(angle)*36+'%';
  b.innerHTML=id?gemSvg(id):preview?gemSvg(armed):'<span class="jewel-plus">+</span>';
  const label=id?`${GEMS[id].name} — извлечь (камень уничтожится)`:preview?`${GEMS[armed].name} — убрать, не вставляя`:`Положить: ${GEMS[armed].name}`;b.title=label;b.setAttribute('aria-label',label);
  b.addEventListener('click',()=>clickSocket(pickedItem,i));box.append(b);
 });
}
function renderGems(box){
 box.replaceChildren();
 for(const id of GEM_IDS){
  const b=document.createElement('button');b.type='button';b.className='jewel-gem';b.setAttribute('aria-pressed',String(id===armed));
  b.innerHTML=gemSvg(id)+`<span><b>${GEMS[id].name}</b><small>${gemText(id)}</small></span><span class="jewel-count">×${stock[id]}</span>`;
  // Смена камня меняет и предварительно положенный; если такого камня нет, предварительная вставка снимается.
  b.addEventListener('click',()=>{armed=id;note='';if(pending&&!(stock[id]>0)){pending=null;note=noGem();}renderJeweler();});box.append(b);
 }
}
function renderGrid(box){
 box.replaceChildren();
 const items=allItems().filter(item=>item.sockets?.length).sort((a,b)=>RANKS.indexOf(b.rarity)-RANKS.indexOf(a.rarity)||isWorn(b)-isWorn(a));
 if(!items.length){const p=document.createElement('p');p.className='anvil-grid-empty';p.textContent='Нет предметов с гнёздами. Гнёзда бывают у редких предметов и выше.';box.append(p);return;}
 for(const item of items){
  const cell=document.createElement('div');cell.className='anvil-item'+(item===pickedItem?' selected':'');cell.style.setProperty('--rc',rarityFlashColors[item.rarity]);
  cell.setAttribute('role','button');cell.tabIndex=0;cell.setAttribute('aria-pressed',String(item===pickedItem));cell.setAttribute('aria-label',item.name+' · '+rarityLabel(item.rarity)+(isWorn(item)?' · надет':''));
  const img=document.createElement('img');img.src=item.image;img.alt='';
  const name=document.createElement('strong');name.textContent=item.name;
  const rarity=document.createElement('small');rarity.textContent=rarityLabel(item.rarity);
  cell.append(img,name,rarity);addLevelPlate(cell,item);
  if(isWorn(item)){const worn=document.createElement('span');worn.className='jewel-worn';worn.textContent='надет';cell.append(worn);}
  attachItemTooltip(cell,item);
  const pick=()=>{hideItemTooltip(true);pickedItem=item===pickedItem?null:item;pending=null;note='';renderJeweler();};
  cell.addEventListener('click',pick);cell.addEventListener('keydown',e=>{if(e.key==='Enter'||e.code==='Space'){e.preventDefault();pick();}});
  box.append(cell);
 }
}
function renderJeweler(target){
 if(target&&target!==panel){panel=target;panel.innerHTML=`<p class="anvil-intro">Выбери камень, нажми на пустое гнездо и подтверди. Инкрустированный камень остаётся в предмете навсегда и даёт бонус, пока предмет надет. Извлечь камень можно, но он при этом уничтожится. Камни выпадают из сундука босса подземелья.</p>
<div class="jewel-layout"><div class="jewel-bench" id="jewelBench"></div><div class="jewel-gems" id="jewelGems"></div></div>
<div class="jewel-confirm" id="jewelConfirm" hidden><span></span><div><button class="jewel-cancel" id="jewelCancel" type="button">Отмена</button><button class="jewel-ok" id="jewelOk" type="button">Инкрустировать</button></div></div>
<p class="jewel-status" id="jewelStatus" role="status"></p><div class="anvil-grid-title">Предметы с гнёздами</div><div class="anvil-grid jewel-grid" id="jewelGrid"></div>`;
  panel.querySelector('#jewelOk').addEventListener('click',confirmInlay);
  panel.querySelector('#jewelCancel').addEventListener('click',()=>{pending=null;note='';renderJeweler();});}
 if(!panel)return;
 if(pickedItem&&!allItems().includes(pickedItem))pickedItem=null;
 if(pending&&(pending.item!==pickedItem||pending.item.sockets?.[pending.index]!==null||!(stock[armed]>0)))pending=null;
 const confirmBox=panel.querySelector('#jewelConfirm');confirmBox.hidden=!pending;
 if(pending)confirmBox.querySelector('span').textContent=`Инкрустировать «${GEMS[armed].name}» (${gemText(armed)})? Камень останется в предмете «${pickedItem.name}» навсегда.`;
 renderBench(panel.querySelector('#jewelBench'));renderGems(panel.querySelector('#jewelGems'));renderGrid(panel.querySelector('#jewelGrid'));
 panel.querySelector('#jewelStatus').textContent=note;
}
function resetJeweler(){pickedItem=null;pending=null;note='';}

// Первый запуск: предметы из сохранения получают гнёзда.
if(allItems().map(ensureSockets).some(Boolean))persistLoot();
renderEquipment();
window.gems={GEMS,SOCKET_LIMIT,CHEST_GEMS,stock:()=>({...stock}),rollSockets,grantChestGems,renderJeweler,resetJeweler,gemSvg};
})();
