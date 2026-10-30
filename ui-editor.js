// Визуальный редактор интерфейса: F2 или кнопка в админ-панели.
// Правки хранятся как CSS-переопределения (localStorage) и экспортируются готовым CSS.
(()=>{
if(window.IS_PUBLIC_SITE)return; // на опубликованном сайте редактор недоступен
const STORE='uiEditorOverrides',PROPS=[
 ['width','Ширина','px'],['height','Высота','px'],['font-size','Размер шрифта','px'],['padding','Отступы внутри',''],
 ['border-radius','Скругление','px'],['opacity','Прозрачность',''],['z-index','Слой (z-index)',''],
 ['color','Цвет текста','color'],['background','Фон',''],['border','Рамка','']
];
let overrides={},active=false,selected=null,hovered=null,undo=[],drag=null;
try{overrides=JSON.parse(localStorage.getItem(STORE))||{}}catch{overrides={}}

const css=document.createElement('style');css.id='uiEditorOverrides';document.head.append(css);
const ui=document.createElement('style');ui.textContent=`
.uie-layer{position:fixed;inset:0;pointer-events:none;z-index:2147483646;font:12px Manrope,Segoe UI,sans-serif;color:#f2f1e7;margin:0;padding:0;border:0;background:none;max-width:none;max-height:none;width:auto;height:auto;overflow:visible}
.uie-box{position:fixed;pointer-events:none;border:1px dashed #6fc3ff;background:#6fc3ff14;display:none}
.uie-box.sel{border:2px solid #edc77b;background:#edc77b12}
.uie-tag{position:absolute;left:-2px;bottom:100%;margin-bottom:3px;background:#edc77b;color:#211a0d;padding:2px 6px;border-radius:4px;white-space:nowrap;font-weight:700;font-size:11px}
.uie-handle{position:absolute;right:-7px;bottom:-7px;width:12px;height:12px;background:#edc77b;border:2px solid #211a0d;border-radius:3px;pointer-events:auto;cursor:nwse-resize}
.uie-panel{position:fixed;top:12px;right:12px;width:300px;max-height:calc(100vh - 24px);overflow:auto;pointer-events:auto;background:#151d18f2;border:1px solid #697754;border-radius:14px;box-shadow:0 18px 60px #000a;padding:14px}
.uie-panel.left{right:auto;left:12px}
.uie-panel h3{margin:0 0 4px;font-size:14px;display:flex;justify-content:space-between;align-items:center;gap:6px}
.uie-panel h4{margin:14px 0 6px;font-size:11px;letter-spacing:1.5px;color:#edc77b}
.uie-panel p{margin:0 0 8px;color:#a5ada2;line-height:1.45;font-size:11px}
.uie-panel code{display:block;background:#0a110d;border:1px solid #ffffff14;border-radius:6px;padding:6px;font:11px Consolas,monospace;color:#c9e4ff;word-break:break-all;margin-bottom:8px}
.uie-row{display:grid;grid-template-columns:105px 1fr;align-items:center;gap:6px;margin:4px 0}
.uie-row label{color:#c1c8b9}
.uie-panel input,.uie-panel textarea{width:100%;min-width:0;box-sizing:border-box;background:#0a110d;color:#f2f1e7;border:1px solid #3d4a3c;border-radius:6px;padding:5px 6px;font:12px Consolas,monospace}
.uie-panel input[type=color]{padding:1px;height:26px}
.uie-pair{display:flex;gap:4px}.uie-pair input[type=text]{flex:1}.uie-pair input[type=color]{width:34px;flex:none}
.uie-btns{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.uie-panel button{background:#304032;color:#f2f1e7;border:1px solid #697754;border-radius:7px;padding:5px 9px;cursor:pointer;font:600 11px Manrope,Segoe UI,sans-serif}
.uie-panel button:hover{background:#3c5240}.uie-panel button.danger{background:#512e29;border-color:#9d6252}
.uie-panel button.on{background:#cba65d;color:#211a0d;border-color:#edc77b}
.uie-list{display:flex;flex-direction:column;gap:3px;max-height:130px;overflow:auto}
.uie-list button{text-align:left;font:11px Consolas,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.uie-panel textarea{height:120px;resize:vertical;margin-top:6px}
html.uie-on, html.uie-on *{cursor:crosshair!important}
html.uie-on .uie-panel, html.uie-on .uie-panel *{cursor:auto!important}
html.uie-on .uie-panel button{cursor:pointer!important}html.uie-on .uie-handle{cursor:nwse-resize!important}
`;document.head.append(ui);

const layer=document.createElement('div');layer.className='uie-layer';
layer.innerHTML=`<div class="uie-box" data-k="hover"></div><div class="uie-box sel" data-k="sel"><span class="uie-tag"></span><span class="uie-handle" title="Потяни, чтобы изменить размер"></span></div><div class="uie-panel"></div>`;
const hoverBox=layer.querySelector('[data-k=hover]'),selBox=layer.querySelector('[data-k=sel]'),tag=selBox.querySelector('.uie-tag'),handle=selBox.querySelector('.uie-handle'),panel=layer.querySelector('.uie-panel');
const own=el=>el&&layer.contains(el);

// Модальные диалоги делают остальную страницу неактивной, поэтому редактор переезжает в открытый диалог.
function host(){const open=[...document.querySelectorAll('dialog[open]')].filter(d=>d.matches(':modal'));return open.at(-1)||document.body}
function rehost(){if(!active)return;const h=host();if(layer.parentNode!==h)h.append(layer)}

function selectorFor(el){
 if(el.id)return '#'+CSS.escape(el.id);
 const parts=[];let node=el;
 while(node&&node!==document.body&&node!==document.documentElement){
  if(node.id){parts.unshift('#'+CSS.escape(node.id));break}
  let part=node.tagName.toLowerCase();
  const cls=[...node.classList].filter(c=>!c.startsWith('uie-')&&!/^(hit|active|open|show|hidden|ready|disabled|on|off|selected|crit)$/.test(c));
  if(cls.length)part+='.'+cls.map(c=>CSS.escape(c)).join('.');
  const p=node.parentElement;
  if(p){const same=[...p.children].filter(c=>c.matches(part));if(same.length>1)part+=`:nth-child(${[...p.children].indexOf(node)+1})`}
  parts.unshift(part);node=p;
 }
 return parts.join(' > ');
}
function pick(el){
 while(el&&el.closest&&el.closest('svg')&&el.tagName.toLowerCase()!=='svg')el=el.parentElement||el.parentNode;
 if(!el||el===document.documentElement||el===document.body||own(el))return null;
 return el;
}
const label=el=>{const s=selectorFor(el);return s.length>46?'…'+s.slice(-45):s};

function build(){
 css.textContent=Object.entries(overrides).map(([sel,o])=>{
  const d=[];
  if(o.dx||o.dy)d.push(`translate:calc(${o.bx||'0px'} + ${o.dx||0}px) calc(${o.by||'0px'} + ${o.dy||0}px)`);
  if(o.hide)d.push('display:none');
  for(const [p] of PROPS)if(o[p]!==undefined&&o[p]!=='')d.push(`${p}:${o[p]}`);
  return d.length?`${sel}{${d.map(x=>x+'!important').join(';')}}`:'';
 }).filter(Boolean).join('\n');
}
function save(){
 for(const k in overrides)if(!Object.keys(overrides[k]).some(p=>!['bx','by'].includes(p)))delete overrides[k];
 try{localStorage.setItem(STORE,JSON.stringify(overrides))}catch{}
 build();
}
function snapshot(){undo.push(JSON.stringify(overrides));if(undo.length>100)undo.shift()}
function entry(el){
 const sel=selectorFor(el);
 if(!overrides[sel]){
  // Сохраняем исходный translate, чтобы сдвиг не ломал центрирование элемента.
  const t=getComputedStyle(el).translate,[bx='0px',by='0px']=t&&t!=='none'?t.split(' '):[];
  overrides[sel]={bx,by};
 }
 return overrides[sel];
}
function zoomOf(el){return el.currentCSSZoom||1}

function place(box,el){
 if(!el||!el.isConnected){box.style.display='none';return}
 const r=el.getBoundingClientRect();
 Object.assign(box.style,{display:'block',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
}
function tick(){if(!active)return;rehost();place(hoverBox,hovered&&hovered!==selected?hovered:null);place(selBox,selected);requestAnimationFrame(tick)}

function select(el){selected=el;hovered=null;if(el)tag.textContent=label(el);renderPanel()}

function renderPanel(){
 const list=Object.keys(overrides);
 let html=`<h3>Редактор интерфейса <span><button data-a="side" title="Переместить панель">⇆</button> <button data-a="close" title="Закрыть (F2)">×</button></span></h3>`;
 if(!selected){
  html+=`<p>Наведи и кликни по любому элементу игры. Перетаскивай выделенный элемент мышью, угол — меняет размер. Стрелки двигают на 1px (Shift — на 10px), Ctrl+Z — отмена, Esc — снять выделение.</p>`;
 }else{
  const sel=selectorFor(selected),o=overrides[sel]||{},cs=getComputedStyle(selected);
  html+=`<h4>ЭЛЕМЕНТ</h4><code>${esc(sel)}</code><div class="uie-btns"><button data-a="parent">↑ Родитель</button><button data-a="child">↓ Вложенный</button><button data-a="hide" class="${o.hide?'on':''}">${o.hide?'Показать':'Скрыть'}</button><button data-a="reset" class="danger">Сбросить</button></div>`;
  html+=`<h4>ПОЛОЖЕНИЕ</h4><div class="uie-row"><label>Сдвиг X / Y</label><div class="uie-pair"><input type="text" data-move="dx" value="${o.dx||0}"><input type="text" data-move="dy" value="${o.dy||0}"></div></div>`;
  html+=`<h4>СТИЛЬ</h4>`;
  for(const [p,name,kind] of PROPS){
   const cur=o[p]!==undefined?o[p]:'',ph=esc(cs.getPropertyValue(p==='background'?'background-color':p));
   html+=kind==='color'
    ?`<div class="uie-row"><label>${name}</label><div class="uie-pair"><input type="text" data-p="${p}" value="${esc(cur)}" placeholder="${ph}"><input type="color" data-c="${p}" value="${toHex(cur||cs.color)}"></div></div>`
    :`<div class="uie-row"><label>${name}</label><input type="text" data-p="${p}" value="${esc(cur)}" placeholder="${ph}"></div>`;
  }
 }
 html+=`<h4>ИЗМЕНЕНО (${list.length})</h4>`;
 html+=list.length?`<div class="uie-list">${list.map(s=>`<button data-go="${esc(s)}" title="${esc(s)}">${esc(s)}</button>`).join('')}</div>`:`<p>Пока ничего не изменено.</p>`;
 html+=`<div class="uie-btns"><button data-a="undo" ${undo.length?'':'disabled'}>↶ Отменить</button><button data-a="export">Экспорт CSS</button><button data-a="download">Скачать .css</button><button data-a="clear" class="danger">Сбросить всё</button></div><textarea readonly hidden></textarea>`;
 panel.innerHTML=html;
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toHex(c){const m=String(c).match(/\d+(\.\d+)?/g);if(String(c).startsWith('#')&&c.length===7)return c;if(!m||m.length<3)return '#ffffff';return '#'+m.slice(0,3).map(n=>(+n|0).toString(16).padStart(2,'0')).join('')}

panel.addEventListener('input',e=>{
 const t=e.target;if(!selected)return;
 const o=entry(selected);
 if(t.dataset.p){o[t.dataset.p]=t.value.trim();if(!o[t.dataset.p])delete o[t.dataset.p];const c=panel.querySelector(`[data-c="${t.dataset.p}"]`);if(c&&t.value)c.value=toHex(t.value)}
 else if(t.dataset.c){o[t.dataset.c]=t.value;panel.querySelector(`[data-p="${t.dataset.c}"]`).value=t.value}
 else if(t.dataset.move){const v=parseFloat(t.value);if(isNaN(v)||!v)delete o[t.dataset.move];else o[t.dataset.move]=v}
 save();
});
panel.addEventListener('focusin',e=>{if(e.target.matches('input'))snapshot()});
panel.addEventListener('change',e=>{if(e.target.matches('input'))renderList()});
function renderList(){const pos=panel.scrollTop;renderPanel();panel.scrollTop=pos}
panel.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.go){const el=document.querySelector(b.dataset.go);if(el)select(el);else alert('Элемент сейчас не найден на странице (возможно, он в закрытом окне).');return}
 const a=b.dataset.a,sel=selected&&selectorFor(selected);
 if(a==='close')toggle(false);
 else if(a==='side')panel.classList.toggle('left');
 else if(a==='parent'&&selected){const p=pick(selected.parentElement);if(p)select(p)}
 else if(a==='child'&&selected){const c=[...selected.children].find(c=>!own(c));if(c)select(pick(c)||c)}
 else if(a==='hide'&&selected){snapshot();const o=entry(selected);o.hide?delete o.hide:o.hide=true;save();renderList()}
 else if(a==='reset'&&selected){snapshot();delete overrides[sel];save();renderList()}
 else if(a==='undo'&&undo.length){overrides=JSON.parse(undo.pop());save();renderList()}
 else if(a==='clear'&&Object.keys(overrides).length&&confirm('Сбросить все изменения интерфейса?')){snapshot();overrides={};save();renderList()}
 else if(a==='export'){const ta=panel.querySelector('textarea');ta.hidden=false;ta.value=css.textContent||'/* Изменений нет */';ta.select();navigator.clipboard?.writeText(ta.value).then(()=>b.textContent='Скопировано ✓',()=>{})}
 else if(a==='download'){const url=URL.createObjectURL(new Blob([css.textContent],{type:'text/css'})),l=document.createElement('a');l.href=url;l.download='ui-overrides.css';l.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
});

// Пока редактор включён, клики не доходят до игры.
function block(e){if(active&&!own(e.target)){e.preventDefault();e.stopImmediatePropagation()}}
for(const t of ['click','dblclick','mousedown','mouseup','contextmenu'])addEventListener(t,block,true);
addEventListener('pointermove',e=>{
 if(!active)return;
 if(drag){
  const z=zoomOf(drag.el),dx=(e.clientX-drag.x)/z,dy=(e.clientY-drag.y)/z,o=entry(drag.el);
  if(drag.mode==='move'){o.dx=Math.round(drag.ox+dx);o.dy=Math.round(drag.oy+dy);if(!o.dx)delete o.dx;if(!o.dy)delete o.dy}
  else{o.width=Math.max(4,Math.round(drag.w+dx))+'px';o.height=Math.max(4,Math.round(drag.h+dy))+'px'}
  drag.moved=true;save();return;
 }
 if(!own(e.target))hovered=pick(document.elementFromPoint(e.clientX,e.clientY));
},true);
addEventListener('pointerdown',e=>{
 if(!active)return;
 if(e.target===handle&&selected){
  e.preventDefault();e.stopImmediatePropagation();snapshot();
  const r=selected.getBoundingClientRect(),z=zoomOf(selected);
  drag={el:selected,mode:'size',x:e.clientX,y:e.clientY,w:r.width/z,h:r.height/z};return;
 }
 if(own(e.target))return;
 e.preventDefault();e.stopImmediatePropagation();
 const el=pick(e.target);if(!el)return;
 if(el!==selected)select(el);
 snapshot();const o=overrides[selectorFor(el)]||{};
 drag={el,mode:'move',x:e.clientX,y:e.clientY,ox:o.dx||0,oy:o.dy||0};
},true);
addEventListener('pointerup',()=>{if(drag){if(!drag.moved)undo.pop();drag=null;renderList()}},true);

addEventListener('keydown',e=>{
 if(e.code==='F2'){e.preventDefault();toggle();return}
 if(!active)return;
 const typing=e.target.matches?.('input,textarea,select');
 if(e.key==='Escape'&&selected){e.preventDefault();select(null);return}
 if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'&&!typing){e.preventDefault();if(undo.length){overrides=JSON.parse(undo.pop());save();renderList()}return}
 if(typing)return;
 const step=e.shiftKey?10:1,dir={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];
 if(dir&&selected){e.preventDefault();snapshot();const o=entry(selected);o.dx=(o.dx||0)+dir[0];o.dy=(o.dy||0)+dir[1];if(!o.dx)delete o.dx;if(!o.dy)delete o.dy;save();renderList();return}
 // Пробел и другие игровые клавиши не срабатывают в режиме редактора.
 e.stopImmediatePropagation();if(e.code==='Space')e.preventDefault();
},true);

function toggle(on=!active){
 active=on;document.documentElement.classList.toggle('uie-on',on);
 if(on){rehost();renderPanel();requestAnimationFrame(tick)}else{layer.remove();selected=hovered=drag=null}
}
window.uiEditor={toggle};
build();
const openAdmin=document.getElementById('adminPanel');
if(openAdmin){const b=document.createElement('button');b.type='button';b.textContent='🎨 Редактор интерфейса (F2)';b.style.cssText='width:100%;margin-top:14px';b.addEventListener('click',()=>{openAdmin.close();toggle(true)});openAdmin.append(b)}
if(new URLSearchParams(location.search).has('edit'))toggle(true);
})();
