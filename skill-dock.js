// Раскладка навыков: 6 слотов наверху окна «Древо талантов», навыки занимают их перетаскиванием мышью.
// Панель в бою и клавиши 1–6 повторяют эти слоты. Навык вне слотов лежит в скрытом #skillStock:
// кнопка остаётся в документе, поэтому код навыков продолжает находить её через $().
(()=>{
const KEY='forest-frontier-skillbar-v1',SLOTS=6,UNDO_MS=60000;
const SKILLS={
 rapid:{button:'rapidSkill',icon:'rapidTreeIcon',name:'Скоростная атака',unlocked:()=>rapidUnlocked,use:()=>useRapid()},
 power:{button:'powerSkill',icon:'powerTreeIcon',name:'Мощный удар',unlocked:()=>powerUnlocked,use:()=>usePower()},
 aim:{button:'aimSkill',icon:'aimTreeIcon',name:'Меткий выстрел',unlocked:()=>aimUnlocked,use:()=>useAim()},
 cut:{button:'cutSkill',icon:'cutTreeIcon',name:'Точный разрез',unlocked:()=>!!window.cutApi?.unlocked(),use:()=>window.cutApi?.use()},
 spin:{button:'spinSkill',icon:'spinTreeIcon',name:'Вихрь',unlocked:()=>!!window.spinApi?.unlocked(),use:()=>window.spinApi?.toggle()},
 phantom:{button:'phantomSkill',icon:'phantomTreeIcon',name:'Фантомный клинок',unlocked:()=>!!window.phantomApi?.unlocked(),use:()=>window.phantomApi?.toggle()},
 powerShot:{button:'powerShotSkill',icon:'powerShotTreeIcon',name:'Теневой обстрел',unlocked:()=>!!window.powerShotApi?.unlocked(),use:()=>window.powerShotApi?.use()},
 rage:{button:'rageSkill',icon:'rageTreeIcon',name:'Неистовая ярость',unlocked:()=>!!window.rageApi?.unlocked(),use:()=>window.rageApi?.use()}
};
const IDS=Object.keys(SKILLS);

const style=document.createElement('style');
style.textContent=`
#skillStock{display:none}
#talentsDialog .skill-dock{position:sticky;top:-28px;z-index:6;margin:0 -28px 16px;padding:14px 28px;background:#101a15f5;border-bottom:1px solid #8b805044;display:flex;flex-wrap:wrap;align-items:center;gap:10px 24px}
.skill-dock-text{flex:1 1 220px;min-width:0}
.skill-dock-text b{display:block;font-size:13px;color:#f0dfb4}
.skill-dock-text small{display:block;margin-top:3px;font-size:11px;line-height:1.4;color:#9eae94}
.skill-dock-slots{display:flex;gap:10px}
.skill-dock-slot{position:relative;width:54px;height:54px;flex-shrink:0;border-radius:50%;border:2px solid #8c8055;background:radial-gradient(circle at 40% 30%,#344637,#111b15 75%);box-shadow:inset 0 0 14px #0008;display:grid;place-items:center;color:#82916d66;font-size:24px;line-height:1;user-select:none;-webkit-user-select:none;transition:border-color .12s,box-shadow .12s,scale .12s}
.skill-dock-slot.filled{border-color:#edc77b;cursor:grab;touch-action:none;color:#ffe1a0;box-shadow:inset 0 0 16px #eec26422,0 0 10px #edc77b22}
.skill-dock-slot .skill-number{bottom:-6px;pointer-events:none}
.skill-dock-icon,.dock-ghost{display:grid;place-items:center;width:38px;height:38px;font-size:24px;line-height:1;pointer-events:none}
.skill-dock-icon>*,.dock-ghost>*{width:100%!important;height:100%!important;object-fit:contain}
.skill-dock-icon>span,.dock-ghost>span{display:grid;place-items:center}
.skill-dock-slot .skill-dock-icon:has(>img){position:absolute;inset:0;width:auto;height:auto}
.dock-ghost:has(>img){padding:0}
.skill-dock-icon>img,.dock-ghost>img{border-radius:50%;object-fit:cover}
.skill-dock.dragging .skill-dock-slot{border-color:#9bc25a}
.skill-dock-slot.over{border-color:#fff2c4!important;box-shadow:0 0 0 3px #edc77b55,0 0 20px #edc77baa!important;scale:1.1}
.skill-dock-slot.dragged .skill-dock-icon{opacity:.25}
.dock-ghost{position:fixed;left:0;top:0;z-index:9999;width:54px;height:54px;padding:8px;box-sizing:border-box;border-radius:50%;border:2px solid #fff2c4;background:#1c281ee6;box-shadow:0 6px 18px #000a,0 0 16px #edc77b88;color:#ffe1a0}
#talentsDialog.dock-dragging{cursor:grabbing;user-select:none;-webkit-user-select:none}
#talentsDialog.dock-dragging *{pointer-events:none!important}
#talentsDialog .talent-section.dock-ready .talent-skill-icon{cursor:grab;touch-action:none}
@media(max-width:500px){#talentsDialog .skill-dock{top:-20px;margin:0 -20px 14px;padding:12px 20px}.skill-dock-slots{gap:6px}.skill-dock-slot{width:44px;height:44px}.skill-dock-icon{width:30px;height:30px;font-size:20px}}
`;
document.head.append(style);

function clean(list){
 const seen=new Set();
 return Array.from({length:SLOTS},(_,i)=>{const id=Array.isArray(list)?list[i]:null;if(!IDS.includes(id)||seen.has(id))return null;seen.add(id);return id;});
}
let slots=[],undo=null;
try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.slots)){slots=clean(saved.slots);undo=saved.undo||null;}else slots=null;}catch{slots=null;}
// Сохранение без раскладки: уже изученные навыки остаются там, где были раньше (слоты 1–4).
if(!slots)slots=clean(['rapid','power','aim','cut'].map(id=>SKILLS[id].unlocked()?id:null));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({slots,undo}));}catch{}};

// ── Клавиши слотов: по умолчанию 1–6 (и цифры на цифровом блоке), в настройках можно назначить другие ──
const BINDS_KEY='forest-frontier-keybinds-v1';
// Эти клавиши заняты игрой (пробел — удар, F2–F5 — редакторы) или нужны для работы окон.
const RESERVED=new Set(['Space','Escape','Tab','Enter','NumpadEnter','F2','F3','F4','F5','ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight','CapsLock','ContextMenu']);
let binds=Array(SLOTS).fill(null);
try{const saved=JSON.parse(localStorage.getItem(BINDS_KEY));if(Array.isArray(saved?.codes))binds=Array.from({length:SLOTS},(_,i)=>typeof saved.codes[i]==='string'&&!RESERVED.has(saved.codes[i])?saved.codes[i]:null);}catch{}
const saveBinds=()=>{try{localStorage.setItem(BINDS_KEY,JSON.stringify({codes:binds}));}catch{}};
// null — клавиша по умолчанию (цифра слота).
const codeOf=i=>binds[i]||'Digit'+(i+1);
function keyName(code){
 let m;
 if((m=/^Digit(\d)$/.exec(code)))return m[1];
 if((m=/^Key(\w)$/.exec(code)))return m[1];
 if((m=/^Numpad(\d)$/.exec(code)))return 'Num'+m[1];
 const names={Backquote:'`',Minus:'-',Equal:'=',BracketLeft:'[',BracketRight:']',Backslash:'\\',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Backspace:'⌫',Delete:'Del',Insert:'Ins',Home:'Home',End:'End',PageUp:'PgUp',PageDown:'PgDn',NumpadAdd:'Num+',NumpadSubtract:'Num−',NumpadMultiply:'Num*',NumpadDivide:'Num/',NumpadDecimal:'Num.'};
 return names[code]||code;
}
const keyLabel=i=>keyName(codeOf(i));
function slotForCode(code){
 for(let i=0;i<SLOTS;i++){if(codeOf(i)===code)return i;if(!binds[i]&&code==='Numpad'+(i+1)&&!binds.includes(code))return i;}
 return -1;
}

// ── Панель в бою ──
const bar=document.querySelector('.skill-bar');
const stock=document.createElement('div');stock.id='skillStock';stock.setAttribute('aria-hidden','true');bar.after(stock);
const empties=Array.from({length:SLOTS},(_,i)=>{
 const slot=document.createElement('div');slot.className='skill-slot';slot.setAttribute('aria-label','Слот навыка '+(i+1)+': пусто');
 slot.innerHTML='<span class="skill-placeholder">+</span><span class="skill-number"></span>';return slot;
});
function renderBar(){
 for(const id of IDS){const button=$(SKILLS[id].button);if(!slots.includes(id))stock.append(button);button.classList.remove('skill-revealed');}
 bar.replaceChildren(...slots.map((id,i)=>{
  if(!id){empties[i].querySelector('.skill-number').textContent=keyLabel(i);return empties[i];}
  const button=$(SKILLS[id].button);button.querySelector('.skill-number').textContent=keyLabel(i);return button;
 }));
}

// ── Слоты в окне талантов ──
const dialog=$('talentsDialog');
const dock=document.createElement('div');dock.className='skill-dock';
dock.innerHTML='<div class="skill-dock-text"><b>Панель навыков</b><small>Перетащи изученный навык в слот: так он появится на панели, на этом же месте. Чтобы убрать навык, вынеси его из слота.</small></div><div class="skill-dock-slots"></div>';
dialog.querySelector('.talents-grid').before(dock);
const dockSlots=Array.from({length:SLOTS},(_,i)=>{
 const slot=document.createElement('div');slot.className='skill-dock-slot';slot.dataset.slot=i;dock.querySelector('.skill-dock-slots').append(slot);return slot;
});
const iconOf=id=>$(SKILLS[id].icon).innerHTML;
const sectionOf=id=>$(SKILLS[id].icon)?.closest('.talent-section');
function renderDock(){
 dockSlots.forEach((slot,i)=>{
  const id=slots[i];slot.classList.toggle('filled',!!id);
  slot.title=id?SKILLS[id].name:'Слот '+(i+1)+': пусто';
  slot.setAttribute('aria-label',slot.title);
  slot.innerHTML=(id?'<span class="skill-dock-icon">'+iconOf(id)+'</span>':'+')+'<span class="skill-number">'+keyLabel(i)+'</span>';
 });
 markSections();
}
function markSections(){for(const id of IDS)sectionOf(id)?.classList.toggle('dock-ready',SKILLS[id].unlocked());}
function apply(next){slots=clean(next);save();renderBar();renderDock();}

// Навык, который больше не изучен (сброс, админ-панель), покидает слот.
function dropLocked(){if(slots.some(id=>id&&!SKILLS[id].unlocked()))apply(slots.map(id=>id&&SKILLS[id].unlocked()?id:null));else if(dialog.open)markSections();}
setInterval(dropLocked,250);

// ── Перетаскивание ──
const DRAG_FROM=6;
let drag=null,swallowClick=false;
function slotAt(x,y){
 return dockSlots.find(slot=>{const r=slot.getBoundingClientRect();return x>=r.left-6&&x<=r.right+6&&y>=r.top-6&&y<=r.bottom+6;})||null;
}
function moveGhost(x,y){drag.ghost.style.transform='translate('+(x-27)+'px,'+(y-27)+'px)';}
function startDrag(){
 drag.started=true;hideItemTooltip(true);
 drag.ghost=document.createElement('div');drag.ghost.className='dock-ghost';drag.ghost.innerHTML=iconOf(drag.id);dialog.append(drag.ghost);
 dialog.classList.add('dock-dragging');dock.classList.add('dragging');
 if(drag.from!==null)dockSlots[drag.from].classList.add('dragged');
}
function endDrag(){
 if(drag?.started){
  drag.ghost.remove();dialog.classList.remove('dock-dragging');dock.classList.remove('dragging');
  dockSlots.forEach(slot=>slot.classList.remove('over','dragged'));
  swallowClick=true;setTimeout(()=>{swallowClick=false;},0);
 }
 drag=null;removeEventListener('pointermove',onMove);removeEventListener('pointerup',onUp);removeEventListener('pointercancel',onCancel);
}
function onMove(event){
 if(!drag||event.pointerId!==drag.pointer)return;
 if(!drag.started){if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<DRAG_FROM)return;startDrag();}
 moveGhost(event.clientX,event.clientY);
 const over=slotAt(event.clientX,event.clientY);dockSlots.forEach(slot=>slot.classList.toggle('over',slot===over));
}
function onUp(event){
 if(!drag||event.pointerId!==drag.pointer)return;
 if(drag.started){
  const over=slotAt(event.clientX,event.clientY),next=[...slots];
  if(over){
   const to=Number(over.dataset.slot),from=drag.from??next.indexOf(drag.id),other=next[to];
   if(from!==to){next[to]=drag.id;if(from>=0)next[from]=other;}
  }else if(drag.from!==null)next[drag.from]=null;
  apply(next);
 }
 endDrag();
}
function onCancel(event){if(drag&&event.pointerId===drag.pointer)endDrag();}
dialog.addEventListener('pointerdown',event=>{
 if(drag||event.button!==0)return;
 let id=null,from=null;
 const slot=event.target.closest('.skill-dock-slot');
 if(slot){from=Number(slot.dataset.slot);id=slots[from];}
 else{
  const section=event.target.closest('.talent-section');
  if(section&&!event.target.closest('button'))id=IDS.find(key=>sectionOf(key)===section&&SKILLS[key].unlocked())||null;
 }
 if(!id)return;
 drag={id,from,pointer:event.pointerId,x:event.clientX,y:event.clientY,started:false,ghost:null};
 addEventListener('pointermove',onMove);addEventListener('pointerup',onUp);addEventListener('pointercancel',onCancel);
});
dialog.addEventListener('dragstart',event=>{if(drag)event.preventDefault();});
// Клик, которым закончился перенос, не должен открывать древо навыка.
dialog.addEventListener('click',event=>{if(swallowClick){swallowClick=false;event.stopPropagation();event.preventDefault();}},true);

// ── Клавиши и подсказки ──
document.addEventListener('keydown',event=>{
 if(event.repeat||capturing>=0||event.ctrlKey||event.altKey||event.metaKey)return;
 if(event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
 const i=slotForCode(event.code);if(i<0)return;
 const id=slots[i];if(id)SKILLS[id].use();
});
window.skillDockHint=id=>{const i=slots.indexOf(id);return i<0?'не на панели · перетащи в слот в древе талантов':'слот '+(i+1)+' или клавиша '+keyLabel(i);};

// ── Раздел «Клавиши навыков» в настройках ──
let capturing=-1;
const keysBox=document.createElement('section');keysBox.className='keybinds';
keysBox.innerHTML='<h3>Клавиши навыков</h3><p>Нажми на кнопку слота, затем на новую клавишу. Esc — отмена. Если клавиша уже занята другим слотом, слоты поменяются клавишами.</p><div class="keybinds-list"></div><button type="button" class="keybinds-reset">Вернуть 1–6</button>';
const settingsDialog=$('settingsDialog');settingsDialog.querySelector('.settings-actions').before(keysBox);
const keyStyle=document.createElement('style');
keyStyle.textContent=`
.keybinds{padding:14px 0 4px;border-bottom:1px solid #ffffff15}
.keybinds h3{margin:0 0 4px;font-size:14px;color:#edc77b}
.keybinds p{margin:0 0 10px;font-size:11.5px;color:#9ead93}
.keybinds-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.keybind{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px 6px 10px;border-radius:10px;background:#ffffff08;border:1px solid #ffffff10;font-size:12px;min-width:0}
.keybind span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#d8dccf}
.keybind button{flex:none;min-width:44px;padding:5px 10px;border-radius:8px;border:1px solid #c49d4566;background:#1c2a21;color:#f0d49b;font:800 13px Manrope,sans-serif;cursor:pointer}
.keybind button:hover{border-color:#edc77b}
.keybind button.waiting{border-color:#fff2c4;color:#fff;box-shadow:0 0 0 2px #edc77b55;animation:keybind-wait 1s ease-in-out infinite}
@keyframes keybind-wait{50%{box-shadow:0 0 0 4px #edc77b33}}
.keybinds-reset{margin-top:10px;padding:6px 12px;font-size:12px}
.keybinds-note{min-height:16px;margin-top:6px;font-size:11.5px;color:#ffb48a}
`;
document.head.append(keyStyle);
const keysList=keysBox.querySelector('.keybinds-list'),keysNote=document.createElement('div');keysNote.className='keybinds-note';keysNote.setAttribute('role','status');keysBox.append(keysNote);
function renderKeys(){
 keysList.replaceChildren(...Array.from({length:SLOTS},(_,i)=>{
  const row=document.createElement('div');row.className='keybind';
  const name=document.createElement('span');name.textContent='Слот '+(i+1)+(slots[i]?' · '+SKILLS[slots[i]].name:'');name.title=name.textContent;
  const btn=document.createElement('button');btn.type='button';btn.dataset.slot=i;btn.textContent=capturing===i?'…':keyLabel(i);btn.classList.toggle('waiting',capturing===i);
  btn.setAttribute('aria-label','Клавиша слота '+(i+1)+': '+keyLabel(i)+'. Нажми, чтобы назначить другую');
  row.append(name,btn);return row;
 }));
 keysBox.querySelector('.keybinds-reset').disabled=binds.every(b=>!b);
}
function bind(i,code){
 const old=codeOf(i),other=Array.from({length:SLOTS},(_,j)=>j).find(j=>j!==i&&codeOf(j)===code);
 binds[i]=code;if(other!==undefined)binds[other]=old;
 // Совпадение с клавишей по умолчанию храним как «по умолчанию».
 binds=binds.map((c,j)=>c==='Digit'+(j+1)?null:c);
 saveBinds();renderBar();renderDock();
}
keysList.addEventListener('click',event=>{
 const btn=event.target.closest('button[data-slot]');if(!btn)return;
 const i=Number(btn.dataset.slot);capturing=capturing===i?-1:i;keysNote.textContent=capturing>=0?'Нажми новую клавишу для слота '+(i+1)+'…':'';renderKeys();
 if(capturing>=0)keysList.querySelector(`button[data-slot="${i}"]`)?.focus();
});
// Перехват клавиши раньше всех остальных обработчиков: пока ждём, клавиша не нажимает навык и не закрывает окно.
window.addEventListener('keydown',event=>{
 if(capturing<0)return;
 event.preventDefault();event.stopImmediatePropagation();
 const i=capturing;
 if(event.code==='Escape'){capturing=-1;keysNote.textContent='';renderKeys();return;}
 if(RESERVED.has(event.code)){keysNote.textContent='Клавишу «'+(event.code==='Space'?'Пробел':keyName(event.code))+'» назначить нельзя: она занята игрой.';return;}
 capturing=-1;bind(i,event.code);keysNote.textContent='Слот '+(i+1)+': клавиша '+keyLabel(i)+'.';renderKeys();
 keysList.querySelector(`button[data-slot="${i}"]`)?.focus();
},true);
keysBox.querySelector('.keybinds-reset').addEventListener('click',()=>{binds=Array(SLOTS).fill(null);capturing=-1;saveBinds();renderBar();renderDock();keysNote.textContent='Клавиши слотов снова 1–6.';renderKeys();});
settingsDialog.addEventListener('close',()=>{capturing=-1;keysNote.textContent='';});
new MutationObserver(()=>{if(settingsDialog.open)renderKeys();}).observe(settingsDialog,{attributes:true,attributeFilter:['open']});

// Сброс прогресса очищает слоты, «Вернуть прогресс» возвращает их (в те же минуту, что и сам прогресс).
$('confirmReset').addEventListener('click',()=>{undo={until:Date.now()+UNDO_MS,slots:[...slots]};apply([]);});
$('undoReset').addEventListener('click',()=>{const saved=undo;undo=null;apply(saved&&Date.now()<saved.until?saved.slots:slots);});

window.skillDockRefresh=renderDock;
$('openTalents').addEventListener('click',renderDock);
save();renderBar();renderDock();
})();
