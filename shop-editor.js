// Редактор магазина: вкладки, товары, цены, скидки, остатки и эффекты покупки. F3 или кнопка в админ-панели.
// Каждая правка сразу действует в игре (черновик в localStorage); «Сохранить в файл» записывает shop-catalog.js через dev-server.py.
(()=>{
if(window.IS_PUBLIC_SITE)return; // на опубликованном сайте редактор недоступен
const api=window.shopApi;if(!api)return;
const clone=value=>JSON.parse(JSON.stringify(value));
const uid=prefix=>prefix+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const esc=text=>String(text??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const BADGES=['Новинка','Хит','Выгодно','Редкое'];
let catalog,tabId=null,itemId=null,dirty=false;

function normalize(data){
 const tabs=Array.isArray(data?.tabs)?data.tabs:[];
 return {version:1,tabs:tabs.map(tab=>({id:String(tab.id||uid('tab')),title:String(tab.title??'Новая вкладка'),icon:String(tab.icon??'star'),
  items:(Array.isArray(tab.items)?tab.items:[]).map(item=>({id:String(item.id||uid('item')),name:String(item.name??'Новый товар'),desc:String(item.desc??''),icon:String(item.icon??tab.icon??'star'),
   price:item.price===''||item.price==null?null:Math.max(0,Number(item.price)||0),discount:Math.min(95,Math.max(0,Math.round(Number(item.discount)||0))),
   stock:item.stock===''||item.stock==null?null:Math.max(0,Math.round(Number(item.stock)||0)),badge:String(item.badge??''),hidden:item.hidden===true,
   effect:{type:api.effects[item.effect?.type]?item.effect.type:'none',amount:Math.max(0,Number(item.effect?.amount)||0),...(item.effect?.itemId?{itemId:String(item.effect.itemId)}:{})}}))}))};
}
// Стартовая цена товара из предмета игры — по редкости, потом её можно поменять.
const RARITY_PRICES={Common:5,Uncommon:15,Rare:40,Epic:100,Legendary:250,Divine:600};
function productFromGameItem(game){return {id:uid('item'),name:'',desc:'',icon:'auto',price:RARITY_PRICES[game.rarity]??null,discount:0,stock:null,badge:'',hidden:false,effect:{type:'gameItem',amount:1,itemId:game.id}};}
function hasDraft(){try{return !!localStorage.getItem(api.draftKey);}catch{return false;}}
function fileText(){return '// Каталог магазина. Этот файл перезаписывает редактор магазина (F3 или кнопка в админ-панели).\nwindow.SHOP_CATALOG='+JSON.stringify(catalog,null,1)+';\n';}
const tab=()=>catalog.tabs.find(t=>t.id===tabId);
const item=()=>tab()?.items.find(i=>i.id===itemId);

const style=document.createElement('style');
style.textContent=`
#shopEditor{width:min(1180px,calc(100% - 24px));max-height:92dvh;overflow:auto}
.se-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:14px}
.se-state{font-size:12px;font-weight:700;padding:6px 10px;border-radius:9px;background:#061214;border:1px solid #7fe6c222}
.se-state.dirty{color:#edc77b;border-color:#edc77b44}.se-state.ok{color:#9ff28f}.se-state.warn{color:#ff9ab0;border-color:#ff6f9a44}
.se-actions{display:flex;flex-wrap:wrap;gap:6px}
html body #shopEditor button{padding:7px 11px;font-size:12px}
html body #shopEditor button.se-primary{color:#062018!important;border:0!important;background:linear-gradient(135deg,#d4ff7a,#5fe6b6)!important;box-shadow:0 0 8px #9ff28f44}
.se-cols{display:grid;grid-template-columns:240px minmax(0,1fr) 340px;gap:14px;align-items:start}
@media(max-width:960px){.se-cols{grid-template-columns:1fr}}
.se-col{padding:12px;border-radius:14px;background:#06121499;border:1px solid #7fe6c222}
.se-col h3{margin:0 0 10px;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#8ff2c9;display:flex;gap:8px}
.se-col h3 span{color:#8fb8aa;letter-spacing:0;text-transform:none;font-weight:600}
.se-list{display:flex;flex-direction:column;gap:5px;margin-bottom:8px;max-height:46dvh;overflow:auto}
.se-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:10px;border:1px solid transparent;cursor:pointer;background:#0a1c1e}
.se-row:hover{border-color:#7fe6c244}.se-row.active{border-color:#9ff28f;background:#0e2a2a}
.se-row.hidden-item{opacity:.5}
.se-row-icon{display:grid;place-items:center;width:28px;height:28px;flex:none}.se-row-icon svg,.se-row-icon img{width:24px;height:24px;object-fit:contain}.se-row-icon.shop-icon-text{font-size:18px}
.se-row-name{flex:1;min-width:0;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.se-row small{font-size:11px;color:#edc77b;white-space:nowrap}
.se-tools{display:flex;gap:2px}
html body #shopEditor .se-tools button{width:24px;height:24px;padding:0;font-size:11px;border-radius:7px}
.se-form{display:flex;flex-direction:column;gap:10px}
.se-form[data-form=tab]{margin-top:14px;padding-top:12px;border-top:1px solid #7fe6c222}
.se-field{display:flex;flex-direction:column;gap:5px;font-size:11.5px;font-weight:700;color:#8fb8aa}
.se-field input,.se-field select,.se-field textarea{font:600 13px Manrope,sans-serif;padding:8px 10px}
.se-field textarea{min-height:60px;resize:vertical}
.se-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.se-hint{font-size:10.5px;font-weight:600;color:#6f948a}
.se-icons{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
html body #shopEditor .se-icons button{height:36px;padding:3px;display:grid;place-items:center}
html body #shopEditor .se-icons button.on{border-color:#9ff28f!important;background:#123636!important}
.se-icons svg{width:24px;height:24px}
.se-chips{display:flex;flex-wrap:wrap;gap:4px}
html body #shopEditor .se-chips button{padding:3px 9px;font-size:11px;border-radius:999px}
.se-check{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:#e4f6ee}
.se-check input{width:18px;height:18px;accent-color:#5fe6b6}
.se-empty{color:#8fb8aa;font-size:12px;text-align:center;padding:16px 4px}
.se-add{display:flex;flex-wrap:wrap;gap:6px}
.se-row.missing .se-row-name{color:#ff9ab0}
html body #shopEditor .se-icons button.se-auto{grid-column:span 2;font-size:11px;font-weight:800}
.se-game-card{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;background:#0a1c1e;border:1px solid #7fe6c233}
.se-game-card img{width:42px;height:42px;object-fit:contain}
.se-game-card div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.se-game-card b{font-size:13px;color:#e4f6ee}.se-game-card small{font-size:11px;color:#8fb8aa}
.se-picker{position:fixed;inset:0;z-index:20;display:grid;place-items:center;background:#02080acc;padding:16px}
.se-picker-panel{width:min(820px,100%);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:16px;border:1px solid #7fe6c255;background:linear-gradient(160deg,#0c1d22,#07120f);box-shadow:0 20px 60px #000c}
.se-picker-head{display:flex;flex-direction:column;gap:3px}.se-picker-head b{font-size:16px;color:#f0fff8}
.se-picker-filters{display:grid;grid-template-columns:1fr 180px;gap:8px}
.se-picker-filters input,.se-picker-filters select{font:600 13px Manrope,sans-serif;padding:8px 10px}
html body #shopEditor .se-chips button.on{border-color:#9ff28f!important;background:#123636!important}
.se-picker-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;overflow:auto;min-height:120px;padding:2px}
html body #shopEditor .se-pick{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px!important;border-color:color-mix(in srgb,var(--rarity) 45%,transparent)!important;text-align:center}
html body #shopEditor .se-pick.on{border-color:#9ff28f!important;background:#123636!important;box-shadow:0 0 0 2px #9ff28f55}
.se-pick img{width:46px;height:46px;object-fit:contain}
.se-pick b{font-size:11.5px;line-height:1.25}.se-pick small{font-size:10px;color:var(--rarity)}
.se-pick em{font-size:9.5px;font-style:normal;color:#edc77b}
.se-picker-foot{display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:flex-end}
.se-picker-foot [data-p=info]{margin-right:auto}
@media(max-width:600px){.se-picker-filters{grid-template-columns:1fr}}
`;
document.head.append(style);

const dialog=document.createElement('dialog');dialog.id='shopEditor';dialog.setAttribute('aria-labelledby','shopEditorTitle');
dialog.innerHTML=`<div class="equipment-heading"><div><div class="talents-eyebrow">ИНСТРУМЕНТ</div><h2 id="shopEditorTitle">Редактор магазина</h2></div><button type="button" data-a="close" aria-label="Закрыть редактор">×</button></div>
<div class="se-bar"><span class="se-state"></span><div class="se-actions"><button type="button" data-a="preview">Открыть магазин</button><button type="button" data-a="save" class="se-primary">Сохранить в файл</button><button type="button" data-a="revert">Отменить изменения</button><button type="button" data-a="export">Экспорт JSON</button><button type="button" data-a="import">Импорт JSON</button><button type="button" data-a="resetBuys">Сбросить покупки</button></div></div>
<div class="se-cols"><section class="se-col"><h3>Вкладки</h3><div class="se-list" data-list="tabs"></div><button type="button" data-a="addTab">+ Вкладка</button><div class="se-form" data-form="tab"></div></section>
<section class="se-col"><h3>Товары <span data-count></span></h3><div class="se-list" data-list="items"></div><div class="se-add"><button type="button" data-a="addItem">+ Товар</button><button type="button" data-a="addGameItems">+ Из предметов игры</button></div></section>
<section class="se-col"><h3>Товар</h3><div class="se-form" data-form="item"></div></section></div>
<input type="file" accept=".json,application/json" hidden>`;
document.body.append(dialog);
const $q=selector=>dialog.querySelector(selector);
// Пробел и другие клавиши в полях редактора не должны запускать атаку.
dialog.addEventListener('keydown',event=>event.stopPropagation());

function setState(text,kind){const el=$q('.se-state');el.textContent=text;el.className='se-state '+kind;}
function showState(){setState(dirty?'Есть изменения, не сохранённые в файл (в игре уже действуют)':'Всё сохранено в shop-catalog.js',dirty?'dirty':'ok');}
function commit(){try{localStorage.setItem(api.draftKey,JSON.stringify(catalog));}catch{}dirty=true;api.refresh();renderLists();showState();}

function priceLabel(entry){if(entry.price==null)return 'скоро';const final=Number((entry.price*(1-entry.discount/100)).toFixed(2));return '◉ '+final+(entry.discount?' (−'+entry.discount+'%)':'');}
function row(entry,active,tools,extra=''){
 const isItem=entry.items===undefined,missing=isItem&&entry.effect.type==='gameItem'&&!api.gameItem(entry);
 const el=document.createElement('div');el.className='se-row'+(active?' active':'')+(entry.hidden?' hidden-item':'')+(missing?' missing':'');el.dataset.id=entry.id;
 el.append(api.iconElement(isItem?api.itemIcon(entry):entry.icon,'se-row-icon'));
 el.insertAdjacentHTML('beforeend',`<span class="se-row-name">${esc(isItem?api.itemName(entry):entry.title)}${missing?' ⚠':''}</span>${extra}<span class="se-tools">${tools}</span>`);
 return el;
}
const TOOLS_TAB='<button type="button" data-move="-1" title="Выше">↑</button><button type="button" data-move="1" title="Ниже">↓</button><button type="button" data-del title="Удалить">✕</button>';
const TOOLS_ITEM='<button type="button" data-move="-1" title="Выше">↑</button><button type="button" data-move="1" title="Ниже">↓</button><button type="button" data-dup title="Копия">⧉</button><button type="button" data-del title="Удалить">✕</button>';
function renderLists(){
 if(!tab())tabId=catalog.tabs[0]?.id??null;
 if(!item())itemId=tab()?.items[0]?.id??null;
 const tabsList=$q('[data-list=tabs]');tabsList.replaceChildren(...catalog.tabs.map(t=>row(t,t.id===tabId,TOOLS_TAB,`<small>${t.items.length}</small>`)));
 if(!catalog.tabs.length)tabsList.innerHTML='<p class="se-empty">Вкладок нет — добавь первую.</p>';
 const items=tab()?.items||[];$q('[data-count]').textContent=tab()?'· '+tab().title:'';
 const itemsList=$q('[data-list=items]');itemsList.replaceChildren(...items.map(i=>row(i,i.id===itemId,TOOLS_ITEM,`<small>${priceLabel(i)}</small>`)));
 if(!items.length)itemsList.innerHTML=`<p class="se-empty">${tab()?'В этой вкладке пока нет товаров.':'Сначала выбери вкладку.'}</p>`;
 $q('[data-a=addItem]').disabled=$q('[data-a=addGameItems]').disabled=!tab();
}

function iconPicker(current,onPick,allowAuto=false){
 const wrap=document.createElement('div');wrap.className='se-field';wrap.innerHTML='<span>Иконка</span>';
 const grid=document.createElement('div');grid.className='se-icons';
 if(allowAuto){const b=document.createElement('button');b.type='button';b.title='Картинка предмета из игры';b.textContent='Авто';b.className='se-auto'+(current==='auto'?' on':'');b.addEventListener('click',()=>{onPick('auto');grid.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));custom.value='';});grid.append(b);}
 for(const key of Object.keys(api.icons)){const b=document.createElement('button');b.type='button';b.title=key;b.innerHTML=api.icons[key];b.classList.toggle('on',key===current);b.addEventListener('click',()=>{onPick(key);grid.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));custom.value='';});grid.append(b);}
 const custom=document.createElement('input');custom.placeholder='или эмодзи / путь assets/…';custom.value=api.icons[current]||current==='auto'?'':current;
 custom.addEventListener('input',()=>{if(!custom.value.trim())return;onPick(custom.value.trim());grid.querySelectorAll('button').forEach(x=>x.classList.remove('on'));});
 wrap.append(grid,custom);return wrap;
}
function field(label,html,hint=''){const wrap=document.createElement('label');wrap.className='se-field';wrap.innerHTML=`<span>${label}</span>${html}${hint?`<span class="se-hint">${hint}</span>`:''}`;return wrap;}

function renderTabForm(){
 const form=$q('[data-form=tab]'),t=tab();form.replaceChildren();if(!t)return;
 const title=field('Название вкладки',`<input value="${esc(t.title)}" maxlength="30">`);
 title.querySelector('input').addEventListener('input',e=>{t.title=e.target.value;commit();$q('[data-count]').textContent='· '+t.title;});
 form.append(title,iconPicker(t.icon,key=>{t.icon=key;commit();}));
}
function renderItemForm(){
 const form=$q('[data-form=item]'),i=item(),t=tab();form.replaceChildren();
 if(!i){form.innerHTML='<p class="se-empty">Выбери товар слева или добавь новый.</p>';return;}
 const effectOptions=Object.entries(api.effects).map(([key,e])=>`<option value="${key}" ${key===i.effect.type?'selected':''}>${esc(e.label)}</option>`).join('');
 const tabOptions=catalog.tabs.map(x=>`<option value="${x.id}" ${x.id===t.id?'selected':''}>${esc(x.title)}</option>`).join('');
 const game=api.gameItem(i),isGame=i.effect.type==='gameItem';
 form.append(
  field('Название',`<input data-f="name" value="${esc(i.name)}" maxlength="40" placeholder="${esc(game?.name||'')}">`,isGame?'Пусто — название предмета из игры':''),
  field('Описание',`<textarea data-f="desc" maxlength="160" placeholder="Пусто — покажется описание эффекта">${esc(i.desc)}</textarea>`),
  iconPicker(i.icon,key=>{i.icon=key;commit();},isGame));
 const prices=document.createElement('div');prices.className='se-pair';
 prices.append(field('Цена, золото',`<input data-f="price" type="number" min="0" step="0.01" value="${i.price??''}" placeholder="скоро">`,'Пусто — «Скоро»'),
  field('Скидка, %',`<input data-f="discount" type="number" min="0" max="95" step="1" value="${i.discount||''}" placeholder="0">`));
 const stock=document.createElement('div');stock.className='se-pair';
 stock.append(field('В наличии, шт.',`<input data-f="stock" type="number" min="0" step="1" value="${i.stock??''}" placeholder="∞">`,'Пусто — без ограничений'),
  field('Куплено игроком',`<button type="button" data-a="resetItemBuys">${api.purchases(i.id)} · сбросить</button>`));
 const badge=field('Метка на карточке',`<input data-f="badge" value="${esc(i.badge)}" maxlength="14" placeholder="без метки"><span class="se-chips">${BADGES.map(b=>`<button type="button" data-badge="${b}">${b}</button>`).join('')}<button type="button" data-badge="">Убрать</button></span>`);
 const effect=document.createElement('div');effect.className='se-pair';
 effect.append(field('Эффект покупки',`<select data-f="effectType">${effectOptions}</select>`),field(isGame?'Количество, шт.':'Сила эффекта',`<input data-f="effectAmount" type="number" min="0" step="1" value="${i.effect.amount||''}" ${api.effects[i.effect.type].amount?'':'disabled'} placeholder="${isGame?'1':'—'}">`));
 const hidden=document.createElement('label');hidden.className='se-check';hidden.innerHTML=`<input type="checkbox" data-f="hidden" ${i.hidden?'checked':''}> Скрыть товар из магазина`;
 form.append(effect);
 if(isGame){
  const pick=document.createElement('div');pick.className='se-field';pick.innerHTML='<span>Предмет из игры</span>';
  const card=document.createElement('div');card.className='se-game-card';
  card.innerHTML=game?`<img src="${esc(game.image)}" alt=""><div><b>${esc(game.name)}</b><small style="color:${api.rarityColor(game.rarity)}">${esc(api.rarityLabel(game.rarity))} · ${esc(api.slotLabel(game.slot))}</small></div>`
   :`<div><b>${i.effect.itemId?'Предмет «'+esc(i.effect.itemId)+'» не найден в игре':'Предмет не выбран'}</b><small>Выбери предмет — покупатель получит его в инвентарь</small></div>`;
  const choose=document.createElement('button');choose.type='button';choose.textContent=game?'Сменить':'Выбрать';
  choose.addEventListener('click',()=>openPicker({multi:false,selected:i.effect.itemId,onDone:([id])=>{i.effect.itemId=id;if(!i.effect.amount)i.effect.amount=1;commit();renderItemForm();}}));
  card.append(choose);pick.append(card);form.append(pick);
 }
 form.append(prices,stock,badge,field('Раздел',`<select data-f="tab">${tabOptions}</select>`),hidden);
}

// Окно выбора предметов игры: поиск, фильтры по редкости и слоту, одиночный или множественный выбор.
function openPicker({multi,selected,onDone}){
 const all=api.gameItems(),chosen=new Set(selected?[selected]:[]),inTab=new Set((tab()?.items||[]).map(x=>x.effect.itemId).filter(Boolean));
 let query='',rarity='',slot='';
 const slots=[...new Set(all.map(g=>g.slot))];
 const box=document.createElement('div');box.className='se-picker';
 box.innerHTML=`<div class="se-picker-panel"><div class="se-picker-head"><b>${multi?'Добавить предметы из игры':'Выбрать предмет из игры'}</b><span class="se-hint">Предметов в игре: ${all.length}. Новые предметы появятся здесь сами.</span></div>
 <div class="se-picker-filters"><input type="search" data-p="q" placeholder="Поиск по названию"><select data-p="slot"><option value="">Все слоты</option>${slots.map(s=>`<option value="${esc(s)}">${esc(api.slotLabel(s))}</option>`).join('')}</select></div>
 <div class="se-chips" data-p="rarity">${['',...api.rarities].map(r=>`<button type="button" data-r="${r}" class="${r?'':'on'}" ${r?`style="color:${api.rarityColor(r)}"`:''}>${r?esc(api.rarityLabel(r)):'Все редкости'}</button>`).join('')}</div>
 <div class="se-picker-grid"></div>
 <div class="se-picker-foot"><span class="se-hint" data-p="info"></span>${multi?'<button type="button" data-p="all">Выбрать все найденные</button>':''}<button type="button" data-p="cancel">Отмена</button><button type="button" class="se-primary" data-p="ok"></button></div></div>`;
 const grid=box.querySelector('.se-picker-grid'),ok=box.querySelector('[data-p=ok]');
 const visible=()=>all.filter(g=>(!rarity||g.rarity===rarity)&&(!slot||g.slot===slot)&&g.name.toLowerCase().includes(query));
 function draw(){
  const list=visible();
  grid.replaceChildren(...list.map(g=>{const b=document.createElement('button');b.type='button';b.className='se-pick'+(chosen.has(g.id)?' on':'');b.dataset.id=g.id;b.style.setProperty('--rarity',api.rarityColor(g.rarity));
   b.innerHTML=`<img src="${esc(g.image)}" alt=""><b>${esc(g.name)}</b><small>${esc(api.rarityLabel(g.rarity))} · ${esc(api.slotLabel(g.slot))}</small>${inTab.has(g.id)?'<em>уже в этой вкладке</em>':''}`;return b;}));
  if(!list.length)grid.innerHTML='<p class="se-empty">Ничего не найдено</p>';
  box.querySelector('[data-p=info]').textContent='Найдено: '+list.length+(multi?' · выбрано: '+chosen.size:'');
  ok.textContent=multi?'Добавить ('+chosen.size+')':'Выбрать';ok.disabled=!chosen.size;
 }
 const close=()=>{box.remove();dialog.removeEventListener('cancel',onCancel);};
 const onCancel=event=>{event.preventDefault();close();};
 dialog.addEventListener('cancel',onCancel);
 box.addEventListener('input',event=>{if(event.target.dataset.p==='q'){query=event.target.value.trim().toLowerCase();draw();}event.stopPropagation();});
 box.addEventListener('change',event=>{if(event.target.dataset.p==='slot'){slot=event.target.value;draw();}event.stopPropagation();});
 box.addEventListener('click',event=>{
  event.stopPropagation();const b=event.target.closest('button');if(!b)return;
  if(b.dataset.r!==undefined){rarity=b.dataset.r;box.querySelectorAll('[data-r]').forEach(x=>x.classList.toggle('on',x===b));draw();}
  else if(b.classList.contains('se-pick')){if(!multi)chosen.clear();chosen.has(b.dataset.id)?chosen.delete(b.dataset.id):chosen.add(b.dataset.id);draw();}
  else if(b.dataset.p==='all'){visible().forEach(g=>chosen.add(g.id));draw();}
  else if(b.dataset.p==='cancel')close();
  else if(b.dataset.p==='ok'&&chosen.size){const ids=all.filter(g=>chosen.has(g.id)).map(g=>g.id);close();onDone(ids);}
 });
 dialog.append(box);draw();box.querySelector('[data-p=q]').focus();
}
dialog.addEventListener('input',event=>{
 const f=event.target.dataset?.f,i=item();if(!f||!i)return;const value=event.target.value;
 if(f==='name'||f==='desc'||f==='badge')i[f]=value;
 else if(f==='price')i.price=value===''?null:Math.max(0,Number(value)||0);
 else if(f==='discount')i.discount=Math.min(95,Math.max(0,Math.round(Number(value)||0)));
 else if(f==='stock')i.stock=value===''?null:Math.max(0,Math.round(Number(value)||0));
 else if(f==='effectAmount')i.effect.amount=Math.max(0,Number(value)||0);
 else if(f==='hidden')i.hidden=event.target.checked;
 else return;
 commit();
});
dialog.addEventListener('change',event=>{
 const f=event.target.dataset?.f,i=item();if(!i)return;
 if(f==='effectType'){i.effect.type=event.target.value;if(i.effect.type==='gameItem'){if(!i.effect.amount)i.effect.amount=1;if(!api.icons[i.icon]||i.icon==='star')i.icon='auto';}commit();renderItemForm();if(i.effect.type==='gameItem'&&!i.effect.itemId)dialog.querySelector('.se-game-card button')?.click();}
 if(f==='tab'&&event.target.value!==tabId){const from=tab(),to=catalog.tabs.find(x=>x.id===event.target.value);from.items.splice(from.items.indexOf(i),1);to.items.push(i);tabId=to.id;commit();renderAll();}
});

function move(list,id,step){const index=list.findIndex(x=>x.id===id),next=index+step;if(index<0||next<0||next>=list.length)return;[list[index],list[next]]=[list[next],list[index]];}
dialog.addEventListener('click',async event=>{
 const button=event.target.closest('button'),rowEl=event.target.closest('.se-row');
 if(rowEl&&!button){const inTabs=rowEl.parentElement.dataset.list==='tabs';if(inTabs){tabId=rowEl.dataset.id;itemId=null;}else itemId=rowEl.dataset.id;renderAll();return;}
 if(!button)return;
 if(rowEl){
  const inTabs=rowEl.parentElement.dataset.list==='tabs',list=inTabs?catalog.tabs:tab().items,id=rowEl.dataset.id;
  if(button.dataset.move){move(list,id,Number(button.dataset.move));commit();return;}
  if(button.hasAttribute('data-dup')){const source=list.find(x=>x.id===id),copy={...clone(source),id:uid('item'),name:source.name+' (копия)'};list.splice(list.indexOf(source)+1,0,copy);itemId=copy.id;commit();renderAll();return;}
  if(button.hasAttribute('data-del')){const target=list.find(x=>x.id===id);if(inTabs&&target.items.length&&!await gameConfirm({title:'Удалить вкладку?',text:`Вкладка «${target.title}» удалится вместе с товарами (${target.items.length}).`,ok:'Удалить'}))return;if(!inTabs&&!await gameConfirm({title:'Удалить товар?',text:`Товар «${target.name}» пропадёт из магазина.`,ok:'Удалить'}))return;list.splice(list.indexOf(target),1);commit();renderAll();return;}
 }
 if(button.dataset.badge!==undefined){const i=item();i.badge=button.dataset.badge;$q('[data-f=badge]').value=i.badge;commit();return;}
 switch(button.dataset.a){
  case 'close':dialog.close();break;
  case 'addTab':{const t={id:uid('tab'),title:'Новая вкладка',icon:'star',items:[]};catalog.tabs.push(t);tabId=t.id;itemId=null;commit();renderAll();$q('[data-form=tab] input')?.select();break;}
  case 'addItem':{const t=tab();if(!t)break;const i={id:uid('item'),name:'Новый товар',desc:'',icon:t.icon,price:null,discount:0,stock:null,badge:'',hidden:false,effect:{type:'none',amount:0}};t.items.push(i);itemId=i.id;commit();renderAll();$q('[data-f=name]')?.select();break;}
  case 'addGameItems':openPicker({multi:true,onDone:ids=>{const t=tab();if(!t)return;const games=api.gameItems();for(const id of ids)t.items.push(productFromGameItem(games.find(g=>g.id===id)));itemId=t.items.at(-1).id;commit();renderAll();setState('Добавлено товаров: '+ids.length+' · цены выставлены по редкости','dirty');}});break;
  case 'preview':api.open();break;
  case 'save':saveFile();break;
  case 'revert':if(dirty&&!await gameConfirm({title:'Отменить изменения каталога?',text:'Все правки пропадут, вернётся каталог из файла.',ok:'Отменить правки'}))break;try{localStorage.removeItem(api.draftKey);}catch{}catalog=normalize(window.SHOP_CATALOG);dirty=false;api.refresh();renderAll();break;
  case 'export':download('shop-catalog.json',JSON.stringify(catalog,null,1),'application/json');break;
  case 'import':$q('input[type=file]').click();break;
  case 'resetBuys':if(await gameConfirm({title:'Сбросить счётчики покупок?',text:'Счётчики покупок всех товаров обнулятся.',ok:'Сбросить'})){api.resetPurchases();renderItemForm();}break;
  case 'resetItemBuys':api.resetPurchases(itemId);renderItemForm();break;
 }
});
$q('input[type=file]').addEventListener('change',async event=>{
 const file=event.target.files[0];event.target.value='';if(!file)return;
 try{const data=JSON.parse(await file.text());if(!Array.isArray(data.tabs))throw 0;catalog=normalize(data);tabId=itemId=null;commit();renderAll();setState('Импортировано: '+file.name,'dirty');}
 catch{setState('Не удалось прочитать файл — нужен JSON, экспортированный редактором','warn');}
});
function download(name,text,type='text/javascript'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function saveFile(){
 try{
  const response=await fetch('/api/shop-catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(catalog)});
  if(!response.ok)throw new Error(response.status);
  window.SHOP_CATALOG=clone(catalog);try{localStorage.removeItem(api.draftKey);}catch{}dirty=false;showState();
 }catch{
  download('shop-catalog.js',fileText());
  setState('Сервер сохранения не запущен: скачан shop-catalog.js — положи его в папку игры. До этого правки действуют из браузера.','warn');
 }
}
function renderAll(){renderLists();renderTabForm();renderItemForm();showState();}
function open(){catalog=normalize(api.catalog());dirty=hasDraft();renderAll();if(!dialog.open)dialog.showModal();}
addEventListener('keydown',event=>{if(event.code==='F3'){event.preventDefault();dialog.open?dialog.close():open();}});
const admin=document.getElementById('adminPanel');
if(admin){const b=document.createElement('button');b.type='button';b.textContent='🛒 Редактор магазина (F3)';b.style.cssText='width:100%;margin-top:10px';b.addEventListener('click',()=>{admin.close();open();});admin.append(b);}
window.shopEditor={open};
})();
