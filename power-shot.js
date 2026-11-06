// Powerful Shot: activate accumulation, earn charges on kills, release a reserved volley.
(()=>{
const KEY='forest-frontier-power-shot-v1',NAME='Теневой обстрел',ICON='assets/power-shot-icon.png',INDEX=6;
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY))||{};}catch{}
const state=new PowerShotState(saved);
let timer=null,token=0,busy=false,backup=null,lastChargeTick=performance.now();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({...state.serialize(),quiverRank:talentDraft?.ranks?.powerShotQuiver??state.quiverRank,volleyRank:talentDraft?.ranks?.powerShotVolley??state.volleyRank}));}catch{}};
const style=document.createElement('style');style.textContent=`
#powerShotSkill>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%}
#powerShotSkill .shot-count{position:absolute;top:-8px;right:-9px;min-width:28px;padding:3px 5px;border-radius:10px;background:#102c3b;border:1px solid #91d7f0;color:#e8fbff;font-size:12px;z-index:3;line-height:1}
#powerShotSkill.shot-armed{box-shadow:0 0 14px #79ccff77,inset 0 0 8px #79ccff}
.power-shot-tree-img{width:100%;height:100%;object-fit:cover;border-radius:50%}
`;document.head.append(style);
const button=document.createElement('button');button.type='button';button.id='powerShotSkill';button.className='skill-slot';
button.innerHTML=`<img src="${ICON}" alt=""><span class="skill-placeholder skill-empty-mark" aria-hidden="true">+</span><span class="skill-number">7</span><span class="skill-mana-cost">20</span><span class="shot-count">0/10</span>`;
document.querySelector('.skill-bar').append(button);
const section=document.createElement('section');section.className='talent-section skill-7 openable-tree';section.tabIndex=0;section.setAttribute('role','button');section.setAttribute('aria-haspopup','dialog');section.setAttribute('aria-label','Открыть древо: '+NAME);
section.innerHTML=`<div class="talent-section-heading"><span class="talent-skill-icon" id="powerShotTreeIcon"><img class="power-shot-tree-img" src="${ICON}" alt=""></span><div><h3>${NAME}</h3><span>Древо талантов</span></div><small id="powerShotTreePoints"></small></div><div class="talent-preview" aria-hidden="true"><span class="talent-node root-node">7</span></div><p>До 10 стрел · Морозный залп</p>`;
const ranged=TALENT_CATEGORIES.find(c=>c.id==='ranged');ranged.skills.push(INDEX);ranged.box.querySelector('.talent-category-row').append(section);talentTreeNames[INDEX]=NAME;
document.querySelector('#talentsDialog .talents-intro').textContent='Изучай навыки и выбирай шесть для своей панели.';
const modal=()=>!!document.querySelector('dialog[open]');
const calm=()=>$('arena').classList.contains('dungeon-calm');
const enemyStamp=()=>[zone,zoneKills,kills,window.dungeonApi?.active()?'dungeon':'forest',renderedEnemyId,maxHp].join(':');
function update(){
 button.classList.toggle('skill-unlocked',state.unlocked);button.classList.toggle('shot-armed',state.active);button.classList.toggle('skill-running',busy);
 button.querySelector('.shot-count').textContent=(busy?state.pending:state.charges)+'/'+(busy?10:state.capacity());button.setAttribute('aria-pressed',String(state.active));
 button.disabled=!state.unlocked||busy;
 button.querySelector('.skill-mana-cost').textContent=state.cost();
 button.title=NAME+' · '+(!state.active?'включить накопление':busy?'залп: осталось '+state.pending:'стрел: '+state.charges+'/'+state.capacity()+' · выпустить '+Math.min(10,state.charges)+' стрел за '+state.cost()+' маны');
 button.setAttribute('aria-label',button.title);setSkillHidden(button,!state.unlocked,7);
 section.classList.toggle('skill-open',state.unlocked);$('powerShotTreePoints').textContent=state.unlocked?'Морозный колчан: '+state.quiverRank+' / 18':'Не открыт';
}
function info(anchor){
 hideItemTooltip(true);(anchor.closest('dialog[open]')||document.body).append(itemTooltip);itemTooltip.replaceChildren();itemTooltip.className='item-tooltip skill-info-tooltip';
 const title=document.createElement('h3');title.textContent=NAME;
 const text=document.createElement('p');text.textContent='Первое нажатие включает накопление. Убийство обычного монстра даёт 2 стрелы, босса — 1. Пока накопление включено, каждые 5 секунд добавляется 1 стрела (максимум '+state.capacity()+'). Повторное нажатие выпускает до 10 стрел из запаса: каждая стрела наносит 200% урона атаки и взрывается тёмной волной. Накопление продолжается после залпа. Новые стрелы остаются для следующего залпа. При снятии с панели накопление останавливается, запас сохраняется.'+(state.volleyRank?' Мощный залп: при запасе от 10 стрел одна большая стрела наносит 2000% атаки за 10 стрел и 20 маны.':'');
 const hint=document.createElement('p');hint.className='skill-info-state';hint.textContent=state.unlocked?'Навык открыт · '+(window.skillDockHint?.('powerShot')||'перетащи на панель'):skillUnlockHint();
 itemTooltip.append(title,tooltipRow('⚔','Урон каждой стрелы','200% атаки'),tooltipRow('💧','Стоимость залпа','2 маны за стрелу · сейчас '+state.cost()),tooltipRow('➶','Стрелы',state.charges+' / '+state.capacity()),text,hint);itemTooltip.hidden=false;if(itemTooltip.showPopover&&!itemTooltip.matches(':popover-open'))itemTooltip.showPopover();placeItemTooltip(anchor);
}
function unlock(){if(state.unlocked||!spendSkillUnlock())return;state.unlocked=true;save();saveProgress();render();update();updateTalentCategories();window.skillDockRefresh?.();}
const originalOpen=openTalentTree;
openTalentTree=function(index){document.querySelector('#talentTreeDialog .tree-detail-note').textContent='Новые таланты пока не настроены.';originalOpen(index);if(index!==INDEX)return;const container=$('talentTreeContent'),root=document.createElement('button');root.type='button';root.className='detail-root talent-node';root.innerHTML=`<img class="power-shot-tree-img" src="${ICON}" alt="">`;root.setAttribute('aria-label',NAME);root.classList.toggle('talent-learned',state.unlocked);root.onclick=()=>{unlock();root.classList.toggle('talent-learned',state.unlocked);refreshQuiver();refreshVolley();info(root);};root.onmouseenter=()=>info(root);root.onmouseleave=hideItemTooltip;root.onfocus=()=>info(root);root.onblur=hideItemTooltip;container.querySelector('.detail-root').replaceWith(root);
 // Ядро уже построило дерево 3×3 с пустыми слотами: занимаем первые два, остальные ждут новых талантов.
 const slots=container.querySelector('.detail-talent-row').children;
 const node=document.createElement('button');node.type='button';node.className='detail-talent rapid-damage-talent';node.id='frostQuiverTalent';
 function refreshQuiver(){node.innerHTML='<span class="talent-node"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 21h20l-3 23H17z" fill="#254f64" stroke="#a9e5ff" stroke-width="2"/><path d="M20 29V5m8 24V3M16 10l4-5 4 5m0-2 4-5 4 5" fill="none" stroke="#bcefff" stroke-width="2"/></svg></span><span>Морозный колчан · '+state.quiverRank+' / 18</span>';node.classList.toggle('talent-invested',state.quiverRank>0);node.setAttribute('aria-label','Морозный колчан '+state.quiverRank+' из 18');node.title='Каждый уровень: +5 к запасу стрел. Запас: '+state.capacity()+'. '+(state.quiverRank<18?'Цена следующего уровня: '+state.nextRankCost()+' очк.':'Максимальный уровень.')+' За залп: до 10 стрел, до 20 маны.';node.setAttribute('aria-disabled',String(!state.unlocked||state.quiverRank>=18||talentPoints<state.nextRankCost()));}
 node.onclick=()=>{if(!state.unlocked||state.quiverRank>=18||talentPoints<state.nextRankCost())return;talentPoints-=state.nextRankCost();state.setRank(state.quiverRank+1);render();update();refreshQuiver();refreshVolley();updateTalentResetButtons();updateTalentDraftUI();};
 const volley=document.createElement('button');volley.type='button';volley.id='powerVolleyTalent';volley.className='detail-talent rapid-damage-talent';
 function refreshVolley(){volley.innerHTML='<span class="talent-node"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 40L34 14M22 14L40 6 32 24M8 28v12h12" fill="none" stroke="#bcefff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>Мощный залп · '+state.volleyRank+' / 1</span>';volley.classList.toggle('talent-invested',state.volleyRank>0);volley.setAttribute('aria-label','Мощный залп '+state.volleyRank+' из 1');volley.title='Цена: 1 очко. При запасе от 10 стрел выпускает одну большую: урон 2000% атаки, расход 10 стрел и 20 маны. При меньшем запасе — обычные стрелы.';volley.setAttribute('aria-disabled',String(!state.unlocked||state.volleyRank===1||talentPoints<1));}
 volley.onclick=()=>{if(!state.unlocked||state.volleyRank||talentPoints<1)return;talentPoints--;state.volleyRank=1;render();update();refreshVolley();refreshQuiver();updateTalentResetButtons();updateTalentDraftUI();};
 refreshVolley();refreshQuiver();slots[1].replaceWith(volley);slots[0].replaceWith(node);document.querySelector('#talentTreeDialog .tree-detail-note').textContent='Морозный колчан: +5 к запасу за уровень. Залп — до 10 стрел, 2 маны за стрелу (максимум 20).';};
const originalSpent=spentTalentPoints;
spentTalentPoints=function(index=null){return originalSpent(index)+(index===null||index===INDEX?state.spentPoints():0);};
const originalReset=resetTalentPoints;
resetTalentPoints=function(index=null){const ours=index===null||index===INDEX;originalReset(index);if(ours){state.setRank(0);state.volleyRank=0;save();update();if($('talentTreeDialog').open&&activeTalentTree===INDEX)openTalentTree(INDEX);updateTalentResetButtons();updateTalentDraftUI();}};
section.onclick=event=>{if(!event.target.closest('button'))openTalentTree(INDEX);};section.onkeydown=event=>{if(event.target===section&&(event.key==='Enter'||event.code==='Space')){event.preventDefault();event.stopPropagation();openTalentTree(INDEX);}};
function cancel(){token++;clearTimeout(timer);timer=null;busy=false;state.cancel();powerShotFx.clear();window.powerShotAudio?.stop();save();update();}
function pump(run){
 if(run!==token)return;
 if(!state.pending){busy=false;save();update();return;}
 if(modal()||calm()||!button.closest('.skill-bar')){cancel();return;}
 if(locked||hp<=0){timer=setTimeout(()=>pump(run),100);return;}
 const target=enemyStamp(),arrowCount=state.projectileCost();
 const impact=()=>{
  if(run!==token)return false;
  checkBossTimer();
  if(target!==enemyStamp()||locked||hp<=0){timer=setTimeout(()=>pump(run),100);return false;}
  if(modal()||calm()){cancel();return false;}
  state.consume();save();attack(true,2*arrowCount,true,false,null,true);window.powerShotAudio?.impact();update();
  timer=setTimeout(()=>pump(run),160);return true;
 };
 window.powerShotAudio?.flight();
 if(!settings.animations||matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setTimeout(impact,180);
 else powerShotFx.fire(impact,arrowCount===10?2.4:1);
}
function use(){
 if(!state.unlocked||busy||modal()||!button.closest('.skill-bar'))return;
 if(!state.active){state.activate();lastChargeTick=performance.now();save();update();$('message').textContent='Теневой обстрел: накопление включено. За обычного монстра +2 стрелы; каждые 5 секунд +1.';return;}
 if(!state.charges){$('message').textContent='Нет стрел: убей монстра или подожди 5 секунд.';return;}
 checkBossTimer();if(locked||hp<=0||calm())return;renderMana();
 const cost=state.cost();
 if(mana<cost){showManaWarning(button);return;}
 if(!state.begin(mana))return;
 mana=Number((mana-cost).toFixed(6));renderMana();saveProgress();busy=true;save();update();pump(++token);
}
button.onclick=use;
const originalClear=clearBattle;clearBattle=function(){originalClear();cancel();};
setInterval(()=>{const now=performance.now(),elapsed=now-lastChargeTick;lastChargeTick=now;if(state.active&&!button.closest('.skill-bar')){cancel();state.active=false;save();}if(state.advance(elapsed))save();if(busy&&modal())cancel();update();},200);
$('confirmReset').addEventListener('click',()=>{backup={until:Date.now()+60000,data:state.serialize()};cancel();state.restore();save();update();});
$('undoReset').addEventListener('click',()=>{if(backup&&Date.now()<backup.until){cancel();state.restore(backup.data);save();update();}backup=null;});
$('adminUnlockAim').insertAdjacentHTML('afterend','<button id="adminUnlockPowerShot" type="button">Открыть Теневой обстрел</button>');
$('adminUnlockPowerShot').onclick=()=>{state.unlocked=true;save();update();adminCommit(NAME+' открыт.');};
window.powerShotApi={save,ranks:()=>({powerShotQuiver:state.quiverRank,powerShotVolley:state.volleyRank}),setRanks(ranks){if(!('powerShotQuiver' in ranks))return;state.setRank(ranks.powerShotQuiver);state.volleyRank=ranks.powerShotVolley===1?1:0;save();update();},unlocked:()=>state.unlocked,active:()=>state.active,use,onKill(boss=false){state.gain(boss?1:2);save();update();},state:()=>({...state.serialize(),busy})};
save();update();
})();
