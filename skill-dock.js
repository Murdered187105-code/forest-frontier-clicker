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
 spin:{button:'spinSkill',icon:'spinTreeIcon',name:'Вихрь',unlocked:()=>!!window.spinApi?.unlocked(),use:()=>window.spinApi?.toggle()}
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

// ── Панель в бою ──
const bar=document.querySelector('.skill-bar');
const stock=document.createElement('div');stock.id='skillStock';stock.setAttribute('aria-hidden','true');bar.after(stock);
const empties=Array.from({length:SLOTS},(_,i)=>{
 const slot=document.createElement('div');slot.className='skill-slot';slot.setAttribute('aria-label','Слот навыка '+(i+1)+': пусто');
 slot.innerHTML='<span class="skill-placeholder">+</span><span class="skill-number">'+(i+1)+'</span>';return slot;
});
function renderBar(){
 for(const id of IDS){const button=$(SKILLS[id].button);if(!slots.includes(id))stock.append(button);button.classList.remove('skill-revealed');}
 bar.replaceChildren(...slots.map((id,i)=>{
  if(!id)return empties[i];
  const button=$(SKILLS[id].button);button.querySelector('.skill-number').textContent=i+1;return button;
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
  slot.innerHTML=(id?'<span class="skill-dock-icon">'+iconOf(id)+'</span>':'+')+'<span class="skill-number">'+(i+1)+'</span>';
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
 if(event.repeat)return;
 const match=/^(?:Digit|Numpad)([1-6])$/.exec(event.code);if(!match)return;
 const id=slots[match[1]-1];if(id)SKILLS[id].use();
});
window.skillDockHint=id=>{const i=slots.indexOf(id);return i<0?'не на панели · перетащи в слот в древе талантов':'слот '+(i+1)+' или клавиша '+(i+1);};

// Сброс прогресса очищает слоты, «Вернуть прогресс» возвращает их (в те же минуту, что и сам прогресс).
$('confirmReset').addEventListener('click',()=>{undo={until:Date.now()+UNDO_MS,slots:[...slots]};apply([]);});
$('undoReset').addEventListener('click',()=>{const saved=undo;undo=null;apply(saved&&Date.now()<saved.until?saved.slots:slots);});

window.skillDockRefresh=renderDock;
$('openTalents').addEventListener('click',renderDock);
save();renderBar();renderDock();
})();
