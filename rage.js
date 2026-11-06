// Навык «Неистовая ярость» (ближний бой). За 20 маны на 45 с увеличивает урон удара на 25%, затем 15 с перезарядки.
// Бонус работает через обёртку combatStats(), поэтому касается всех ударов и виден в характеристиках героя.
// Время действия идёт по реальному времени и сохраняется, так что перезагрузка страницы ярость не снимает.
(()=>{
const KEY='forest-frontier-rage-v1',NAME='Неистовая ярость',INDEX=7;
const MANA_COST=20,DURATION=45000,COOLDOWN=15000,BONUS=.25;
// object-view-box отрезает тонкую рамку картинки; ?v= сбрасывает кэш при замене файла.
const ICON=`<img class="rage-icon" src="assets/rage-icon.webp?v=2" alt="" aria-hidden="true" draggable="false">`;

let saved={};try{saved=JSON.parse(localStorage.getItem(KEY))||{};}catch{}
let unlocked=saved.unlocked===true,activeUntil=Number(saved.activeUntil)||0,readyAt=Number(saved.readyAt)||0;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({unlocked,activeUntil,readyAt}));}catch{}};
const active=()=>Date.now()<activeUntil;

const style=document.createElement('style');
style.textContent=`
.rage-icon{display:block;object-fit:cover;object-view-box:inset(10%);border-radius:50%;-webkit-mask-image:radial-gradient(circle closest-side,#000 48%,#0008 82%,#0003 100%);mask-image:radial-gradient(circle closest-side,#000 48%,#0008 82%,#0003 100%)}
#rageSkill .rage-icon{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;pointer-events:none}
#rageSkill:not(.skill-unlocked) .rage-icon{opacity:.4;filter:grayscale(.6)}
#rageSkill.skill-cooling .rage-icon{opacity:.35}
#rageSkill.mana-insufficient:not(.rage-on) .rage-icon{filter:saturate(.4) brightness(.7)}
#rageSkill .rage-time{position:absolute;inset:0;display:grid;place-items:center;font-size:18px;font-weight:700;color:#fff;pointer-events:none;text-shadow:0 1px 5px #000,0 0 5px #000;z-index:3}
#rageSkill.skill-cooling::before,#rageSkill.rage-on::before{content:'';position:absolute;inset:-2px;border-radius:50%;background:conic-gradient(from 0deg,var(--rage-ring) 0deg var(--cooldown-angle),#ff6a4a14 var(--cooldown-angle) 360deg);mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));pointer-events:none;z-index:2}
#rageSkill .skill-number,#rageSkill .skill-mana-cost{z-index:4}
#rageSkill.skill-cooling{--rage-ring:#edc77b}
#rageSkill.rage-on{--rage-ring:#ff6a3a;box-shadow:0 0 14px #ff4a1a99,inset 0 0 10px #ff6a3a;animation:rage-pulse 1.2s ease-in-out infinite}
.skill-bar .skill-slot.rage-on{filter:none}
@keyframes rage-pulse{50%{box-shadow:0 0 22px #ff4a1acc,inset 0 0 14px #ffae6a}}
#arena.rage-on::after{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;border-radius:inherit;box-shadow:inset 0 0 70px #ff3a1a55,inset 0 0 18px #ff6a3a44;animation:rage-vignette 1.6s ease-in-out infinite}
@keyframes rage-vignette{50%{box-shadow:inset 0 0 95px #ff3a1a77,inset 0 0 24px #ff8a4a55}}
.talent-skill-icon .rage-icon,.detail-root .rage-icon{width:100%;height:100%;border-radius:50%;pointer-events:none}
#talentTreeContent .detail-root>.rage-icon{flex:none;margin:0}
#damageValue.rage-damage{color:#6dff86;text-shadow:0 0 8px #2fd85a99,0 2px 3px #000;transition:color .3s}
.damage-plaque.rage-pulse .dp-main>img{animation:rage-plaque-pulse .45s ease-out}
@keyframes rage-plaque-pulse{40%{scale:1.35;filter:brightness(1.5) drop-shadow(0 0 6px #4dff6a)}}
.rage-damage-pop{position:fixed;z-index:60;translate:-50% 0;font:900 22px 'Russo One',Manrope,sans-serif;color:#7dff94;text-shadow:0 0 10px #2fd85a,0 2px 3px #000;pointer-events:none;animation:rage-damage-pop 1.1s ease-out forwards}
@keyframes rage-damage-pop{0%{opacity:0;transform:translateY(8px) scale(.7)}15%{opacity:1;transform:scale(1.15)}100%{opacity:0;transform:translateY(-34px) scale(1)}}
@media (prefers-reduced-motion:reduce){#rageSkill.rage-on,#arena.rage-on::after,.damage-plaque.rage-pulse .dp-main>img{animation:none}}
`;
document.head.append(style);

// ── Кнопка навыка (скрытый запас и слоты панели ведёт skill-dock.js) ──
const button=document.createElement('button');button.type='button';button.className='skill-slot';button.id='rageSkill';
button.innerHTML=`${ICON}<span class="skill-placeholder rage-time"></span><span class="skill-placeholder skill-empty-mark" aria-hidden="true">+</span><span class="skill-number">8</span><span class="skill-mana-cost" aria-label="Стоимость: ${MANA_COST} маны">${MANA_COST}</span>`;
document.querySelector('.skill-bar').append(button);
const arena=$('arena');
if(getComputedStyle(arena).position==='static')arena.style.position='relative';

// Урон удара: +25%, пока ярость действует.
const originalCombatStats=combatStats;
combatStats=function(){const stats=originalCombatStats.apply(this,arguments);if(active()&&stats)stats.damage=Number((stats.damage*(1+BONUS)).toFixed(4));return stats;};

let wasActive=active();
// Урон за удар на панели рисует отдельная renderDamagePlaque, render() его не трогает.
const refresh=()=>{render();if(typeof renderDamagePlaque==='function')renderDamagePlaque();};
function use(){
 renderMana();
 if(!unlocked||active()||document.querySelector('dialog[open]'))return;
 if(Date.now()<readyAt)return;
 if(mana<MANA_COST){showManaWarning(button);return;}
 mana=Number((mana-MANA_COST).toFixed(6));renderMana();
 const before=combatStats().damage;
 activeUntil=Date.now()+DURATION;readyAt=activeUntil+COOLDOWN;save();saveProgress();
 $('message').textContent=NAME+'! Урон удара +25% на 45 секунд.';
 update();refresh();showDamageGain(combatStats().damage-before);
}
// Как у душ: значок урона на панели вспыхивает, над числом всплывает зелёная прибавка.
function showDamageGain(gain){
 const plaque=document.querySelector('.damage-plaque'),value=$('damageValue');
 if(!plaque||!value||!settings.animations)return;
 plaque.classList.remove('rage-pulse');void plaque.offsetWidth;plaque.classList.add('rage-pulse');
 const rect=value.getBoundingClientRect(),pop=document.createElement('span');pop.className='rage-damage-pop';
 pop.textContent='+'+Number(gain.toFixed(2)).toLocaleString('ru-RU');
 pop.style.left=rect.left+rect.width/2+'px';pop.style.top=rect.top-26+'px';document.body.append(pop);setTimeout(()=>pop.remove(),1150);
}
function update(){
 const now=Date.now(),on=active(),cooling=!on&&now<readyAt;
 // Ярость закончилась: пересчитать урон в окнах характеристик.
 if(wasActive&&!on)refresh();
 wasActive=on;
 arena.classList.toggle('rage-on',on);$('damageValue')?.classList.toggle('rage-damage',on);
 button.classList.toggle('skill-unlocked',unlocked);button.classList.toggle('rage-on',on);button.classList.toggle('skill-cooling',cooling);
 button.classList.toggle('mana-insufficient',unlocked&&!on&&mana<MANA_COST);
 const left=on?activeUntil-now:cooling?readyAt-now:0;
 button.style.setProperty('--cooldown-angle',(on?left/DURATION:cooling?left/COOLDOWN:0)*360+'deg');
 button.querySelector('.rage-time').textContent=left>0?Math.ceil(left/1000)+'с':'';
 button.disabled=!unlocked||on||(cooling&&mana>=MANA_COST);
 button.title=unlocked?NAME+' · Урон удара +25% на 45 с · '+MANA_COST+' маны · Перезарядка 15 с'+(on?' · действует ещё '+Math.ceil(left/1000)+' с':''):'';
 button.setAttribute('aria-label',NAME+(on?' — действует':''));
 setSkillHidden(button,!unlocked,8);
 section.classList.toggle('skill-open',unlocked);
 $('rageTreePoints').textContent=unlocked?'Открыт':'Не открыт';
}
setInterval(update,100);
button.addEventListener('click',use);

// ── Окно талантов: новая ветка в «Ближнем бою» ──
const section=document.createElement('section');section.className='talent-section skill-8 openable-tree';section.tabIndex=0;section.setAttribute('role','button');section.setAttribute('aria-haspopup','dialog');section.setAttribute('aria-label','Открыть древо: '+NAME);
section.innerHTML=`<div class="talent-section-heading"><span class="talent-skill-icon" id="rageTreeIcon">${ICON}</span><div><h3>${NAME}</h3><span>Древо талантов</span></div><small id="rageTreePoints"></small></div><div class="talent-preview" aria-hidden="true"><span class="talent-node root-node">8</span></div><p>Урон удара +25% · 45 с</p>`;
const melee=TALENT_CATEGORIES.find(c=>c.id==='melee');melee.skills.push(INDEX);melee.box.querySelector('.talent-category-row').append(section);talentTreeNames[INDEX]=NAME;
section.onclick=event=>{if(!event.target.closest('button'))openTalentTree(INDEX);};
section.onkeydown=event=>{if(event.target===section&&(event.key==='Enter'||event.code==='Space')){event.preventDefault();event.stopPropagation();openTalentTree(INDEX);}};

function showInfo(anchor){
 hideItemTooltip(true);(anchor.closest('dialog[open]')||document.body).append(itemTooltip);itemTooltip.replaceChildren();itemTooltip.className='item-tooltip skill-info-tooltip';
 const title=document.createElement('h3');title.textContent=NAME;
 const text=document.createElement('p');text.textContent='Герой впадает в ярость: 45 секунд урон каждого удара больше на 25%. Действует на обычные удары, автоатаку и удары навыков. После окончания ярости — 15 секунд перезарядки.';
 const state=document.createElement('p');state.className='skill-info-state';state.textContent=unlocked?'Навык открыт · '+(window.skillDockHint?.('rage')||'перетащи на панель'):skillUnlockHint();
 itemTooltip.append(title,tooltipRow('💧','Мана',String(MANA_COST)),tooltipRow('⚔','Урон удара','+25%'),tooltipRow('⏱','Длительность','45 с'),tooltipRow('⏱','Перезарядка','15 с'),text,state);
 itemTooltip.hidden=false;if(itemTooltip.showPopover&&!itemTooltip.matches(':popover-open'))itemTooltip.showPopover();placeItemTooltip(anchor);
}
function unlock(){
 if(unlocked||!spendSkillUnlock())return;
 unlocked=true;save();saveProgress();render();update();updateTalentCategories();window.skillDockRefresh?.();
 $('message').textContent=NAME+' открыта! Перетащи её в слот наверху древа талантов.';
}
const originalOpenTree=openTalentTree;
openTalentTree=function(index){
 originalOpenTree(index);
 if(index!==INDEX)return;
 const old=$('talentTreeContent').querySelector('.detail-root'),root=document.createElement('button');
 root.type='button';root.className='detail-root talent-node';root.innerHTML=ICON;root.classList.toggle('talent-learned',unlocked);root.setAttribute('aria-label',NAME);
 const info=()=>showInfo(root);
 root.addEventListener('mouseenter',info);root.addEventListener('mouseleave',hideItemTooltip);root.addEventListener('focus',info);root.addEventListener('blur',hideItemTooltip);
 root.addEventListener('click',()=>{unlock();root.classList.toggle('talent-learned',unlocked);info();});
 old?.replaceWith(root);
};

// Админ-панель.
$('adminUnlockAim').insertAdjacentHTML('afterend','<button id="adminUnlockRage" type="button">Открыть '+NAME+'</button>');
$('adminUnlockRage').addEventListener('click',()=>{unlocked=true;save();update();updateTalentCategories();window.skillDockRefresh?.();adminCommit(NAME+' открыта.');});
// Сброс прогресса закрывает навык, «Вернуть прогресс» в течение минуты возвращает его.
let backup=null;
$('confirmReset').addEventListener('click',()=>{backup={until:Date.now()+60000,unlocked};unlocked=false;activeUntil=0;readyAt=0;save();update();render();});
$('undoReset').addEventListener('click',()=>{if(backup&&Date.now()<backup.until){unlocked=backup.unlocked;save();update();}backup=null;});

window.rageApi={unlocked:()=>unlocked,active,use};
update();
// Ярость пережила перезагрузку: ядро уже нарисовало панель без бонуса, перерисовать с ним.
if(active())refresh();
})();
