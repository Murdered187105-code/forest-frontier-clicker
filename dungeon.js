// Подземелья: этажи. На каждом этаже — карта с развилками: клетки со случайными боссами обычного мира
// (бой за «Ключ подземелья», сундук с 1 предметом и 20% шансом на самоцвет) ведут к боссу этажа одной из
// четырёх стихий (бой за «Ключ в неизведанное», большой сундук и душа босса). Пройденный босс этажа открывает следующий этаж.
// На каждый бой 3 попытки по 60 с; здоровье противника между попытками сохраняется, мана и навыки — обновляются.
// Бой идёт на той же арене, что и лес: состояние леса откладывается при входе и возвращается при выходе.
(()=>{
const DUNGEON_KEY='forest-frontier-dungeon-v1';
// REPLAY_PRICE и поле replayKeys — цена и запас «Ключа подземелья» (раньше «Ключ былых врат»; имя поля сохранено ради старых сохранений).
const UNLOCK_LEVEL=10,ATTEMPTS=3,ATTEMPT_MS=60000,REPLAY_PRICE=25,BOSS_CHEST_ITEMS=3;
const FLOOR_BOSS_HP=3,MOB_CHEST_ITEMS=1,MOB_GEM_CHANCE=.2;
// Карта этажа: число клеток в каждом шаге. 0 — вход, последний — босс этажа; самый длинный путь — 8 клеток.
const MAP_WIDTHS=[1,3,4,3,4,3,4,3,1],MAP_W=760,MAP_H=320;
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
const CHEST_RARITY_WEIGHTS={Uncommon:60,Rare:29.5,Epic:8,Legendary:2,Divine:.5};
// Сундук босса мира на клетке карты: от обычного до эпического (шансы в процентах).
const MOB_CHEST_RARITY_WEIGHTS={Common:50,Uncommon:30,Rare:15,Epic:5};

// map: карта текущего этажа {floor, seed, boss — босс этажа, visited:[id клеток], current:id}. Сама карта строится заново из seed.
const fresh=()=>({version:1,cleared:0,keys:0,replayKeys:0,redSouls:0,lastBoss:null,run:null,chest:null,map:null});
let state=fresh();
// Режим экрана (не сохраняется): off — лес; gate — у врат; fight — бой; pause — между попытками; victory — сундук; busy — анимация.
let mode='off',forest=null,deadline=0,savedRunAt=0,bannerTimer=null,zoneHtml='';

// Подземелья, ключи в магазине и души боссов открываются с 10 уровня героя.
function unlocked(){return playerLevel>=UNLOCK_LEVEL;}
function bossById(id){return BOSSES.find(b=>b.id===id)||null;}
// Боссы обычного мира (по одному на каждый вид врагов пяти локаций) — противники на клетках карты.
let worldCache=null;
function worldBosses(){
 if(worldCache)return worldCache;
 const groups=[[forestEnemies,'svg'],[fieldEnemies,'webp'],[wasteEnemies,'webp'],[mineEnemies,'webp'],[desertEnemies,'webp']];
 return worldCache=groups.flatMap(([list,ext])=>list.map(e=>({id:e.id,name:eliteNames[e.id]?.[1]||e.name,color:e.color,light:e.light,img:`assets/monster-${e.id}-boss.${ext}`,mob:true,element:'dark'})));
}
function mobById(id){return worldBosses().find(m=>m.id===id)||null;}
// Противник боя или сундука: босс этажа (стихия) или босс мира с клетки карты.
function foeOf(r){return r?(r.mob?mobById(r.mob):bossById(r.bossId)):null;}
function isInt(v,min=0){return Number.isSafeInteger(v)&&v>=min;}
function load(){
 try{
  const s=JSON.parse(localStorage.getItem(DUNGEON_KEY));if(!s||s.version!==1)return;
  const next=fresh();
  for(const k of ['cleared','keys','replayKeys','redSouls'])if(isInt(s[k]))next[k]=s[k];
  if(bossById(s.lastBoss))next.lastBoss=s.lastBoss;
  const r=s.run;
  // Старые сохранения: бой с боссом стихии без клетки карты считается боем с боссом этажа.
  if(r&&isInt(r.level,1)&&(bossById(r.bossId)||mobById(r.mob))&&Number.isFinite(r.maxHp)&&r.maxHp>0&&Number.isFinite(r.hp)&&r.hp>0&&r.hp<=r.maxHp&&isInt(r.used)&&r.used<=ATTEMPTS)
   next.run=r.mob&&mobById(r.mob)?{level:r.level,mob:r.mob,node:isInt(r.node)?r.node:null,maxHp:r.maxHp,hp:r.hp,used:r.used}:{level:r.level,bossId:r.bossId,maxHp:r.maxHp,hp:r.hp,used:r.used};
  const c=s.chest;
  if(c&&isInt(c.level,1)&&(c.mob?mobById(c.mob):bossById(c.bossId)))next.chest=c.mob?{level:c.level,mob:c.mob}:{level:c.level,bossId:c.bossId};
  const m=s.map;
  if(m&&isInt(m.floor,1)&&isInt(m.seed)&&Array.isArray(m.visited)&&m.visited.every(v=>isInt(v))&&isInt(m.current)&&bossById(m.boss))next.map={floor:m.floor,seed:m.seed,boss:m.boss,visited:[...new Set([0,...m.visited])],current:m.current};
  state=next;
 }catch{}
}
function save(){try{localStorage.setItem(DUNGEON_KEY,JSON.stringify(state));}catch{}}
function keyPrice(){return 100+10*state.cleared;}
// Здоровье боссов мира на клетках — прежняя формула боссов подземелья; у босса этажа — в FLOOR_BOSS_HP раз больше.
function bossHealth(level){return Math.max(1,Math.round(100*(playerLevel/10)*level));}
function floorBossHealth(level){return bossHealth(level)*FLOOR_BOSS_HP;}

// ── Карта этажа ──────────────────────────────────────────────────────────
function seededRng(seed){let s=seed|0;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// Строит карту из seed: клетки по шагам (x — доля высоты карты), связи между соседними шагами и два обхода через шаг.
// Клетки одного шага стоят на равных расстояниях, поэтому значки не накладываются.
function buildMap(floor,seed,bossId){
 const r=seededRng(seed),layers=[],edges=[],last=MAP_WIDTHS.length-1;let id=0;
 const mobs=worldBosses();
 MAP_WIDTHS.forEach((w,k)=>{layers[k]=Array.from({length:w},(_,i)=>({id:id++,layer:k,y:(i+1)/(w+1),kind:k===0?'start':k===last?'boss':'mob',mob:k>0&&k<last?mobs[Math.floor(r()*mobs.length)].id:null}));});
 const link=(a,b)=>{if(!edges.some(e=>e.a===a.id&&e.b===b.id))edges.push({a:a.id,b:b.id});};
 const nearest=(list,y)=>[...list].sort((p,q)=>Math.abs(p.y-y)-Math.abs(q.y-y));
 for(let k=0;k<last;k++){
  const A=layers[k],B=layers[k+1];
  A.forEach(a=>{const near=nearest(B,a.y);link(a,near[0]);if(k===0||B.length===1)B.forEach(b=>link(a,b));else if(r()<.55&&near[1])link(a,near[1]);});
  B.forEach(b=>{if(!edges.some(e=>e.b===b.id))link(nearest(A,b.y)[0],b);});
 }
 [[2,0],[4,layers[4].length-1]].forEach(([k,i])=>{const a=layers[k][i];link(a,nearest(layers[k+2],a.y)[0]);});
 return {floor,bossId,nodes:layers.flat(),edges};
}
let mapCache=null;
// Карта текущего этажа; новый этаж получает новую карту.
function floorMap(){
 const floor=state.cleared+1;
 if(!state.map||state.map.floor!==floor){state.map={floor,seed:Math.floor(Math.random()*2**31),boss:pickBoss().id,visited:[0],current:0};save();}
 if(!mapCache||mapCache.floor!==floor||mapCache.seed!==state.map.seed)mapCache={...buildMap(floor,state.map.seed,state.map.boss),seed:state.map.seed};
 return mapCache;
}
const nodeOf=id=>floorMap().nodes.find(n=>n.id===id)||null;
const nextNodes=()=>floorMap().edges.filter(e=>e.a===state.map.current).map(e=>e.b);

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
.dg-toggle-notice{position:fixed;z-index:60;translate:-50% 0;max-width:260px;padding:8px 12px;border-radius:10px;background:#140b22f2;border:1px solid #a77bff88;color:#f0e6ff;font:700 12px Manrope,sans-serif;text-align:center;box-shadow:0 6px 18px #000a;pointer-events:none;animation:dg-notice 2.6s ease forwards}
@keyframes dg-notice{0%{opacity:0;transform:translateY(-4px)}10%,80%{opacity:1;transform:none}100%{opacity:0}}
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
.dg-door-l{transform-origin:452px 0}.dg-door-r{transform-origin:1135px 0}
/* Эффекты врат: мерцание факелов, пульс кристаллов, свет шва и пола, искры и пылинки */
.dgx{pointer-events:none}.dgx>*{mix-blend-mode:screen}
.dgx-torch,.dgx-flame,.dgx-pool,.dgx-crystal,.dgx-lock,.dgx-floor{transform-box:fill-box;transform-origin:center}
.dgx-torch{animation:dgx-flicker 1.9s ease-in-out infinite}.dgx-flame{animation:dgx-flicker 0.7s ease-in-out infinite alternate}
.dgx-pool{animation:dgx-flicker 2.3s ease-in-out infinite}
@keyframes dgx-flicker{0%,100%{opacity:.75;transform:scale(1)}25%{opacity:1;transform:scale(1.07)}55%{opacity:.6;transform:scale(.95)}80%{opacity:.9;transform:scale(1.03)}}
.dgx-crystal{animation:dgx-crystal 2.6s ease-in-out infinite}.dgx-key{animation-duration:3.2s}
@keyframes dgx-crystal{0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}
.dgx-seam{animation:dgx-seam 2.8s ease-in-out infinite;transition:opacity .4s}
@keyframes dgx-seam{0%,100%{opacity:.45}50%{opacity:1}}
.dgx-floor{animation:dgx-crystal 3.4s ease-in-out infinite}
.dgx-lock{animation:dgx-crystal 2.2s ease-in-out infinite;transition:opacity .35s}
.dg-gate.open .dgx-seam,.dg-gate.open .dgx-lock{opacity:0!important;animation:none}
.dgx-ember{fill:#ffcf6a;animation:dgx-ember 2s ease-out infinite}
@keyframes dgx-ember{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}100%{opacity:0;transform:translate(var(--dx),-140px)}}
.dgx-mote{fill:#e0c4ff;animation:dgx-mote 5s ease-in-out infinite}
@keyframes dgx-mote{0%,100%{opacity:0;transform:translate(0,0)}30%,70%{opacity:.85}100%{transform:translate(var(--dx),-70px)}}
.no-animations .dgx *{animation:none!important}.no-animations .dgx-ember,.no-animations .dgx-mote{display:none}
@media (prefers-reduced-motion:reduce){.dgx *{animation:none!important}.dgx-ember,.dgx-mote{display:none}}
.dg-gate.open .dg-door-l,.dg-gate.open .dg-door-r{transform:scaleX(.07);filter:brightness(.45)}
.dg-gate .dg-light{opacity:0;transition:opacity .9s .25s}
.dg-gate.open .dg-light{opacity:1}
.dg-gate .dg-lock{transition:opacity .35s,transform .35s;transform-box:fill-box;transform-origin:center}
.dg-gate.open .dg-lock{opacity:0;transform:scale(1.6)}
#arena.in-dungeon.dungeon-calm #monster,#arena.in-dungeon.dungeon-calm .enemy-info,#arena.in-dungeon.dungeon-calm .skill-bar,#arena.in-dungeon.dungeon-calm .mana-bar{visibility:hidden}
/* Боссы подземелья крупнее обычных врагов примерно в 1,4 раза */
#arena.dungeon-fight #monster{width:clamp(300px,42vh,490px);height:clamp(260px,36vh,430px)}
html.hud-fit #arena.dungeon-fight #monster{width:clamp(300px,calc(var(--hud-h)*.42),490px);height:clamp(260px,calc(var(--hud-h)*.37),430px)}
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
/* Картинки ключей не квадратные: вписываются в ячейку целиком. */
.dungeon-panel img[src*="assets/key-"]{object-fit:contain;filter:drop-shadow(0 1px 2px #000a)}
.dungeon-panel.dg-wide{width:min(780px,96%);bottom:3%;max-height:90%}
/* Карта этажа: лента шагов слева направо. Размеры клеток — в % ширины карты, поэтому значки не накладываются при любом масштабе. */
.dgm-map{position:relative;width:100%;aspect-ratio:${MAP_W}/${MAP_H};margin:8px 0 4px;border-radius:12px;background:linear-gradient(90deg,#1e1530,#2a1c40 50%,#1e1530);border:1px solid #7a5fc044;overflow:hidden}
.dgm-map svg.dgm-edges{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.dgm-edge{fill:none;stroke-linecap:round;stroke:#5b4a7d;stroke-width:3}
.dgm-edge.done{stroke:#c9a6ff;stroke-width:4;filter:drop-shadow(0 0 4px #a878ff)}
.dgm-edge.open{stroke:#e6d6ff;stroke-dasharray:8 6;animation:dgmFlow 1s linear infinite}
@keyframes dgmFlow{to{stroke-dashoffset:-14}}
.dgm-col{position:absolute;top:2.5%;translate:-50% 0;font-size:9.5px;letter-spacing:.08em;color:#a99dbf88;pointer-events:none;white-space:nowrap}
.dungeon-panel button.dgm-node{position:absolute;translate:-50% -50%;width:5.8%;aspect-ratio:44/50;height:auto;padding:0;gap:0;display:grid;place-items:center;border-radius:10px 10px 22px 22px;background:linear-gradient(#3c2c5c,#22183a);border:2px solid #9a7fd0;transition:transform .15s,filter .2s,opacity .2s;--glow:#c9a6ffaa}
.dungeon-panel button.dgm-node img{width:112%;height:112%;object-fit:contain;pointer-events:none;filter:drop-shadow(0 2px 2px #000a)}
.dungeon-panel button.dgm-node.boss{width:10%;aspect-ratio:78/86;border-radius:16px 16px 40px 40px;border:3px solid #ffcf6a;background:linear-gradient(#5a2a40,#2a1020);box-shadow:0 0 24px #ff7a4a66}
.dungeon-panel button.dgm-node.start{width:4.6%;aspect-ratio:1;border-radius:50%;font-size:15px;color:#e6d6ff}
.dungeon-panel button.dgm-node.available{animation:dgmPulse 1.4s ease-in-out infinite}
.dungeon-panel button.dgm-node.available:hover{transform:scale(1.15);background:linear-gradient(#4c3a70,#2a1d46)}
.dungeon-panel button.dgm-node.selected{outline:3px solid #fff;outline-offset:2px}
.dungeon-panel button.dgm-node.locked{opacity:.55;filter:grayscale(.75) brightness(.75);cursor:default}
.dungeon-panel button.dgm-node.done{filter:grayscale(.2) brightness(.85);cursor:default}
.dungeon-panel button.dgm-node.done::after{content:'✓';position:absolute;right:-4px;bottom:-4px;width:16px;height:16px;border-radius:50%;background:#2f9e57;color:#fff;font:700 11px/16px sans-serif;text-align:center;box-shadow:0 0 0 2px #0008}
.dungeon-panel button.dgm-node.here{border-color:#fff;box-shadow:0 0 12px #fff8}
@keyframes dgmPulse{50%{box-shadow:0 0 0 5px var(--glow),0 0 18px var(--glow)}}
@media (prefers-reduced-motion:reduce){.dungeon-panel button.dgm-node.available,.dgm-edge.open{animation:none}}
.dgm-pick{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:6px}
.dgm-pick .dg-boss-card{margin:0}
.dungeon-panel button img.dg-price-soul{width:24px;height:24px;padding:3px;margin-left:-2px;box-sizing:border-box;border-radius:50%;background:radial-gradient(circle,#1a1030 55%,#0b0618);box-shadow:0 0 0 1px #6a4fb099,0 0 6px #4fd8ff55}
.dungeon-panel .dg-keys{display:flex;justify-content:center;gap:14px;margin:4px 0 2px;font-weight:800;color:#e4d4ff}
.dungeon-panel .dg-keys span{display:flex;align-items:center;gap:5px}.dungeon-panel .dg-keys img{width:24px;height:24px}
.dungeon-panel select{padding:9px 10px;border-radius:10px;border:1px solid #b88cff55;background:#120a1f;color:#f0e6ff;font:700 12.5px Manrope,sans-serif}
.dungeon-panel .dg-sep{height:1px;margin:12px 0 6px;background:linear-gradient(90deg,transparent,#b88cff44,transparent)}
.dungeon-panel .dg-note{font-size:11.5px;color:#a594c4}
.dg-boss-card{display:flex;align-items:center;gap:12px;margin:8px 0 10px;padding:10px;border-radius:14px;background:#0c0716;border:1px solid var(--c,#a77bff)55;text-align:left}
.dg-boss-card img{width:80px;height:72px;object-fit:contain;filter:drop-shadow(0 0 10px var(--c,#a77bff))}
.dg-boss-card b{display:block;font:15px 'Russo One',sans-serif;color:var(--l,#fff)}
.dg-boss-card small{display:block;color:#cbbde6}
.dg-banner{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:31;padding:12px 26px;border-radius:14px;background:#0a0612e6;border:1px solid var(--c,#b88cff)88;color:#fff;font:22px 'Russo One',sans-serif;letter-spacing:1px;text-shadow:0 0 16px var(--c,#b88cff);pointer-events:none;animation:dg-banner 1.2s ease-out forwards}
@keyframes dg-banner{0%{opacity:0;transform:translate(-50%,-50%) scale(.7)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}75%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(.96)}}
.dg-chest-btn{position:absolute;z-index:25;width:170px;height:142px;padding:0;border:0;background:none;cursor:pointer;translate:-50% -50%;filter:drop-shadow(0 10px 12px #000a)}
.dg-chest-btn svg{width:100%;height:100%;overflow:visible}
.dg-chest-btn .dg-chest-hint{position:absolute;left:50%;bottom:-26px;transform:translateX(-50%);white-space:nowrap;font:800 12px Manrope,sans-serif;color:#ffd0c8;text-shadow:0 0 8px #ff3030,0 1px 2px #000;animation:dg-rune 1.6s ease-in-out infinite}
/* Открытие: сундук вздрагивает, крышка подскакивает вверх и откидывается назад, из щели бьют лучи */
.dg-chest-lid{transform-box:view-box;transform-origin:1150px 440px;transition:transform .6s .22s cubic-bezier(.3,1.5,.5,1)}
.dg-chest-btn.open .dg-chest-lid{transform:translate(-20px,-150px) rotate(-12deg)}
.dg-chest-btn.open .dg-chest-base,.dg-chest-btn.open .dg-chest-lid image{animation:dg-chest-jolt .24s ease-out}
@keyframes dg-chest-jolt{0%{transform:none}35%{transform:translate(0,14px) scale(1.02,.96)}70%{transform:translate(0,-6px)}100%{transform:none}}
.dg-chest-beams{opacity:0;transform-box:view-box;transform-origin:770px 470px;transform:scaleY(.2);transition:opacity .45s .3s,transform .6s .3s cubic-bezier(.2,.8,.3,1)}
.dg-chest-btn.open .dg-chest-beams{opacity:1;transform:none;animation:dg-chest-rays 1.8s 1s ease-in-out infinite}
@keyframes dg-chest-rays{50%{opacity:.6}}
.dg-chest-aura{opacity:.25;animation:dg-rune 2.2s ease-in-out infinite}.dg-chest-btn.open .dg-chest-aura{opacity:.6}
.dg-chest-btn{width:210px;height:185px}
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
// Врата — картинка assets/dungeon-gate.webp (1586×992). Створки вырезаны из неё же по арке проёма
// и при открытии сжимаются к петлям, открывая свет за вратами.
const GATE_ART='assets/dungeon-gate.webp',GATE_ARCH='M452 812V515A341.5 341.5 0 0 1 1135 515V812Z';
function gateSvg(open){
 return `<svg class="dg-gate dg-gate-art${open?' open':''}" viewBox="0 0 1586 992" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
 <clipPath id="dgDoorL"><path d="M452 812V515A341.5 341.5 0 0 1 793.5 173.5V812Z"/></clipPath>
 <clipPath id="dgDoorR"><path d="M793.5 173.5A341.5 341.5 0 0 1 1135 515V812H793.5Z"/></clipPath>
 <radialGradient id="dgLight" cx=".5" cy=".62" r=".6"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#f0dcff"/><stop offset=".6" stop-color="#b88cff"/><stop offset="1" stop-color="#2a1450"/></radialGradient></defs>
 <image href="${GATE_ART}" width="1586" height="992"/>
 <path d="${GATE_ARCH}" fill="#040208"/><path class="dg-light" d="${GATE_ARCH}" fill="url(#dgLight)"/>
 <g class="dg-door dg-door-l"><image href="${GATE_ART}" width="1586" height="992" clip-path="url(#dgDoorL)"/></g>
 <g class="dg-door dg-door-r"><image href="${GATE_ART}" width="1586" height="992" clip-path="url(#dgDoorR)"/></g>${gateFx()}</svg>`;
}
// Живые эффекты поверх картинки врат: координаты — центры факелов и кристаллов на самой картинке.
const GATE_TORCHES=[[227,371],[1356,371]],GATE_CRYSTALS=[[641,145],[514,222],[423,342],[943,146],[1071,222],[1161,344]];
function gateFx(){
 const rand=(a,b)=>(a+Math.random()*(b-a)).toFixed(2);
 let embers='',motes='';
 for(const [x,y] of GATE_TORCHES)for(let i=0;i<7;i++)embers+=`<circle class="dgx-ember" cx="${x+Number(rand(-14,14))}" cy="${y-20}" r="${rand(2,4)}" style="--dx:${rand(-30,30)}px;animation-duration:${rand(1.6,2.6)}s;animation-delay:${rand(-2.6,0)}s"/>`;
 for(let i=0;i<14;i++)motes+=`<circle class="dgx-mote" cx="${rand(470,1115)}" cy="${rand(260,800)}" r="${rand(2,3.6)}" style="--dx:${rand(-40,40)}px;animation-duration:${rand(4,7)}s;animation-delay:${rand(-7,0)}s"/>`;
 return `<g class="dgx"><defs>
  <radialGradient id="dgxFire"><stop offset="0" stop-color="#ffe7a0" stop-opacity=".95"/><stop offset=".35" stop-color="#ff9a3a" stop-opacity=".45"/><stop offset="1" stop-color="#ff6a00" stop-opacity="0"/></radialGradient>
  <radialGradient id="dgxCrystal"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".3" stop-color="#d9b8ff" stop-opacity=".7"/><stop offset="1" stop-color="#9a5cff" stop-opacity="0"/></radialGradient>
  <radialGradient id="dgxFloor"><stop offset="0" stop-color="#c79bff" stop-opacity=".55"/><stop offset="1" stop-color="#7b3cff" stop-opacity="0"/></radialGradient>
  <radialGradient id="dgxGold"><stop offset="0" stop-color="#fff2c0" stop-opacity=".8"/><stop offset=".5" stop-color="#ffc24a" stop-opacity=".3"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient>
  <linearGradient id="dgxSeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6ccff" stop-opacity="0"/><stop offset=".5" stop-color="#e6ccff" stop-opacity=".9"/><stop offset="1" stop-color="#b88cff" stop-opacity=".6"/></linearGradient></defs>
  ${GATE_TORCHES.map(([x,y],i)=>`<ellipse class="dgx-pool" cx="${x}" cy="860" rx="150" ry="34" fill="url(#dgxFire)" style="animation-delay:${-i*.4}s"/><circle class="dgx-torch" cx="${x}" cy="${y}" r="120" fill="url(#dgxFire)" style="animation-delay:${-i*.55}s"/><circle class="dgx-flame" cx="${x}" cy="${y-6}" r="38" fill="url(#dgxFire)" style="animation-delay:${-i*.3}s"/>`).join('')}
  ${GATE_CRYSTALS.map(([x,y],i)=>`<circle class="dgx-crystal" cx="${x}" cy="${y}" r="30" fill="url(#dgxCrystal)" style="animation-delay:${-i*.45}s"/>`).join('')}
  <circle class="dgx-crystal dgx-key" cx="793" cy="88" r="52" fill="url(#dgxCrystal)"/>
  <rect class="dgx-seam" x="789" y="180" width="9" height="632" fill="url(#dgxSeam)"/>
  <ellipse class="dgx-floor" cx="793" cy="832" rx="230" ry="42" fill="url(#dgxFloor)"/>
  <circle class="dgx-lock" cx="793" cy="575" r="78" fill="url(#dgxGold)"/>
  ${embers}${motes}</g>`;
}
// Залы, нарисованные картинкой (1586×992), по стихии босса; стихии без картинки рисуются кодом ниже.
// У всех картинок одна раскладка: точки — центры огней, кристаллов (знамёна и окно-роза) и магического круга, по ним ложатся живые эффекты.
const HALL_LAYOUT={flames:[[260,335,110],[1329,335,110],[450,630,95],[1139,630,95]],crystals:[[102,295,34],[1487,295,34],[793,250,120]],circle:[793,845,500,92]};
const HALL_ART={
 dark:{src:'assets/dungeon-hall-dark.webp',fire:'#d9a8ff',deep:'#8a3cff',...HALL_LAYOUT},
 fire:{src:'assets/dungeon-hall-fire.webp',fire:'#ffc46a',deep:'#ff5a00',...HALL_LAYOUT},
 light:{src:'assets/dungeon-hall-light.webp',fire:'#fff0b8',deep:'#ffc23a',...HALL_LAYOUT},
 ice:{src:'assets/dungeon-hall-ice.webp',fire:'#c8f0ff',deep:'#2aa0ff',...HALL_LAYOUT}
};
function hallArt(art){
 const rand=(a,b)=>(a+Math.random()*(b-a)).toFixed(2);
 let embers='',motes='';
 for(const [x,y] of art.flames)for(let i=0;i<6;i++)embers+=`<circle class="dgx-ember" cx="${x+Number(rand(-12,12))}" cy="${y-18}" r="${rand(2,4)}" style="fill:${art.fire};--dx:${rand(-26,26)}px;animation-duration:${rand(1.6,2.6)}s;animation-delay:${rand(-2.6,0)}s"/>`;
 for(let i=0;i<18;i++)motes+=`<circle class="dgx-mote" cx="${rand(300,1290)}" cy="${rand(300,900)}" r="${rand(2,3.6)}" style="--dx:${rand(-40,40)}px;animation-duration:${rand(4,7)}s;animation-delay:${rand(-7,0)}s"/>`;
 const [cx,cy,rx,ry]=art.circle;
 return `<svg class="dg-hall dg-hall-art" viewBox="0 0 1586 992" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
  <radialGradient id="dgxHallFire"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="${art.fire}" stop-opacity=".5"/><stop offset="1" stop-color="${art.deep}" stop-opacity="0"/></radialGradient>
  <radialGradient id="dgxHallCrystal"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".4" stop-color="${art.fire}" stop-opacity=".45"/><stop offset="1" stop-color="${art.deep}" stop-opacity="0"/></radialGradient>
  <radialGradient id="dgxHallFloor"><stop offset=".55" stop-color="${art.deep}" stop-opacity="0"/><stop offset=".85" stop-color="${art.fire}" stop-opacity=".45"/><stop offset="1" stop-color="${art.deep}" stop-opacity="0"/></radialGradient></defs>
  <image href="${art.src}" width="1586" height="992"/>
  <g class="dgx">
   ${art.flames.map(([x,y,r],i)=>`<circle class="dgx-torch" cx="${x}" cy="${y}" r="${r}" fill="url(#dgxHallFire)" style="animation-delay:${-i*.5}s"/><circle class="dgx-flame" cx="${x}" cy="${y-4}" r="${Math.round(r*.35)}" fill="url(#dgxHallFire)" style="animation-delay:${-i*.3}s"/>`).join('')}
   ${art.crystals.map(([x,y,r],i)=>`<circle class="dgx-crystal" cx="${x}" cy="${y}" r="${r}" fill="url(#dgxHallCrystal)" style="animation-delay:${-i*.7}s"/>`).join('')}
   <ellipse class="dgx-floor" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#dgxHallFloor)"/>
   ${embers}${motes}</g></svg>`;
}
function hallSvg(boss){
 if(HALL_ART[boss.element])return hallArt(HALL_ART[boss.element]);
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
// Сундук босса — картинка assets/boss-chest.webp (1536×1024). Крышка вырезана по светящейся щели
// (с центральной брошью — она висит на крышке) и при открытии поднимается, из щели бьёт красный свет.
const CHEST_ART='assets/boss-chest.webp',CHEST_LID='M0 0H1536V425L1320 428 960 478 762 482 744 556H518L500 487 200 490 0 490Z';
function chestSvg(){
 return `<svg viewBox="140 -150 1260 1110" aria-hidden="true"><defs>
 <clipPath id="dcLid"><path d="${CHEST_LID}"/></clipPath>
 <clipPath id="dcBase"><path d="${CHEST_LID}M0 0V1024H1536V0Z" clip-rule="evenodd"/></clipPath>
 <radialGradient id="dcGlow"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#ffb0a8"/><stop offset="1" stop-color="#ff2a2a" stop-opacity="0"/></radialGradient>
 <linearGradient id="dcRay" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff3ef" stop-opacity=".9"/><stop offset="1" stop-color="#ff4040" stop-opacity="0"/></linearGradient></defs>
 <ellipse class="dg-chest-aura" cx="770" cy="560" rx="560" ry="360" fill="url(#dcGlow)"/>
 <g class="dg-chest-beams"><path d="M770 470L470-120H600ZM770 470L700-150H840ZM770 470L940-130H1070ZM770 470L250 60 300-10ZM770 470L1290 40 1240-30Z" fill="url(#dcRay)"/><ellipse cx="770" cy="470" rx="380" ry="120" fill="url(#dcGlow)"/></g>
 <g class="dg-chest-base"><image href="${CHEST_ART}" width="1536" height="1024" clip-path="url(#dcBase)"/></g>
 <g class="dg-chest-lid"><image href="${CHEST_ART}" width="1536" height="1024" clip-path="url(#dcLid)"/></g>
 </svg>`;
}

// ── Отрисовка состояния ─────────────────────────────────────────────────
function currentBoss(){return foeOf(state.run||state.chest);}
function nextLevel(){return state.run?state.run.level:state.cleared+1;}
function updateToggle(){
 const inside=mode!=='off',ready=state.keys+(state.chest?1:0)+(state.run?1:0);
 toggle.hidden=!inside&&!unlocked();
 toggle.classList.toggle('in-forest-return',inside);
 const html=inside?TREE_ICON+'<span>В приключение</span>':GATE_ICON+'<span>Подземелья</span>'+(ready?`<b>${ready}</b>`:'');
 if(toggle.dataset.view!==html){toggle.innerHTML=html;toggle.dataset.view=html;}
 toggle.title=inside?'Вернуться: '+locationName():'Подземелья: врата и боссы стихий';
 toggle.setAttribute('aria-label',toggle.title);
}
function updateWallet(){
 $('bossSouls').textContent=state.redSouls-redInFlight;
 redWallet.hidden=!(unlocked()||mode!=='off');
 placeRedWallet();
}
function setScene(html){scene.innerHTML=html;scene.hidden=false;}
function setPanel(html,center=false,wide=false){panel.innerHTML=html;panel.hidden=!html;panel.classList.toggle('center',center);panel.classList.toggle('dg-wide',wide);}
// Цвета противника: у босса этажа — его стихия, у босса мира — цвета его вида.
function foeColors(boss){return boss.mob?{color:boss.color,light:boss.light}:ELEMENTS[boss.element];}
function bossSprite(boss){if(boss.mob)return `<svg viewBox="0 0 200 175" role="img" aria-label="${boss.name}" style="overflow:hidden"><image href="${boss.img}" width="200" height="175" preserveAspectRatio="xMidYMid meet"/></svg>`;if(window.bossPuppets?.has(boss.id))return window.bossPuppets.html(boss.id,boss.name);return `<svg viewBox="0 0 200 175" role="img" aria-label="${boss.name}" style="overflow:hidden"><image href="assets/monster-dungeon-${boss.id}.svg" width="200" height="175" preserveAspectRatio="xMidYMid meet"/></svg>`;}
function paintBossColors(boss){
 const el=foeColors(boss);
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
  document.querySelector('.enemy-type').firstChild.textContent=(boss.mob?'БОСС МИРА':'БОСС ЭТАЖА · '+ELEMENTS[boss.element].name.toUpperCase())+' · ЭТАЖ ';
  $('level').textContent=state.run.level;
  // У боссов мира на клетках нет стихии и сопротивления.
  info.hidden=!!boss.mob;if(!boss.mob)info.innerHTML=`<i>◆</i> ${resistText(boss)}`;
 }else info.hidden=true;
 const lvl=nextLevel();
 document.querySelector('.stage-heading').textContent='ПОДЗЕМЕЛЬЕ';
 $('wave').textContent=lvl;$('previousStage').textContent=lvl>1?lvl-1:'—';$('previousStage').style.visibility=lvl>1?'visible':'hidden';$('previousStageDot').style.visibility=lvl>1?'visible':'hidden';$('nextStage').textContent=lvl+1;
 $('wave').classList.add('boss-stage-glow');$('nextStage').classList.add('boss-stage-glow');$('wave').setAttribute('aria-label','Этаж подземелья '+lvl);
 updateToggle();updateWallet();
}
// Каждые 100 мс вместо таймера лесного босса.
function tick(){
 const fighting=mode==='fight'&&state.run;
 const timer=$('bossTimerBar');timer.hidden=!fighting;$('bossCountdown').hidden=!fighting;$('retreatBoss').hidden=!fighting||locked||hp<=0;
 if(!fighting){$('zoneProgress').textContent=mode==='off'?'':mode==='pause'&&state.run?'Попыток осталось: '+(ATTEMPTS-state.run.used||ATTEMPTS):state.run?'Бой начат':'Этаж '+(state.cleared+1);return;}
 const left=deadline?Math.max(0,deadline-Date.now()):ATTEMPT_MS,seconds=left/1000;
 $('zoneProgress').textContent='Попытка '+state.run.used+' / '+ATTEMPTS;
 $('retreatBoss').textContent='Покинуть зал';
 $('bossCountdown').textContent='Осталось: '+Math.ceil(seconds)+' с';
 timer.setAttribute('aria-valuenow',Math.min(60,seconds).toFixed(1));$('bossTimerFill').style.width=Math.min(100,seconds/60*100)+'%';timer.classList.toggle('timer-urgent',seconds<=10);
 if(hp>0&&Date.now()-savedRunAt>1000){state.run.hp=hp;save();savedRunAt=Date.now();}
 if(deadline&&!locked&&hp>0&&left<=0)endAttempt('time');
}

// ── Ход игры ────────────────────────────────────────────────────────────
// Подсказка под кнопкой входа: строка сообщений в игре скрыта, и без неё отказ выглядел как неработающая кнопка.
function toggleNotice(text){
 document.querySelector('.dg-toggle-notice')?.remove();
 const r=toggle.getBoundingClientRect(),note=document.createElement('div');note.className='dg-toggle-notice';note.textContent=text;note.setAttribute('role','status');
 note.style.left=r.left+r.width/2+'px';note.style.top=r.bottom+8+'px';document.body.append(note);setTimeout(()=>note.remove(),2600);
}
// Пока враг погибает и следующий ещё не появился, вход откладывается и происходит сам, как только враг появится.
let enterWait=null;
function enter(){
 if(mode!=='off'||!unlocked())return;
 if(locked||hp<=0){
  if(enterWait)return;toggleNotice('Вход в подземелье после этого противника…');const until=Date.now()+5000;
  enterWait=setInterval(()=>{if(mode!=='off'||Date.now()>until){clearInterval(enterWait);enterWait=null;return;}if(!locked&&hp>0){clearInterval(enterWait);enterWait=null;enter();}},100);
  return;
 }
 clearBattle();
 // Бой с боссом этапа можно оставить: его таймер замирает, пока ты в подземелье, и продолжается по возвращении.
 forest={hp,maxHp,bossLeft:isTimedBoss()&&bossDeadline?Math.max(0,bossDeadline-Date.now()):0};zoneHtml=document.querySelector('.topbar .zone').innerHTML;
 document.querySelector('.topbar .zone').innerHTML='✦ &nbsp; Подземелье';
 arena.classList.add('in-dungeon');
 for(const b of BOSSES){for(const s of ['','-hurt'])new Image().src=`assets/monster-dungeon-${b.id}${s}.svg`;window.bossPuppets?.preload(b.id);}
 for(const n of floorMap().nodes){const m=mobById(n.mob);if(m){new Image().src=m.img;new Image().src=m.img.replace(/(\.\w+)$/,'-hurt$1');}}
 showGate(false);
}
function leave(){
 if(mode==='off'||mode==='busy')return;
 if(state.run&&mode==='fight'){state.run.hp=hp;save();}
 clearTimeout(bannerTimer);arena.querySelectorAll('.dg-banner,.dg-chest-btn').forEach(n=>n.remove());
 clearBattle();mode='off';deadline=0;
 ({hp,maxHp}=forest);if(forest.bossLeft&&isTimedBoss())bossDeadline=Date.now()+forest.bossLeft;forest=null;locked=false;
 document.querySelector('.topbar .zone').innerHTML=zoneHtml;document.querySelector('.stage-heading').textContent='ЭТАП';
 arena.classList.remove('in-dungeon','dungeon-fight','dungeon-calm');scene.hidden=true;scene.innerHTML='';setPanel('');info.hidden=true;
 $('retreatBoss').textContent='Прервать бой';$('bossTimerBar').hidden=true;$('bossCountdown').hidden=true;
 renderedEnemyId='';updateAttackButton();render();checkBossTimer();updateToggle();updateWallet();
 $('message').textContent='Ты вернулся: '+locationName()+'.';
}
function keyRow(){return `<div class="dg-keys"><span title="Ключ в неизведанное"><img src="assets/key-unknown.webp" alt="">${state.keys}</span><span title="Ключ подземелья"><img src="assets/key-dungeon.webp" alt="">${state.replayKeys}</span></div>`;}
// Иконка босса этажа — его кукла в покое, собранная в одну картинку (assets/bosses/icons/<id>.png); у босса мира — его картинка.
function bossIcon(boss){return boss.mob?boss.img:`assets/bosses/icons/${boss.id}.png`;}
function bossCard(boss,extra){const el=foeColors(boss);return `<div class="dg-boss-card" style="--c:${el.color};--l:${el.light}"><img src="${bossIcon(boss)}" alt=""><div><b>${boss.name}</b><small>${boss.mob?'Босс мира':'Босс этажа · стихия: '+el.name}</small><small>${extra}</small></div></div>`;}
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
// Выбранная на карте клетка (id); если она перестала быть доступной, выбирается первая доступная.
let selectedNode=null;
// Координаты клетки в системе карты MAP_W×MAP_H.
function nodePos(n){return [40+n.layer*(MAP_W-80)/(MAP_WIDTHS.length-1),MAP_H*(.06+.94*n.y)];}
function mapHtml(){
 const map=floorMap(),path=state.map.visited,visited=new Set(path),open=new Set(nextNodes()),last=MAP_WIDTHS.length-1;
 const edges=map.edges.map(e=>{
  const [x1,y1]=nodePos(nodeOf(e.a)),[x2,y2]=nodePos(nodeOf(e.b)),mx=(x1+x2)/2,i=path.indexOf(e.a);
  const cls=i>=0&&path[i+1]===e.b?'done':e.a===state.map.current&&open.has(e.b)?'open':'';
  return `<path class="dgm-edge ${cls}" d="M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}"/>`;
 }).join('');
 const cols=MAP_WIDTHS.map((_,k)=>`<span class="dgm-col" style="left:${nodePos({layer:k,y:0})[0]/MAP_W*100}%">${k===0?'ВХОД':k===last?'БОСС ЭТАЖА':'ШАГ '+k}</span>`).join('');
 const nodes=map.nodes.map(n=>{
  const [x,y]=nodePos(n),foe=n.kind==='boss'?bossById(map.bossId):mobById(n.mob);
  const st=n.id===state.map.current?(n.kind==='start'?'here':'here done'):visited.has(n.id)?'done':open.has(n.id)?'available':'locked';
  const title=n.kind==='start'?'Вход на этаж':foe.name+(n.kind==='boss'?' — босс этажа':' — босс мира');
  const inner=n.kind==='start'?'⚑':`<img src="${bossIcon(foe)}" alt="">`;
  return `<button type="button" class="dgm-node ${n.kind} ${st}${n.id===selectedNode?' selected':''}" data-a="node" data-n="${n.id}" style="left:${x/MAP_W*100}%;top:${y/MAP_H*100}%" title="${title}" aria-label="${title}"${st==='available'?'':' aria-disabled="true"'}>${inner}</button>`;
 }).join('');
 return `<div class="dgm-map"><svg class="dgm-edges" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="none" aria-hidden="true">${edges}</svg>${cols}${nodes}</div>`;
}
function soulPrice(n){return `${n} <img class="dg-price-soul" src="assets/soul.svg" alt="душ">`;}
function renderGatePanel(){
 const lvl=nextLevel(),run=state.run;
 let html=`<div class="dg-eyebrow">ПОДЗЕМЕЛЬЕ</div><h3>Этаж ${lvl}</h3>`;
 if(state.chest){
  const cb=foeOf(state.chest);
  html+=`<p>Сундук ${cb?'«'+cb.name+'»':'босса'} ещё не открыт.</p><div class="dg-row"><button class="dg-primary" data-a="chest">🎁 Открыть сундук</button></div>`;
 }else if(run){
  const boss=foeOf(run);
  html+=bossCard(boss,`Здоровье: ${fmt(run.hp)} / ${fmt(run.maxHp)} · попыток: ${ATTEMPTS-run.used} из ${ATTEMPTS}`)
   +`<p>Бой начат — ${boss.name} ждёт в зале.</p><div class="dg-row"><button class="dg-primary" data-a="hall">⚔ Войти в зал</button></div>`;
 }else{
  const open=nextNodes();if(!open.includes(selectedNode))selectedNode=open[0]??null;
  const node=nodeOf(selectedNode),map=floorMap();
  html+=mapHtml();
  if(node){
   const boss=node.kind==='boss',foe=boss?bossById(map.bossId):mobById(node.mob);
   const have=boss?state.keys:state.replayKeys,keyName=boss?'Ключ в неизведанное':'Ключ подземелья';
   html+=`<div class="dgm-pick">${bossCard(foe,`Здоровье: ${fmt(boss?floorBossHealth(lvl):bossHealth(lvl))}`)}<button class="dg-primary" data-a="fight" ${have?'':'disabled'} title="${have?'Потратить':'Нужен'} «${keyName}»"><img src="assets/${boss?'key-unknown':'key-dungeon'}.webp" alt="">В бой</button></div>`;
  }
  const kp=keyPrice(),canKey=state.keys<MAX_UNKNOWN_KEYS&&souls>=kp;
  html+=`<p class="dg-note">Боссы мира на клетках — за «Ключ подземелья», босс этажа — за «Ключ в неизведанное».</p>${keyRow()}
  <div class="dg-row"><button data-a="buyKey" ${canKey?'':'disabled'} title="${state.keys>=MAX_UNKNOWN_KEYS?'В запасе может быть только один такой ключ':souls>=kp?'':'Не хватает душ'}"><img src="assets/key-unknown.webp" alt="">Ключ в неизведанное · ${soulPrice(kp)}</button><button data-a="buyReplay" ${souls>=REPLAY_PRICE?'':'disabled'} title="${souls>=REPLAY_PRICE?'':'Не хватает душ'}"><img src="assets/key-dungeon.webp" alt="">Ключ подземелья · ${soulPrice(REPLAY_PRICE)}</button></div>`;
 }
 html+=`<div class="dg-row"><button data-a="leave">Вернуться в приключение</button></div>`;
 setPanel(html,false,!run&&!state.chest);
}
function fmt(n){return Number(n).toLocaleString('ru-RU',{maximumFractionDigits:1});}
function pickBoss(){const pool=BOSSES.filter(b=>b.id!==state.lastBoss);return pool[Math.floor(Math.random()*pool.length)];}
// Начинает бой на клетке карты (ключ уже потрачен): босс мира или босс этажа с утроенным здоровьем.
function openFight(node){
 const floor=state.cleared+1,boss=node.kind==='boss',hpMax=boss?floorBossHealth(floor):bossHealth(floor);
 state.run=boss?{level:floor,bossId:floorMap().bossId,maxHp:hpMax,hp:hpMax,used:0}:{level:floor,mob:node.mob,node:node.id,maxHp:hpMax,hp:hpMax,used:0};
 selectedNode=null;save();
 const gate=scene.querySelector('.dg-gate');setPanel('');
 if(gate&&settings.animations){mode='busy';gate.classList.add('open');setTimeout(()=>startAttempt(),1500);}
 else startAttempt();
}
function startAttempt(){
 const run=state.run,boss=foeOf(run);if(!run||!boss)return showGate(false);
 clearBattle();
 run.used++;save();
 mana=maxMana();manaUpdatedAt=Date.now();powerReadyAt=0;rapidReadyAt=0;aimReadyAt=0;cooldownUntil=0;window.manaBurnFx?.resetCooldowns();renderMana();
 hp=run.hp;maxHp=run.maxHp;
 setScene(hallSvg(boss));setPanel('');
 if(settings.animations)scene.querySelector('svg').animate([{opacity:0,transform:'scale(1.08)'},{opacity:1,transform:'scale(1)'}],{duration:600,easing:'ease-out'});
 mode='fight';locked=true;deadline=0;render();
 const el=foeColors(boss);
 const banner=document.createElement('div');banner.className='dg-banner';banner.style.setProperty('--c',el.color);banner.textContent=`Попытка ${run.used} из ${ATTEMPTS}`;arena.append(banner);
 clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>{banner.remove();if(mode!=='fight')return;locked=false;deadline=Date.now()+ATTEMPT_MS;updateAttackButton();$('message').textContent=boss.name+' ждёт. В бой!';},settings.animations?1100:0);
 updateAttackButton();
}
function endAttempt(reason){
 const run=state.run;if(!run)return;
 run.hp=Math.max(.01,hp);clearBattle();locked=true;deadline=0;mode='pause';
 const boss=foeOf(run);
 if(run.used>=ATTEMPTS){
  run.hp=run.maxHp;run.used=0;save();render();
  setPanel(`<div class="dg-eyebrow">ПОПЫТКИ ЗАКОНЧИЛИСЬ</div><h3>${boss.name} устоял</h3><p>Здоровье босса восстановилось. Ключ не сгорел — можно начать заново с тремя новыми попытками.</p>
  <div class="dg-row"><button class="dg-primary" data-a="again">⚔ Начать заново</button><button data-a="gate">К карте</button></div>`,true);
 }else{
  save();render();
  setPanel(`<div class="dg-eyebrow">${reason==='time'?'ВРЕМЯ ВЫШЛО':'ТЫ ПОКИНУЛ ЗАЛ'}</div><h3>Попытка ${run.used} из ${ATTEMPTS}</h3>
  <p>Здоровье босса сохранится: <b>${fmt(run.hp)} / ${fmt(run.maxHp)}</b>.<br>В следующей попытке мана и навыки восстановятся. Осталось попыток: ${ATTEMPTS-run.used}.</p>
  <div class="dg-row"><button class="dg-primary" data-a="next">⚔ Следующая попытка</button><button data-a="gate">К карте</button></div>`,true);
 }
 $('message').textContent=reason==='time'?'Время вышло!':'Ты покинул зал.';
}
// Вызывается из attack() игры, когда здоровье босса подземелья падает до нуля.
function onBossKilled(){
 const run=state.run,boss=foeOf(run);
 locked=true;deadline=0;mode='victory';
 gainExperience(maxHp);
 if(run.mob){
  // Босс мира: клетка пройдена, герой встаёт на неё; сундук — 1 предмет и шанс на самоцвет.
  const m=state.map;if(m&&m.floor===run.level&&Number.isInteger(run.node)&&!m.visited.includes(run.node)){m.visited.push(run.node);m.current=run.node;}
  state.chest={level:run.level,mob:run.mob};
 }else{
  // Босс этажа открывает следующий этаж (новая карта строится при следующем показе врат).
  if(run.level===state.cleared+1)state.cleared++;
  state.lastBoss=run.bossId;state.chest={level:run.level,bossId:run.bossId};
 }
 state.run=null;save();
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
function rollBossItem(weights=CHEST_RARITY_WEIGHTS){
 const eligible=lootPool().filter(i=>weights[i.rarity]);if(!eligible.length)return null;
 const present=Object.entries(weights).filter(([r])=>eligible.some(i=>i.rarity===r));
 let roll=Math.random()*present.reduce((s,[,w])=>s+w,0),rarity=present[0][0];
 for(const [r,w] of present){if((roll-=w)<0){rarity=r;break;}}
 const pool=eligible.filter(i=>i.rarity===rarity);return {...pool[Math.floor(Math.random()*pool.length)]};
}
function openChest(btn){
 // У босса этажа в сундуке BOSS_CHEST_ITEMS предметов, у босса мира — MOB_CHEST_ITEMS.
 const space=INVENTORY_LIMIT-inventoryItems.length,mob=!!state.chest?.mob,need=mob?MOB_CHEST_ITEMS:BOSS_CHEST_ITEMS;
 // Нет места — сундук остаётся на месте закрытым, подсказка на нём и панель с кнопкой инвентаря; после освобождения места его можно открыть снова.
 if(space<need){
  const hint=btn.querySelector('.dg-chest-hint');if(hint)hint.textContent='Нужно мест в инвентаре: '+need+' · свободно '+Math.max(0,space);
  if(settings.animations)btn.animate([{rotate:'0deg'},{rotate:'-6deg'},{rotate:'6deg'},{rotate:'-3deg'},{rotate:'0deg'}],{duration:420});
  btn.addEventListener('click',()=>openChest(btn),{once:true});
  setPanel(`<h3>Инвентарь заполнен</h3><p>В сундуке ${need} предмет${need===1?'':'а'} — освободи ${need-Math.max(0,space)} мест${need-Math.max(0,space)===1?'о':'а'} в инвентаре и нажми на сундук снова.</p>
  <div class="dg-row"><button class="dg-primary" data-a="inventory">🎒 Открыть инвентарь</button><button data-a="gate">К карте</button></div>`,true);
  return;
 }
 const items=[];for(let i=0;i<need;i++){const it=starterWeapon(rollBossItem(mob?MOB_CHEST_RARITY_WEIGHTS:CHEST_RARITY_WEIGHTS));if(it)items.push(it);}
 inventoryItems.push(...items);renderEquipment();persistLoot();
 // Самоцветы для инкрустации (gems.js) — сразу в запас: у босса этажа 1–3 случайных, у босса мира — один камень с шансом MOB_GEM_CHANCE; душа босса — только с босса этажа.
 const gemsWon=(mob?(Math.random()<MOB_GEM_CHANCE?window.gems?.grantChestGems(1):[]):window.gems?.grantChestGems())||[];
 if(!mob)state.redSouls++;const reward=state.chest;state.chest=null;save();
 btn.classList.add('open');btn.querySelector('.dg-chest-hint')?.remove();
 if(!mob)flyRedSoul(btn);
 const cards=items.map((it,i)=>`<div class="dg-reward" data-i="${i}" style="--c:${rarityFlashColors[it.rarity]||'#edc77b'};animation-delay:${.15+i*.12}s"><small>${rarityLabel(it.rarity)}</small><img src="${it.image}" alt=""><strong>${it.name}</strong></div>`).join('')
  +gemsWon.map(([id,count],i)=>{const g=window.gems.GEMS[id];return `<div class="dg-reward" style="--c:${g.color};animation-delay:${.15+(items.length+i)*.12}s"><small>Самоцвет</small><span class="dg-gem">${window.gems.gemSvg(id)}</span><strong>${g.name}${count>1?' ×'+count:''}</strong></div>`;}).join('')
  +(mob?'':`<div class="dg-reward" style="--c:#ff4a4a;animation-delay:${.15+(items.length+gemsWon.length)*.12}s"><small>Валюта</small><img src="assets/soul-boss.svg" alt=""><strong>Душа босса +1</strong></div>`);
 setTimeout(()=>{
  setPanel(`<div class="dg-eyebrow">НАГРАДА · ЭТАЖ ${reward.level}</div><h3>${mob?'Сундук босса мира':'Сундук босса этажа'}</h3><div class="dg-rewards">${cards}</div>
  ${items.length?'<p class="dg-note">Предметы добавлены в инвентарь'+(gemsWon.length?', самоцветы — в запас ювелира в кузнице':'')+'.</p>':'<p class="dg-note">Подходящих предметов в игре пока нет.</p>'}
  <div class="dg-row"><button class="dg-primary" data-a="onward">${mob?'Дальше → к карте этажа':'Дальше → на этаж '+(state.cleared+1)}</button><button data-a="leave">Вернуться в приключение</button></div>`,true);
  panel.querySelectorAll('.dg-reward[data-i]').forEach(card=>{addLevelPlate(card,items[Number(card.dataset.i)]);attachItemTooltip(card,items[Number(card.dataset.i)]);});
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
 else if(a==='buyReplay'){if(souls<REPLAY_PRICE)return;souls-=REPLAY_PRICE;state.replayKeys++;save();saveProgress();render();updateWallet();$('message').textContent='Куплен «Ключ подземелья» за '+REPLAY_PRICE+' душ.';renderGatePanel();}
 else if(a==='node'){const id=Number(b.dataset.n);if(nextNodes().includes(id)&&id!==selectedNode){selectedNode=id;renderGatePanel();}}
 // Босс мира тратит «Ключ подземелья», босс этажа — «Ключ в неизведанное».
 else if(a==='fight'){const node=nodeOf(selectedNode);if(!node||state.run||state.chest||!nextNodes().includes(node.id))return;const k=node.kind==='boss'?'keys':'replayKeys';if(state[k]<1)return;state[k]--;updateToggle();openFight(node);}
 else if(a==='buyKey'){const price=keyPrice();if(state.keys>=MAX_UNKNOWN_KEYS||souls<price)return;souls-=price;state.keys++;save();saveProgress();render();updateToggle();updateWallet();$('message').textContent='Куплен «Ключ в неизведанное» за '+price+' душ.';renderGatePanel();}
 else if(a==='hall'||a==='next'||a==='again'){if(a==='hall'&&settings.animations){const g=scene.querySelector('.dg-gate');mode='busy';setPanel('');g?.classList.add('open');setTimeout(startAttempt,g?.classList.contains('open')?700:0);}else startAttempt();}
 else if(a==='gate'){arena.querySelectorAll('.dg-chest-btn').forEach(n=>n.remove());showGate(false);}
 else if(a==='inventory')$('openInventory').click();
 else if(a==='chest'){const boss=foeOf(state.chest);if(boss)showChest(boss);}
 else if(a==='onward'){arena.querySelectorAll('.dg-chest-btn').forEach(n=>n.remove());setPanel('');showGate(true);}
});
toggle.addEventListener('click',()=>mode==='off'?enter():leave());
// После закрытия магазина у врат обновляем число ключей на панели.
$('shopDialog').addEventListener('close',()=>{if(mode==='gate')renderGatePanel();updateToggle();});

// ── Магазин: вкладка «Подземелье», цены в душах ─────────────────────────
// Ключей в неизведанное в запасе может быть не больше MAX_UNKNOWN_KEYS: следующий покупается, когда прежний потрачен.
const MAX_UNKNOWN_KEYS=1;
// Ключи сверх лимита, купленные до его появления, забираются с возвратом душ по текущей цене ключа.
function capKeys(){
 const extra=state.keys-MAX_UNKNOWN_KEYS;if(extra<=0)return;
 const refund=extra*keyPrice();state.keys=MAX_UNKNOWN_KEYS;souls+=refund;save();saveProgress();
 $('message').textContent='Лишние ключи в неизведанное ('+extra+') обменяны обратно: +'+refund+' душ.';
}
SHOP_EFFECTS.dungeonKey={label:'Ключ в неизведанное',amount:true,hint:a=>'Ключ в неизведанное × '+Math.max(1,a),apply:a=>{
 if(state.keys>=MAX_UNKNOWN_KEYS)return 'В запасе может быть только '+MAX_UNKNOWN_KEYS+' ключ в неизведанное';
 state.keys=Math.min(MAX_UNKNOWN_KEYS,state.keys+Math.max(1,a));save();updateToggle();return true;}};
SHOP_EFFECTS.replayKey={label:'Ключ подземелья',amount:true,hint:a=>'Ключ подземелья × '+Math.max(1,a),apply:a=>{state.replayKeys+=Math.max(1,a);save();return true;}};
// Ключи больше не продаются в магазине: оба покупаются кнопками прямо у врат (renderGatePanel).
function shopTabs(){
 return [];
}

// ── Сброс прогресса и админка ───────────────────────────────────────────
function snapshot(){return JSON.parse(JSON.stringify(state));}
function reset(){if(mode!=='off')leave();state=fresh();save();updateToggle();updateWallet();}
function restore(s){if(!s)return;if(mode!=='off')leave();localStorage.setItem(DUNGEON_KEY,JSON.stringify(s));load();capKeys();updateToggle();updateWallet();}
const admin=document.getElementById('adminPanel');
if(admin){
 const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-top:10px';
 row.innerHTML='<button type="button" data-k="keys">+1 ключ в неизведанное</button><button type="button" data-k="replayKeys">+1 ключ подземелья</button><button type="button" data-k="redSouls">+1 душа босса</button>';
 row.addEventListener('click',e=>{const k=e.target.closest('button')?.dataset.k;if(!k)return;state[k]++;save();updateToggle();updateWallet();if(mode==='gate')renderGatePanel();});
 admin.append(row);
}

load();capKeys();updateToggle();updateWallet();
window.dungeonApi={
 active:()=>mode!=='off',
 forest:()=>mode!=='off'?forest:null,
 damageFactor:()=>{const boss=bossById(state.run?.bossId);return mode==='fight'&&boss&&!state.run.mob?1-resistance(boss):1;},
 attackLabel:()=>mode==='off'?null:mode==='fight'?'Готовься…':'Подземелье',
 refresh:()=>{updateToggle();updateWallet();},
 renderEnemy,tick,onBossKilled,shopTabs,snapshot,reset,restore,
 leaveHall:()=>{if(mode==='fight'&&!locked)endAttempt('leave');},
 state:()=>snapshot()
};
})();
