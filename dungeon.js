// Подземелья: врата открываются ключами из магазина, за каждыми — босс одной из четырёх стихий.
// На босса даётся 3 попытки по 60 с; здоровье босса между попытками сохраняется, мана и навыки — обновляются.
// Бой идёт на той же арене, что и лес: состояние леса откладывается при входе и возвращается при выходе.
(()=>{
const DUNGEON_KEY='forest-frontier-dungeon-v1';
const UNLOCK_LEVEL=10,ATTEMPTS=3,ATTEMPT_MS=60000,REPLAY_PRICE=50,BOSS_CHEST_ITEMS=3;
const ELEMENTS={
 dark:{name:'Тьма',color:'#a77bff',deep:'#1d0f38',light:'#e4d4ff'},
 fire:{name:'Огонь',color:'#ff6a2a',deep:'#3a0e06',light:'#ffd9b8'},
 light:{name:'Свет',color:'#ffd75e',deep:'#3a2c08',light:'#fff4c8'},
 ice:{name:'Лёд',color:'#5ec8ff',deep:'#0a2440',light:'#d8f4ff'}
};
const BOSSES=[
 {id:'dark-knight',name:'Тёмный рыцарь',element:'dark'},
 {id:'shadow-reaper',name:'Теневой жнец',element:'dark'},
 {id:'void-maw',name:'Пожиратель бездны',element:'dark'},
 {id:'fire-dragon',name:'Огненный дракон',element:'fire'},
 {id:'flame-lord',name:'Владыка пламени',element:'fire'},
 {id:'ash-phoenix',name:'Пепельный феникс',element:'fire'},
 {id:'light-spawn',name:'Порождение света',element:'light'},
 {id:'radiant-guardian',name:'Сияющий страж',element:'light'},
 {id:'seraph',name:'Небесный серафим',element:'light'},
 {id:'ice-golem',name:'Ледяной голем',element:'ice'},
 {id:'frost-witch',name:'Морозная ведьма',element:'ice'},
 {id:'frost-wolf',name:'Морозный волк-исполин',element:'ice'}
];
// Редкость предметов из сундука босса: обычные и необычные исключены.
const CHEST_RARITY_WEIGHTS={Rare:55,Epic:28,Legendary:13,Divine:4};

const fresh=()=>({version:1,cleared:0,keys:0,replayKeys:0,redSouls:0,lastBoss:null,run:null,chest:null});
let state=fresh();
// Режим экрана (не сохраняется): off — лес; gate — у врат; fight — бой; pause — между попытками; victory — сундук; busy — анимация.
let mode='off',forest=null,deadline=0,savedRunAt=0,bannerTimer=null,zoneHtml='';

// Подземелья, ключи в магазине и души боссов открываются с 10 уровня героя.
function unlocked(){return playerLevel>=UNLOCK_LEVEL;}
function bossById(id){return BOSSES.find(b=>b.id===id)||null;}
function isInt(v,min=0){return Number.isSafeInteger(v)&&v>=min;}
function load(){
 try{
  const s=JSON.parse(localStorage.getItem(DUNGEON_KEY));if(!s||s.version!==1)return;
  const next=fresh();
  for(const k of ['cleared','keys','replayKeys','redSouls'])if(isInt(s[k]))next[k]=s[k];
  if(bossById(s.lastBoss))next.lastBoss=s.lastBoss;
  const r=s.run;
  if(r&&isInt(r.level,1)&&bossById(r.bossId)&&Number.isFinite(r.maxHp)&&r.maxHp>0&&Number.isFinite(r.hp)&&r.hp>0&&r.hp<=r.maxHp&&isInt(r.used)&&r.used<=ATTEMPTS)
   next.run={level:r.level,bossId:r.bossId,maxHp:r.maxHp,hp:r.hp,used:r.used,replay:r.replay===true};
  if(s.chest&&isInt(s.chest.level,1)&&bossById(s.chest.bossId))next.chest={level:s.chest.level,bossId:s.chest.bossId};
  state=next;
 }catch{}
}
function save(){try{localStorage.setItem(DUNGEON_KEY,JSON.stringify(state));}catch{}}
function keyPrice(){return 50+10*state.cleared;}
function bossHealth(level){return Math.max(1,Math.round(100*(playerLevel/10)*level));}

// Сопротивление: 50% к урону своей стихии, 25% к урону без стихии, иначе 0%.
function damageElements(){return [...new Set(Object.values(equipped).filter(Boolean).map(i=>i.element).filter(e=>e&&e!=='none'))];}
function resistance(boss){const els=damageElements();if(els.includes(boss.element))return .5;if(!els.length)return .25;return 0;}
function resistText(boss){
 const r=resistance(boss),els=damageElements();
 if(r===.5)return 'Сопротивление 50% — твой урон той же стихии';
 if(r===.25)return 'Сопротивление 25% — у твоего урона нет стихии';
 return 'Без сопротивления — '+els.map(e=>elementNames[e]||e).join(', ').toLowerCase()+' пробивает защиту';
}

// ── Разметка ─────────────────────────────────────────────────────────────
const style=document.createElement('style');
style.textContent=`
.stage-circles{position:relative}
.dungeon-entry{position:absolute;left:calc(100% + 18px);top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:7px;height:40px;padding:0 14px 0 9px;border-radius:999px;border:2px solid #fff;outline:2px solid #000;background:radial-gradient(circle at 40% 30%,#3a2458,#140b22 75%);color:#f0e6ff;font:800 12px Manrope,sans-serif;letter-spacing:.4px;cursor:pointer;white-space:nowrap;box-shadow:0 0 14px #a77bff55,inset 0 0 12px #0008}
.dungeon-entry:hover{box-shadow:0 0 22px #a77bffaa,inset 0 0 12px #0008}
.dungeon-entry svg{width:22px;height:22px}
.dungeon-entry.in-forest-return{background:radial-gradient(circle at 40% 30%,#344637,#111b15 75%);box-shadow:0 0 14px #7fe6c255,inset 0 0 12px #0008}
.dungeon-entry b{display:grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#a77bff;color:#140b22;font-size:10px}
@media(max-width:760px){.dungeon-entry span{display:none}.dungeon-entry{padding:0 9px;left:calc(100% + 10px)}}
#arena.in-dungeon{background:#07050c}
.dungeon-scene{position:absolute;inset:0;z-index:-1;overflow:hidden;pointer-events:none}
.dungeon-scene svg{position:absolute;inset:0;width:100%;height:100%}
.dg-flame{transform-box:fill-box;transform-origin:50% 100%;animation:dg-flame 1.1s ease-in-out infinite}
.dg-flame:nth-of-type(2n){animation-duration:.8s;animation-delay:-.3s}
@keyframes dg-flame{50%{transform:scale(.9,1.12) skewX(3deg)}}
.dg-torch-glow{animation:dg-glow 1.6s ease-in-out infinite}
@keyframes dg-glow{50%{opacity:.35}}
.dg-rune{animation:dg-rune 2.4s ease-in-out infinite}
@keyframes dg-rune{50%{opacity:.35}}
.dg-lock-glow{transform-box:fill-box;transform-origin:center;animation:dg-lock 1.8s ease-in-out infinite}
@keyframes dg-lock{50%{transform:scale(1.18);opacity:.25}}
.dg-door{transform-box:view-box;transition:transform 1.1s cubic-bezier(.55,.05,.25,1),filter 1.1s}
.dg-door-l{transform-origin:420px 0}.dg-door-r{transform-origin:780px 0}
.dg-gate.open .dg-door-l,.dg-gate.open .dg-door-r{transform:scaleX(.07);filter:brightness(.45)}
.dg-gate .dg-light{opacity:0;transition:opacity .9s .25s}
.dg-gate.open .dg-light{opacity:1}
.dg-gate .dg-lock{transition:opacity .35s,transform .35s;transform-box:fill-box;transform-origin:center}
.dg-gate.open .dg-lock{opacity:0;transform:scale(1.6)}
#arena.in-dungeon.dungeon-calm #monster,#arena.in-dungeon.dungeon-calm .enemy-info,#arena.in-dungeon.dungeon-calm .skill-bar,#arena.in-dungeon.dungeon-calm .mana-bar{visibility:hidden}
#arena.dungeon-fight #monster{width:clamp(230px,30vh,350px);height:clamp(200px,26vh,305px)}
html.hud-fit #arena.dungeon-fight #monster{width:clamp(230px,calc(var(--hud-h)*.3),350px);height:clamp(200px,calc(var(--hud-h)*.265),305px)}
#arena.dungeon-fight #monster>svg:not(.slash-effect){filter:drop-shadow(0 0 16px var(--boss-glow,#a77bff))}
#arena.dungeon-fight #enemyName{color:var(--boss-light,#e4d4ff);text-shadow:0 0 14px var(--boss-glow,#a77bff)}
#arena.dungeon-fight .enemy-type{color:var(--boss-glow,#a77bff)}
.dungeon-info{display:block;margin-top:3px;font:700 11px Manrope,sans-serif;letter-spacing:.3px;color:#d9ccff;text-shadow:0 1px 2px #000}
.dungeon-info i{font-style:normal;color:var(--boss-glow,#a77bff)}
/* Полоска здоровья босса подземелья: фиолетовая, с заострёнными краями */
.hp-dungeon-frame{display:none}
#arena.dungeon-fight .hp-reference-frame{display:none}
#arena.dungeon-fight .hp-dungeon-frame{display:block;position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;filter:drop-shadow(0 3px 4px #000a) drop-shadow(0 0 8px #8a3cff55)}
#arena.dungeon-fight .hp .track{clip-path:polygon(3% 0,97% 0,100% 50%,97% 100%,3% 100%,0 50%);border-radius:0}
#arena.dungeon-fight .hp .fill{border-radius:0;background:radial-gradient(ellipse at 40% 0%,#f3d0ff88,transparent 34%),linear-gradient(to bottom,#f0c6ff 0%,#c46bff 10%,#9b34f0 26%,#7a1fd6 50%,#56109e 72%,#3c0a74 92%,#8a2be2 100%);box-shadow:inset 0 0 2px 1px #d79bff,0 0 12px #9b34f088}
#arena.dungeon-fight .hp .track .hp-damage-trail{border-radius:0;background:linear-gradient(#fff,#efe6ff 45%,#d8c8ee)}
.dungeon-entry[hidden],.boss-soul-wallet[hidden],.dungeon-panel[hidden],.dungeon-scene[hidden],.dungeon-info[hidden]{display:none!important}
.boss-soul-wallet{border-color:#ff5a5a66!important;box-shadow:0 0 14px #ff303033,0 4px 14px #0006!important}
.boss-soul-wallet .soul-wallet-label{color:#ffb3a6!important}
.boss-soul-wallet b{color:#ffd0c8!important;text-shadow:0 0 10px #ff3030aa!important}
.dungeon-panel{position:absolute;left:50%;bottom:5%;transform:translateX(-50%);z-index:30;width:min(460px,90%);max-height:78%;overflow:auto;padding:16px 18px 18px;border-radius:18px;background:linear-gradient(160deg,#160d26f0,#08050ef0);border:1px solid #b88cff55;box-shadow:0 20px 60px #000c,0 0 34px #8a5cff2a;color:#efe6ff;text-align:center;font:13px/1.45 Manrope,sans-serif}
.dungeon-panel.center{top:50%;bottom:auto;transform:translate(-50%,-50%)}
.dungeon-panel h3{margin:0 0 4px;font:20px 'Russo One',Manrope,sans-serif;letter-spacing:.5px;color:#fff}
.dungeon-panel .dg-eyebrow{font-size:10px;letter-spacing:2px;font-weight:800;color:#b88cff}
.dungeon-panel p{margin:6px 0 12px;color:#cbbde6}
.dungeon-panel .dg-row{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px}
.dungeon-panel button{cursor:pointer;display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:999px;border:1px solid #b88cff55;background:#1e1233;color:#f0e6ff;font:800 12.5px Manrope,sans-serif}
.dungeon-panel button:hover:not(:disabled){background:#2a1946}
.dungeon-panel button:disabled{opacity:.45;cursor:not-allowed}
.dungeon-panel button.dg-primary{border:0;color:#1a0b2e;background:linear-gradient(135deg,#f0c6ff,#a77bff)}
.dungeon-panel button img{width:22px;height:22px}
.dungeon-panel .dg-keys{display:flex;justify-content:center;gap:14px;margin:4px 0 2px;font-weight:800;color:#e4d4ff}
.dungeon-panel .dg-keys span{display:flex;align-items:center;gap:5px}.dungeon-panel .dg-keys img{width:24px;height:24px}
.dungeon-panel select{padding:9px 10px;border-radius:10px;border:1px solid #b88cff55;background:#120a1f;color:#f0e6ff;font:700 12.5px Manrope,sans-serif}
.dungeon-panel .dg-sep{height:1px;margin:12px 0 6px;background:linear-gradient(90deg,transparent,#b88cff44,transparent)}
.dungeon-panel .dg-note{font-size:11.5px;color:#a594c4}
.dg-boss-card{display:flex;align-items:center;gap:12px;margin:8px 0 10px;padding:10px;border-radius:14px;background:#0c0716;border:1px solid var(--c,#a77bff)55;text-align:left}
.dg-boss-card img{width:74px;height:64px;filter:drop-shadow(0 0 10px var(--c,#a77bff))}
.dg-boss-card b{display:block;font:15px 'Russo One',sans-serif;color:var(--l,#fff)}
.dg-boss-card small{display:block;color:#cbbde6}
.dg-banner{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:31;padding:12px 26px;border-radius:14px;background:#0a0612e6;border:1px solid var(--c,#b88cff)88;color:#fff;font:22px 'Russo One',sans-serif;letter-spacing:1px;text-shadow:0 0 16px var(--c,#b88cff);pointer-events:none;animation:dg-banner 1.2s ease-out forwards}
@keyframes dg-banner{0%{opacity:0;transform:translate(-50%,-50%) scale(.7)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}75%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(.96)}}
.dg-chest-btn{position:absolute;z-index:25;width:170px;height:142px;padding:0;border:0;background:none;cursor:pointer;translate:-50% -50%;filter:drop-shadow(0 10px 12px #000a)}
.dg-chest-btn svg{width:100%;height:100%;overflow:visible}
.dg-chest-btn .dg-chest-hint{position:absolute;left:50%;bottom:-26px;transform:translateX(-50%);white-space:nowrap;font:800 12px Manrope,sans-serif;color:#ffd0c8;text-shadow:0 0 8px #ff3030,0 1px 2px #000;animation:dg-rune 1.6s ease-in-out infinite}
.dg-chest-lid{transform-box:view-box;transform-origin:60px 50px;transition:transform .5s cubic-bezier(.3,1.6,.5,1)}
.dg-chest-btn.open .dg-chest-lid{transform:translateY(-18px) rotate(-9deg) scaleY(.7)}
.dg-chest-beams{opacity:0;transition:opacity .4s .15s}
.dg-chest-btn.open .dg-chest-beams{opacity:1}
.dg-rewards{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px;margin:10px 0 6px}
.dg-reward{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border-radius:12px;background:#0c0716;border:1px solid var(--c);box-shadow:inset 0 0 16px color-mix(in srgb,var(--c) 22%,transparent),0 0 12px color-mix(in srgb,var(--c) 30%,transparent);animation:dg-reward .55s cubic-bezier(.2,1.4,.4,1) both}
.dg-reward img{width:46px;height:46px;object-fit:contain}
.dg-reward small{font-size:10px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--c)}
.dg-reward strong{font-size:11.5px;line-height:1.2;color:#fff}
@keyframes dg-reward{from{opacity:0;transform:translateY(14px) scale(.8)}}
.boss-soul-fly{position:absolute;left:0;top:0;z-index:40;width:52px;height:52px;pointer-events:none;filter:drop-shadow(0 0 10px #ff3030)}
`;
document.head.append(style);

const GATE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V10a8 8 0 0 1 16 0v11Z"/><path d="M12 4v17M7 21v-9M17 21v-9"/><circle cx="12" cy="14" r="1.6" fill="currentColor"/></svg>';
const TREE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 2 5 11h4l-4 6h14l-4-6h4Z"/><path d="M12 17v5"/></svg>';
const toggle=document.createElement('button');toggle.type='button';toggle.id='dungeonToggle';toggle.className='dungeon-entry';
document.querySelector('.stage-circles').append(toggle);
const arena=$('arena');
const scene=document.createElement('div');scene.className='dungeon-scene';scene.hidden=true;arena.prepend(scene);
const panel=document.createElement('div');panel.className='dungeon-panel';panel.hidden=true;arena.append(panel);
const info=document.createElement('span');info.className='dungeon-info';info.hidden=true;document.querySelector('.enemy-info .enemy-type').after(info);
const redWallet=document.createElement('div');redWallet.className='soul-wallet boss-soul-wallet';redWallet.setAttribute('aria-label','Души боссов');redWallet.hidden=true;
redWallet.innerHTML='<span class="soul-wallet-icon" aria-hidden="true"><img src="assets/soul-boss.svg" alt=""></span><div><span class="soul-wallet-label">ДУШИ БОССОВ</span><b id="bossSouls">0</b></div>';
$('soulWallet').after(redWallet);
function placeRedWallet(){const w=$('soulWallet');redWallet.style.top=w.offsetTop+w.offsetHeight+10+'px';redWallet.style.right=getComputedStyle(w).right;}
new ResizeObserver(placeRedWallet).observe($('soulWallet'));addEventListener('resize',placeRedWallet);
// Вторая рамка полоски здоровья — с острыми шипами, показывается только в бою подземелья.
document.querySelector('.hp-metal-frame').insertAdjacentHTML('afterbegin',`<svg class="hp-dungeon-frame" viewBox="0 0 1160 120" preserveAspectRatio="none" aria-hidden="true"><defs>
<linearGradient id="hpdMetal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c9a8ef"/><stop offset=".18" stop-color="#5a3a86"/><stop offset=".4" stop-color="#22123b"/><stop offset=".65" stop-color="#120a20"/><stop offset=".86" stop-color="#4f3278"/><stop offset="1" stop-color="#8f6cc0"/></linearGradient>
<linearGradient id="hpdRim" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f0dcff"/><stop offset=".35" stop-color="#7a4fc4"/><stop offset=".65" stop-color="#1a0d2e"/><stop offset="1" stop-color="#b48cf0"/></linearGradient>
<linearGradient id="hpdGem" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe6ff"/><stop offset=".5" stop-color="#b44cff"/><stop offset="1" stop-color="#3a0a6a"/></linearGradient></defs>
<path d="M0 60 76 2 88 22H1072L1084 2 1160 60 1084 118 1072 98H88L76 118Z" fill="url(#hpdMetal)" stroke="#1a0d2e" stroke-width="3"/>
<path d="M250 22 268 0 286 22ZM470 22 488 4 506 22ZM654 22 672 4 690 22ZM874 22 892 0 910 22ZM250 98 268 120 286 98ZM470 98 488 116 506 98ZM654 98 672 116 690 98ZM874 98 892 120 910 98Z" fill="url(#hpdMetal)" stroke="#1a0d2e" stroke-width="2.5"/>
<path d="M30 60 70 28 80 30H1080L1090 28 1130 60 1090 92 1080 90H80L70 92Z" fill="#06030c" stroke="url(#hpdRim)" stroke-width="4"/>
<path d="M88 22H1072M88 98H1072" stroke="#e0c6ff" stroke-opacity=".35" stroke-width="2"/>
<g transform="translate(44 60)"><path d="M0-26 16 0 0 26-16 0Z" fill="#12081f" stroke="#1a0d2e" stroke-width="3"/><path d="M0-21 12 0 0 21-12 0Z" fill="url(#hpdGem)"/><path d="M0-21 0 0-12 0Z" fill="#f0dcff" opacity=".7"/></g>
<g transform="translate(1116 60)"><path d="M0-26 16 0 0 26-16 0Z" fill="#12081f" stroke="#1a0d2e" stroke-width="3"/><path d="M0-21 12 0 0 21-12 0Z" fill="url(#hpdGem)"/><path d="M0-21 0 0-12 0Z" fill="#f0dcff" opacity=".7"/></g></svg>`);

// ── Сцены: врата и зал босса ─────────────────────────────────────────────
function floorLines(){
 let s='';for(let x=-900;x<=2100;x+=150)s+=`<path d="M${x} 760L${600+(x-600)*.22} 560" stroke="#ffffff" stroke-opacity=".05" stroke-width="2"/>`;
 for(const y of [585,620,668,730])s+=`<path d="M0 ${y}H1200" stroke="#ffffff" stroke-opacity=".045" stroke-width="2"/>`;
 return s;
}
function torch(x,y,tint){
 return `<circle cx="${x}" cy="${y-10}" r="95" fill="url(#dgTorch)" class="dg-torch-glow"/>
 <path d="M${x-14} ${y+26}H${x+14}L${x+8} ${y+6}H${x-8}Z" fill="#2a2236" stroke="#0a0710" stroke-width="3"/>
 <path d="M${x} ${y+26}v26" stroke="#2a2236" stroke-width="6"/>
 <path class="dg-flame" d="M${x} ${y-44}C${x+16} ${y-24} ${x+18} ${y-6} ${x} ${y+6}C${x-18} ${y-6} ${x-16} ${y-24} ${x} ${y-44}Z" fill="${tint}"/>
 <path class="dg-flame" d="M${x} ${y-26}C${x+9} ${y-14} ${x+9} ${y-2} ${x} ${y+4}C${x-9} ${y-2} ${x-9} ${y-14} ${x} ${y-26}Z" fill="#fff6d8"/>`;
}
function sceneDefs(tint,deep){
 return `<linearGradient id="dgWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(deep,'#34294d',.45)}"/><stop offset=".62" stop-color="${mix(deep,'#120e1c',.7)}"/><stop offset="1" stop-color="#050309"/></linearGradient>
 <pattern id="dgBricks" width="120" height="60" patternUnits="userSpaceOnUse"><path d="M0 1H120M0 31H120M60 1V31M0 31V60M120 31V60" stroke="#ffffff" stroke-opacity=".055" stroke-width="2" fill="none"/></pattern>
 <linearGradient id="dgStone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1f1a2c"/><stop offset=".4" stop-color="#4a4262"/><stop offset="1" stop-color="#171320"/></linearGradient>
 <linearGradient id="dgFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(deep,'#120d1c',.6)}"/><stop offset="1" stop-color="#040207"/></linearGradient>
 <radialGradient id="dgTorch"><stop offset="0" stop-color="${tint}" stop-opacity=".55"/><stop offset="1" stop-color="${tint}" stop-opacity="0"/></radialGradient>
 <radialGradient id="dgTint" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="${tint}" stop-opacity=".55"/><stop offset=".6" stop-color="${tint}" stop-opacity=".14"/><stop offset="1" stop-color="${tint}" stop-opacity="0"/></radialGradient>
 <radialGradient id="dgVignette" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
 <filter id="dgBlur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>`;
}
function pillar(x,y,w,h){
 return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#dgStone)" stroke="#07050c" stroke-width="4"/>
 <rect x="${x-12}" y="${y-22}" width="${w+24}" height="26" fill="#3a3350" stroke="#07050c" stroke-width="4"/>
 <rect x="${x-14}" y="${y+h-6}" width="${w+28}" height="24" fill="#2a2438" stroke="#07050c" stroke-width="4"/>
 <path d="M${x+w*.3} ${y+8}V${y+h-8}M${x+w*.7} ${y+8}V${y+h-8}" stroke="#000" stroke-opacity=".25" stroke-width="3"/>`;
}
function gateSvg(open){
 const tint='#b88cff',deep='#1d0f38';
 let runes='';for(let i=0;i<9;i++){const a=Math.PI*(1+i/8),x=600+Math.cos(a)*200,y=330+Math.sin(a)*176;runes+=`<path d="M${x} ${y-9}L${x+7} ${y}L${x} ${y+9}L${x-7} ${y}Z" fill="${tint}" class="dg-rune" style="animation-delay:${-i*.27}s"/>`;}
 const studs=xs=>[250,360,470,560].flatMap(y=>xs.map(x=>`<circle cx="${x}" cy="${y}" r="5" fill="#8a7a6a" stroke="#1a120a" stroke-width="2"/>`)).join('');
 return `<svg class="dg-gate${open?' open':''}" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${sceneDefs(tint,deep)}
 <linearGradient id="dgDoor" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a1a10"/><stop offset=".5" stop-color="#4a301c"/><stop offset="1" stop-color="#22150c"/></linearGradient>
 <radialGradient id="dgLight" cx=".5" cy=".62" r=".6"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#f0dcff"/><stop offset=".6" stop-color="${tint}"/><stop offset="1" stop-color="#2a1450"/></radialGradient>
 <radialGradient id="dgGold" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff2c0"/><stop offset=".5" stop-color="#d9a23a"/><stop offset="1" stop-color="#6b4210"/></radialGradient></defs>
 <rect width="1200" height="760" fill="url(#dgWall)"/><rect width="1200" height="560" fill="url(#dgBricks)"/>
 <path d="M0 560H1200V760H0Z" fill="url(#dgFloor)"/>${floorLines()}
 ${pillar(230,130,92,440)}${pillar(878,130,92,440)}${torch(276,300,'#ff9a3a')}${torch(924,300,'#ff9a3a')}
 <path d="M372 600V318Q372 122 600 110Q828 122 828 318V600Z" fill="url(#dgStone)" stroke="#07050c" stroke-width="6"/>
 <path d="M372 600V318Q372 122 600 110Q828 122 828 318V600" fill="none" stroke="#6a5e88" stroke-width="3" stroke-opacity=".6" transform="translate(0 6)"/>
 <path d="M580 104L600 84 620 104 612 140H588Z" fill="#3a3350" stroke="#07050c" stroke-width="4"/>
 ${runes}
 <path d="M420 600V322Q420 180 600 170Q780 180 780 322V600Z" fill="#040208"/>
 <path class="dg-light" d="M420 600V322Q420 180 600 170Q780 180 780 322V600Z" fill="url(#dgLight)"/>
 <g class="dg-door dg-door-l"><path d="M420 600V322Q420 180 600 170V600Z" fill="url(#dgDoor)" stroke="#120a06" stroke-width="4"/>
  <path d="M420 250H600M420 360H600M420 470H600M420 560H600" stroke="#3a3a44" stroke-width="12"/><path d="M420 250H600M420 360H600M420 470H600M420 560H600" stroke="#6a6a78" stroke-width="3" stroke-opacity=".6" transform="translate(0 -3)"/>
  <path d="M470 210V598M530 186V598" stroke="#120a06" stroke-width="3" stroke-opacity=".6"/>${studs([452,520,568])}</g>
 <g class="dg-door dg-door-r"><path d="M600 170Q780 180 780 322V600H600Z" fill="url(#dgDoor)" stroke="#120a06" stroke-width="4"/>
  <path d="M600 250H780M600 360H780M600 470H780M600 560H780" stroke="#3a3a44" stroke-width="12"/><path d="M600 250H780M600 360H780M600 470H780M600 560H780" stroke="#6a6a78" stroke-width="3" stroke-opacity=".6" transform="translate(0 -3)"/>
  <path d="M670 186V598M730 210V598" stroke="#120a06" stroke-width="3" stroke-opacity=".6"/>${studs([632,680,748])}</g>
 <g class="dg-lock"><circle cx="600" cy="420" r="58" fill="${tint}" opacity=".4" class="dg-lock-glow"/><circle cx="600" cy="420" r="40" fill="url(#dgGold)" stroke="#3a2408" stroke-width="5"/>
  <circle cx="600" cy="420" r="30" fill="none" stroke="#fff2c0" stroke-opacity=".5" stroke-width="2"/>
  <path d="M600 400a10 10 0 0 1 6 18l5 20h-22l5-20a10 10 0 0 1 6-18Z" fill="#12081f"/><path d="M600 404a6 6 0 0 1 3.6 10.8" fill="none" stroke="${tint}" stroke-width="2.4"/></g>
 <ellipse cx="600" cy="720" rx="620" ry="70" fill="#8a7aa8" opacity=".14" filter="url(#dgBlur)"/>
 <rect width="1200" height="760" fill="url(#dgVignette)"/></svg>`;
}
function hallSvg(boss){
 const el=ELEMENTS[boss.element],tint=el.color,deep=el.deep;
 let rose='';for(let i=0;i<8;i++)rose+=`<path d="M600 205L${600+Math.cos(i*Math.PI/4)*74} ${205+Math.sin(i*Math.PI/4)*74}A74 74 0 0 1 ${600+Math.cos((i+1)*Math.PI/4)*74} ${205+Math.sin((i+1)*Math.PI/4)*74}Z" fill="${i%2?tint:el.light}" opacity="${i%2?.55:.3}" stroke="#07050c" stroke-width="4"/>`;
 let glyphs='';for(let i=0;i<16;i++){const a=i/16*Math.PI*2,x=600+Math.cos(a)*262,y=640+Math.sin(a)*52;glyphs+=`<rect x="${x-6}" y="${y-3}" width="12" height="6" rx="2" fill="${tint}" class="dg-rune" style="animation-delay:${-i*.15}s"/>`;}
 const banner=x=>`<path d="M${x} 150H${x+64}V330L${x+32} 304 ${x} 330Z" fill="${mix(tint,'#1a1028',.45)}" stroke="#07050c" stroke-width="4"/><path d="M${x+32} 196L${x+46} 222 ${x+32} 248 ${x+18} 222Z" fill="${el.light}" opacity=".85"/><path d="M${x-6} 150H${x+70}" stroke="#6a5e88" stroke-width="6" stroke-linecap="round"/>`;
 return `<svg class="dg-hall" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${sceneDefs(tint,deep)}</defs>
 <rect width="1200" height="760" fill="url(#dgWall)"/><rect width="1200" height="560" fill="url(#dgBricks)"/>
 <path d="M380 580V270Q380 96 600 86Q820 96 820 270V580Z" fill="#050309" stroke="#07050c" stroke-width="6"/>
 <path d="M380 580V270Q380 96 600 86Q820 96 820 270V580Z" fill="url(#dgTint)"/>
 <circle cx="600" cy="205" r="82" fill="#0a0612" stroke="#3a3350" stroke-width="8"/>${rose}<circle cx="600" cy="205" r="18" fill="${el.light}" opacity=".7"/>
 <path d="M0 560H1200V760H0Z" fill="url(#dgFloor)"/>${floorLines()}
 ${pillar(40,60,120,520)}${pillar(1040,60,120,520)}${pillar(250,120,84,450)}${pillar(866,120,84,450)}
 ${banner(170)}${banner(966)}
 ${torch(292,250,tint)}${torch(908,250,tint)}
 <path d="M346 572H414L404 600H356Z" fill="#2a2236" stroke="#07050c" stroke-width="4"/>${torch(380,540,tint)}
 <path d="M786 572H854L844 600H796Z" fill="#2a2236" stroke="#07050c" stroke-width="4"/>${torch(820,540,tint)}
 <ellipse cx="600" cy="640" rx="300" ry="64" fill="${tint}" opacity=".2" filter="url(#dgBlur)"/>
 <ellipse cx="600" cy="640" rx="290" ry="58" fill="none" stroke="${tint}" stroke-width="4" opacity=".75"/>
 <ellipse cx="600" cy="640" rx="230" ry="44" fill="none" stroke="${el.light}" stroke-width="2" opacity=".45" stroke-dasharray="18 12"/>${glyphs}
 <ellipse cx="600" cy="740" rx="640" ry="80" fill="${tint}" opacity=".14" filter="url(#dgBlur)"/>
 <rect width="1200" height="760" fill="${tint}" opacity=".07"/>
 <rect width="1200" height="760" fill="url(#dgVignette)"/></svg>`;
}
function mix(a,b,t){const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.round(v*(1-t)+y[i]*t).toString(16).padStart(2,'0')).join('');}
function chestSvg(){
 return `<svg viewBox="0 0 120 100" aria-hidden="true"><defs>
 <linearGradient id="dcWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2a6a"/><stop offset="1" stop-color="#1a0b2e"/></linearGradient>
 <linearGradient id="dcGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2c0"/><stop offset=".5" stop-color="#e3a83a"/><stop offset="1" stop-color="#7a4a10"/></linearGradient>
 <radialGradient id="dcGlow"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#ff9a8a"/><stop offset="1" stop-color="#ff3030" stop-opacity="0"/></radialGradient></defs>
 <ellipse cx="60" cy="54" rx="64" ry="48" fill="#ff3030" opacity=".18"/>
 <g class="dg-chest-beams"><path d="M60 46L20-40H44ZM60 46L60-50 72-40ZM60 46L100-40H78ZM60 46L120 0 110-12ZM60 46L0 0 10-12Z" fill="#ffe0d8" opacity=".55"/><circle cx="60" cy="46" r="34" fill="url(#dcGlow)"/></g>
 <path d="M14 50H106V90Q60 98 14 90Z" fill="url(#dcWood)" stroke="#0a0412" stroke-width="3"/>
 <path d="M14 62H106M14 80H106" stroke="url(#dcGold)" stroke-width="4"/><path d="M30 50V92M90 50V92" stroke="url(#dcGold)" stroke-width="5"/>
 <g class="dg-chest-lid"><path d="M12 50Q12 18 60 16Q108 18 108 50Z" fill="url(#dcWood)" stroke="#0a0412" stroke-width="3"/>
  <path d="M12 50Q12 18 60 16Q108 18 108 50" fill="none" stroke="url(#dcGold)" stroke-width="4"/><path d="M30 26V50M90 26V50M60 16V50" stroke="url(#dcGold)" stroke-width="4"/>
  <path d="M60 22l5 9-5 9-5-9Z" fill="#ff5a5a" stroke="#4a0a12" stroke-width="1.5"/></g>
 <rect x="50" y="46" width="20" height="22" rx="4" fill="url(#dcGold)" stroke="#4a2a08" stroke-width="2"/><path d="M60 52l4 6-4 6-4-6Z" fill="#ff3030" stroke="#4a0a12" stroke-width="1.2"/>
 </svg>`;
}

// ── Отрисовка состояния ─────────────────────────────────────────────────
function currentBoss(){return bossById(state.run?.bossId||state.chest?.bossId);}
function nextLevel(){return state.run?state.run.level:state.cleared+1;}
function updateToggle(){
 const inside=mode!=='off',ready=state.keys+(state.chest?1:0)+(state.run?1:0);
 toggle.hidden=!inside&&!unlocked();
 toggle.classList.toggle('in-forest-return',inside);
 const html=inside?TREE_ICON+'<span>В лес</span>':GATE_ICON+'<span>Подземелья</span>'+(ready?`<b>${ready}</b>`:'');
 if(toggle.dataset.view!==html){toggle.innerHTML=html;toggle.dataset.view=html;}
 toggle.title=inside?'Вернуться в Сумрачный лес':'Подземелья: врата и боссы стихий';
 toggle.setAttribute('aria-label',toggle.title);
}
function updateWallet(){
 $('bossSouls').textContent=state.redSouls-redInFlight;
 redWallet.hidden=!(unlocked()||mode!=='off');
 placeRedWallet();
}
function setScene(html){scene.innerHTML=html;scene.hidden=false;}
function setPanel(html,center=false){panel.innerHTML=html;panel.hidden=!html;panel.classList.toggle('center',center);}
function bossSprite(boss){return `<svg viewBox="0 0 200 175" role="img" aria-label="${boss.name}" style="overflow:hidden"><image href="assets/monster-dungeon-${boss.id}.svg" width="200" height="175" preserveAspectRatio="xMidYMid meet"/></svg>`;}
function paintBossColors(boss){
 const el=ELEMENTS[boss.element];
 arena.style.setProperty('--boss-glow',el.color);arena.style.setProperty('--boss-light',el.light);
 $('enemyName').style.setProperty('--enemy-base',el.color);$('enemyName').style.setProperty('--enemy-light',el.light);
}
// Вызывается из render() игры, пока открыто подземелье, вместо отрисовки лесного монстра.
function renderEnemy(){
 arena.classList.remove('boss-fight','true-boss-fight');
 const boss=currentBoss(),fighting=(mode==='fight'||mode==='pause')&&state.run&&boss;
 arena.classList.toggle('dungeon-fight',!!fighting);
 arena.classList.toggle('dungeon-calm',!fighting);
 if(fighting){
  if(renderedEnemyId!=='dungeon-'+boss.id){const old=document.querySelector('#monster > svg:not(.slash-effect)');if(old)old.outerHTML=bossSprite(boss);renderedEnemyId='dungeon-'+boss.id;}
  paintBossColors(boss);
  $('enemyName').textContent=boss.name;
  document.querySelector('.enemy-type').firstChild.textContent='БОСС ПОДЗЕМЕЛЬЯ · '+ELEMENTS[boss.element].name.toUpperCase()+' · УР. ';
  $('level').textContent=state.run.level;
  info.hidden=false;info.innerHTML=`<i>◆</i> ${resistText(boss)}`;
 }else info.hidden=true;
 const lvl=nextLevel();
 document.querySelector('.stage-heading').textContent='ПОДЗЕМЕЛЬЕ';
 $('wave').textContent=lvl;$('previousStage').textContent=lvl>1?lvl-1:'—';$('previousStage').style.visibility=lvl>1?'visible':'hidden';$('previousStageDot').style.visibility=lvl>1?'visible':'hidden';$('nextStage').textContent=lvl+1;
 $('wave').classList.add('boss-stage-glow');$('nextStage').classList.add('boss-stage-glow');$('wave').setAttribute('aria-label','Уровень подземелья '+lvl);
 updateToggle();updateWallet();
}
// Каждые 100 мс вместо таймера лесного босса.
function tick(){
 const fighting=mode==='fight'&&state.run;
 const timer=$('bossTimerBar');timer.hidden=!fighting;$('bossCountdown').hidden=!fighting;$('retreatBoss').hidden=!fighting||locked||hp<=0;
 if(!fighting){$('zoneProgress').textContent=mode==='off'?'':mode==='pause'&&state.run?'Попыток осталось: '+(ATTEMPTS-state.run.used||ATTEMPTS):state.run?'Врата открыты':'Врата закрыты';return;}
 const left=deadline?Math.max(0,deadline-Date.now()):ATTEMPT_MS,seconds=left/1000;
 $('zoneProgress').textContent='Попытка '+state.run.used+' / '+ATTEMPTS;
 $('retreatBoss').textContent='Покинуть зал';
 $('bossCountdown').textContent='Осталось: '+Math.ceil(seconds)+' с';
 timer.setAttribute('aria-valuenow',Math.min(60,seconds).toFixed(1));$('bossTimerFill').style.width=Math.min(100,seconds/60*100)+'%';timer.classList.toggle('timer-urgent',seconds<=10);
 if(hp>0&&Date.now()-savedRunAt>1000){state.run.hp=hp;save();savedRunAt=Date.now();}
 if(deadline&&!locked&&hp>0&&left<=0)endAttempt('time');
}

// ── Ход игры ────────────────────────────────────────────────────────────
function enter(){
 if(mode!=='off'||!unlocked())return;
 if(isTimedBoss()){$('message').textContent='Сначала закончи или прерви бой с боссом этапа.';return;}
 if(locked||hp<=0){$('message').textContent='Дождись следующего противника и попробуй снова.';return;}
 clearBattle();
 forest={hp,maxHp};zoneHtml=document.querySelector('.topbar .zone').innerHTML;
 document.querySelector('.topbar .zone').innerHTML='✦ &nbsp; Подземелье<small>Врата в неизведанное</small>';
 arena.classList.add('in-dungeon');
 for(const b of BOSSES)for(const s of ['','-hurt'])new Image().src=`assets/monster-dungeon-${b.id}${s}.svg`;
 showGate(false);
}
function leave(){
 if(mode==='off'||mode==='busy')return;
 if(state.run&&mode==='fight'){state.run.hp=hp;save();}
 clearTimeout(bannerTimer);arena.querySelectorAll('.dg-banner,.dg-chest-btn').forEach(n=>n.remove());
 clearBattle();mode='off';deadline=0;
 ({hp,maxHp}=forest);forest=null;locked=false;
 document.querySelector('.topbar .zone').innerHTML=zoneHtml;document.querySelector('.stage-heading').textContent='ЭТАП';
 arena.classList.remove('in-dungeon','dungeon-fight','dungeon-calm');scene.hidden=true;scene.innerHTML='';setPanel('');info.hidden=true;
 $('retreatBoss').textContent='Прервать бой';$('bossTimerBar').hidden=true;$('bossCountdown').hidden=true;
 renderedEnemyId='';updateAttackButton();render();checkBossTimer();updateToggle();updateWallet();
 $('message').textContent='Ты вернулся в Сумрачный лес.';
}
function keyRow(){return `<div class="dg-keys"><span title="Ключ в неизведанное"><img src="assets/key-unknown.svg" alt="">${state.keys}</span><span title="Ключ былых врат"><img src="assets/key-replay.svg" alt="">${state.replayKeys}</span></div>`;}
function bossCard(boss,extra){const el=ELEMENTS[boss.element];return `<div class="dg-boss-card" style="--c:${el.color};--l:${el.light}"><img src="assets/monster-dungeon-${boss.id}.svg" alt=""><div><b>${boss.name}</b><small>Стихия: ${el.name}</small><small>${extra}</small></div></div>`;}
function showGate(approach){
 mode='gate';locked=true;deadline=0;
 const open=!!state.run;
 setScene(gateSvg(open));
 if(approach&&settings.animations){
  const s=scene.querySelector('svg');
  s.animate([{transform:'scale(.55) translateY(-6%)',filter:'brightness(.25) blur(2px)'},{transform:'scale(.78) translateY(-2%)',filter:'brightness(.6) blur(1px)',offset:.55},{transform:'scale(1)',filter:'none'}],{duration:1500,easing:'cubic-bezier(.3,.1,.3,1)'});
 }
 renderGatePanel();render();
}
function renderGatePanel(){
 const lvl=nextLevel(),run=state.run,boss=run?bossById(run.bossId):null;
 let html=`<div class="dg-eyebrow">ВРАТА В НЕИЗВЕДАННОЕ</div><h3>Уровень ${lvl}</h3>`;
 if(state.chest){
  const cb=bossById(state.chest.bossId);
  html+=`<p>Сундук ${cb?'«'+cb.name+'»':'босса'} ещё не открыт.</p><div class="dg-row"><button class="dg-primary" data-a="chest">🎁 Открыть сундук босса</button></div>`;
 }else if(run){
  html+=bossCard(boss,`Здоровье: ${fmt(run.hp)} / ${fmt(run.maxHp)} · попыток: ${ATTEMPTS-run.used} из ${ATTEMPTS}`)
   +`<p>${run.replay?'Повторный проход. ':''}Врата открыты — босс ждёт в зале.</p><div class="dg-row"><button class="dg-primary" data-a="hall">⚔ Войти в зал</button></div>`;
 }else{
  html+=`<p>За вратами ждёт случайный босс одной из четырёх стихий. Здоровье: <b>${fmt(bossHealth(lvl))}</b>.<br>Чтобы открыть врата, нужен «Ключ в неизведанное».</p>${keyRow()}
  <div class="dg-row"><button class="dg-primary" data-a="open" ${state.keys?'':'disabled'}><img src="assets/key-unknown.svg" alt="">Открыть ключом</button><button data-a="shop">🛒 Ключи в магазине</button></div>`;
 }
 if(state.cleared>0&&!run&&!state.chest){
  const opts=Array.from({length:state.cleared},(_,i)=>`<option value="${i+1}">Уровень ${i+1}</option>`).join('');
  html+=`<div class="dg-sep"></div><div class="dg-note">Пройденные врата можно открыть снова «Ключом былых врат».</div>
  <div class="dg-row"><select data-f="replay">${opts}</select><button data-a="replay" ${state.replayKeys?'':'disabled'}><img src="assets/key-replay.svg" alt="">Открыть снова (${state.replayKeys})</button></div>`;
 }
 html+=`<div class="dg-row"><button data-a="leave">🌲 Вернуться в лес</button></div>`;
 setPanel(html);
}
function fmt(n){return Number(n).toLocaleString('ru-RU',{maximumFractionDigits:1});}
function pickBoss(){const pool=BOSSES.filter(b=>b.id!==state.lastBoss);return pool[Math.floor(Math.random()*pool.length)];}
function openGate(level,replay){
 const boss=pickBoss(),maxHpBoss=bossHealth(level);
 state.run={level,bossId:boss.id,maxHp:maxHpBoss,hp:maxHpBoss,used:0,replay};state.lastBoss=boss.id;save();
 const gate=scene.querySelector('.dg-gate');setPanel('');
 if(gate&&settings.animations){mode='busy';gate.classList.add('open');setTimeout(()=>startAttempt(),1500);}
 else startAttempt();
}
function startAttempt(){
 const run=state.run,boss=bossById(run.bossId);if(!run||!boss)return showGate(false);
 clearBattle();
 run.used++;save();
 mana=maxMana();manaUpdatedAt=Date.now();powerReadyAt=0;rapidReadyAt=0;aimReadyAt=0;cooldownUntil=0;renderMana();
 hp=run.hp;maxHp=run.maxHp;
 setScene(hallSvg(boss));setPanel('');
 if(settings.animations)scene.querySelector('svg').animate([{opacity:0,transform:'scale(1.08)'},{opacity:1,transform:'scale(1)'}],{duration:600,easing:'ease-out'});
 mode='fight';locked=true;deadline=0;render();
 const el=ELEMENTS[boss.element];
 const banner=document.createElement('div');banner.className='dg-banner';banner.style.setProperty('--c',el.color);banner.textContent=`Попытка ${run.used} из ${ATTEMPTS}`;arena.append(banner);
 clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>{banner.remove();if(mode!=='fight')return;locked=false;deadline=Date.now()+ATTEMPT_MS;updateAttackButton();$('message').textContent=boss.name+' ждёт. В бой!';},settings.animations?1100:0);
 updateAttackButton();
}
function endAttempt(reason){
 const run=state.run;if(!run)return;
 run.hp=Math.max(.01,hp);clearBattle();locked=true;deadline=0;mode='pause';
 const boss=bossById(run.bossId);
 if(run.used>=ATTEMPTS){
  run.hp=run.maxHp;run.used=0;save();render();
  setPanel(`<div class="dg-eyebrow">ПОПЫТКИ ЗАКОНЧИЛИСЬ</div><h3>${boss.name} устоял</h3><p>Здоровье босса восстановилось. Ключ не сгорел — врата остаются открытыми, можно начать заново с тремя новыми попытками.</p>
  <div class="dg-row"><button class="dg-primary" data-a="again">⚔ Начать заново</button><button data-a="gate">К вратам</button></div>`,true);
 }else{
  save();render();
  setPanel(`<div class="dg-eyebrow">${reason==='time'?'ВРЕМЯ ВЫШЛО':'ТЫ ПОКИНУЛ ЗАЛ'}</div><h3>Попытка ${run.used} из ${ATTEMPTS}</h3>
  <p>Здоровье босса сохранится: <b>${fmt(run.hp)} / ${fmt(run.maxHp)}</b>.<br>В следующей попытке мана и навыки восстановятся. Осталось попыток: ${ATTEMPTS-run.used}.</p>
  <div class="dg-row"><button class="dg-primary" data-a="next">⚔ Следующая попытка</button><button data-a="gate">К вратам</button></div>`,true);
 }
 $('message').textContent=reason==='time'?'Время вышло!':'Ты покинул зал.';
}
// Вызывается из attack() игры, когда здоровье босса подземелья падает до нуля.
function onBossKilled(){
 const run=state.run,boss=bossById(run.bossId);
 locked=true;deadline=0;mode='victory';
 gainExperience(maxHp);
 if(!run.replay&&run.level===state.cleared+1)state.cleared++;
 state.chest={level:run.level,bossId:run.bossId};state.run=null;save();
 $('message').textContent=boss.name+' повержен! С него выпал сундук.';
 setTimeout(()=>showChest(boss),settings.animations?750:0);
}
function showChest(boss){
 if(mode==='off')return;
 mode='victory';
 setScene(hallSvg(boss));
 arena.classList.add('dungeon-calm');arena.classList.remove('dungeon-fight');
 const m=$('monster').getBoundingClientRect(),a=arena.getBoundingClientRect(),zoom=arena.currentCSSZoom||1;
 const btn=document.createElement('button');btn.type='button';btn.className='dg-chest-btn';btn.setAttribute('aria-label','Открыть сундук босса');
 btn.innerHTML=chestSvg()+'<span class="dg-chest-hint">Нажми, чтобы открыть</span>';
 btn.style.left=((m.left+m.width/2-a.left)/zoom)+'px';btn.style.top=((m.top+m.height*.62-a.top)/zoom)+'px';
 arena.append(btn);
 if(settings.animations)btn.animate([{transform:'translateY(-160px) scale(.7)',opacity:0},{transform:'translateY(0) scale(1.05)',opacity:1,offset:.6},{transform:'translateY(-14px) scale(1)',offset:.8},{transform:'none'}],{duration:800,easing:'cubic-bezier(.4,0,.6,1)'});
 btn.addEventListener('click',()=>openChest(btn),{once:true});
 setPanel('');
}
function rollBossItem(){
 const eligible=itemPool.filter(i=>CHEST_RARITY_WEIGHTS[i.rarity]);if(!eligible.length)return null;
 const present=Object.entries(CHEST_RARITY_WEIGHTS).filter(([r])=>eligible.some(i=>i.rarity===r));
 let roll=Math.random()*present.reduce((s,[,w])=>s+w,0),rarity=present[0][0];
 for(const [r,w] of present){if((roll-=w)<0){rarity=r;break;}}
 const pool=eligible.filter(i=>i.rarity===rarity);return {...pool[Math.floor(Math.random()*pool.length)]};
}
function openChest(btn){
 const space=24-inventoryItems.length;
 if(space<BOSS_CHEST_ITEMS){
  $('message').textContent=`В инвентаре нужно ${BOSS_CHEST_ITEMS} свободных места. Освободи место и открой сундук у врат.`;
  btn.remove();showGate(false);return;
 }
 const items=[];for(let i=0;i<BOSS_CHEST_ITEMS;i++){const it=rollBossItem();if(it)items.push(it);}
 inventoryItems.push(...items);renderEquipment();persistLoot();
 state.redSouls++;const reward=state.chest;state.chest=null;save();
 btn.classList.add('open');btn.querySelector('.dg-chest-hint')?.remove();
 flyRedSoul(btn);
 const cards=items.map((it,i)=>`<div class="dg-reward" data-i="${i}" style="--c:${rarityFlashColors[it.rarity]||'#edc77b'};animation-delay:${.15+i*.12}s"><small>${rarityLabel(it.rarity)}</small><img src="${it.image}" alt=""><strong>${it.name}</strong></div>`).join('')
  +`<div class="dg-reward" style="--c:#ff4a4a;animation-delay:${.15+items.length*.12}s"><small>Валюта</small><img src="assets/soul-boss.svg" alt=""><strong>Душа босса +1</strong></div>`;
 setTimeout(()=>{
  setPanel(`<div class="dg-eyebrow">НАГРАДА · УРОВЕНЬ ${reward.level}</div><h3>Сундук босса</h3><div class="dg-rewards">${cards}</div>
  ${items.length?'<p class="dg-note">Предметы добавлены в инвентарь.</p>':'<p class="dg-note">Подходящих предметов в игре пока нет.</p>'}
  <div class="dg-row"><button class="dg-primary" data-a="onward">Дальше → к следующим вратам</button><button data-a="leave">🌲 В лес</button></div>`,true);
  panel.querySelectorAll('.dg-reward[data-i]').forEach(card=>attachItemTooltip(card,items[Number(card.dataset.i)]));
 },settings.animations?650:0);
 render();
}
let redInFlight=0;
function flyRedSoul(from){
 if(!settings.animations){updateWallet();return;}
 redInFlight++;redWallet.hidden=false;updateWallet();
 const a=arena.getBoundingClientRect(),zoom=arena.currentCSSZoom||1,f=from.getBoundingClientRect(),t=redWallet.querySelector('img').getBoundingClientRect();
 const sx=(f.left+f.width/2-a.left)/zoom-26,sy=(f.top+f.height*.35-a.top)/zoom-26,tx=(t.left+t.width/2-a.left)/zoom-26,ty=(t.top+t.height/2-a.top)/zoom-26;
 const soul=document.createElement('img');soul.src='assets/soul-boss.svg';soul.alt='';soul.className='boss-soul-fly';arena.append(soul);
 soul.animate([{translate:`${sx}px ${sy}px`,scale:.3,opacity:0},{translate:`${sx}px ${sy-90}px`,scale:1.4,opacity:1,offset:.35},{translate:`${sx}px ${sy-100}px`,scale:1.3,opacity:1,offset:.5},{translate:`${tx}px ${ty}px`,scale:.6,opacity:1}],{duration:1300,delay:250,easing:'cubic-bezier(.5,0,.3,1)',fill:'both'})
  .finished.finally(()=>{soul.remove();redInFlight=Math.max(0,redInFlight-1);updateWallet();redWallet.classList.remove('soul-pulse');void redWallet.offsetWidth;redWallet.classList.add('soul-pulse');});
}

panel.addEventListener('click',event=>{
 const b=event.target.closest('button[data-a]');if(!b||b.disabled)return;
 const a=b.dataset.a;
 if(a==='leave')leave();
 else if(a==='shop'){shopActiveTab='dungeon';$('shopStatus').textContent='';renderShop();$('shopDialog').showModal();}
 else if(a==='open'){if(state.keys<1)return;state.keys--;save();openGate(state.cleared+1,false);}
 else if(a==='replay'){if(state.replayKeys<1)return;const level=Number(panel.querySelector('[data-f="replay"]').value)||1;if(level<1||level>state.cleared)return;state.replayKeys--;save();openGate(level,true);}
 else if(a==='hall'||a==='next'||a==='again'){if(a==='hall'&&settings.animations){const g=scene.querySelector('.dg-gate');mode='busy';setPanel('');g?.classList.add('open');setTimeout(startAttempt,g?.classList.contains('open')?700:0);}else startAttempt();}
 else if(a==='gate')showGate(false);
 else if(a==='chest'){const boss=bossById(state.chest.bossId);if(boss)showChest(boss);}
 else if(a==='onward'){arena.querySelectorAll('.dg-chest-btn').forEach(n=>n.remove());setPanel('');showGate(true);}
});
toggle.addEventListener('click',()=>mode==='off'?enter():leave());
// После закрытия магазина у врат обновляем число ключей на панели.
$('shopDialog').addEventListener('close',()=>{if(mode==='gate')renderGatePanel();updateToggle();});

// ── Магазин: вкладка «Подземелье», цены в душах ─────────────────────────
SHOP_EFFECTS.dungeonKey={label:'Ключ в неизведанное',amount:true,hint:a=>'Ключ в неизведанное × '+Math.max(1,a),apply:a=>{state.keys+=Math.max(1,a);save();updateToggle();return true;}};
SHOP_EFFECTS.replayKey={label:'Ключ былых врат',amount:true,hint:a=>'Ключ былых врат × '+Math.max(1,a),apply:a=>{state.replayKeys+=Math.max(1,a);save();return true;}};
function shopTabs(){
 if(!unlocked())return [];
 return [{id:'dungeon',title:'Подземелье',icon:'assets/key-unknown.svg',items:[
  {id:'dungeon-key-unknown',name:'Ключ в неизведанное',desc:`Открывает новые врата подземелья. Цена: 50 душ + 10 за каждый пройденный уровень (пройдено: ${state.cleared}). У тебя: ${state.keys}`,icon:'assets/key-unknown.svg',price:keyPrice(),discount:0,stock:null,currency:'souls',effect:{type:'dungeonKey',amount:1}},
  {id:'dungeon-key-replay',name:'Ключ былых врат',desc:`Повторно открывает уже пройденные врата — с той же наградой. У тебя: ${state.replayKeys}`,icon:'assets/key-replay.svg',price:REPLAY_PRICE,discount:0,stock:null,currency:'souls',effect:{type:'replayKey',amount:1}}
 ]}];
}

// ── Сброс прогресса и админка ───────────────────────────────────────────
function snapshot(){return JSON.parse(JSON.stringify(state));}
function reset(){if(mode!=='off')leave();state=fresh();save();updateToggle();updateWallet();}
function restore(s){if(!s)return;if(mode!=='off')leave();localStorage.setItem(DUNGEON_KEY,JSON.stringify(s));load();updateToggle();updateWallet();}
const admin=document.getElementById('adminPanel');
if(admin){
 const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-top:10px';
 row.innerHTML='<button type="button" data-k="keys">+1 ключ в неизведанное</button><button type="button" data-k="replayKeys">+1 ключ былых врат</button><button type="button" data-k="redSouls">+1 душа босса</button>';
 row.addEventListener('click',e=>{const k=e.target.closest('button')?.dataset.k;if(!k)return;state[k]++;save();updateToggle();updateWallet();if(mode==='gate')renderGatePanel();});
 admin.append(row);
}

load();updateToggle();updateWallet();
window.dungeonApi={
 active:()=>mode!=='off',
 forest:()=>mode!=='off'?forest:null,
 damageFactor:()=>{const boss=bossById(state.run?.bossId);return mode==='fight'&&boss?1-resistance(boss):1;},
 attackLabel:()=>mode==='off'?null:mode==='fight'?'Готовься…':'Подземелье',
 refresh:()=>{updateToggle();updateWallet();},
 renderEnemy,tick,onBossKilled,shopTabs,snapshot,reset,restore,
 leaveHall:()=>{if(mode==='fight'&&!locked)endAttempt('leave');},
 state:()=>snapshot()
};
})();
