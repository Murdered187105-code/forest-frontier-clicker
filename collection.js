// Коллекция комплектов: список всех наборов оружия, аксессуаров и брони с поиском и фильтрами.
// Предмет отмечается в коллекции, как только игрок его получил, и остаётся отмеченным после продажи или распыления.
// Когда отмечены все предметы комплекта, его бонус действует навсегда — через window.setCollectionBonus в bonusSources().
(()=>{
const COLLECTION_KEY='forest-frontier-collection-v1';
const RANKS=['Common','Uncommon','Rare','Epic','Legendary','Divine'];
const KIND_NAMES={weapon:'Оружие',accessory:'Аксессуары',armor:'Броня'};
const BONUS_TEXT={damage:['к урону',''],damageBonus:['к урону удара',''],maxMana:['к максимуму маны',''],goldBonus:['золота за убийство','%'],attackSpeed:['скорости атаки','%'],critChance:['шанса крита',' п.п.'],critDamage:['урона крита','%']};
const sets=(window.ITEM_SETS||[]).filter(set=>RANKS.includes(set.rarity)&&KIND_NAMES[set.kind]&&Array.isArray(set.items)&&set.items.length);
const color=rarity=>rarityFlashColors[rarity]||'#d9b56a';
const template=id=>itemPool.find(item=>item.id===id)||null;
const slotName=item=>item.slot==='weapon'?'Оружие':item.slot==='ring'?'Кольцо':slotNames[item.slot]||item.slot;
const number=value=>Number(value.toFixed(2)).toLocaleString('ru-RU');

const collected=new Set(),completed=new Set();
try{const saved=JSON.parse(localStorage.getItem(COLLECTION_KEY));if(saved){(saved.items||[]).forEach(id=>typeof id==='string'&&collected.add(id));(saved.sets||[]).forEach(id=>typeof id==='string'&&completed.add(id));}}catch{}
function save(){try{localStorage.setItem(COLLECTION_KEY,JSON.stringify({items:[...collected],sets:[...completed]}));}catch{}}
const progress=set=>set.items.filter(id=>collected.has(id)).length;
// Другие окна (наковальня) спрашивают, открыт ли предмет в коллекции.
window.collectionApi={has:id=>collected.has(id)};

// Суммарный бонус всех собранных комплектов — подключается в bonusSources() как ещё один источник характеристик.
window.setCollectionBonus=()=>{
 const total={name:'Комплекты'};
 for(const set of sets)if(completed.has(set.id))for(const [key,value] of Object.entries(set.bonus||{}))if(BONUS_TEXT[key]&&Number.isFinite(value))total[key]=Number(((total[key]||0)+value).toFixed(2));
 return total;
};
function bonusLines(bonus){return Object.entries(bonus||{}).filter(([key,value])=>BONUS_TEXT[key]&&Number.isFinite(value)).map(([key,value])=>(key==='damage'?'':'+')+number(value)+BONUS_TEXT[key][1]+' '+BONUS_TEXT[key][0]);}

// Отмечает всё, что сейчас лежит в инвентаре и надето, и открывает бонусы только что собранных комплектов.
function record(){
 let changed=false;const fresh=[];
 for(const item of [...inventoryItems,...Object.values(equipped)])if(item&&typeof item.id==='string'&&!collected.has(item.id)){collected.add(item.id);changed=true;}
 for(const set of sets)if(!completed.has(set.id)&&progress(set)===set.items.length){completed.add(set.id);fresh.push(set);changed=true;}
 if(!changed)return;
 save();
 if(fresh.length){
  renderEquipment();
  $('message').textContent='Комплект собран: '+fresh.map(set=>'«'+set.name+'»').join(', ')+'! Бонус действует навсегда.';
  announce(fresh);
 }
 if(dialog.open)render();
}
// Любое получение предмета в игре заканчивается сохранением инвентаря — там коллекция и узнаёт о новинках.
const originalPersistLoot=persistLoot;
persistLoot=function(){originalPersistLoot();record();};

const style=document.createElement('style');
style.textContent=`
#openCollection svg{width:24px;height:24px}
.collection-button{position:absolute;z-index:5;background:#22352bed}
html body #collectionDialog{--gold:#f5d68a;--gold-dim:#c9a35a;width:min(720px,calc(100% - 24px));max-height:92dvh;overflow:auto;padding:24px;font-family:'Golos Text',Manrope,'Segoe UI',sans-serif;color:#efe6cd!important;background:radial-gradient(ellipse at 50% 20%,#1f4a2e,#0b2015 60%,#05110a)!important;border:3px double #c9a35a!important;box-shadow:0 0 0 1px #000,0 0 32px #f5d68a1f,0 24px 70px #000d!important}
html body #collectionDialog:before{display:none}
html body #collectionDialog .equipment-heading{border-bottom:1px solid #c9a35a55}
html body #collectionDialog h2{font-family:inherit;color:#ffe7a3;text-shadow:0 1px 0 #6b4a1a,0 0 18px #f5d68a55}
html body #collectionDialog .talents-eyebrow{color:var(--gold-dim)}
html body #collectionDialog p{color:#cbbf9e}
html body #collectionDialog .equipment-heading>button{color:var(--gold)!important;background:#132519!important;border-color:#c9a35a66!important;box-shadow:none}
.collection-summary{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 12px;padding:10px 14px;border:1px solid #c9a35a66;border-radius:12px;background:linear-gradient(#0d2416,#081a10)}
.collection-summary b{color:#ffe7a3;font-size:18px}
.collection-summary small{display:block;font-size:11px;color:#a99d7c}
.collection-total{font-size:12px;color:#d9cba2;text-align:right}
.collection-total span{display:inline-block;margin:2px 0 2px 8px;color:#9ff28f}
html body #collectionDialog .collection-search{width:100%;min-height:40px;padding:0 14px 0 38px;border-radius:12px;border:1px solid #c9a35a66!important;background:#06120c url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23c9a35a' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-4-4'/%3E%3C/svg%3E") no-repeat 12px 50%/18px!important;color:#f3e7c4!important;font:inherit;font-size:14px}
html body #collectionDialog .collection-search:focus{outline:none;box-shadow:0 0 0 2px #c9a35a55}
.collection-filters{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px}
html body #collectionDialog .collection-filters button{min-height:30px;padding:0 12px;border-radius:999px;font-family:inherit;font-size:12px;color:var(--fc,#f5d68a)!important;background:#0a1a10!important;border:1px solid color-mix(in srgb,var(--fc,#c9a35a) 55%,transparent)!important;box-shadow:none!important}
html body #collectionDialog .collection-filters button.active{color:#1a1408!important;background:var(--fc,#e2b45a)!important;border-color:transparent!important}
.collection-group{margin-top:16px}
.collection-group h3{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--rc)}
.collection-group h3:after{content:'';flex:1;height:1px;background:linear-gradient(90deg,color-mix(in srgb,var(--rc) 60%,transparent),transparent)}
.set-card{margin-bottom:8px;border-radius:12px;border:1px solid transparent;background:radial-gradient(ellipse at 20% 0,#1c3123,#09130d) padding-box,linear-gradient(145deg,color-mix(in srgb,var(--rc) 70%,transparent),#3a2e14 55%,color-mix(in srgb,var(--rc) 50%,transparent)) border-box;overflow:hidden}
.set-card.done{box-shadow:0 0 14px color-mix(in srgb,var(--rc) 30%,transparent)}
html body #collectionDialog .set-head{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center;width:100%;padding:11px 14px;border:0!important;border-radius:0;background:none!important;box-shadow:none!important;text-align:left;color:inherit;font-family:inherit;cursor:pointer}
html body #collectionDialog .set-head:hover{background:#ffffff08!important}
.set-name{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:#f6eed6}
.set-name small{padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.04em;color:var(--rc);background:#00000040;border:1px solid color-mix(in srgb,var(--rc) 45%,transparent)}
.set-count{font-size:13px;font-weight:800;color:#f3e7c4;font-variant-numeric:tabular-nums}
.set-card.done .set-count{color:#9ff28f}
.set-bar{grid-column:1/-1;height:6px;border-radius:3px;background:#00000066;overflow:hidden}
.set-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,color-mix(in srgb,var(--rc) 60%,#000),var(--rc))}
.set-bonus{grid-column:1/-1;font-size:12px;color:#a99d7c}
.set-bonus b{color:#d9cba2;font-weight:600}
.set-card.done .set-bonus b{color:#9ff28f}
.set-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;padding:0 14px 14px}
.set-items[hidden]{display:none}
.set-item{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 5px;border-radius:10px;border:1px solid color-mix(in srgb,var(--rc) 50%,transparent);background:#07130bcc;text-align:center}
.set-item img{width:46px;height:46px;object-fit:contain;filter:drop-shadow(0 3px 4px #000a)}
.set-item strong{font-size:11px;font-weight:600;line-height:1.15;color:#efe6cd}
.set-item small{font-size:9px;color:#a99d7c}
.set-item.missing img{filter:grayscale(1) brightness(.45)}
.set-item.missing strong{color:#8f8565}
.set-item.owned:after{content:'✓';position:absolute;top:4px;right:7px;font-size:12px;font-weight:800;color:#9ff28f}
.collection-empty{margin:20px 0;text-align:center;font-size:13px}
.collection-toast{position:fixed;left:50%;top:18%;z-index:30;translate:-50% 0;padding:14px 22px;border-radius:14px;border:2px solid var(--rc);background:#0b2015f2;box-shadow:0 0 30px color-mix(in srgb,var(--rc) 50%,transparent);text-align:center;font-family:'Golos Text',sans-serif;color:#f6eed6;pointer-events:none;animation:collection-toast 3.2s ease-in-out forwards}
.collection-toast small{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--rc)}
.collection-toast b{display:block;margin:3px 0;font-size:18px}
@keyframes collection-toast{0%{opacity:0;transform:translateY(-14px) scale(.9)}10%,80%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-10px)}}
@media(max-width:540px){html body #collectionDialog{padding:16px}.collection-total{text-align:left}.set-items{grid-template-columns:repeat(auto-fill,minmax(80px,1fr))}}
`;
document.head.append(style);

// Кнопка — справа от кнопки «Характеристики», на той же высоте.
const statsButton=$('openCharacterStats');
const openButton=document.createElement('button');
openButton.className='feature-button collection-button';openButton.id='openCollection';openButton.type='button';
openButton.setAttribute('aria-label','Коллекция комплектов');openButton.setAttribute('aria-haspopup','dialog');
openButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6Z"/><path d="m9 12 2 2 4-4"/></svg><span class="feature-label">Коллекция комплектов</span>';
statsButton.after(openButton);
function placeButton(){const cs=getComputedStyle(statsButton);openButton.style.left=statsButton.offsetLeft+statsButton.offsetWidth+12+'px';openButton.style.bottom=cs.bottom;}
addEventListener('resize',placeButton);placeButton();

const dialog=document.createElement('dialog');
dialog.id='collectionDialog';dialog.setAttribute('aria-labelledby','collectionTitle');
dialog.innerHTML=`<div class="equipment-heading"><div><div class="talents-eyebrow">КОЛЛЕКЦИЯ</div><h2 id="collectionTitle">Комплекты</h2></div><button id="closeCollection" type="button" aria-label="Закрыть коллекцию">×</button></div>
<div class="collection-summary"><div><small>Собрано комплектов</small><b id="collectionDone">0 / 0</b></div><div class="collection-total" id="collectionTotal"></div></div>
<input id="collectionSearch" class="collection-search" type="search" placeholder="Поиск по комплекту или предмету" aria-label="Поиск комплекта" autocomplete="off">
<div class="collection-filters" id="collectionRarities" aria-label="Редкость"></div>
<div class="collection-filters" id="collectionKinds" aria-label="Тип комплекта"></div>
<div id="collectionList"></div>`;
document.body.append(dialog);

let rarityFilter='all',kindFilter='all';const expanded=new Set();
function filterButtons(box,options,current,onPick){
 box.replaceChildren();
 for(const [value,label,tint] of options){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.classList.toggle('active',value===current);
  button.setAttribute('aria-pressed',String(value===current));if(tint)button.style.setProperty('--fc',tint);
  button.addEventListener('click',()=>{onPick(value);render();});box.append(button);
 }
}
function matches(set,query){
 if(!query)return true;
 return [set.name,...set.items.map(id=>template(id)?.name||'')].some(text=>text.toLowerCase().includes(query));
}
function setCard(set){
 const total=set.items.length,have=progress(set),done=completed.has(set.id);
 const card=document.createElement('div');card.className='set-card'+(done?' done':'');card.style.setProperty('--rc',color(set.rarity));
 const head=document.createElement('button');head.type='button';head.className='set-head';head.setAttribute('aria-expanded',String(expanded.has(set.id)));
 head.innerHTML=`<span class="set-name"></span><span class="set-count">${done?'✓ Собран':have+' / '+total}</span><span class="set-bar"><i style="width:${have/total*100}%"></i></span><span class="set-bonus">Бонус комплекта: <b></b></span>`;
 head.querySelector('.set-name').textContent=set.name;
 const kind=document.createElement('small');kind.textContent=KIND_NAMES[set.kind];head.querySelector('.set-name').append(kind);
 head.querySelector('.set-bonus b').textContent=bonusLines(set.bonus).join(', ')||'будет объявлен позже';
 const list=document.createElement('div');list.className='set-items';list.hidden=!expanded.has(set.id);
 for(const id of set.items){
  const item=template(id),owned=collected.has(id),cell=document.createElement('div');
  cell.className='set-item '+(owned?'owned':'missing');cell.style.setProperty('--rc',color(item?.rarity||set.rarity));
  cell.innerHTML='<img alt=""><strong></strong><small></small>';
  if(item){cell.querySelector('img').src=item.image;cell.querySelector('strong').textContent=item.name;cell.querySelector('small').textContent=slotName(item)+(owned?'':' · не получен');attachItemTooltip(cell,item);}
  else cell.querySelector('strong').textContent='Неизвестный предмет';
  list.append(cell);
 }
 head.addEventListener('click',()=>{if(expanded.has(set.id))expanded.delete(set.id);else expanded.add(set.id);list.hidden=!expanded.has(set.id);head.setAttribute('aria-expanded',String(!list.hidden));hideItemTooltip(true);});
 card.append(head,list);return card;
}
function render(){
 $('collectionDone').textContent=completed.size+' / '+sets.length;
 const bonus=bonusLines(window.setCollectionBonus()),total=$('collectionTotal');total.replaceChildren();
 total.append(bonus.length?'Действующие бонусы:':'Собери комплект, чтобы получить его бонус навсегда.');
 for(const line of bonus){const span=document.createElement('span');span.textContent=line;total.append(span);}
 filterButtons($('collectionRarities'),[['all','Все редкости'],...RANKS.filter(rarity=>sets.some(set=>set.rarity===rarity)).map(rarity=>[rarity,rarityLabel(rarity),color(rarity)])],rarityFilter,value=>rarityFilter=value);
 filterButtons($('collectionKinds'),[['all','Все типы'],...Object.entries(KIND_NAMES)],kindFilter,value=>kindFilter=value);
 const query=$('collectionSearch').value.trim().toLowerCase(),list=$('collectionList');list.replaceChildren();
 const shown=sets.filter(set=>(rarityFilter==='all'||set.rarity===rarityFilter)&&(kindFilter==='all'||set.kind===kindFilter)&&matches(set,query));
 if(!shown.length){const empty=document.createElement('p');empty.className='collection-empty';empty.textContent=sets.length?'Ничего не найдено.':'Комплектов пока нет.';list.append(empty);return;}
 for(const rarity of [...RANKS].reverse()){
  const group=shown.filter(set=>set.rarity===rarity);if(!group.length)continue;
  const section=document.createElement('section');section.className='collection-group';section.style.setProperty('--rc',color(rarity));
  const title=document.createElement('h3');title.textContent=rarityLabel(rarity)+' · '+group.length;section.append(title);
  group.sort((a,b)=>Object.keys(KIND_NAMES).indexOf(a.kind)-Object.keys(KIND_NAMES).indexOf(b.kind)||a.name.localeCompare(b.name,'ru')).forEach(set=>section.append(setCard(set)));
  list.append(section);
 }
}
function announce(fresh){
 if(!settings.animations)return;
 fresh.forEach((set,i)=>setTimeout(()=>{
  const toast=document.createElement('div');toast.className='collection-toast';toast.style.setProperty('--rc',color(set.rarity));
  toast.innerHTML='<small>Комплект собран</small><b></b><span></span>';toast.querySelector('b').textContent=set.name;toast.querySelector('span').textContent=bonusLines(set.bonus).join(', ');
  (document.querySelector('dialog[open]')||document.body).append(toast);setTimeout(()=>toast.remove(),3300);
 },i*900));
}

$('collectionSearch').addEventListener('input',render);
openButton.addEventListener('click',()=>{record();render();dialog.showModal();});
$('closeCollection').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>hideItemTooltip(true));

// Сброс прогресса очищает и коллекцию; «Вернуть прогресс» в течение минуты возвращает её.
let backup=null;
$('confirmReset').addEventListener('click',()=>{backup={until:Date.now()+60000,items:[...collected],sets:[...completed]};collected.clear();completed.clear();save();renderEquipment();});
$('undoReset').addEventListener('click',()=>{if(backup&&Date.now()<backup.until){backup.items.forEach(id=>collected.add(id));backup.sets.forEach(id=>completed.add(id));save();renderEquipment();}backup=null;});

// Уже имеющиеся у игрока предметы сразу попадают в коллекцию.
record();renderEquipment();
})();
