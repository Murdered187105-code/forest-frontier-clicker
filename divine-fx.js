// Эффект божественных предметов: за картинкой вращаются золотые лучи и «дышит» сияние,
// по краю карточки переливается золотая рамка. Легендарные получают только огненную рамку («Пламенный обод»). Модуль сам находит картинки божественных предметов
// в любом окне (инвентарь, экипировка, коллекция, кузница, подсказки) и снимает эффект, когда предмет пропадает.
// Не трогает: неполученные предметы коллекции и карточки награды сундука (у них свой эффект).
(()=>{
 const SKIP='.reward-card,.rc-face,.set-item.missing';
 const css=document.createElement('style');
 css.textContent=`
@property --divine-ang{syntax:'<angle>';initial-value:0deg;inherits:false}
.divine-host{isolation:isolate}
.divine-aura{position:absolute;z-index:-1;pointer-events:none;transform:translate(-50%,-50%)}
.divine-aura::before,.divine-aura::after{content:'';position:absolute;inset:0;border-radius:50%}
.divine-aura::before{background:radial-gradient(circle,#ffd85a88,#ffb84a33 32%,#0000 62%);animation:divine-pulse 2.8s ease-in-out infinite}
.divine-aura::after{background:repeating-conic-gradient(from 0deg,#ffe8a000 0deg 9deg,#ffe8a066 12deg,#ffe8a000 15deg 30deg);
 -webkit-mask:radial-gradient(circle,#000 0 18%,#0009 38%,#0000 64%);mask:radial-gradient(circle,#000 0 18%,#0009 38%,#0000 64%);animation:divine-spin 14s linear infinite}
.divine-host>img.divine-img{filter:drop-shadow(0 0 5px #ffe39a99)}
.divine-frame{position:absolute;z-index:5;pointer-events:none;border-radius:inherit;padding:2px;
 background:conic-gradient(from var(--divine-ang),#ffd85a,#fff4c2,#ffb347,#fff,#ffd85a 50%,#7a5a1a 60%,#ffd85a);
 -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
 mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);animation:divine-frame 4s linear infinite}
.legend-frame{position:absolute;z-index:5;pointer-events:none;border-radius:inherit;padding:2px;
 background:conic-gradient(from var(--divine-ang),#ff9b3e,#ffe0a0,#ff5a1f,#fff3d6,#ff9b3e 50%,#6a2408 62%,#ff9b3e);
 -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
 mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);animation:divine-frame 4s linear infinite}
@keyframes divine-spin{to{transform:rotate(360deg)}}
@keyframes divine-pulse{0%,100%{opacity:.55;transform:scale(.92)}50%{opacity:1;transform:scale(1.06)}}
@keyframes divine-frame{to{--divine-ang:360deg}}
@media (prefers-reduced-motion:reduce){.divine-aura::before,.divine-aura::after,.divine-frame,.legend-frame{animation:none}}`;
 document.head.append(css);

 // Легендарные предметы получают только рамку «Пламенный обод» — без сияния за картинкой.
 let divineSrc=new Set(),legendSrc=new Set();
 const srcOf=rarity=>new Set(itemPool.filter(i=>i.rarity===rarity).map(i=>new URL(i.image,location.href).href));
 const refreshList=()=>{divineSrc=srcOf('Divine');legendSrc=srcOf('Legendary');};
 const legendHosts=new Set();
 const fitFrame=(host,frame)=>{const b=parseFloat(getComputedStyle(host).borderTopWidth)||0;frame.style.inset=-b+'px';};
 function decorateLegend(img){
  if(img.classList.contains('legend-img')||!legendSrc.has(img.src)||img.closest(SKIP))return;
  const host=img.parentElement;if(!host)return;
  if(getComputedStyle(host).position==='static')host.style.position='relative';
  img.classList.add('legend-img');
  let frame=host.querySelector(':scope>.legend-frame');
  if(!frame){frame=document.createElement('span');frame.className='legend-frame';host.append(frame);}
  fitFrame(host,frame);legendHosts.add(host);
 }
 refreshList();
 const hosts=new Set();
 const sizer=new ResizeObserver(entries=>entries.forEach(e=>place(e.target)));

 // Сияние ставится по центру картинки и в полтора раза больше неё.
 function place(img){
  const aura=img.divineAura;if(!aura||!img.offsetWidth)return;
  const side=Math.max(img.offsetWidth,img.offsetHeight)*1.55;
  Object.assign(aura.style,{left:img.offsetLeft+img.offsetWidth/2+'px',top:img.offsetTop+img.offsetHeight/2+'px',width:side+'px',height:side+'px'});
  const frame=img.parentElement?.querySelector(':scope>.divine-frame');
  if(frame){const b=parseFloat(getComputedStyle(img.parentElement).borderTopWidth)||0;frame.style.inset=-b+'px';}
 }
 function decorate(img){
  decorateLegend(img);
  if(img.divineAura||!divineSrc.has(img.src)||img.closest(SKIP))return;
  const host=img.parentElement;if(!host)return;
  if(getComputedStyle(host).position==='static')host.style.position='relative';
  host.classList.add('divine-host');img.classList.add('divine-img');
  const aura=document.createElement('span');aura.className='divine-aura';host.insertBefore(aura,img);img.divineAura=aura;
  if(!host.querySelector(':scope>.divine-frame')){const frame=document.createElement('span');frame.className='divine-frame';host.append(frame);}
  hosts.add(host);sizer.observe(img);place(img);
 }
 function undecorate(img){
  img.divineAura?.remove();img.divineAura=null;img.classList.remove('divine-img');sizer.unobserve(img);
 }
 // Хозяин без божественной картинки теряет рамку; картинка без хозяина или с другим src — сияние.
 function sweep(){
  for(const host of hosts){
   host.querySelectorAll(':scope>img.divine-img').forEach(img=>{if(!divineSrc.has(img.src)||img.closest(SKIP))undecorate(img);});
   host.querySelectorAll(':scope>.divine-aura').forEach(a=>{if(!(a.nextElementSibling?.divineAura===a))a.remove();});
   if(!host.isConnected||!host.querySelector(':scope>img.divine-img')){host.querySelector(':scope>.divine-frame')?.remove();host.classList.remove('divine-host');hosts.delete(host);}
  }
  for(const host of legendHosts){
   host.querySelectorAll(':scope>img.legend-img').forEach(img=>{if(!legendSrc.has(img.src)||img.closest(SKIP))img.classList.remove('legend-img');});
   if(!host.isConnected||!host.querySelector(':scope>img.legend-img')){host.querySelector(':scope>.legend-frame')?.remove();legendHosts.delete(host);}
  }
 }
 function scan(root){
  if(root.tagName==='IMG')decorate(root);
  else root.querySelectorAll?.('img').forEach(decorate);
 }
 let queued=false;
 const observer=new MutationObserver(records=>{
  for(const r of records){
   if(r.type==='attributes'){if(r.target.divineAura&&!divineSrc.has(r.target.src))undecorate(r.target);if(r.target.tagName==='IMG'){if(!legendSrc.has(r.target.src))r.target.classList.remove('legend-img');decorate(r.target);}}
   else r.addedNodes.forEach(n=>n.nodeType===1&&scan(n));
  }
  if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;sweep();});}
 });
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
 scan(document.body);
 window.divineFx={refresh(){refreshList();scan(document.body);sweep();}};
})();
