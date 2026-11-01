// Наковальня: три разных предмета одной редкости сплавляются в один случайный предмет по собственной таблице шансов.
// Результат определяется и сохраняется сразу при запуске — анимация лишь показывает уже полученный предмет,
// поэтому закрытие окна или перезагрузка страницы не позволяют переиграть исход или потерять награду.
(()=>{
const RANKS=['Common','Uncommon','Rare','Epic','Legendary','Divine'];
// Шансы в десятых долях процента: сумма в каждой группе — ровно 1000.
const FUSION_ODDS={
 Common:{Common:200,Uncommon:720,Rare:80},
 Uncommon:{Uncommon:400,Rare:560,Epic:40},
 Rare:{Rare:600,Epic:385,Legendary:15},
 Epic:{Epic:800,Legendary:195,Divine:5},
 Legendary:{Legendary:900,Divine:100}
};
const GROUP_NAMES={Common:'три обычных',Uncommon:'три необычных',Rare:'три редких',Epic:'три эпических',Legendary:'три легендарных'};
const STAT_NAMES={damage:'урону',damageBonus:'доп. урону удара',maxMana:'максимуму маны',goldBonus:'золоту за убийство',attackSpeed:'скорости атаки',critChance:'шансу крита',critDamage:'урону крита'};
const FUSE_MS=2300,FUSE_MS_REDUCED=350,FX_MS=1900;
const rank=rarity=>RANKS.indexOf(rarity);
const color=rarity=>rarityFlashColors[rarity]||'#d9b56a';
const reducedMotion=()=>!settings.animations||matchMedia('(prefers-reduced-motion: reduce)').matches;
const percent=weight=>(weight/10).toLocaleString('ru-RU')+'%';

const style=document.createElement('style');
style.textContent=`
#openAnvil svg{width:24px;height:24px}
html body #anvilDialog{--anvil-gold:#f5d68a;--anvil-gold-dim:#c9a35a;--anvil-line:#c9a35a66;--anvil-gilt:linear-gradient(145deg,#f7dc93,#8a6526 45%,#f0cf7f 70%,#7a5520);width:min(680px,calc(100% - 24px));max-height:92dvh;overflow:auto;padding:24px;font-family:'Golos Text',Manrope,'Segoe UI',sans-serif;color:#efe6cd!important;background:radial-gradient(ellipse at 50% 30%,#1f4a2e,#0b2015 60%,#05110a)!important;border:3px double #c9a35a!important;box-shadow:0 0 0 1px #000,0 0 32px #f5d68a1f,0 24px 70px #000d!important}
html body #anvilDialog:before{display:none}
html body #anvilDialog .equipment-heading{border-bottom:1px solid #c9a35a55}
html body #anvilDialog h2{font-family:inherit;color:#ffe7a3;text-shadow:0 1px 0 #6b4a1a,0 0 18px #f5d68a55}
html body #anvilDialog .talents-eyebrow{color:var(--anvil-gold-dim)}
html body #anvilDialog p{color:#cbbf9e}
html body #anvilDialog .equipment-heading>button{color:var(--anvil-gold)!important;background:#132519!important;border-color:var(--anvil-line)!important;box-shadow:none}
.anvil-tabs{display:flex;gap:4px;padding:4px;margin:14px 0 12px;border-radius:999px;background:#08120c;border:1px solid #a8894e33}
html body #anvilDialog .anvil-tab{flex:1;min-height:36px;border:0!important;border-radius:999px;font-weight:700;font-size:13px;line-height:1;font-family:inherit;color:#3a2405!important;background:linear-gradient(180deg,#fff0b8,#e2b45a 45%,#a8762c)!important;box-shadow:0 0 10px #f5d68a33!important;cursor:default}
.anvil-intro{margin:0 0 14px;font-size:13px;line-height:1.5;text-align:center}
.anvil-forge{position:relative;width:min(360px,100%);margin:0 auto}
.anvil-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));column-gap:3.334%;position:relative;z-index:2}
.anvil-slot{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;aspect-ratio:1;padding:6px;border-radius:12px;border:2px solid transparent;background:radial-gradient(ellipse at 50% 30%,#1d3d26,#09160d) padding-box,var(--anvil-gilt) border-box;box-shadow:0 4px 10px #000a,inset 0 0 14px #000a;color:#8f8565;font-size:11px;text-align:center;overflow:hidden}
.anvil-slot.filled{background:radial-gradient(ellipse at 50% 30%,#1d3d26,#09160d) padding-box,linear-gradient(145deg,var(--rc),#8a6526 50%,var(--rc)) border-box;box-shadow:inset 0 0 14px #000a,0 0 10px color-mix(in srgb,var(--rc) 35%,transparent);cursor:pointer;color:#efe6cd}
.anvil-slot.filled:hover,.anvil-slot.filled:focus-visible{outline:2px solid var(--rc);outline-offset:2px}
.anvil-slot img{width:58%;height:58%;object-fit:contain;filter:drop-shadow(0 3px 4px #000a)}
.anvil-slot strong{max-width:100%;font-size:10px;font-weight:600;line-height:1.15;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.anvil-slot .anvil-slot-empty{font-size:22px;color:#c9a35a66}
.anvil-chutes{display:block;width:100%;height:auto;margin-top:-6px;position:relative;z-index:1;overflow:visible}
.anvil-chute-shell{fill:none;stroke:#b8893d;stroke-width:16;stroke-linecap:round}
.anvil-chute-rim{fill:none;stroke:#6a4a1c;stroke-width:21;stroke-linecap:butt;stroke-dasharray:3.5 18}
.anvil-chute-channel{fill:none;stroke:#170d04;stroke-width:8;stroke-linecap:round}
.anvil-chute-shine{fill:none;stroke:#fff1c077;stroke-width:2;stroke-linecap:round;transform:translateX(-4px)}
.anvil-lava{fill:none;stroke:url(#anvilLavaGrad);stroke-width:7;stroke-linecap:round;stroke-dasharray:100 100;stroke-dashoffset:100;filter:url(#anvilGlow)}
.anvil-lava-flow{fill:none;stroke:#fff7c2;stroke-width:2.2;stroke-linecap:round;stroke-dasharray:3 9;opacity:0}
.anvil-forge.melting .anvil-lava{animation:anvil-pour .95s .25s cubic-bezier(.45,.05,.55,.95) forwards,anvil-lava-pulse .5s 1.2s ease-in-out infinite alternate}
.anvil-forge.melting .anvil-lava-flow{animation:anvil-flow-show .3s .9s forwards,anvil-flow .45s linear infinite}
.anvil-forge.melting .anvil-chute-channel{animation:anvil-channel-glow 2s .4s forwards}
@keyframes anvil-pour{to{stroke-dashoffset:0}}
@keyframes anvil-lava-pulse{from{stroke-width:7}to{stroke-width:8.5}}
@keyframes anvil-flow-show{to{opacity:.85}}
@keyframes anvil-flow{to{stroke-dashoffset:-12}}
@keyframes anvil-channel-glow{to{stroke:#3a1406}}
.anvil-forge.melting .anvil-slot.filled{animation:anvil-slot-heat 1.7s ease-in forwards}
.anvil-forge.melting .anvil-slot.filled img{animation:anvil-item-heat 1.7s ease-in forwards}
@keyframes anvil-slot-heat{0%{border-color:var(--rc)}35%{border-color:#ffb347;box-shadow:inset 0 0 22px #ff7a1a88,0 0 18px #ff8c2a99}100%{border-color:#6a3a1a;box-shadow:inset 0 0 14px #000a;opacity:.55}}
@keyframes anvil-item-heat{0%{filter:drop-shadow(0 3px 4px #000a)}35%{filter:brightness(1.8) sepia(1) saturate(4) hue-rotate(-18deg) drop-shadow(0 0 10px #ffa23a)}70%{filter:brightness(2.4) sepia(1) saturate(3) hue-rotate(-12deg) drop-shadow(0 0 14px #ffcf6a);opacity:.7}100%{filter:brightness(2.6) sepia(1) saturate(2) blur(1px);opacity:.12;transform:scale(.88) translateY(6px)}}
.anvil-result-wrap{position:relative;display:flex;justify-content:center;margin-top:-4px;padding-bottom:12px}
.anvil-result-wrap:after{content:'❖';position:absolute;left:50%;bottom:-6px;translate:-50% 0;color:#c9a35a;font-size:14px;text-shadow:0 0 8px #f5d68a88}
.anvil-result{--rc:#a8894e;position:relative;isolation:isolate;width:33.4%;aspect-ratio:4/5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:8px;border-radius:16px;border:3px solid transparent;background:radial-gradient(ellipse at 50% 35%,#1d3d26,#07130b) padding-box,var(--anvil-gilt) border-box;box-shadow:inset 0 0 18px #000c,0 6px 16px #000a,0 0 22px #f5d68a22;text-align:center;overflow:hidden;transition:border-color .35s,box-shadow .35s}
.anvil-result-empty{font-size:11px;line-height:1.3;color:#8f8565}
.anvil-result.closed .anvil-question{font:800 44px/1 'Golos Text',sans-serif;color:#cfc3a1;text-shadow:0 0 10px #0008}
.anvil-result.ready,.anvil-result.revealed{background:radial-gradient(ellipse at 50% 35%,#1d3d26,#07130b) padding-box,linear-gradient(145deg,var(--rc),#5a3d12 50%,var(--rc)) border-box;box-shadow:inset 0 0 18px #000c,0 6px 16px #000a,0 0 18px color-mix(in srgb,var(--rc) 60%,transparent),0 0 40px color-mix(in srgb,var(--rc) 25%,transparent);cursor:pointer}
.anvil-result.ready .anvil-question{color:var(--rc);text-shadow:0 0 14px var(--rc)}
.anvil-result.ready{animation:anvil-ready-pulse 1.6s ease-in-out infinite}
@keyframes anvil-ready-pulse{50%{transform:translateY(-3px) scale(1.03)}}
.anvil-result:focus-visible{outline:2px solid var(--rc);outline-offset:4px}
.anvil-result small.anvil-hint{position:absolute;bottom:6px;left:4px;right:4px;font-size:9px;color:#efe6cd;opacity:.85}
.anvil-result img{width:56%;height:46%;object-fit:contain;filter:drop-shadow(0 4px 6px #000b)}
.anvil-result strong{font-size:11px;line-height:1.15;color:#f6eed6}
.anvil-result .anvil-result-rarity{font-size:9px;letter-spacing:.08em;text-transform:uppercase;font-weight:800;color:var(--rc)}
.anvil-result.revealed>*:not(.anvil-melt){animation:anvil-pop .45s ease-out}
@keyframes anvil-pop{from{transform:scale(.6);opacity:0}}
.anvil-melt{position:absolute;inset:auto 0 0;z-index:-1;height:0;background:linear-gradient(to top,#c8361a,#ff8a24 55%,#ffd56a 92%,#fff6c4);box-shadow:0 -4px 14px #ffb04acc}
.anvil-melt:before{content:'';position:absolute;left:-10%;right:-10%;top:-5px;height:10px;border-radius:50%;background:#fff1b0;filter:blur(2px)}
.anvil-forge.melting .anvil-melt{animation:anvil-fill 1.05s 1.15s cubic-bezier(.4,0,.6,1) forwards}
@keyframes anvil-fill{to{height:100%}}
.anvil-fx{position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none;z-index:3}
.anvil-fx .fx-flash{position:absolute;left:-90px;top:-90px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,#fff8d8,#ffbf4dcc 30%,#ff9b3e55 55%,transparent 70%);animation:anvil-flash 1.1s ease-out forwards}
.anvil-fx .fx-rays{position:absolute;left:-130px;top:-130px;width:260px;height:260px;border-radius:50%;background:repeating-conic-gradient(from 0deg,#ffd27a66 0 6deg,transparent 6deg 30deg);-webkit-mask:radial-gradient(circle,#000 25%,transparent 70%);mask:radial-gradient(circle,#000 25%,transparent 70%);animation:anvil-rays 1.8s ease-out forwards}
.anvil-fx .fx-spark{position:absolute;width:5px;height:5px;margin:-2.5px;border-radius:50%;background:#ffe39a;box-shadow:0 0 8px #ff9b3e,0 0 3px #fff;animation:anvil-spark 1.2s cubic-bezier(.2,.7,.4,1) forwards}
.anvil-fx .fx-halo{position:absolute;left:-40px;top:-40px;width:80px;height:80px;border-radius:50%;border:3px solid #fff4b8;box-shadow:0 0 18px #ffe375,inset 0 0 18px #ffe37599;animation:anvil-halo 1.7s ease-out forwards}
.anvil-fx .fx-glow{position:absolute;left:-110px;top:-110px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,#fffbe6ee,#ffe37588 35%,transparent 70%);animation:anvil-flash 1.6s ease-out forwards}
.anvil-fx .fx-star{position:absolute;width:14px;height:14px;margin:-7px;background:#fff6c8;clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);filter:drop-shadow(0 0 6px #ffe375);animation:anvil-star 1.6s ease-out forwards}
@keyframes anvil-flash{0%{transform:scale(.2);opacity:0}20%{opacity:1}100%{transform:scale(1.5);opacity:0}}
@keyframes anvil-rays{0%{transform:scale(.3) rotate(0);opacity:0}25%{opacity:1}100%{transform:scale(1.25) rotate(70deg);opacity:0}}
@keyframes anvil-spark{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.3);opacity:0}}
@keyframes anvil-halo{0%{transform:scale(.3);opacity:0}15%{opacity:1}100%{transform:scale(3.2);opacity:0;border-width:1px}}
@keyframes anvil-star{0%{transform:translate(0,0) scale(0) rotate(0);opacity:0}25%{opacity:1;transform:translate(calc(var(--dx)*.4),calc(var(--dy)*.4)) scale(1.2) rotate(45deg)}100%{transform:translate(var(--dx),var(--dy)) scale(.4) rotate(140deg);opacity:0}}
.anvil-odds{margin:16px auto 0;max-width:420px;padding:10px 14px;border:1px solid #c9a35a66;border-radius:12px;background:linear-gradient(#0d2416,#081a10);font-size:13px}
.anvil-odds h3{margin:0 0 6px;font-weight:700;font-size:11px;line-height:1.3;font-family:inherit;letter-spacing:.08em;text-transform:uppercase;color:var(--anvil-gold-dim);text-align:center}
.anvil-odds ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:6px 18px}
.anvil-odds li{display:flex;align-items:baseline;gap:6px}
.anvil-odds li span{font-weight:700}
.anvil-odds li b{color:#f3e7c4;font-variant-numeric:tabular-nums}
.anvil-odds .anvil-odds-empty{margin:0;text-align:center;color:#a99d7c;font-size:12px}
.anvil-actions{display:flex;flex-direction:column;align-items:center;gap:8px;margin:14px 0 4px}
html body #anvilDialog .anvil-actions p{margin:0;min-height:1.4em;font-size:13px;text-align:center;color:#d9cba2}
html body #anvilDialog .anvil-actions p.success{color:#ffd88a;font-weight:700}
html body #anvilDialog .anvil-fuse{min-width:180px;min-height:44px;padding:0 26px;border-radius:12px;border:1px solid #fff2c0aa!important;font-weight:800;font-size:15px;line-height:1;font-family:inherit;letter-spacing:.04em;color:#3a2405!important;background:linear-gradient(180deg,#fff0b8,#e2b45a 40%,#a8762c 75%,#d9a84e)!important;box-shadow:0 0 22px #f5d68a55,inset 0 -2px 0 #6b4a1a,inset 0 1px 0 #fff!important;text-shadow:0 1px 0 #fff6;cursor:pointer}
html body #anvilDialog .anvil-fuse:hover:not(:disabled){filter:brightness(1.08)}
html body #anvilDialog .anvil-fuse:disabled{opacity:.4;cursor:not-allowed;filter:grayscale(.5)}
.anvil-grid-title{margin:18px 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--anvil-gold-dim);text-align:center}
.anvil-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}
.anvil-item{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 5px;border-radius:10px;border:1px solid transparent;background:radial-gradient(ellipse at 50% 25%,#1c3123,#09130d) padding-box,linear-gradient(145deg,var(--rc),#4a3a1a 55%,var(--rc)) border-box;box-shadow:inset 0 0 12px #000a;text-align:center;cursor:pointer;transition:opacity .2s,filter .2s,box-shadow .15s,transform .15s}
.anvil-item:hover:not(.locked),.anvil-item:focus-visible{box-shadow:inset 0 0 12px #000a,0 0 10px color-mix(in srgb,var(--rc) 45%,transparent);transform:translateY(-1px);outline:none}
.anvil-item img{width:48px;height:48px;object-fit:contain;filter:drop-shadow(0 3px 4px #000a)}
.anvil-item strong{font-size:11px;font-weight:600;line-height:1.15;color:#efe6cd}
.anvil-item small{font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--rc)}
.anvil-item.selected{box-shadow:inset 0 0 14px color-mix(in srgb,var(--rc) 30%,transparent),0 0 12px color-mix(in srgb,var(--rc) 55%,transparent)}
.anvil-item.selected:after{content:'✓';position:absolute;top:4px;right:6px;font-weight:800;font-size:13px;color:var(--rc)}
.anvil-item.locked{opacity:.32;filter:grayscale(.75);cursor:not-allowed}
.anvil-grid-empty{grid-column:1/-1;margin:6px 0;text-align:center;font-size:13px}
@media(max-width:540px){html body #anvilDialog{padding:16px}.anvil-intro{font-size:12px}.anvil-grid{grid-template-columns:repeat(auto-fill,minmax(78px,1fr))}.anvil-item img{width:40px;height:40px}.anvil-result-empty{font-size:10px}}
@media(prefers-reduced-motion:reduce){#anvilDialog *,#anvilDialog *:before,#anvilDialog *:after{animation:none!important;transition:none!important}}
`;
document.head.append(style);

// Кнопка в левом меню — сразу под «Древом талантов».
const openButton=document.createElement('button');
openButton.className='feature-button';openButton.id='openAnvil';openButton.type='button';
openButton.setAttribute('aria-label','Наковальня');openButton.setAttribute('aria-haspopup','dialog');
openButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6.5h14.5L21 5v2.2c0 2-1.8 3.6-4.3 3.6h-1.4c-1 0-1.8.8-1.8 1.8V15h-4v-2.2c0-1-.8-1.8-1.8-1.8H5.2C3.4 11 2 9.6 2 7.8Z"/><path d="M8 15h8l1.6 3.5H6.4Z"/><path d="M4.5 21h15"/></svg><span class="feature-label">Наковальня</span>';
$('openTalents').after(openButton);

const chute=(id,d)=>`<g data-chute="${id}"><path class="anvil-chute-shell" d="${d}"/><path class="anvil-chute-rim" d="${d}"/><path class="anvil-chute-channel" d="${d}"/><path class="anvil-chute-shine" d="${d}"/><path class="anvil-lava" pathLength="100" d="${d}"/><path class="anvil-lava-flow" d="${d}"/></g>`;
const dialog=document.createElement('dialog');
dialog.id='anvilDialog';dialog.setAttribute('aria-labelledby','anvilTitle');
dialog.innerHTML=`<div class="equipment-heading"><div><div class="talents-eyebrow">КУЗНИЦА</div><h2 id="anvilTitle">Наковальня</h2></div><button id="closeAnvil" type="button" aria-label="Закрыть наковальню">×</button></div>
<div class="anvil-tabs" role="tablist" aria-label="Разделы наковальни"><button class="anvil-tab" type="button" role="tab" id="anvilFusionTab" aria-selected="true" aria-controls="anvilFusionPanel">Сплавление</button></div>
<section class="anvil-panel" id="anvilFusionPanel" role="tabpanel" aria-labelledby="anvilFusionTab">
<p class="anvil-intro">Положи на наковальню три разных предмета одной редкости — металл сольётся в один случайный предмет. Редкость может вырасти, но исходные предметы расходуются при любом исходе.</p>
<div class="anvil-forge" id="anvilForge">
<div class="anvil-slots">${[0,1,2].map(i=>`<div class="anvil-slot" data-slot="${i}"></div>`).join('')}</div>
<svg class="anvil-chutes" viewBox="0 0 360 104" aria-hidden="true"><defs>
<linearGradient id="anvilLavaGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="104"><stop offset="0" stop-color="#fff4a8"/><stop offset=".4" stop-color="#ffb02e"/><stop offset=".75" stop-color="#ff6a1f"/><stop offset="1" stop-color="#d9361b"/></linearGradient>
<filter id="anvilGlow" filterUnits="userSpaceOnUse" x="-20" y="-20" width="400" height="144"><feGaussianBlur stdDeviation="2.6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>${chute('left','M56 4 C56 56 152 46 152 104')}${chute('center','M180 4 V104')}${chute('right','M304 4 C304 56 208 46 208 104')}</svg>
<div class="anvil-result-wrap" id="anvilResultWrap"><div class="anvil-result" id="anvilResult"></div></div>
</div>
<div class="anvil-odds" id="anvilOdds" aria-live="polite"></div>
<div class="anvil-actions"><p id="anvilStatus" role="status"></p><button id="anvilFuse" class="anvil-fuse" type="button">Сплавить</button></div>
<div class="anvil-grid-title">Предметы инвентаря</div>
<div class="anvil-grid" id="anvilGrid"></div>
</section>`;
document.body.append(dialog);

const forge=$('anvilForge'),resultCard=$('anvilResult'),slots=[...forge.querySelectorAll('.anvil-slot')];
// selected — три позиции верхних слотов (null — пусто); sources — расплавляемые предметы на время анимации.
let selected=[null,null,null],sources=null,result=null,sourceRarity=null,phase='idle',timers=[],note='';

const picks=()=>selected.filter(Boolean);
const isEquipped=item=>Object.values(equipped).includes(item);
function fusible(item){return !!FUSION_ODDS[item.rarity]&&inventoryItems.includes(item)&&!isEquipped(item);}
function validSelection(list){return list.length===3&&new Set(list).size===3&&list.every(fusible)&&list.every(item=>item.rarity===list[0].rarity);}
function canPick(item){
 if(phase==='melting'||!fusible(item))return false;
 if(selected.includes(item))return true;
 const current=picks();
 return current.length<3&&(!current.length||current[0].rarity===item.rarity);
}

function rollRarity(group){
 let roll=Math.random()*1000;
 const entries=Object.entries(FUSION_ODDS[group]);
 for(const [rarity,weight] of entries){if((roll-=weight)<0)return rarity;}
 return entries[entries.length-1][0];
}
// Обычные — эпические предметы получают случайную прибавку к одной из своих характеристик; легендарные и божественные остаются как в каталоге.
function forgeItem(template){
 const item={...template};
 if(rank(item.rarity)>=rank('Legendary'))return item;
 const own=Object.keys(STAT_NAMES).filter(key=>typeof template[key]==='number'&&template[key]>0);
 const keys=own.length?own:['damageBonus','maxMana','critChance','goldBonus','attackSpeed'];
 const key=keys[Math.floor(Math.random()*keys.length)],base=template[key]||1,share=.1+Math.random()*.2;
 const bonus=key==='damageBonus'?Math.max(.1,Number((base*share).toFixed(1))):Math.max(1,Math.round(base*share));
 item.forgeBonus={[key]:bonus};
 return applyForgeBonus(item);
}
function rollResult(group){
 let rarity=rollRarity(group);
 // Если в каталоге нет предметов выпавшей редкости, берём ближайшую нижнюю, но не ниже исходной.
 while(rank(rarity)>rank(group)&&!itemPool.some(item=>item.rarity===rarity))rarity=RANKS[rank(rarity)-1];
 const pool=itemPool.filter(item=>item.rarity===rarity);
 return pool.length?forgeItem(pool[Math.floor(Math.random()*pool.length)]):null;
}

function fuse(){
 const list=picks();
 if(phase!=='idle'||result||!validSelection(list))return;
 const item=rollResult(list[0].rarity);if(!item)return;
 // Расход и награда записываются сразу, до анимации.
 for(const source of list)inventoryItems.splice(inventoryItems.indexOf(source),1);
 inventoryItems.push(item);persistLoot();
 sources=selected;selected=[null,null,null];result=item;sourceRarity=list[0].rarity;phase='melting';note='';
 hideItemTooltip(true);
 forge.classList.remove('melting');void forge.offsetWidth;forge.classList.add('melting');
 render();
 timers.push(setTimeout(finishMelting,reducedMotion()?FUSE_MS_REDUCED:FUSE_MS));
}
function finishMelting(){
 if(phase!=='melting'||!dialog.open)return;
 forge.classList.remove('melting');sources=null;phase='ready';render();
 resultCard.focus({preventScroll:true});
}
function openResult(){
 if(phase==='ready'){
  phase='revealed';
  const up=rank(result.rarity)>rank(sourceRarity);
  note=up?'Успех! Редкость повышена: '+rarityLabel(sourceRarity)+' → '+rarityLabel(result.rarity)+'.':'Редкость сохранена: '+rarityLabel(result.rarity)+'.';
  const bonus=result.forgeBonus&&Object.entries(result.forgeBonus)[0];
  if(bonus)note+=' Закалка: +'+bonus[1]+' к '+STAT_NAMES[bonus[0]]+'.';
  render();revealEffect(result.rarity);
 }else if(phase==='revealed'){
  note='«'+result.name+'» отправлен в инвентарь.';
  hideItemTooltip(true);result=null;sourceRarity=null;phase='idle';clearEffects();render();
 }
}

function revealEffect(rarity){
 if(reducedMotion()||(rarity!=='Legendary'&&rarity!=='Divine'))return;
 const fx=document.createElement('div');fx.className='anvil-fx '+rarity.toLowerCase();fx.setAttribute('aria-hidden','true');
 if(rarity==='Legendary'){
  fx.innerHTML='<span class="fx-rays"></span><span class="fx-flash"></span>';
  for(let i=0;i<16;i++){const spark=document.createElement('span'),angle=i/16*Math.PI*2+Math.random()*.3,reach=70+Math.random()*60;spark.className='fx-spark';spark.style.setProperty('--dx',Math.cos(angle)*reach+'px');spark.style.setProperty('--dy',Math.sin(angle)*reach+'px');spark.style.animationDelay=Math.random()*.15+'s';fx.append(spark);}
 }else{
  fx.innerHTML='<span class="fx-glow"></span>'+[0,1,2].map(i=>`<span class="fx-halo" style="animation-delay:${i*.22}s"></span>`).join('');
  for(let i=0;i<12;i++){const star=document.createElement('span'),angle=i/12*Math.PI*2,reach=80+Math.random()*50;star.className='fx-star';star.style.setProperty('--dx',Math.cos(angle)*reach+'px');star.style.setProperty('--dy',Math.sin(angle)*reach+'px');star.style.animationDelay=.1+Math.random()*.3+'s';fx.append(star);}
 }
 $('anvilResultWrap').append(fx);
 timers.push(setTimeout(()=>fx.remove(),FX_MS));
}
function clearEffects(){document.querySelectorAll('#anvilResultWrap .anvil-fx').forEach(node=>node.remove());}

function toggleItem(item){
 if(phase==='melting')return;
 const index=selected.indexOf(item);
 if(index>=0)selected[index]=null;
 else if(canPick(item))selected[selected.indexOf(null)]=item;
 else return;
 note='';render();
}
function onActivate(el,callback){
 el.addEventListener('click',callback);
 el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.code==='Space'){event.preventDefault();event.stopPropagation();callback();}});
}
slots.forEach((slot,i)=>onActivate(slot,()=>{if(phase!=='melting'&&selected[i]){selected[i]=null;note='';hideItemTooltip(true);render();}}));
onActivate(resultCard,openResult);
$('anvilFuse').addEventListener('click',fuse);

function renderSlots(){
 const shown=sources||selected;
 slots.forEach((slot,i)=>{
  const item=shown[i];slot.replaceChildren();slot.classList.toggle('filled',!!item);
  if(item){
   slot.style.setProperty('--rc',color(item.rarity));
   const image=document.createElement('img');image.src=item.image;image.alt='';
   const name=document.createElement('strong');name.textContent=item.name;
   slot.append(image,name);
   const label=item.name+' · '+rarityLabel(item.rarity)+(sources?'':' — нажми, чтобы убрать');
   slot.setAttribute('aria-label',label);slot.setAttribute('role','button');slot.tabIndex=sources?-1:0;
  }else{
   slot.style.removeProperty('--rc');
   const plus=document.createElement('span');plus.className='anvil-slot-empty';plus.textContent='+';slot.append(plus);
   slot.setAttribute('aria-label','Слот '+(i+1)+': пусто');slot.removeAttribute('role');slot.removeAttribute('tabindex');
  }
  attachItemTooltip(slot,sources?null:item);
 });
}
function renderResult(){
 resultCard.replaceChildren();resultCard.className='anvil-result';resultCard.style.removeProperty('--rc');
 attachItemTooltip(resultCard,null);
 if(phase==='idle'){
  const empty=document.createElement('span');empty.className='anvil-result-empty';empty.textContent='Результат сплавления';resultCard.append(empty);
  resultCard.removeAttribute('role');resultCard.removeAttribute('tabindex');resultCard.setAttribute('aria-label','Результат сплавления');return;
 }
 const question=document.createElement('span');question.className='anvil-question';question.textContent='?';
 if(phase==='melting'){
  // Во время плавки карточка нейтральна: редкость не угадать по цвету.
  const melt=document.createElement('span');melt.className='anvil-melt';
  resultCard.classList.add('closed');resultCard.append(melt,question);
  resultCard.removeAttribute('role');resultCard.tabIndex=-1;resultCard.setAttribute('aria-label','Идёт сплавление');return;
 }
 resultCard.style.setProperty('--rc',color(result.rarity));resultCard.setAttribute('role','button');resultCard.tabIndex=0;
 const hint=document.createElement('small');hint.className='anvil-hint';
 if(phase==='ready'){
  hint.textContent='Нажми, чтобы открыть';resultCard.classList.add('closed','ready');resultCard.append(question,hint);
  resultCard.setAttribute('aria-label','Закрытый результат — нажми, чтобы открыть');return;
 }
 const rarity=document.createElement('span');rarity.className='anvil-result-rarity';rarity.textContent=rarityLabel(result.rarity);
 const image=document.createElement('img');image.src=result.image;image.alt='';
 const name=document.createElement('strong');name.textContent=result.name;
 hint.textContent='Нажми, чтобы забрать';
 resultCard.classList.add('revealed');resultCard.append(rarity,image,name,hint);
 resultCard.setAttribute('aria-label',result.name+' · '+rarityLabel(result.rarity)+' — нажми, чтобы забрать');
 attachItemTooltip(resultCard,result);
}
function renderOdds(){
 const group=phase==='melting'?sourceRarity:picks()[0]?.rarity,box=$('anvilOdds');box.replaceChildren();
 if(!group){const hint=document.createElement('p');hint.className='anvil-odds-empty';hint.textContent='Выбери предметы, чтобы увидеть шансы результата.';box.append(hint);return;}
 const title=document.createElement('h3');title.textContent='Возможный результат · '+GROUP_NAMES[group];
 const list=document.createElement('ul');
 for(const [rarity,weight] of Object.entries(FUSION_ODDS[group])){
  const row=document.createElement('li'),name=document.createElement('span'),chance=document.createElement('b');
  name.textContent=rarityLabel(rarity);name.style.color=color(rarity);chance.textContent=percent(weight);
  row.append(name,chance);list.append(row);
 }
 box.append(title,list);
}
function renderStatus(){
 const status=$('anvilStatus'),count=picks().length;let text;
 status.classList.toggle('success',phase==='revealed'&&rank(result.rarity)>rank(sourceRarity));
 if(phase==='melting')text='Металл плавится…';
 else if(phase==='ready')text='Сплав готов. Нажми на карточку, чтобы открыть результат.';
 else if(phase==='revealed')text=note+' Нажми на предмет ещё раз, чтобы забрать его.';
 else if(note&&!count)text=note;
 else if(!count)text='Выбери три предмета одной редкости.';
 else if(count<3)text='Выбрано '+count+' из 3 · '+rarityLabel(picks()[0].rarity);
 else text='Всё готово — жми «Сплавить».';
 status.textContent=text;
 const fuseButton=$('anvilFuse');
 fuseButton.disabled=phase!=='idle'||!validSelection(picks());
 fuseButton.textContent=phase==='melting'?'Плавка…':'Сплавить';
}
function renderGrid(){
 const grid=$('anvilGrid');grid.replaceChildren();
 // Новый предмет прячется из сетки, пока лежит на месте результата, чтобы не выдать редкость раньше времени.
 const items=inventoryItems.map((item,index)=>({item,index})).filter(entry=>entry.item!==result)
  .sort((a,b)=>rank(b.item.rarity)-rank(a.item.rarity)||a.index-b.index);
 if(!items.length){const empty=document.createElement('p');empty.className='anvil-grid-empty';empty.textContent='Инвентарь пуст. Надетые предметы на наковальню не кладутся.';grid.append(empty);return;}
 for(const {item} of items){
  const cell=document.createElement('div'),chosen=selected.includes(item),available=canPick(item);
  cell.className='anvil-item'+(chosen?' selected':'')+(available?'':' locked');
  cell.style.setProperty('--rc',color(item.rarity));
  cell.setAttribute('role','button');cell.tabIndex=available?0:-1;cell.setAttribute('aria-pressed',String(chosen));cell.setAttribute('aria-disabled',String(!available));
  cell.setAttribute('aria-label',item.name+' · '+rarityLabel(item.rarity)+(item.rarity==='Divine'?' — божественные предметы не сплавляются':''));
  const image=document.createElement('img');image.src=item.image;image.alt='';
  const name=document.createElement('strong');name.textContent=item.name;
  const rarity=document.createElement('small');rarity.textContent=rarityLabel(item.rarity);
  cell.append(image,name,rarity);
  attachItemTooltip(cell,item);
  onActivate(cell,()=>toggleItem(item));
  grid.append(cell);
 }
}
function render(){
 // Предметы могли исчезнуть из инвентаря (продажа, экипировка) — убираем их из выбора.
 selected=selected.map(item=>item&&fusible(item)?item:null);
 renderSlots();renderResult();renderOdds();renderStatus();renderGrid();
}
function reset(){
 timers.forEach(clearTimeout);timers=[];clearEffects();forge.classList.remove('melting');
 selected=[null,null,null];sources=null;result=null;sourceRarity=null;phase='idle';note='';
}

openButton.addEventListener('click',()=>{reset();render();dialog.showModal();});
// Результат уже лежит в инвентаре, поэтому при закрытии достаточно остановить эффекты и снять блокировки.
// Событие close приходит асинхронно, поэтому кнопка закрытия чистит всё сразу, а Escape — через событие.
function closeAnvil(){hideItemTooltip(true);reset();}
$('closeAnvil').addEventListener('click',()=>{closeAnvil();dialog.close();});
dialog.addEventListener('close',closeAnvil);
})();
