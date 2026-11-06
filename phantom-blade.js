// Навык «Фантомный клинок» (ближний бой). За 20 маны на 25 с каждый обычный удар и удар навыка ближнего боя
// повторяется через 0,2 с в том же месте призрачной копией и наносит 25% фактически нанесённого урона. Затем 15 с перезарядки.
// Время действия идёт по реальному времени и сохраняется, как у «Неистовой ярости».
// Навыки сообщают об ударе сами: сразу после attack() вызывают phantomApi.echo(эффект, опережение в мс).
(()=>{
const KEY='forest-frontier-phantom-v1',NAME='Фантомный клинок',ICON='assets/phantom-blade.webp';
const MANA_COST=20,DURATION=25000,COOLDOWN=15000,DELAY_MS=200,SHARE=.25;

let saved={};try{saved=JSON.parse(localStorage.getItem(KEY))||{};}catch{}
let unlocked=saved.unlocked===true,activeUntil=Number(saved.activeUntil)||0,readyAt=Number(saved.readyAt)||0;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({unlocked,activeUntil,readyAt}));}catch{}};
const isOn=()=>Date.now()<activeUntil;

const style=document.createElement('style');
style.textContent=`
#phantomSkill{cursor:pointer}
#phantomSkill:disabled{cursor:default}
#phantomSkill .phantom-icon{position:absolute;inset:3px;width:calc(100% - 6px);height:calc(100% - 6px);border-radius:50%;object-fit:cover;pointer-events:none}
#phantomSkill.mana-insufficient:not(.phantom-on) .phantom-icon{filter:saturate(.4) brightness(.7)}
#phantomSkill.skill-cooling .phantom-icon{opacity:.35}
#phantomSkill .phantom-time{position:absolute;inset:0;display:grid;place-items:center;font-size:18px;font-weight:800;color:#fff;pointer-events:none;-webkit-text-stroke:4px #000;paint-order:stroke fill;z-index:3}
#phantomSkill.skill-cooling::before,#phantomSkill.phantom-on::before{content:'';position:absolute;inset:-2px;border-radius:50%;background:conic-gradient(from 0deg,var(--phantom-ring) 0deg var(--cooldown-angle),#a878ff14 var(--cooldown-angle) 360deg);mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));pointer-events:none;z-index:2}
#phantomSkill .skill-number,#phantomSkill .skill-mana-cost{z-index:4}
#phantomSkill.skill-cooling{--phantom-ring:#edc77b}
#phantomSkill.phantom-on{--phantom-ring:#b98aff;box-shadow:0 0 14px #a878ff99,inset 0 0 10px #b98aff;animation:phantom-pulse 1.2s ease-in-out infinite}
.skill-bar .skill-slot.phantom-on{filter:none}
@keyframes phantom-pulse{50%{box-shadow:0 0 22px #a878ffcc,inset 0 0 14px #e0ccff}}
@media (prefers-reduced-motion:reduce){#phantomSkill.phantom-on{animation:none}}
.talent-skill-icon .phantom-tree-img,.detail-root .phantom-tree-img{width:100%;height:100%;border-radius:50%;object-fit:cover;pointer-events:none}
.float.phantom-float{color:#cfb4ff;text-shadow:0 0 8px #a878ff,0 2px 3px #000}
.slash-effect.phantom-slash{filter:drop-shadow(0 0 6px #a878ff)}
.cut-fx.phantom .cut-open-glow{background:radial-gradient(ellipse at center,#f1e6ff,#c9a8ffcc 30%,#a878ff55 58%,transparent 72%)}
.cut-fx.phantom .cut-open{background:linear-gradient(90deg,transparent,#efe6ff 15%,#efe6ff 85%,transparent);box-shadow:0 0 var(--glow) #a878ff}
.cut-spark.phantom{background:#d8c4ff;box-shadow:0 0 6px #a878ff,0 0 2px #fff}
`;
document.head.append(style);

// ── Кнопка навыка (скрытый запас и слоты панели ведёт skill-dock.js) ──
const button=document.createElement('button');button.type='button';button.className='skill-slot';button.id='phantomSkill';
button.innerHTML=`<img class="phantom-icon" src="${ICON}" alt=""><span class="skill-placeholder phantom-time"></span><span class="skill-placeholder skill-empty-mark" aria-hidden="true">+</span><span class="skill-number">6</span><span class="skill-mana-cost" aria-label="Стоимость: ${MANA_COST} маны">${MANA_COST}</span>`;
document.querySelector('.skill-bar').append(button);

const arena=$('arena');
const calm=()=>arena.classList.contains('dungeon-calm');
const quietFx=()=>!settings.animations||matchMedia('(prefers-reduced-motion: reduce)').matches;
const enemyKey=()=>(window.dungeonApi?.active()?'dg:':'')+zone+':'+zoneKills+':'+kills;

function use(){
 renderMana();
 if(!unlocked||isOn()||document.querySelector('dialog[open]')||Date.now()<readyAt)return;
 if(mana<MANA_COST){showManaWarning(button);return;}
 mana=Number((mana-MANA_COST).toFixed(6));renderMana();
 activeUntil=Date.now()+DURATION;readyAt=activeUntil+COOLDOWN;save();saveProgress();
 $('message').textContent=NAME+'! 25 секунд удары навыков ближнего боя повторяются копией.';
 updateUI();
}
function updateUI(){
 const now=Date.now(),on=isOn(),cooling=!on&&now<readyAt,left=on?activeUntil-now:cooling?readyAt-now:0;
 button.classList.toggle('skill-unlocked',unlocked);button.classList.toggle('phantom-on',on);button.classList.toggle('skill-cooling',cooling);
 button.classList.toggle('mana-insufficient',unlocked&&!on&&mana<MANA_COST);
 button.style.setProperty('--cooldown-angle',(on?left/DURATION:cooling?left/COOLDOWN:0)*360+'deg');
 button.querySelector('.phantom-time').textContent=left>0?Math.ceil(left/1000)+'с':'';
 button.disabled=!unlocked||on||(cooling&&mana>=MANA_COST);
 button.setAttribute('aria-pressed',on);
 button.title=unlocked?NAME+' · Копии ударов на 25 с · '+MANA_COST+' маны · Перезарядка 15 с'+(on?' · действует ещё '+Math.ceil(left/1000)+' с':''):'';
 button.setAttribute('aria-label',NAME+(on?' — действует':''));
 setSkillHidden(button,!unlocked,6);
 updateSection();
}
setInterval(updateUI,100);
button.addEventListener('click',use);

// ── Эхо удара ──
const pending=new Set();
function later(ms,fn){const timer=setTimeout(()=>{pending.delete(timer);fn();},ms);pending.add(timer);}
// lead — на сколько раньше удара начать анимацию, чтобы меч дошёл до цели ровно в момент урона.
function echo(fx,lead=0){
 if(!isOn()||!(lastStrikeDamage>0))return;
 const amount=Number((lastStrikeDamage*SHARE).toFixed(2)),enemy=enemyKey();
 const sameEnemy=()=>enemy===enemyKey()&&!locked&&hp>0&&!calm();
 later(Math.max(0,DELAY_MS-lead),()=>{if(sameEnemy()&&!quietFx())fx();});
 later(DELAY_MS,()=>{
  if(!sameEnemy())return;
  if(!quietFx())$('monster').animate([{filter:'brightness(1.3) drop-shadow(0 0 16px #a878ff)'},{filter:'brightness(1) drop-shadow(0 0 0 #a878ff00)'}],{duration:240,easing:'ease-out'});
  attack(true,null,true,false,amount);
 });
}
function cancelEchoes(){pending.forEach(clearTimeout);pending.clear();}
// Базовая атака (клик по врагу, пробел, автоатака) тоже повторяется копией. Навыки зовут attack(true, …) и сообщают о себе сами,
// а сама копия бьёт с fixedDamage, поэтому повторяются только обычные удары.
const originalAttack=attack;
attack=function(skillStrike=false,damageScale=null,quiet=false,auto=false,fixedDamage=null){
 const result=originalAttack.apply(this,arguments);
 if(!skillStrike&&fixedDamage===null&&lastStrikeDamage>0){const swing=lastSwing;echo(()=>showSlash(false,{swing}));}
 return result;
};

// ── Окно талантов: свободная ветка «Навык 6» становится веткой навыка и переезжает в ближний бой ──
const treeImg=`<img class="phantom-tree-img" src="${ICON}" alt="">`;
const section=document.querySelector('#talentsDialog .talent-section.skill-6');
section.classList.remove('skill-soon');
const icon=section.querySelector('.talent-skill-icon');icon.id='phantomTreeIcon';icon.innerHTML=treeImg;
section.querySelector('h3').textContent=NAME;section.querySelector('small').id='phantomTreePoints';
section.querySelector('.talent-preview .root-node').textContent='6';
section.querySelector('p').textContent='Копии ударов · 25 с';
const melee=TALENT_CATEGORIES.find(c=>c.id==='melee'),owner=TALENT_CATEGORIES.find(c=>c.skills.includes(5));
if(melee&&owner&&owner!==melee){owner.skills=owner.skills.filter(i=>i!==5);melee.skills.push(5);melee.box.querySelector('.talent-category-row').append(section);}
talentTreeNames[5]=NAME;
section.setAttribute('aria-label','Открыть древо: '+NAME);
function updateSection(){
 section.classList.toggle('skill-open',unlocked);
 $('phantomTreePoints').textContent=unlocked?'Открыт':'Не открыт';
}
function showInfo(anchor){
 hideItemTooltip(true);(anchor.closest('dialog[open]')||document.body).append(itemTooltip);itemTooltip.replaceChildren();itemTooltip.className='item-tooltip skill-info-tooltip';
 const title=document.createElement('h3');title.textContent=NAME;
 const text=document.createElement('p');text.textContent='На 25 секунд каждый удар навыков ближнего боя («Скоростная атака», «Мощный удар», «Точный разрез», «Вихрь») через 0,2 с повторяется призрачной копией: копия разреза появляется с другой стороны врага, остальные — в том же месте. Обычные удары и автоатака тоже повторяются. Если враг умер раньше, копия не наносит урона. После окончания — 15 секунд перезарядки.';
 const state=document.createElement('p');state.className='skill-info-state';state.textContent=unlocked?'Навык открыт · '+skillDockHint('phantom'):skillUnlockHint();
 itemTooltip.append(title,tooltipRow('💧','Мана',String(MANA_COST)),tooltipRow('⚔','Урон копии','25% от урона удара'),tooltipRow('⏱','Задержка','0,2 с'),tooltipRow('⏱','Длительность','25 с'),tooltipRow('⏱','Перезарядка','15 с'),text,state);
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
 if(index!==5)return;
 const old=$('talentTreeContent').querySelector('.detail-root'),root=old.cloneNode(false);
 root.removeAttribute('title');root.innerHTML=treeImg;root.classList.toggle('talent-learned',unlocked);root.setAttribute('aria-label',NAME);
 const info=()=>showInfo(root);
 root.addEventListener('mouseenter',info);root.addEventListener('mouseleave',hideItemTooltip);root.addEventListener('focus',info);root.addEventListener('blur',hideItemTooltip);
 root.addEventListener('click',()=>{unlock();root.classList.toggle('talent-learned',unlocked);info();});
 old.replaceWith(root);
};

// Сброс боя (этап, вход и выход из подземелья, отступление) отменяет копии в полёте; время действия навыка идёт дальше.
const originalClearBattle=clearBattle;
clearBattle=function(){originalClearBattle();cancelEchoes();};
// Админ-панель.
$('adminUnlockAim').insertAdjacentHTML('afterend','<button id="adminUnlockPhantom" type="button">Открыть '+NAME+'</button>');
$('adminUnlockPhantom').addEventListener('click',()=>{unlocked=true;save();updateUI();adminCommit(NAME+' открыт.');});
// Сброс прогресса закрывает навык, «Вернуть прогресс» в течение минуты возвращает его.
let backup=null;
$('confirmReset').addEventListener('click',()=>{backup={until:Date.now()+60000,unlocked};cancelEchoes();unlocked=false;activeUntil=0;readyAt=0;save();updateUI();});
$('undoReset').addEventListener('click',()=>{if(backup&&Date.now()<backup.until){unlocked=backup.unlocked;save();updateUI();}backup=null;});

// toggle оставлен для skill-dock.js: теперь это разовая активация.
window.phantomApi={unlocked:()=>unlocked,active:isOn,toggle:use,use,echo};
updateUI();
})();
