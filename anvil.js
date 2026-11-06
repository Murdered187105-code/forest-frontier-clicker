// Наковальня: три разных предмета одной редкости сплавляются в один случайный предмет по собственной таблице шансов.
// Результат определяется и сохраняется сразу при запуске — анимация лишь показывает уже полученный предмет,
// поэтому закрытие окна или перезагрузка страницы не позволяют переиграть исход или потерять награду.
// Плавильня: предметы распыляются в реагенты своей редкости, количество — случайное в пределах таблицы.
// Наковальня: предметы комплектов куются из реагентов — молот, искры и звук удара.
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
const STAT_NAMES={damage:'урону',damageBonus:'доп. урону удара',maxMana:'максимуму маны',manaRegen:'восстановлению маны',goldBonus:'золоту за убийство',attackSpeed:'скорости атаки',critChance:'шансу крита',critDamage:'урону крита'};
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
html body #anvilDialog .anvil-tab{flex:1;min-height:36px;border:0!important;border-radius:999px;font-weight:700;font-size:13px;line-height:1;font-family:inherit;color:var(--anvil-gold)!important;background:none!important;box-shadow:none!important;cursor:pointer;transition:color .2s}
html body #anvilDialog .anvil-tab:hover:not(.active):not(:disabled){color:#fff0c4!important;background:#c9a35a1a!important}
html body #anvilDialog .anvil-tab.active{color:#3a2405!important;background:linear-gradient(180deg,#fff0b8,#e2b45a 45%,#a8762c)!important;box-shadow:0 0 10px #f5d68a33!important;cursor:default}
html body #anvilDialog .anvil-tab:disabled:not(.active){opacity:.45;cursor:not-allowed}
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
/* Закрытый результат — тот же задник карточки, что у сундука; вопрос уже на картинке */
.anvil-result.closed,.anvil-result.ready{border-color:transparent;background:url(assets/card-back.png) center/100% 100% no-repeat border-box}
.anvil-result.closed .anvil-question,.anvil-result.ready .anvil-question{display:none}
/* Готовый результат: те же слои и эффекты редкости, что у карточки сундука (index.html), только мельче. При наведении покачивание останавливается, чтобы не спорить с наклоном */
.anvil-result.ready{--reward-color:var(--rc);--rc-fx:250px;--rc-rise:-175px;overflow:visible;background:none}
.anvil-result.ready:is(:hover,:focus-visible){animation:none}
/* Окно не прыгает при открытии: без ползунка на время переворота и с местом под три строки статуса */
html body #anvilDialog:has(.rc-flipping,.rc-wave-host){overflow:hidden}
html body #anvilDialog #anvilStatus{min-height:54.6px}
.anvil-result.ready small.anvil-hint{z-index:5;left:6px;right:6px;bottom:8px;padding:2px 0;border-radius:5px;background:#07130bd9;opacity:1;font-size:8.5px;white-space:nowrap}
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
/* Плавильня */
.reagent-bank{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin:0 0 14px}
.reagent-chip{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 3px 5px;border-radius:10px;border:1px solid transparent;background:radial-gradient(ellipse at 50% 30%,#1c3123,#09130d) padding-box,linear-gradient(145deg,var(--rc),#4a3a1a 55%,var(--rc)) border-box;text-align:center}
.reagent-chip img{width:40px;height:40px;object-fit:contain;filter:drop-shadow(0 0 6px color-mix(in srgb,var(--rc) 45%,transparent))}
.reagent-chip b{font-size:14px;line-height:1.2;color:#f6eed6;font-variant-numeric:tabular-nums}
.reagent-chip small{font-size:8px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--rc)}
.reagent-chip.pulse{animation:reagent-pulse .6s ease-out}
@keyframes reagent-pulse{40%{transform:scale(1.14);box-shadow:0 0 18px var(--rc)}}
.smelt-stage{position:relative;height:250px;max-width:420px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid #c9a35a44;background:radial-gradient(ellipse at 50% 88%,#4a2a0e44,transparent 55%),radial-gradient(ellipse at 50% 20%,#1f3d2a,#07130b 70%);box-shadow:inset 0 0 34px #000c}
.smelt-stack,.smelt-empty{position:absolute;left:50%;top:24px;width:96px;height:118px;margin-left:-48px;z-index:3}
.smelt-stack{cursor:pointer}
.smelt-stack:focus-visible{outline:2px solid var(--anvil-gold);outline-offset:6px;border-radius:12px}
.smelt-stack[hidden],.smelt-empty[hidden]{display:none}
.smelt-empty{display:grid;place-items:center;padding:8px;border:2px dashed #c9a35a55;border-radius:10px;text-align:center;font-size:10px;line-height:1.3;color:#8f8565}
.smelt-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:6px;border-radius:10px;border:2px solid transparent;background:radial-gradient(ellipse at 50% 25%,#1c3123,#09130d) padding-box,linear-gradient(145deg,var(--rc),#4a3a1a 55%,var(--rc)) border-box;box-shadow:0 6px 14px #000b;text-align:center;transform:translate(var(--x),var(--y)) rotate(var(--r))}
.smelt-card img{width:52px;height:52px;object-fit:contain;filter:drop-shadow(0 3px 4px #000a)}
.smelt-card.has-level{gap:2px;justify-content:flex-start}
.smelt-card.has-level img{flex:none;width:42px;height:42px}
.smelt-card.has-level strong{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
.smelt-card strong{font-size:9.5px;font-weight:600;line-height:1.1;color:#efe6cd}
.smelt-card small{font-size:8px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--rc)}
.smelt-card.card-in{animation:smelt-card-in .32s cubic-bezier(.2,.8,.3,1.2)}
@keyframes smelt-card-in{from{transform:translate(var(--x),calc(var(--y) - 46px)) rotate(calc(var(--r) - 14deg));opacity:0}}
.smelt-count{position:absolute;top:-9px;right:-14px;z-index:60;min-width:26px;height:26px;padding:0 7px;border-radius:13px;display:grid;place-items:center;font-size:12px;font-weight:800;color:#3a2405;background:linear-gradient(#fff0b8,#c99a45);box-shadow:0 2px 6px #000a}
.smelt-decor{position:absolute;pointer-events:none;display:none}
.smelt-vortex,.smelt-circle{display:block}
.smelt-vortex{left:50%;top:150px;width:200px;height:200px;margin:-100px 0 0 -100px;border-radius:50%;opacity:.35;background:repeating-conic-gradient(from 0deg,#f5d68a33 0 10deg,transparent 10deg 40deg);-webkit-mask:radial-gradient(circle,#000 10%,transparent 68%);mask:radial-gradient(circle,#000 10%,transparent 68%);opacity:0;animation:smelt-spin 3s linear infinite}
.smelt-circle{left:50%;top:150px;width:210px;height:210px;margin:-105px 0 0 -105px;opacity:.5;transition:opacity .4s,filter .4s;animation:smelt-spin 30s linear infinite}
.smelt-circle.active{opacity:1;filter:drop-shadow(0 0 8px #f5d68a) brightness(1.4);animation-duration:4s}
@keyframes smelt-spin{to{rotate:360deg}}
.smelt-gem{position:absolute;z-index:8;width:46px;height:46px;margin:-23px 0 0 -23px;pointer-events:none;filter:drop-shadow(0 0 10px var(--rc))}
.smelt-gem img{width:100%;height:100%;object-fit:contain}
.smelt-fly{position:fixed;z-index:20;width:40px;height:40px;margin:-20px 0 0 -20px;pointer-events:none;filter:drop-shadow(0 0 10px var(--rc))}
.smelt-fly img{width:100%;height:100%;object-fit:contain}
.smelt-dot{position:absolute;z-index:7;width:5px;height:5px;margin:-2.5px;border-radius:50%;background:var(--rc);box-shadow:0 0 6px var(--rc),0 0 2px #fff;pointer-events:none}
.smelt-result{position:absolute;left:0;right:0;bottom:12px;z-index:9;display:flex;flex-wrap:wrap;justify-content:center;gap:6px 10px;padding:0 10px}
.smelt-result span{display:flex;align-items:center;gap:4px;padding:3px 9px 3px 4px;border-radius:999px;background:#07130bdd;border:1px solid color-mix(in srgb,var(--rc) 60%,transparent);font-weight:800;font-size:13px;color:var(--rc);animation:anvil-pop .4s ease-out}
.smelt-result img{width:24px;height:24px;object-fit:contain}
.smelt-preview{margin:14px auto 0;max-width:420px;padding:10px 14px;border:1px solid #c9a35a66;border-radius:12px;background:linear-gradient(#0d2416,#081a10);font-size:13px}
.smelt-preview h3{margin:0 0 6px;font-weight:700;font-size:11px;line-height:1.3;font-family:inherit;letter-spacing:.08em;text-transform:uppercase;color:var(--anvil-gold-dim);text-align:center}
.smelt-row{display:flex;align-items:center;gap:8px;padding:3px 0;border-top:1px solid #c9a35a1a}
.smelt-row:first-of-type{border-top:0}
.smelt-row img{width:28px;height:28px;object-fit:contain}
.smelt-row span{flex:1;font-weight:700;color:var(--rc)}
.smelt-row em{font-style:normal;font-size:11px;color:#a99d7c}
.smelt-row b{color:#f3e7c4;font-variant-numeric:tabular-nums}
.smelt-preview .anvil-odds-empty{margin:0;text-align:center;color:#a99d7c;font-size:12px}
.smelt-buttons{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
html body #anvilDialog .smelt-clear{min-height:44px;padding:0 18px;border-radius:12px;font-family:inherit;color:var(--anvil-gold)!important;background:#0d2416!important;border:1px solid #c9a35a66!important;box-shadow:none!important}
.smelt-quick{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:14px}
html body #anvilDialog .smelt-quick button{min-height:28px;padding:0 11px;border-radius:999px;font-family:inherit;font-size:11px;color:var(--rc)!important;background:#0a1a10!important;border:1px solid color-mix(in srgb,var(--rc) 55%,transparent)!important;box-shadow:none!important}
@media(max-width:540px){.reagent-bank{grid-template-columns:repeat(3,minmax(0,1fr))}.smelt-row em{display:none}}
/* Наковальня: ковка */
.craft-stage{position:relative;height:270px;max-width:440px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid #c9a35a44;background:radial-gradient(ellipse at 50% 92%,#5a2a0e55,transparent 55%),radial-gradient(ellipse at 50% 15%,#1f3d2a,#07130b 72%);box-shadow:inset 0 0 34px #000c}
.craft-anvil{position:absolute;left:50%;bottom:10px;width:250px;margin-left:-125px;height:auto;z-index:2;filter:drop-shadow(0 10px 12px #000c)}
.craft-hammer{position:absolute;z-index:4;width:170px;height:56px;transform-origin:160px 28px;transform:rotate(34deg);filter:drop-shadow(0 6px 8px #000b);pointer-events:none}
.craft-stage.idle .craft-hammer{animation:craft-hammer-idle 2.6s ease-in-out infinite}
@keyframes craft-hammer-idle{50%{transform:rotate(38deg)}}
.craft-pile{position:absolute;inset:0;z-index:3;pointer-events:none}
.craft-pile img{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;object-fit:contain;filter:drop-shadow(0 3px 4px #000a)}
.craft-ghost{position:absolute;left:50%;top:26px;width:86px;height:86px;margin-left:-43px;z-index:5;display:grid;place-items:center;pointer-events:none}
.craft-ghost img{width:100%;height:100%;object-fit:contain;opacity:.32;filter:grayscale(.4) drop-shadow(0 0 10px var(--rc));animation:craft-ghost 2.4s ease-in-out infinite}
@keyframes craft-ghost{50%{transform:translateY(-6px);opacity:.45}}
.craft-ghost.forged img{opacity:1;filter:drop-shadow(0 0 16px var(--rc)) drop-shadow(0 0 4px #fff);animation:craft-forged .7s cubic-bezier(.2,.8,.3,1.3)}
@keyframes craft-forged{from{transform:translateY(70px) scale(.2);opacity:0}}
.craft-ghost-empty{position:absolute;left:50%;top:44px;translate:-50% 0;z-index:4;font-size:12px;color:#a99d7c;text-align:center;white-space:nowrap}
.craft-spark{position:absolute;z-index:6;width:4px;height:4px;margin:-2px;border-radius:50%;background:#fff1b0;box-shadow:0 0 6px #ffb347,0 0 2px #fff;pointer-events:none}
.craft-spark.streak{width:10px;height:2px;margin:-1px -5px;border-radius:2px}
.craft-flash{position:absolute;z-index:6;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;background:radial-gradient(circle,#fff8d8,#ffb34788 35%,transparent 68%);pointer-events:none;opacity:0}
.craft-ring{position:absolute;z-index:6;width:60px;height:22px;margin:-11px 0 0 -30px;border-radius:50%;border:2px solid #ffd27a;pointer-events:none;opacity:0}
#anvilCraftPanel{position:relative}
.craft-fly{position:absolute;z-index:20;width:34px;height:34px;margin:-17px 0 0 -17px;pointer-events:none;filter:drop-shadow(0 0 8px var(--rc))}
.craft-fly img{width:100%;height:100%;object-fit:contain}
.craft-label{position:absolute;left:0;right:0;bottom:12px;z-index:7;text-align:center;font-weight:800;font-size:14px;color:var(--rc);text-shadow:0 0 10px #000,0 0 14px color-mix(in srgb,var(--rc) 60%,transparent);animation:anvil-pop .4s ease-out}
.craft-cost{margin-top:14px}
.craft-cost .craft-target{display:flex;align-items:center;gap:10px;margin:0 0 8px;padding-bottom:8px;border-bottom:1px solid #c9a35a22}
.craft-cost .craft-target img{width:42px;height:42px;object-fit:contain}
.craft-cost .craft-target strong{display:block;font-size:14px;color:#f6eed6}
.craft-cost .craft-target small{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--rc)}
.craft-cost .smelt-row b.lack{color:#ff8a7a}
.craft-cost .smelt-row b.ok{color:#9ff28f}
.craft-filters{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:18px 0 6px}
html body #anvilDialog .craft-filters button{min-height:28px;padding:0 11px;border-radius:999px;font-family:inherit;font-size:11px;color:var(--fc,#f5d68a)!important;background:#0a1a10!important;border:1px solid color-mix(in srgb,var(--fc,#c9a35a) 55%,transparent)!important;box-shadow:none!important}
html body #anvilDialog .craft-filters button.active{color:#1a1408!important;background:var(--fc,#e2b45a)!important;border-color:transparent!important}
.craft-set{margin-top:12px}
.craft-set h4{display:flex;align-items:center;gap:8px;margin:0 0 6px;font-size:12px;color:var(--rc);letter-spacing:.04em}
.craft-set h4 small{padding:1px 7px;border-radius:999px;font-size:9px;font-weight:700;color:#cbbf9e;border:1px solid #c9a35a44}
.craft-set h4:after{content:'';flex:1;height:1px;background:linear-gradient(90deg,color-mix(in srgb,var(--rc) 50%,transparent),transparent)}
.craft-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:7px}
.craft-items .anvil-item small.craft-made{color:#9ff28f;letter-spacing:0;text-transform:none;font-weight:700}
.craft-items .anvil-item.unknown{border-style:dashed;background:radial-gradient(ellipse at 50% 25%,#101c14,#050b07) padding-box,linear-gradient(145deg,color-mix(in srgb,var(--rc) 45%,transparent),#2a2414 55%,color-mix(in srgb,var(--rc) 35%,transparent)) border-box}
.craft-items .anvil-item.unknown img{filter:brightness(0) drop-shadow(0 0 1px #c9a35a99);opacity:.75}
.craft-items .anvil-item.unknown strong{color:#8f8565}
.craft-items .anvil-item.unknown small:not(.craft-made){color:#8f8565}
/* Появление выкованного предмета по редкости */
.craft-fx{position:absolute;pointer-events:none;z-index:6}
.craft-aura{z-index:3;width:var(--size);height:var(--size);margin:calc(var(--size) / -2) 0 0 calc(var(--size) / -2);border-radius:50%;background:radial-gradient(circle,var(--rc),transparent 68%);opacity:var(--glow);animation:craft-aura 2.6s ease-in-out infinite}
@keyframes craft-aura{0%,100%{transform:scale(.9)}50%{transform:scale(1.1)}}
.craft-rays{z-index:3;width:210px;height:210px;margin:-105px 0 0 -105px;border-radius:50%;background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--rc) 60%,transparent) 0 6deg,transparent 6deg 22deg);-webkit-mask:radial-gradient(circle,#000 18%,transparent 70%);mask:radial-gradient(circle,#000 18%,transparent 70%);animation:craft-rays 10s linear infinite}
.craft-rays.divine{width:250px;height:250px;margin:-125px 0 0 -125px;background:repeating-conic-gradient(from 0deg,#fffbe6bb 0 4deg,transparent 4deg 15deg);animation-duration:16s}
@keyframes craft-rays{to{rotate:360deg}}
.craft-burst{width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;background:radial-gradient(circle,#fff,var(--rc) 32%,transparent 68%);opacity:0}
.craft-mote{width:6px;height:6px;margin:-3px;border-radius:50%;background:var(--rc);box-shadow:0 0 8px var(--rc),0 0 2px #fff;opacity:0}
.craft-mote.dim{background:#e6eaec;box-shadow:0 0 5px #bfc5c8}
.craft-mote.big{width:8px;height:8px;margin:-4px}
.craft-mote.spark{width:12px;height:3px;margin:-1.5px -6px;border-radius:2px;background:#fff1b0;box-shadow:0 0 8px var(--rc)}
.craft-mote.ember{width:4px;height:4px;margin:-2px;background:#ffcf6a;box-shadow:0 0 6px #ff6a1f}
.craft-star{width:12px;height:12px;margin:-6px;background:#fff;clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);filter:drop-shadow(0 0 4px var(--rc));opacity:0}
.craft-star.big{width:16px;height:16px;margin:-8px;background:#fffbe6}
.craft-ripple{z-index:5;width:80px;height:80px;margin:-40px 0 0 -40px;border-radius:50%;border:2px solid var(--rc);box-shadow:0 0 12px var(--rc),inset 0 0 10px var(--rc);opacity:0}
.craft-ripple.halo{border-color:#fffbe6;border-width:3px}
.craft-pillar{z-index:5;width:80px;height:100%;margin-left:-40px;transform-origin:top;background:linear-gradient(to bottom,#fffbe6ee,#ffe375aa 55%,transparent);filter:blur(3px);opacity:0}
.craft-whiteout{z-index:7;width:100%;height:100%;margin:0;transform:translate(-50%,-50%);background:radial-gradient(circle at 50% 30%,#fffdf2,#ffe37588 45%,transparent 80%);opacity:0}
.craft-ghost.forged img{filter:drop-shadow(0 0 var(--glow-size,12px) var(--rc)) drop-shadow(0 0 3px #fff)}
@media(max-width:540px){.craft-stage{height:250px}.craft-anvil{width:220px;margin-left:-110px}.craft-items{grid-template-columns:repeat(auto-fill,minmax(74px,1fr))}}
@media(max-width:540px){html body #anvilDialog{padding:16px}.anvil-intro{font-size:12px}.anvil-grid{grid-template-columns:repeat(auto-fill,minmax(78px,1fr))}.anvil-item img{width:40px;height:40px}.anvil-result-empty{font-size:10px}}
@media(prefers-reduced-motion:reduce){#anvilDialog *,#anvilDialog *:before,#anvilDialog *:after{animation:none!important;transition:none!important}}
`;
document.head.append(style);

// Кнопка в левом меню — сразу под «Древом талантов».
const openButton=document.createElement('button');
openButton.className='feature-button';openButton.id='openAnvil';openButton.type='button';
openButton.setAttribute('aria-label','Кузница');openButton.setAttribute('aria-haspopup','dialog');
openButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6.5h14.5L21 5v2.2c0 2-1.8 3.6-4.3 3.6h-1.4c-1 0-1.8.8-1.8 1.8V15h-4v-2.2c0-1-.8-1.8-1.8-1.8H5.2C3.4 11 2 9.6 2 7.8Z"/><path d="M8 15h8l1.6 3.5H6.4Z"/><path d="M4.5 21h15"/></svg><span class="feature-label">Кузница</span>';
$('openTalents').after(openButton);

const chute=(id,d)=>`<g data-chute="${id}"><path class="anvil-chute-shell" d="${d}"/><path class="anvil-chute-rim" d="${d}"/><path class="anvil-chute-channel" d="${d}"/><path class="anvil-chute-shine" d="${d}"/><path class="anvil-lava" pathLength="100" d="${d}"/><path class="anvil-lava-flow" d="${d}"/></g>`;
const dialog=document.createElement('dialog');
dialog.id='anvilDialog';dialog.setAttribute('aria-labelledby','anvilTitle');
dialog.innerHTML=`<div class="equipment-heading"><div><div class="talents-eyebrow">РЕМЕСЛО</div><h2 id="anvilTitle">Кузница</h2></div><button id="closeAnvil" type="button" aria-label="Закрыть кузницу">×</button></div>
<div class="anvil-tabs" role="tablist" aria-label="Разделы кузницы"><button class="anvil-tab active" type="button" role="tab" id="anvilFusionTab" data-tab="fusion" aria-selected="true" aria-controls="anvilFusionPanel">Сплавление</button><button class="anvil-tab" type="button" role="tab" id="anvilSmeltTab" data-tab="smelt" aria-selected="false" aria-controls="anvilSmeltPanel" tabindex="-1">Плавильня</button><button class="anvil-tab" type="button" role="tab" id="anvilCraftTab" data-tab="craft" aria-selected="false" aria-controls="anvilCraftPanel" tabindex="-1">Наковальня</button><button class="anvil-tab" type="button" role="tab" id="anvilJewelTab" data-tab="jewel" aria-selected="false" aria-controls="anvilJewelPanel" tabindex="-1">Ювелир</button></div>
<section class="anvil-panel" id="anvilJewelPanel" role="tabpanel" aria-labelledby="anvilJewelTab" hidden></section>
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
</section>
<section class="anvil-panel" id="anvilSmeltPanel" role="tabpanel" aria-labelledby="anvilSmeltTab" hidden>
<p class="anvil-intro">Брось в плавильню ненужные предметы — они распадутся на реагенты своей редкости. Количество реагентов случайное, предметы исчезают.</p>
<div class="reagent-bank" id="reagentBank" aria-label="Твои реагенты"></div>
<div class="smelt-stage" id="smeltStage">
<div class="smelt-decor smelt-vortex"></div>
<svg class="smelt-decor smelt-circle" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="92" fill="none" stroke="#c9a35a" stroke-width="2"/><circle cx="100" cy="100" r="78" fill="none" stroke="#c9a35a" stroke-width="1" stroke-dasharray="2 6"/><circle cx="100" cy="100" r="58" fill="none" stroke="#f5d68a" stroke-width="1.5"/>${[...Array(8)].map((_,i)=>`<g transform="rotate(${i*45} 100 100)"><path d="M100 10 l5 8 -5 8 -5 -8Z" fill="#f5d68a"/><path d="M96 34 h8 M100 30 v8" stroke="#c9a35a" stroke-width="1.5"/></g>`).join('')}<path d="M100 42 L150 129 L50 129Z M100 158 L50 71 L150 71Z" fill="none" stroke="#c9a35a" stroke-width="1" opacity=".7"/></svg>
<div class="smelt-empty" id="smeltEmpty">Выбери предметы в инвентаре ниже</div>
<div class="smelt-stack" id="smeltStack" role="button" tabindex="0" aria-label="Стопка предметов — нажми, чтобы убрать верхний" hidden></div>
</div>
<div class="smelt-preview" id="smeltPreview" aria-live="polite"></div>
<div class="anvil-actions"><p id="smeltStatus" role="status"></p><div class="smelt-buttons"><button id="smeltClear" class="smelt-clear" type="button">Очистить</button><button id="smeltGo" class="anvil-fuse" type="button">Распылить</button></div></div>
<div class="smelt-quick" id="smeltQuick"></div>
<div class="anvil-grid-title">Предметы инвентаря</div>
<div class="anvil-grid" id="smeltGrid"></div>
</section>
<section class="anvil-panel" id="anvilCraftPanel" role="tabpanel" aria-labelledby="anvilCraftTab" hidden>
<p class="anvil-intro">Выбери предмет из комплекта и выкуй его из реагентов: нужно 100 реагентов редкости предмета и 200 реагентов на ступень ниже.</p>
<div class="reagent-bank" id="craftBank" aria-label="Твои реагенты"></div>
<div class="craft-stage idle" id="craftStage">
<div class="craft-ghost" id="craftGhost"></div>
<svg class="craft-anvil" viewBox="0 0 250 150" aria-hidden="true"><defs><linearGradient id="craftIron" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e979c"/><stop offset=".18" stop-color="#5a6166"/><stop offset="1" stop-color="#22272a"/></linearGradient><linearGradient id="craftFace" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e777c"/><stop offset=".5" stop-color="#d4dade"/><stop offset="1" stop-color="#6e777c"/></linearGradient><radialGradient id="craftHeat" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffcf6a" stop-opacity=".9"/><stop offset=".6" stop-color="#ff6a1f" stop-opacity=".35"/><stop offset="1" stop-color="#ff6a1f" stop-opacity="0"/></radialGradient></defs>
<path d="M8 22C30 22 46 24 58 30H196V22H232V58C214 58 200 62 192 70C186 76 184 84 184 92H66C66 80 58 68 44 60C30 52 16 46 8 22Z" fill="url(#craftIron)" stroke="#0e1113" stroke-width="3" stroke-linejoin="round"/>
<path d="M58 22H232V32H58Z" fill="url(#craftFace)" stroke="#0e1113" stroke-width="2"/>
<ellipse class="craft-heat" cx="125" cy="26" rx="54" ry="12" fill="url(#craftHeat)" opacity="0"/>
<path d="M84 92H166L176 112H74Z" fill="#33393c" stroke="#0e1113" stroke-width="3" stroke-linejoin="round"/>
<path d="M50 112H200L210 136H40Z" fill="url(#craftIron)" stroke="#0e1113" stroke-width="3" stroke-linejoin="round"/>
<path d="M70 40H180" stroke="#ffffff22" stroke-width="2"/><circle cx="214" cy="40" r="4" fill="#0e1113"/>
</svg>
<div class="craft-pile" id="craftPile"></div>
<svg class="craft-hammer" id="craftHammer" viewBox="0 0 170 56" aria-hidden="true"><defs><linearGradient id="craftHandle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a06a34"/><stop offset="1" stop-color="#4a2a10"/></linearGradient><linearGradient id="craftHead" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8edf0"/><stop offset=".45" stop-color="#7d868b"/><stop offset="1" stop-color="#2e3437"/></linearGradient></defs>
<path d="M52 22H166V34H52Z" fill="url(#craftHandle)" stroke="#1a0e05" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M140 21H150V35H140ZM118 21H124V35H118Z" fill="#c9a35a" stroke="#1a0e05" stroke-width="1.5"/>
<path d="M6 4H54V52H6Z" fill="url(#craftHead)" stroke="#121518" stroke-width="3" stroke-linejoin="round"/>
<path d="M2 10H8V46H2ZM52 10H58V46H52Z" fill="#4a5256" stroke="#121518" stroke-width="2"/>
<path d="M12 10H46" stroke="#ffffff55" stroke-width="2"/>
</svg>
</div>
<div class="smelt-preview craft-cost" id="craftCost" aria-live="polite"></div>
<div class="anvil-actions"><p id="craftStatus" role="status"></p><button id="craftGo" class="anvil-fuse" type="button" hidden>Выковать</button></div>
<div class="craft-filters" id="craftRarities" aria-label="Редкость комплекта"></div>
<div id="craftSets"></div>
</section>`;
document.body.append(dialog);

const forge=$('anvilForge'),resultCard=$('anvilResult'),slots=[...forge.querySelectorAll('.anvil-slot')];
addCardTilt(resultCard,()=>resultCard.classList.contains('ready'));
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
 // Сначала выпадают уровень и случайные характеристики, закалка усиливает одну из выпавших.
 const item=window.rollItemStats?window.rollItemStats({...template}):{...template};
 if(rank(item.rarity)>=rank('Legendary'))return item;
 const own=Object.keys(STAT_NAMES).filter(key=>typeof item[key]==='number'&&item[key]>0);
 const keys=own.length?own:['damageBonus','maxMana','critChance','goldBonus','attackSpeed'];
 const key=keys[Math.floor(Math.random()*keys.length)],base=item[key]||1,share=.1+Math.random()*.2;
 // Дробные характеристики получают дробную прибавку: восстановление маны измеряется сотыми долями в секунду.
 const bonus=key==='damageBonus'?Math.max(.1,Number((base*share).toFixed(1))):key==='manaRegen'?Math.max(.01,Number((base*share).toFixed(2))):Math.max(1,Math.round(base*share));
 item.forgeBonus={[key]:bonus};
 return applyForgeBonus(item);
}
function rollResult(group){
 let rarity=rollRarity(group);
 // Если в каталоге нет предметов выпавшей редкости, берём ближайшую нижнюю, но не ниже исходной.
 while(rank(rarity)>rank(group)&&!lootPool().some(item=>item.rarity===rarity))rarity=RANKS[rank(rarity)-1];
 const pool=lootPool().filter(item=>item.rarity===rarity);
 return pool.length?forgeItem(starterWeapon(pool[Math.floor(Math.random()*pool.length)])):null;
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
 renderTabs();
 timers.push(setTimeout(finishMelting,reducedMotion()?FUSE_MS_REDUCED:FUSE_MS));
}
function finishMelting(){
 if(phase!=='melting'||!dialog.open)return;
 forge.classList.remove('melting');sources=null;phase='ready';render();renderTabs();
 resultCard.focus({preventScroll:true});
}
let flipping=false;
function openResult(){
 if(phase==='ready'){
  if(flipping)return;
  flipping=true;hideItemTooltip(true);
  playCardFlip(resultCard,result.rarity,()=>{
  flipping=false;if(phase!=='ready'||!result)return;
  phase='revealed';
  const up=rank(result.rarity)>rank(sourceRarity);
  note=up?'Успех! Редкость повышена: '+rarityLabel(sourceRarity)+' → '+rarityLabel(result.rarity)+'.':'Редкость сохранена: '+rarityLabel(result.rarity)+'.';
  const bonus=result.forgeBonus&&Object.entries(result.forgeBonus)[0];
  if(bonus)note+=' Закалка: +'+bonus[1]+' к '+STAT_NAMES[bonus[0]]+'.';
  render();revealEffect(result.rarity);revealDone();
  });
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
  const item=shown[i];slot.replaceChildren();slot.classList.remove('has-level');slot.classList.toggle('filled',!!item);
  if(item){
   slot.style.setProperty('--rc',color(item.rarity));
   const image=document.createElement('img');image.src=item.image;image.alt='';
   const name=document.createElement('strong');name.textContent=item.name;
   slot.append(image,name);addLevelPlate(slot,item);
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
  hint.textContent='Нажми, чтобы открыть';resultCard.classList.add('closed','ready','rc-'+result.rarity.toLowerCase());resultCard.innerHTML=rewardBackLayers(result.rarity);resultCard.append(hint);
  resultCard.setAttribute('aria-label','Закрытый результат — нажми, чтобы открыть');return;
 }
 const rarity=document.createElement('span');rarity.className='anvil-result-rarity';rarity.textContent=rarityLabel(result.rarity);
 const image=document.createElement('img');image.src=result.image;image.alt='';
 const name=document.createElement('strong');name.textContent=result.name;
 hint.textContent='Нажми, чтобы забрать';
 resultCard.classList.add('revealed');resultCard.append(rarity,image,name,hint);addLevelPlate(resultCard,result);
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
  cell.append(image,name,rarity);addLevelPlate(cell,item);
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
// ── Плавильня ──
const REAGENT_KEY='forest-frontier-reagents-v1';
// Сколько реагентов той же редкости даёт один распылённый предмет: от и до включительно.
const REAGENT_YIELD={Common:[25,50],Uncommon:[20,40],Rare:[15,20],Epic:[10,15],Legendary:[5,10],Divine:[3,5]};
const REAGENT_PLURAL={Common:'Обычные',Uncommon:'Необычные',Rare:'Редкие',Epic:'Эпические',Legendary:'Легендарные',Divine:'Божественные'};
const REAGENT_SHORT={...REAGENT_PLURAL,Divine:'Божеств.'};
const REAGENT_GENITIVE={Common:'обычных',Uncommon:'необычных',Rare:'редких',Epic:'эпических',Legendary:'легендарных',Divine:'божественных'};
// Реагенты появляются в круге на REVEAL_AT, через REST_MS по очереди (с шагом FLY_GAP) улетают к ячейкам за FLY_MS.
const REVEAL_AT=1650,REST_MS=550,FLY_GAP=120,FLY_MS=700,SMELT_MS_REDUCED=300,STACK_VISIBLE=7;
const reagentImage=rarity=>'assets/reagent-'+rarity.toLowerCase()+'.webp';
const reagents=Object.fromEntries(RANKS.map(rarity=>[rarity,0]));
try{const saved=JSON.parse(localStorage.getItem(REAGENT_KEY));if(saved)for(const rarity of RANKS)if(Number.isSafeInteger(saved[rarity])&&saved[rarity]>=0)reagents[rarity]=saved[rarity];}catch{}
function saveReagents(){try{localStorage.setItem(REAGENT_KEY,JSON.stringify(reagents));}catch{}}
let smeltPicks=[],smeltBusy=false,smeltTimers=[],smeltGain=null,smeltNote='';
// shown — числа на счётчиках: во время анимации отстают от reagents, пока реагенты летят к ним.
const shown={...reagents};
const stage=$('smeltStage'),stack=$('smeltStack');
const smeltable=item=>!!REAGENT_YIELD[item.rarity]&&inventoryItems.includes(item)&&!isEquipped(item);
const randomInt=(min,max)=>min+Math.floor(Math.random()*(max-min+1));
// Небольшой сдвиг и поворот каждой карточки, чтобы стопка выглядела набросанной; зависит только от позиции.
// Высота считается среди видимых карточек (level): иначе большая стопка уезжает за верх сцены.
function cardPose(i,level){const seed=Math.sin(i*12.9898+4.1)*43758.5453,f=seed-Math.floor(seed);return {x:Math.round((f-.5)*14),y:-level*3,r:Math.round((f*2-1)*9)};}

function renderBank(pulse=[]){
 for(const bank of dialog.querySelectorAll('.reagent-bank')){
 if(!bank.children.length)for(const rarity of RANKS){
  const chip=document.createElement('div');chip.className='reagent-chip';chip.dataset.rarity=rarity;chip.style.setProperty('--rc',color(rarity));
  chip.innerHTML=`<img src="${reagentImage(rarity)}" alt=""><b>0</b><small>${REAGENT_SHORT[rarity]}</small>`;bank.append(chip);
 }
 for(const chip of bank.children){
  const rarity=chip.dataset.rarity;chip.querySelector('b').textContent=shown[rarity].toLocaleString('ru-RU');
  chip.setAttribute('aria-label',rarityLabel(rarity)+' реагенты: '+reagents[rarity]);
  if(pulse.includes(rarity)){chip.classList.remove('pulse');void chip.offsetWidth;chip.classList.add('pulse');}
 }
 }
}
function renderStack(added=null){
 const list=smeltPicks,visible=list.slice(-STACK_VISIBLE),offset=list.length-visible.length;
 $('smeltEmpty').hidden=list.length>0;stack.hidden=!list.length;stack.replaceChildren();
 visible.forEach((item,i)=>{
  const pose=cardPose(offset+i,i),card=document.createElement('div');card.className='smelt-card'+(item===added?' card-in':'');
  card.style.cssText=`--rc:${color(item.rarity)};--x:${pose.x}px;--y:${pose.y}px;--r:${pose.r}deg;z-index:${i+1}`;
  card.dataset.x=pose.x;card.dataset.y=pose.y;card.dataset.r=pose.r;
  card.innerHTML=`<small>${rarityLabel(item.rarity)}</small><img src="${item.image}" alt=""><strong></strong>`;card.querySelector('strong').textContent=item.name;addLevelPlate(card,item);
  stack.append(card);
 });
 if(list.length>1){const count=document.createElement('span');count.className='smelt-count';count.textContent='×'+list.length;stack.append(count);}
 attachItemTooltip(stack,list[list.length-1]||null);
}
function smeltRanges(list){
 const ranges={};
 for(const item of list){const [min,max]=REAGENT_YIELD[item.rarity],range=ranges[item.rarity]||(ranges[item.rarity]={min:0,max:0,count:0});range.min+=min;range.max+=max;range.count++;}
 return ranges;
}
function renderPreview(){
 const box=$('smeltPreview');box.replaceChildren();
 const ranges=smeltRanges(smeltPicks);
 if(!smeltPicks.length){const hint=document.createElement('p');hint.className='anvil-odds-empty';hint.textContent='Добавь предметы, чтобы увидеть, сколько реагентов можно получить.';box.append(hint);return;}
 const title=document.createElement('h3');title.textContent='Возможная добыча';box.append(title);
 for(const rarity of [...RANKS].reverse()){
  const range=ranges[rarity];if(!range)continue;
  const row=document.createElement('div');row.className='smelt-row';row.style.setProperty('--rc',color(rarity));
  row.innerHTML=`<img src="${reagentImage(rarity)}" alt=""><span>${REAGENT_PLURAL[rarity]} реагенты</span><em>предметов: ${range.count}</em><b>${range.min.toLocaleString('ru-RU')} – ${range.max.toLocaleString('ru-RU')}</b>`;
  box.append(row);
 }
}
function renderSmeltStatus(){
 const count=smeltPicks.length;
 $('smeltStatus').textContent=smeltBusy?'Предметы распадаются…':smeltNote&&!count?smeltNote:count?'В плавильне предметов: '+count+'. Нажми на стопку, чтобы убрать верхний.':'Выбери предметы для распыления — можно сразу несколько.';
 $('smeltGo').disabled=smeltBusy||!count;$('smeltClear').disabled=smeltBusy||!count;
 $('smeltGo').textContent=smeltBusy?'Плавка…':'Распылить';
}
function renderQuick(){
 const box=$('smeltQuick');box.replaceChildren();if(smeltBusy)return;
 for(const rarity of RANKS){
  const rest=inventoryItems.filter(item=>item.rarity===rarity&&smeltable(item)&&!smeltPicks.includes(item));
  if(!rest.length)continue;
  const button=document.createElement('button');button.type='button';button.style.setProperty('--rc',color(rarity));
  button.textContent='+ все '+REAGENT_PLURAL[rarity].toLowerCase()+' ('+rest.length+')';
  button.addEventListener('click',()=>{smeltPicks.push(...rest);smeltNote='';clearSmeltResult();renderSmelt(rest[rest.length-1]);});
  box.append(button);
 }
}
function renderSmeltGrid(){
 const grid=$('smeltGrid');grid.replaceChildren();
 const items=inventoryItems.map((item,index)=>({item,index})).sort((a,b)=>rank(b.item.rarity)-rank(a.item.rarity)||a.index-b.index);
 if(!items.length){const empty=document.createElement('p');empty.className='anvil-grid-empty';empty.textContent='Инвентарь пуст. Надетые предметы распылить нельзя.';grid.append(empty);return;}
 for(const {item} of items){
  const cell=document.createElement('div'),chosen=smeltPicks.includes(item),available=!smeltBusy&&smeltable(item);
  cell.className='anvil-item'+(chosen?' selected':'')+(available?'':' locked');cell.style.setProperty('--rc',color(item.rarity));
  cell.setAttribute('role','button');cell.tabIndex=available?0:-1;cell.setAttribute('aria-pressed',String(chosen));cell.setAttribute('aria-disabled',String(!available));
  const [min,max]=REAGENT_YIELD[item.rarity];cell.setAttribute('aria-label',item.name+' · '+rarityLabel(item.rarity)+' · '+min+'–'+max+' реагентов');
  cell.innerHTML=`<img src="${item.image}" alt=""><strong></strong><small>${rarityLabel(item.rarity)}</small>`;cell.querySelector('strong').textContent=item.name;addLevelPlate(cell,item);
  attachItemTooltip(cell,item);
  onActivate(cell,()=>toggleSmelt(item));
  grid.append(cell);
 }
}
function renderSmelt(added=null){
 smeltPicks=smeltPicks.filter(smeltable);
 renderBank();if(!smeltBusy)renderStack(added);renderPreview();renderSmeltStatus();renderQuick();renderSmeltGrid();
}
function clearSmeltResult(){stage.querySelectorAll('.smelt-result').forEach(node=>node.remove());}
function toggleSmelt(item){
 if(smeltBusy)return;
 const index=smeltPicks.indexOf(item);
 if(index>=0)smeltPicks.splice(index,1);else if(smeltable(item))smeltPicks.push(item);else return;
 smeltNote='';clearSmeltResult();hideItemTooltip(true);renderSmelt(index>=0?null:item);
}
onActivate(stack,()=>{if(smeltBusy||!smeltPicks.length)return;smeltPicks.pop();hideItemTooltip(true);renderSmelt();});
$('smeltClear').addEventListener('click',()=>{if(smeltBusy)return;smeltPicks=[];smeltNote='';clearSmeltResult();hideItemTooltip(true);renderSmelt();});
$('smeltGo').addEventListener('click',smeltItems);

function smeltItems(){
 const list=smeltPicks.filter(smeltable);
 if(smeltBusy||!list.length)return;
 const gain={};
 for(const item of list){const [min,max]=REAGENT_YIELD[item.rarity];gain[item.rarity]=(gain[item.rarity]||0)+randomInt(min,max);}
 // Предметы списываются и реагенты начисляются сразу — анимация только показывает уже сохранённый результат.
 for(const item of list)inventoryItems.splice(inventoryItems.indexOf(item),1);
 for(const [rarity,amount] of Object.entries(gain))reagents[rarity]+=amount;
 persistLoot();saveReagents();
 smeltBusy=true;smeltGain=gain;smeltPicks=[];hideItemTooltip(true);clearSmeltResult();stack.querySelector('.smelt-count')?.remove();
 const quiet=reducedMotion();
 // Ячейки реагентов должны быть видны, чтобы реагенты долетели до них на глазах у игрока.
 $('reagentBank').scrollIntoView({block:'nearest',behavior:quiet?'auto':'smooth'});
 if(quiet)stack.hidden=true;else playSmelt([...stack.querySelectorAll('.smelt-card')],gain);
 renderSmelt();renderTabs();
 // Итог подводится, только когда последний реагент долетел до своей ячейки.
 const kinds=Object.keys(gain).length;
 smeltTimers.push(setTimeout(finishSmelt,quiet?SMELT_MS_REDUCED:REVEAL_AT+REST_MS+(kinds-1)*FLY_GAP+FLY_MS+150));
}
function finishSmelt(){
 if(!smeltBusy||!dialog.open)return;
 smeltBusy=false;const gain=smeltGain;smeltGain=null;
 Object.assign(shown,reagents);
 dialog.querySelectorAll('.smelt-temp').forEach(node=>node.remove());stage.querySelector('.smelt-circle')?.classList.remove('active');
 const summary=document.createElement('div');summary.className='smelt-result';
 const parts=[];
 for(const rarity of [...RANKS].reverse()){if(!gain[rarity])continue;const tag=document.createElement('span');tag.style.setProperty('--rc',color(rarity));tag.innerHTML=`<img src="${reagentImage(rarity)}" alt="">+${gain[rarity]}`;summary.append(tag);parts.push('+'+gain[rarity]+' '+REAGENT_GENITIVE[rarity]);}
 stage.append(summary);
 smeltNote='Получено реагентов: '+parts.join(', ')+'.';
 renderSmelt();renderBank(reducedMotion()?Object.keys(gain):[]);renderTabs();
}

// Общий финал всех вариантов: реагенты появляются в точке (x, y) сцены и улетают к своим счётчикам.
function revealReagents(gain,x,y,delay){
 const kinds=[...RANKS].reverse().filter(rarity=>gain[rarity]);
 kinds.forEach((rarity,i)=>{
  const gem=document.createElement('div');gem.className='smelt-gem smelt-temp';gem.style.setProperty('--rc',color(rarity));
  gem.style.left=x+(i-(kinds.length-1)/2)*52+'px';gem.style.top=y+'px';gem.style.opacity=0;
  gem.innerHTML=`<img src="${reagentImage(rarity)}" alt="">`;stage.append(gem);
  gem.animate([{opacity:0,transform:'scale(0) rotate(-40deg)'},{opacity:1,transform:'scale(1.35) rotate(8deg)',offset:.6},{opacity:1,transform:'scale(1)'}],{duration:450,delay:delay+i*90,fill:'forwards',easing:'cubic-bezier(.2,.8,.3,1.2)'});
  smeltTimers.push(setTimeout(()=>flyToBank(gem,rarity,gain[rarity]),delay+REST_MS+i*FLY_GAP));
 });
}
function flyToBank(gem,rarity,amount){
 const chip=$('reagentBank').querySelector(`[data-rarity="${rarity}"]`);if(!gem.isConnected||!chip)return;
 const from=gem.getBoundingClientRect(),to=chip.querySelector('img').getBoundingClientRect();
 const fly=document.createElement('div');fly.className='smelt-fly smelt-temp';fly.style.setProperty('--rc',color(rarity));fly.innerHTML=gem.innerHTML;
 fly.style.left=from.left+from.width/2+'px';fly.style.top=from.top+from.height/2+'px';dialog.append(fly);gem.remove();
 const dx=to.left+to.width/2-(from.left+from.width/2),dy=to.top+to.height/2-(from.top+from.height/2);
 const flight=fly.animate([{transform:'translate(0,0) scale(1.1)'},{transform:`translate(${dx*.45}px,${dy*.45-60}px) scale(1.25)`,offset:.45},{transform:`translate(${dx}px,${dy}px) scale(.7)`,opacity:.9}],{duration:FLY_MS,easing:'cubic-bezier(.5,0,.7,1)',fill:'forwards'});
 flight.onfinish=()=>{fly.remove();countUp(rarity,amount);};
}
function countUp(rarity,amount){
 const chip=$('reagentBank').querySelector(`[data-rarity="${rarity}"]`),label=chip.querySelector('b'),start=shown[rarity],end=Math.min(reagents[rarity],start+amount),began=performance.now();
 shown[rarity]=end;chip.classList.remove('pulse');void chip.offsetWidth;chip.classList.add('pulse');
 const step=now=>{const t=Math.min(1,(now-began)/500);label.textContent=Math.round(start+(end-start)*t).toLocaleString('ru-RU');if(t<1&&chip.isConnected)requestAnimationFrame(step);};
 requestAnimationFrame(step);
}
const pose=card=>({x:+card.dataset.x,y:+card.dataset.y,r:+card.dataset.r});
// Рунный круг разгорается, стопка дрожит и рассыпается пылью цвета редкости;
// пыль закручивается вихрем в центр круга, вспыхивает и сгущается в реагенты.
function playSmelt(cards,gain){
 const circle=stage.querySelector('.smelt-circle'),vortex=stage.querySelector('.smelt-vortex'),center={x:stage.clientWidth/2,y:150};
 circle.classList.add('active');
 vortex.animate([{opacity:0,transform:'scale(.5)'},{opacity:.9,transform:'scale(1.1)',offset:.55},{opacity:0,transform:'scale(.3)'}],{duration:1500,delay:350,easing:'ease-in-out'});
 const perCard=Math.max(10,Math.floor(84/Math.max(1,cards.length)));
 cards.forEach((card,i)=>{
  const p=pose(card),delay=380+i*70,rarityColor=card.style.getPropertyValue('--rc');
  card.animate([{transform:`translate(${p.x}px,${p.y}px) rotate(${p.r}deg)`},{transform:`translate(${p.x-3}px,${p.y}px) rotate(${p.r-3}deg)`,offset:.2},{transform:`translate(${p.x+3}px,${p.y}px) rotate(${p.r+3}deg)`,offset:.4},{transform:`translate(${p.x-2}px,${p.y}px) rotate(${p.r-2}deg)`,offset:.6},{transform:`translate(${p.x}px,${p.y}px) rotate(${p.r}deg)`,filter:'brightness(1.8)',opacity:1,offset:.85},{transform:`translate(${p.x}px,${p.y}px) rotate(${p.r}deg) scale(1.08)`,filter:'brightness(3) blur(3px)',opacity:0}],{duration:delay+180,easing:'linear',fill:'forwards'});
  for(let k=0;k<perCard;k++){
   const dot=document.createElement('span');dot.className='smelt-dot smelt-temp';dot.style.setProperty('--rc',k%3?rarityColor:'#fff3c4');
   const sx=center.x+p.x+(Math.random()-.5)*80,sy=24+Math.random()*110+p.y;dot.style.left=sx+'px';dot.style.top=sy+'px';dot.style.opacity=0;stage.append(dot);
   const out=Math.random()*Math.PI*2,reach=30+Math.random()*50,startAngle=Math.atan2(sy-center.y,sx-center.x),radius=Math.hypot(sx-center.x,sy-center.y)+reach*.5;
   const frames=[{opacity:1,transform:'translate(0,0) scale(1)'},{opacity:1,transform:`translate(${Math.cos(out)*reach}px,${Math.sin(out)*reach}px) scale(1.3)`,offset:.25}];
   for(let s=1;s<=4;s++){const a=startAngle+s*.9,r=radius*(1-s/4.4);frames.push({opacity:s<4?1:0,transform:`translate(${center.x+Math.cos(a)*r-sx}px,${center.y+Math.sin(a)*r-sy}px) scale(${1.2-s*.18})`,offset:s<4?.25+s*.18:1});}
   dot.animate(frames,{duration:1250,delay:delay+Math.random()*120,easing:'cubic-bezier(.3,0,.6,1)',fill:'forwards'});
  }
 });
 // Искры с кольца круга стягиваются к центру прямо перед вспышкой.
 for(let i=0;i<10;i++){const star=document.createElement('span');star.className='smelt-dot smelt-temp';star.style.setProperty('--rc','#fff3c4');const a=i/10*Math.PI*2;star.style.left=center.x+Math.cos(a)*92+'px';star.style.top=center.y+Math.sin(a)*92+'px';star.style.opacity=0;stage.append(star);
  star.animate([{opacity:0,transform:'translate(0,0) scale(.5)'},{opacity:1,transform:'translate(0,0) scale(1.6)',offset:.3},{opacity:0,transform:`translate(${-Math.cos(a)*92}px,${-Math.sin(a)*92}px) scale(.4)`}],{duration:700,delay:900+i*30,easing:'cubic-bezier(.5,0,.8,.5)',fill:'forwards'});}
 const flash=document.createElement('span');flash.className='smelt-temp';flash.style.cssText=`position:absolute;left:${center.x-70}px;top:${center.y-70}px;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,#fff8d8,#f5d68a88 40%,transparent 70%);opacity:0;z-index:6;pointer-events:none`;stage.append(flash);
 flash.animate([{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1)',offset:.4},{opacity:0,transform:'scale(1.7)'}],{duration:700,delay:REVEAL_AT-100});
 revealReagents(gain,center.x,center.y,REVEAL_AT);
}

// ── Наковальня: ковка предметов комплектов из реагентов ──
// Цена: 100 реагентов редкости предмета и 200 реагентов на ступень ниже (у обычных предметов — только 100 обычных).
const CRAFT_MAIN=100,CRAFT_LOWER=200,SFX_KEY='forest-frontier-sfx-v1';
// Тайминг ковки: реагенты летят на наковальню, затем молот бьёт STRIKES раз, после чего появляется предмет.
const DROP_MS=650,STRIKE_START=1150,STRIKE_GAP=460,STRIKES=4,STRIKE_HIT=.68,STRIKE_MS=440,CRAFT_REDUCED=350;
const KIND_LABEL={weapon:'Оружие',accessory:'Аксессуары',armor:'Броня'};
const craftStage=$('craftStage'),hammer=$('craftHammer'),pile=$('craftPile'),ghost=$('craftGhost');
let craftPick=null,craftBusy=false,craftTimers=[],craftFilter='all',craftNote='',craftDone=null;
const craftSets=(window.ITEM_SETS||[]).filter(set=>RANKS.includes(set.rarity));
const craftTemplate=id=>lootPool().find(item=>item.id===id)||null;
function craftCost(rarity){const cost={[rarity]:CRAFT_MAIN},lower=RANKS[rank(rarity)-1];if(lower)cost[lower]=CRAFT_LOWER;return cost;}
const affordable=cost=>Object.entries(cost).every(([rarity,amount])=>reagents[rarity]>=amount);

// Звук удара без файлов, на Web Audio; включается переключателем «Звуки кузницы» в настройках.
let sfxOn=true,sfxContext=null;
try{sfxOn=localStorage.getItem(SFX_KEY)!=='off';}catch{}
$('animationsEnabled').closest('label').insertAdjacentHTML('afterend','<label class="setting-row" for="forgeSoundEnabled"><span>Звуки кузницы</span><input type="checkbox" id="forgeSoundEnabled"></label>');
$('forgeSoundEnabled').checked=sfxOn;
$('forgeSoundEnabled').addEventListener('change',event=>{sfxOn=event.target.checked;try{localStorage.setItem(SFX_KEY,sfxOn?'on':'off');}catch{}});
// Звук удара: глухой удар (thump), звон-аккорд [частота, громкость, затухание], шипение искр и россыпь высоких «звёздочек».
const FORGE_SOUND={thump:[160,70,.5,.1],partials:[[1047,.2,1.2],[1319,.15,1],[1568,.13,.9],[2093,.08,.7]],hiss:[6000,.12,.12,.9],shimmer:7};
function clank(power=1){
 if(!sfxOn)return;
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 sfxContext=sfxContext||new AC();if(sfxContext.state==='suspended')sfxContext.resume();
 const voice=FORGE_SOUND,ctx=sfxContext,t=ctx.currentTime+.005,out=ctx.createGain();out.gain.value=.55*power;out.connect(ctx.destination);
 const [from,to,level,decay]=voice.thump,thump=ctx.createOscillator(),thumpGain=ctx.createGain();thump.type='sine';thump.frequency.setValueAtTime(from,t);thump.frequency.exponentialRampToValueAtTime(to,t+decay*.75);
 thumpGain.gain.setValueAtTime(level,t);thumpGain.gain.exponentialRampToValueAtTime(.001,t+decay);thump.connect(thumpGain).connect(out);thump.start(t);thump.stop(t+decay+.02);
 for(const [freq,volume,length] of voice.partials){
  const tone=ctx.createOscillator(),gain=ctx.createGain();tone.type='sine';tone.frequency.value=freq;
  gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0005,t+length);tone.connect(gain).connect(out);tone.start(t);tone.stop(t+length+.05);
 }
 const [band,hissLevel,hissLength,q]=voice.hiss,size=Math.floor(ctx.sampleRate*hissLength),buffer=ctx.createBuffer(1,size,ctx.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<size;i++)data[i]=(Math.random()*2-1)*(1-i/size)**3;
 const hiss=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),hissGain=ctx.createGain();hiss.buffer=buffer;filter.type='bandpass';filter.frequency.value=band;filter.Q.value=q;
 hissGain.gain.value=hissLevel;hiss.connect(filter).connect(hissGain).connect(out);hiss.start(t);
 // Россыпь коротких высоких «звёздочек» после удара.
 for(let i=0;i<voice.shimmer;i++){
  const at=t+.04+i*.045,ping=ctx.createOscillator(),gain=ctx.createGain();ping.type='triangle';ping.frequency.value=2800+Math.random()*3200;
  gain.gain.setValueAtTime(.05,at);gain.gain.exponentialRampToValueAtTime(.0005,at+.18);ping.connect(gain).connect(out);ping.start(at);ping.stop(at+.2);
 }
}

function craftHit(){
 const anvil=craftStage.querySelector('.craft-anvil').getBoundingClientRect(),box=craftStage.getBoundingClientRect();
 return {x:anvil.left-box.left+anvil.width*145/250,y:anvil.top-box.top+anvil.height*22/150};
}
function placeHammer(){const hit=craftHit();hammer.style.left=hit.x-30+'px';hammer.style.top=hit.y-62+'px';}
function renderGhost(){
 ghost.replaceChildren();ghost.classList.remove('forged');
 // Пока молот куёт, силуэт скрыт: предмет появляется только после последнего удара.
 if(craftBusy)return;
 const shownItem=craftDone||craftPick;
 if(!shownItem){const hint=document.createElement('span');hint.className='craft-ghost-empty';hint.textContent='Выбери предмет из комплекта';ghost.append(hint);return;}
 ghost.style.setProperty('--rc',color(shownItem.rarity));
 const image=document.createElement('img');image.src=shownItem.image;image.alt='';ghost.append(image);
 if(craftDone)ghost.classList.add('forged');
}
function renderCraftCost(){
 const box=$('craftCost');box.replaceChildren();
 if(!craftPick){const hint=document.createElement('p');hint.className='anvil-odds-empty';hint.textContent='Выбери предмет ниже, чтобы увидеть, сколько реагентов нужно для ковки.';box.append(hint);return;}
 const head=document.createElement('div');head.className='craft-target';head.style.setProperty('--rc',color(craftPick.rarity));
 head.innerHTML='<img alt=""><div><small></small><strong></strong></div>';head.querySelector('img').src=craftPick.image;
 head.querySelector('small').textContent=rarityLabel(craftPick.rarity);head.querySelector('strong').textContent=craftPick.name;
 attachItemTooltip(head,craftPick);box.append(head);
 for(const [rarity,amount] of Object.entries(craftCost(craftPick.rarity))){
  const row=document.createElement('div');row.className='smelt-row';row.style.setProperty('--rc',color(rarity));
  const enough=reagents[rarity]>=amount;
  row.innerHTML=`<img src="${reagentImage(rarity)}" alt=""><span>${REAGENT_PLURAL[rarity]} реагенты</span><b class="${enough?'ok':'lack'}">${reagents[rarity].toLocaleString('ru-RU')} / ${amount}</b>`;
  box.append(row);
 }
}
function renderCraftStatus(){
 const go=$('craftGo'),status=$('craftStatus');
 const cost=craftPick&&craftCost(craftPick.rarity),ready=!!craftPick&&affordable(cost)&&inventoryItems.length<INVENTORY_LIMIT;
 go.hidden=craftBusy||!ready;
 if(craftBusy)status.textContent='Молот куёт…';
 else if(craftNote&&(!craftPick||craftDone))status.textContent=craftNote;
 else if(!craftPick)status.textContent='Выбери предмет, который хочешь выковать.';
 else if(!affordable(cost))status.textContent='Не хватает: '+Object.entries(cost).filter(([rarity,amount])=>reagents[rarity]<amount).map(([rarity,amount])=>amount-reagents[rarity]+' '+REAGENT_GENITIVE[rarity]).join(', ')+'.';
 else if(inventoryItems.length>=INVENTORY_LIMIT)status.textContent='Инвентарь заполнен — освободи ячейку, чтобы выковать предмет.';
 else status.textContent='Реагентов хватает — жми «Выковать».';
}
function renderCraftList(){
 const filters=$('craftRarities');filters.replaceChildren();
 for(const [value,label] of [['all','Все редкости'],...RANKS.filter(rarity=>craftSets.some(set=>set.rarity===rarity)).map(rarity=>[rarity,rarityLabel(rarity)])]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.classList.toggle('active',value===craftFilter);button.setAttribute('aria-pressed',String(value===craftFilter));
  if(value!=='all')button.style.setProperty('--fc',color(value));
  button.addEventListener('click',()=>{craftFilter=value;renderCraftList();});filters.append(button);
 }
 const list=$('craftSets');list.replaceChildren();
 const sets=craftSets.filter(set=>craftFilter==='all'||set.rarity===craftFilter).sort((a,b)=>rank(b.rarity)-rank(a.rarity));
 // Предметы, которых ещё нет в коллекции, показываются тёмным силуэтом — их можно выковать, чтобы открыть.
 const known=id=>window.collectionApi?window.collectionApi.has(id):true;
 for(const set of sets){
  const block=document.createElement('section');block.className='craft-set';block.style.setProperty('--rc',color(set.rarity));
  const title=document.createElement('h4');title.textContent=set.name+' · '+rarityLabel(set.rarity);const kind=document.createElement('small');kind.textContent=KIND_LABEL[set.kind]||set.kind;title.append(kind);
  const grid=document.createElement('div');grid.className='craft-items';
  for(const id of set.items){
   const item=craftTemplate(id);if(!item)continue;
   const cell=document.createElement('div'),chosen=craftPick?.id===item.id,locked=craftBusy;
   const open=known(item.id);
   cell.className='anvil-item'+(chosen?' selected':'')+(locked?' locked':'')+(open?'':' unknown');cell.style.setProperty('--rc',color(item.rarity));
   cell.setAttribute('role','button');cell.tabIndex=locked?-1:0;cell.setAttribute('aria-pressed',String(chosen));
   cell.innerHTML='<img alt=""><strong></strong><small></small>';cell.querySelector('img').src=item.image;cell.querySelector('strong').textContent=item.name;addLevelPlate(cell,item);
   const tag=cell.querySelector('small');tag.textContent=affordable(craftCost(item.rarity))?'Можно выковать':open?rarityLabel(item.rarity):'Не открыт';if(affordable(craftCost(item.rarity)))tag.classList.add('craft-made');
   cell.setAttribute('aria-label',item.name+' · '+rarityLabel(item.rarity)+(open?'':' · ещё не открыт в коллекции'));
   attachItemTooltip(cell,item);
   onActivate(cell,()=>{if(craftBusy)return;craftPick=craftPick?.id===item.id?null:item;craftDone=null;craftNote='';clearCraftScene();hideItemTooltip(true);renderCraft();});
   grid.append(cell);
  }
  block.append(title,grid);list.append(block);
 }
}
function renderCraft(){
 renderBank();renderGhost();renderCraftCost();renderCraftStatus();renderCraftList();
 craftStage.classList.toggle('idle',!craftBusy);placeHammer();
}
// Чистит сцену вместе с анимациями горки и разогрева: застывший финал прошлой ковки (прозрачность 0) иначе прятал новую горку.
function clearCraftScene(){
 const heat=craftStage.querySelector('.craft-heat');
 [pile,heat].forEach(node=>node.getAnimations().forEach(animation=>animation.cancel()));
 pile.replaceChildren();craftStage.querySelectorAll('.craft-temp,.craft-label,.craft-fx').forEach(node=>node.remove());
}

function forgeCraft(){
 const item=craftPick;if(craftBusy||!item)return;
 const cost=craftCost(item.rarity);
 if(!affordable(cost)||inventoryItems.length>=INVENTORY_LIMIT){renderCraft();return;}
 // Реагенты списываются и предмет кладётся в инвентарь сразу — анимация лишь показывает ковку.
 for(const [rarity,amount] of Object.entries(cost))reagents[rarity]-=amount;
 const made=starterWeapon({...item});inventoryItems.push(made);
 saveReagents();persistLoot();
 craftBusy=true;craftDone=null;craftNote='';hideItemTooltip(true);clearCraftScene();
 const quiet=reducedMotion();
 if(quiet)Object.assign(shown,reagents);
 renderCraft();renderTabs();
 if(!quiet){$('craftBank').scrollIntoView({block:'start',behavior:'smooth'});playForge(cost);}
 const total=quiet?CRAFT_REDUCED:STRIKE_START+STRIKES*STRIKE_GAP+500;
 craftTimers.push(setTimeout(()=>finishForge(made),total));
}
function finishForge(item){
 if(!craftBusy||!dialog.open)return;
 craftBusy=false;craftDone=item;Object.assign(shown,reagents);revealDone();
 craftNote='Выковано: «'+item.name+'». Предмет уже в инвентаре.';
 craftStage.querySelectorAll('.craft-temp').forEach(node=>node.remove());
 meltPile();
 renderCraft();renderTabs();
 const label=document.createElement('div');label.className='craft-label';label.style.setProperty('--rc',color(item.rarity));label.textContent=rarityLabel(item.rarity)+' · '+item.name;craftStage.append(label);
 revealForged(item);
 if(!reducedMotion())clank(.6);
}

// Реагенты стоимости падают из своих ячеек прямо на наковальню и ложатся горкой; счётчики уменьшаются.
// Летящие реагенты живут внутри вкладки, а не на экране, поэтому прокрутка окна не сбивает их с пути.
function dropReagents(cost){
 const panel=$('anvilCraftPanel'),base=panel.getBoundingClientRect(),box=craftStage.getBoundingClientRect(),hit=craftHit();
 const stageX=box.left-base.left+craftStage.clientLeft,stageY=box.top-base.top+craftStage.clientTop;let index=0;
 for(const [rarity,amount] of Object.entries(cost)){
  const chip=$('craftBank').querySelector(`[data-rarity="${rarity}"]`);if(!chip)continue;
  countDown(chip,rarity,amount);
  const icon=chip.querySelector('img').getBoundingClientRect(),startX=icon.left-base.left+icon.width/2,startY=icon.top-base.top+icon.height/2,pieces=amount>=200?4:3;
  for(let k=0;k<pieces;k++,index++){
   const tx=hit.x+((index%7)-3)*13,ty=hit.y-12-Math.floor(index/7)*10-(index%2)*5,delay=index*60;
   const fly=document.createElement('div');fly.className='craft-fly craft-temp';fly.style.setProperty('--rc',color(rarity));fly.innerHTML=`<img src="${reagentImage(rarity)}" alt="">`;
   fly.style.left=startX+'px';fly.style.top=startY+'px';panel.append(fly);
   const dx=stageX+tx-startX,dy=stageY+ty-startY;
   // Реагент приподнимается над ячейкой, затем с ускорением падает в свою точку на наковальне и чуть подпрыгивает.
   const flight=fly.animate([
    {transform:'translate(0,0) scale(.6)',opacity:0},
    {transform:'translate(0,-14px) scale(1.1)',opacity:1,offset:.18},
    {transform:`translate(${dx}px,${dy}px) scale(1)`,opacity:1,offset:.86,easing:'ease-out'},
    {transform:`translate(${dx}px,${dy-7}px) scale(1)`,opacity:1,offset:.93},
    {transform:`translate(${dx}px,${dy}px) scale(1)`,opacity:1}
   ],{duration:DROP_MS,delay,easing:'cubic-bezier(.55,0,.85,.45)',fill:'forwards'});
   flight.onfinish=()=>{fly.remove();const piece=document.createElement('img');piece.src=reagentImage(rarity);piece.alt='';piece.style.left=tx+'px';piece.style.top=ty+'px';piece.style.transform=`rotate(${(Math.random()-.5)*50}deg)`;pile.append(piece);};
  }
 }
}
function countDown(chip,rarity,amount){
 const label=chip.querySelector('b'),start=shown[rarity],end=Math.max(reagents[rarity],start-amount),began=performance.now();
 shown[rarity]=end;chip.classList.remove('pulse');void chip.offsetWidth;chip.classList.add('pulse');
 const step=now=>{const t=Math.min(1,(now-began)/500);label.textContent=Math.round(start+(end-start)*t).toLocaleString('ru-RU');if(t<1&&chip.isConnected)requestAnimationFrame(step);};
 requestAnimationFrame(step);
}
function craftSparks(x,y,count,tint='#ffb347'){
 for(let i=0;i<count;i++){
  const spark=document.createElement('span');spark.className='craft-spark craft-temp'+(i%3?'':' streak');spark.style.left=x+'px';spark.style.top=y+'px';
  if(tint!=='#ffb347'&&i%2)spark.style.background=tint;craftStage.append(spark);
  const angle=-Math.PI*(.08+Math.random()*.84),reach=40+Math.random()*90,gravity=30+Math.random()*50;
  const dx=Math.cos(angle)*reach,dy=Math.sin(angle)*reach;
  spark.animate([{transform:`translate(0,0) rotate(${angle}rad)`,opacity:1},{transform:`translate(${dx*.7}px,${dy*.7}px) rotate(${angle}rad)`,opacity:1,offset:.55},{transform:`translate(${dx}px,${dy+gravity}px) rotate(${angle+.6}rad)`,opacity:0}],{duration:450+Math.random()*350,easing:'cubic-bezier(.15,.7,.4,1)',fill:'forwards'}).onfinish=()=>spark.remove();
 }
}
// Молот замахивается и бьёт; в момент удара — искры, вспышка, волна, тряска сцены, звук и разогрев наковальни.
function playForge(cost){
 dropReagents(cost);
 const heat=craftStage.querySelector('.craft-heat');
 for(let s=0;s<STRIKES;s++){
  const start=STRIKE_START+s*STRIKE_GAP,last=s===STRIKES-1;
  hammer.animate([{transform:'rotate(34deg)'},{transform:'rotate(54deg)',offset:.4},{transform:'rotate(-2deg)',offset:STRIKE_HIT},{transform:'rotate(7deg)',offset:.8},{transform:'rotate(34deg)'}],{duration:STRIKE_MS,delay:start,easing:'cubic-bezier(.5,0,.6,1)'});
  craftTimers.push(setTimeout(()=>{
   if(!craftBusy)return;
   const hit=craftHit();
   craftSparks(hit.x,hit.y-8,last?26:14);
   const flash=document.createElement('span');flash.className='craft-flash craft-temp';flash.style.left=hit.x+'px';flash.style.top=hit.y-8+'px';craftStage.append(flash);
   flash.animate([{opacity:0,transform:'scale(.3)'},{opacity:1,transform:'scale(1)',offset:.25},{opacity:0,transform:'scale(1.5)'}],{duration:380,fill:'forwards'}).onfinish=()=>flash.remove();
   const ring=document.createElement('span');ring.className='craft-ring craft-temp';ring.style.left=hit.x+'px';ring.style.top=hit.y-2+'px';craftStage.append(ring);
   ring.animate([{opacity:1,transform:'scale(.4)'},{opacity:0,transform:'scale(2.6)'}],{duration:420,easing:'ease-out',fill:'forwards'}).onfinish=()=>ring.remove();
   craftStage.animate([{transform:'translate(0,0)'},{transform:`translate(${last?-4:-2}px,${last?3:2}px)`},{transform:`translate(${last?3:2}px,-1px)`},{transform:'translate(0,0)'}],{duration:180});
   pile.animate([{filter:'brightness(1)'},{filter:`brightness(${1.6+s*.4}) sepia(.6) saturate(2)`,offset:.3},{filter:`brightness(${1.2+s*.25}) sepia(${.2+s*.15})`}],{duration:400,fill:'forwards'});
   heat.animate([{opacity:Math.min(1,s*.25)},{opacity:Math.min(1,.4+s*.25)}],{duration:300,fill:'forwards'});
   clank(last?1:.8);
  },start+STRIKE_MS*STRIKE_HIT));
 }
}
// Появление выкованного предмета: у каждой редкости своя вспышка, свой эффект и постоянное сияние за предметом,
// которое становится сильнее с ростом редкости. Центр эффектов — центр силуэта предмета над наковальней.
function revealForged(item){
 const tint=color(item.rarity),power=rank(item.rarity),cx=craftStage.clientWidth/2,cy=ghost.offsetTop+ghost.offsetHeight/2;
 const add=(cls,x=cx,y=cy)=>{const node=document.createElement('span');node.className='craft-fx '+cls;node.style.left=x+'px';node.style.top=y+'px';node.style.setProperty('--rc',tint);craftStage.append(node);return node;};
 const once=(node,frames,timing)=>{node.animate(frames,{fill:'forwards',...timing}).onfinish=()=>node.remove();};
 ghost.style.setProperty('--glow-size',8+power*4+'px');
 const aura=add('craft-aura');aura.style.setProperty('--size',90+power*24+'px');aura.style.setProperty('--glow',(.3+power*.12).toFixed(2));
 if(power>=4)add('craft-rays'+(power===5?' divine':''));
 if(reducedMotion())return;
 once(add('craft-burst'),[{opacity:0,transform:'scale(.2)'},{opacity:.6+power*.08,transform:'scale(1)',offset:.3},{opacity:0,transform:`scale(${1.4+power*.2})`}],{duration:450+power*120,easing:'ease-out'});
 REVEAL_EFFECTS[item.rarity]({add,once,cx,cy,tint});
}
const motes=(count,make)=>{for(let i=0;i<count;i++)make(i);};
const REVEAL_EFFECTS={
 // Обычный: лёгкое облачко серебристой пыли.
 Common({add,once}){motes(10,i=>{const angle=i/10*Math.PI*2,reach=30+Math.random()*20;once(add('craft-mote dim'),[{opacity:.9,transform:'translate(0,0) scale(1)'},{opacity:0,transform:`translate(${Math.cos(angle)*reach}px,${Math.sin(angle)*reach}px) scale(.4)`}],{duration:600+Math.random()*300,easing:'ease-out'});});},
 // Необычный: зелёные огоньки медленно всплывают из-под предмета, покачиваясь.
 Uncommon({add,once,cx,cy}){motes(14,i=>{const x=cx+(Math.random()-.5)*80,sway=(Math.random()-.5)*30;once(add('craft-mote',x,cy+40),[{opacity:0,transform:'translate(0,0) scale(.6)'},{opacity:1,transform:`translate(${sway}px,-40px) scale(1)`,offset:.4},{opacity:0,transform:`translate(${-sway}px,-${90+Math.random()*30}px) scale(.5)`}],{duration:1300+Math.random()*500,delay:Math.random()*400,easing:'ease-out'});});},
 // Редкий: синие волны расходятся кольцами, вокруг вспыхивают блики.
 Rare({add,once,cx,cy}){
  [0,180,360].forEach(delay=>once(add('craft-ripple'),[{opacity:.9,transform:'scale(.4)'},{opacity:0,transform:'scale(2.4)'}],{duration:900,delay,easing:'ease-out'}));
  motes(8,i=>{const angle=i/8*Math.PI*2+.3,reach=48+Math.random()*16;once(add('craft-star',cx+Math.cos(angle)*reach,cy+Math.sin(angle)*reach),[{opacity:0,transform:'scale(0) rotate(0)'},{opacity:1,transform:'scale(1.2) rotate(45deg)',offset:.4},{opacity:0,transform:'scale(0) rotate(90deg)'}],{duration:700,delay:150+i*70});});
 },
 // Эпический: фиолетовые огоньки кружат по орбите и стягиваются в предмет, аура пульсирует.
 Epic({add,once,cx,cy}){
  motes(14,i=>{const start=i/14*Math.PI*2,frames=[];for(let s=0;s<=6;s++){const angle=start+s*.7,r=70*(1-s/7);frames.push({opacity:s===6?0:1,transform:`translate(${Math.cos(angle)*r}px,${Math.sin(angle)*r*.7}px) scale(${1.3-s*.12})`});}once(add('craft-mote big'),frames,{duration:1400,delay:i*25,easing:'ease-in'});});
  once(add('craft-ripple'),[{opacity:.8,transform:'scale(1.8)'},{opacity:0,transform:'scale(.5)'}],{duration:1200,easing:'ease-in'});
 },
 // Легендарный: золотые лучи, мощный сноп искр и тлеющие угольки, поднимающиеся вверх.
 Legendary({add,once,cx,cy}){
  motes(26,i=>{const angle=i/26*Math.PI*2+Math.random()*.2,reach=60+Math.random()*60,gravity=25+Math.random()*30;once(add('craft-mote spark'),[{opacity:1,transform:`translate(0,0) rotate(${angle}rad)`},{opacity:1,transform:`translate(${Math.cos(angle)*reach*.7}px,${Math.sin(angle)*reach*.7}px) rotate(${angle}rad)`,offset:.6},{opacity:0,transform:`translate(${Math.cos(angle)*reach}px,${Math.sin(angle)*reach+gravity}px) rotate(${angle}rad)`}],{duration:800+Math.random()*300,easing:'cubic-bezier(.15,.7,.4,1)'});});
  motes(12,i=>{const x=cx+(Math.random()-.5)*110;once(add('craft-mote ember',x,cy+50),[{opacity:0,transform:'translate(0,0)'},{opacity:1,transform:`translate(${(Math.random()-.5)*20}px,-50px)`,offset:.3},{opacity:0,transform:`translate(${(Math.random()-.5)*40}px,-130px)`}],{duration:1600+Math.random()*600,delay:200+Math.random()*600,easing:'ease-out'});});
 },
 // Божественный: столп света сверху, белая вспышка, расходящиеся ореолы и звёзды.
 Divine({add,once,cx,cy}){
  once(add('craft-pillar',cx,0),[{opacity:0,transform:'scaleY(0)'},{opacity:1,transform:'scaleY(1)',offset:.25},{opacity:.8,transform:'scaleY(1)',offset:.6},{opacity:0,transform:'scaleY(1) scaleX(1.6)'}],{duration:1500,easing:'ease-out'});
  once(add('craft-whiteout',craftStage.clientWidth/2,craftStage.clientHeight/2),[{opacity:0},{opacity:.75,offset:.15},{opacity:0}],{duration:700});
  [0,220,440].forEach(delay=>once(add('craft-ripple halo'),[{opacity:1,transform:'scale(.3)'},{opacity:0,transform:'scale(3.2)'}],{duration:1300,delay,easing:'ease-out'}));
  motes(16,i=>{const angle=i/16*Math.PI*2,reach=80+Math.random()*50;once(add('craft-star big'),[{opacity:0,transform:'translate(0,0) scale(0) rotate(0)'},{opacity:1,transform:`translate(${Math.cos(angle)*reach*.4}px,${Math.sin(angle)*reach*.4}px) scale(1.3) rotate(60deg)`,offset:.3},{opacity:0,transform:`translate(${Math.cos(angle)*reach}px,${Math.sin(angle)*reach}px) scale(.4) rotate(160deg)`}],{duration:1400,delay:150+Math.random()*250,easing:'ease-out'});});
 }
};
// В момент появления предмета горка реагентов вспыхивает и сжимается в него, наковальня остывает.
function meltPile(){
 const heat=craftStage.querySelector('.craft-heat');
 if(reducedMotion()||!pile.children.length){clearCraftScene();return;}
 const fade=pile.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.6) translateY(10px)',filter:'brightness(3) blur(3px)'}],{duration:420,fill:'forwards'});
 fade.onfinish=()=>{pile.replaceChildren();pile.getAnimations().forEach(animation=>animation.cancel());};
 heat.animate([{opacity:1},{opacity:0}],{duration:900,fill:'forwards'}).onfinish=()=>heat.getAnimations().forEach(animation=>animation.cancel());
}
$('craftGo').addEventListener('click',forgeCraft);
addEventListener('resize',()=>{if(activeTab==='craft')placeHammer();});
function resetCraft(){
 craftTimers.forEach(clearTimeout);craftTimers=[];
 dialog.querySelectorAll('.craft-temp').forEach(node=>node.remove());clearCraftScene();
 craftStage.getAnimations({subtree:true}).forEach(animation=>{if(!(animation instanceof CSSAnimation))animation.cancel();});
 craftStage.querySelector('.craft-heat').style.opacity=0;
 craftBusy=false;craftDone=null;craftNote='';Object.assign(shown,reagents);
}

// Вкладки переключаются, только когда ни одна из вкладок не занята анимацией.
let activeTab='fusion';
function renderTabs(){
 const busy=phase==='melting'||smeltBusy||craftBusy;
 dialog.querySelectorAll('.anvil-tab').forEach(tab=>{const on=tab.dataset.tab===activeTab;tab.classList.toggle('active',on);tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;tab.disabled=busy&&!on;});
 $('anvilFusionPanel').hidden=activeTab!=='fusion';$('anvilSmeltPanel').hidden=activeTab!=='smelt';$('anvilCraftPanel').hidden=activeTab!=='craft';$('anvilJewelPanel').hidden=activeTab!=='jewel';
}
function showTab(tab){
 if(tab===activeTab||phase==='melting'||smeltBusy||craftBusy)return;
 hideItemTooltip(true);activeTab=tab;renderTabs();renderActive();
}
// «Ювелир» (инкрустация камней) рисует gems.js.
function renderActive(){if(activeTab==='jewel')window.gems?.renderJeweler($('anvilJewelPanel'));else if(activeTab==='smelt')renderSmelt();else if(activeTab==='craft')renderCraft();else render();}
dialog.querySelectorAll('.anvil-tab').forEach(tab=>tab.addEventListener('click',()=>showTab(tab.dataset.tab)));
function resetSmelt(){
 smeltTimers.forEach(clearTimeout);smeltTimers=[];
 dialog.querySelectorAll('.smelt-temp').forEach(node=>node.remove());stage.querySelector('.smelt-circle')?.classList.remove('active');
 stage.getAnimations({subtree:true}).forEach(animation=>{if(!(animation instanceof CSSAnimation))animation.cancel();});
 clearSmeltResult();smeltBusy=false;smeltGain=null;smeltPicks=[];smeltNote='';Object.assign(shown,reagents);
}
// Сброс прогресса в настройках обнуляет и реагенты; «Вернуть прогресс» в течение минуты возвращает их.
let reagentBackup=null;
$('confirmReset').addEventListener('click',()=>{reagentBackup={until:Date.now()+60000,data:{...reagents}};for(const rarity of RANKS)reagents[rarity]=0;saveReagents();Object.assign(shown,reagents);});
$('undoReset').addEventListener('click',()=>{if(reagentBackup&&Date.now()<reagentBackup.until){Object.assign(reagents,reagentBackup.data);saveReagents();Object.assign(shown,reagents);}reagentBackup=null;});

function reset(){
 flipping=false;timers.forEach(clearTimeout);timers=[];clearEffects();forge.classList.remove('melting');
 selected=[null,null,null];sources=null;result=null;sourceRarity=null;phase='idle';note='';
}

openButton.addEventListener('click',()=>{reset();resetSmelt();resetCraft();window.gems?.resetJeweler();renderTabs();dialog.showModal();renderActive();});
// Результат уже лежит в инвентаре, поэтому при закрытии достаточно остановить эффекты и снять блокировки.
// Событие close приходит асинхронно, поэтому кнопка закрытия чистит всё сразу, а Escape — через событие.
function closeAnvil(){hideItemTooltip(true);reset();resetSmelt();resetCraft();revealDone();}
// Пока результат сплавления или ковки не показан, коллекция придерживает сообщение о собранном комплекте.
window.anvilApi={revealPending:()=>dialog.open&&(phase==='melting'||phase==='ready'||craftBusy)};
function revealDone(){setTimeout(()=>window.collectionApi?.flush());}
$('closeAnvil').addEventListener('click',()=>{closeAnvil();dialog.close();});
dialog.addEventListener('close',closeAnvil);
})();
