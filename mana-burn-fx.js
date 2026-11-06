// Общий эффект поддерживаемых навыков, которые тратят ману в секунду: мана стоит на значке как жидкость и выгорает сверху,
// от её поверхности летят искры, рамка светится, раз в секунду всплывает «−N». При малом запасе пламя краснеет.
// После выключения навык 5 секунд на перезарядке (при сбросе боя перезарядка не начинается: burn.setOn(false,true)).
// Новый такой навык подключается так: const burn=manaBurnFx(кнопка,цена в секунду); burn.setOn(вкл), burn.tick() раз в секунду,
// а перед включением проверка burn.ready().
(()=>{
const TAU=Math.PI*2,COOLDOWN_MS=5000,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const style=document.createElement('style');
style.textContent=`
.mana-burn-skill{overflow:visible;isolation:isolate}
.mana-burn-skill .mana-burn-fx{position:absolute;left:50%;top:50%;width:150%;height:150%;translate:-50% -50%;pointer-events:none;z-index:2}
.mana-burn-skill .skill-number,.mana-burn-skill .skill-mana-cost{z-index:3}
.mana-burn-skill.mana-burn-on{border-color:#7fc8ff;box-shadow:inset 0 0 18px #0009,0 0 18px #4aa8ff88}
.mana-burn-tick{position:absolute;right:-8px;top:-6px;z-index:4;font-size:13px;font-weight:800;color:#8fd0ff;text-shadow:0 1px 3px #000;pointer-events:none}
.mana-burn-skill.mana-burn-cooling{border-color:#817248;box-shadow:inset 0 0 18px #0007}
.mana-burn-skill.mana-burn-cooling>img{opacity:.35}
.mana-burn-skill.mana-burn-cooling::before{content:'';position:absolute;inset:-2px;z-index:2;border-radius:50%;background:conic-gradient(from 0deg,#7fc8ff 0deg var(--cooldown-angle),#7fc8ff14 var(--cooldown-angle) 360deg);mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));pointer-events:none}
.mana-burn-time{display:none;position:absolute;inset:0;z-index:3;place-items:center;font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;color:#e6f4ff;text-shadow:0 1px 4px #000;pointer-events:none}
.mana-burn-cooling .mana-burn-time{display:grid}
`;
document.head.append(style);

const quietFx=()=>!settings.animations||matchMedia('(prefers-reduced-motion: reduce)').matches;
const items=[];
let running=false,last=0,time=0;

function draw(item,dt){
 const {button,canvas,ctx:c}=item,size=button.offsetWidth||70,box=size*1.5,dpr=Math.min(2,devicePixelRatio||1),pixels=Math.round(box*dpr);
 if(canvas.width!==pixels){canvas.width=pixels;canvas.height=pixels;}
 const mid=box/2,R=size/2-2,share=clamp(mana/maxMana(),0,1),low=share<.2,blue=low?'255,110,90':'90,170,255',hot=low?'255,200,170':'205,235,255',quiet=quietFx();
 c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,box,box);
 if(item.on){
  const top=mid+R-2*R*share;
  c.save();c.beginPath();c.arc(mid,mid,R,0,TAU);c.clip();
  const g=c.createLinearGradient(0,top,0,mid+R);g.addColorStop(0,`rgba(${hot},.75)`);g.addColorStop(.18,`rgba(${blue},.55)`);g.addColorStop(1,`rgba(${blue},.2)`);c.fillStyle=g;
  c.beginPath();c.moveTo(mid-R,mid+R);c.lineTo(mid-R,top);
  for(let x=mid-R;x<=mid+R;x+=3)c.lineTo(x,top+(quiet?0:Math.sin(x*.22+time*7)*2+Math.sin(x*.1-time*4)*1.4));
  c.lineTo(mid+R,mid+R);c.closePath();c.fill();c.restore();
  if(!quiet&&share>.01)for(let i=0;i<2;i++){const half=Math.sqrt(Math.max(0,R*R-(top-mid)**2))*.92;item.parts.push({x:mid+(Math.random()*2-1)*half,y:top,vx:(Math.random()-.5)*12,vy:-22-Math.random()*34,life:.45,max:.45,size:.8+Math.random()*2.2,hot:Math.random()<.5});}
 }
 c.save();c.globalCompositeOperation='lighter';
 item.parts=item.parts.filter(p=>(p.life-=dt)>0);
 for(const p of item.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;const k=p.life/p.max;c.fillStyle=`rgba(${p.hot?hot:blue},${k})`;c.beginPath();c.arc(p.x,p.y,p.size*(.5+k*.5),0,TAU);c.fill();}
 c.restore();
}
function frame(now){
 const dt=clamp((now-last)/1000,0,1);last=now;time+=dt;
 for(const item of items)if(item.on||item.parts.length||item.dirty){draw(item,dt);item.dirty=item.on||item.parts.length>0;}
 if(items.some(item=>item.on||item.parts.length||item.dirty))requestAnimationFrame(frame);else running=false;
}
function start(){if(running)return;running=true;last=performance.now();requestAnimationFrame(frame);}
function refreshCooldown(item){
 const remaining=Math.max(0,item.readyAt-Date.now());
 item.button.classList.toggle('mana-burn-cooling',remaining>0);
 if(!remaining)return;
 item.button.style.setProperty('--cooldown-angle',remaining/COOLDOWN_MS*360+'deg');
 item.time.textContent=Math.ceil(remaining/1000)+'с';
}
setInterval(()=>items.forEach(refreshCooldown),100);

window.manaBurnFx=function(button,cost){
 const canvas=document.createElement('canvas');canvas.className='mana-burn-fx';button.classList.add('mana-burn-skill');
 button.querySelector('img')?button.querySelector('img').after(canvas):button.prepend(canvas);
 const time=document.createElement('span');time.className='mana-burn-time';canvas.after(time);
 const item={button,canvas,ctx:canvas.getContext('2d'),time,on:false,dirty:false,parts:[],readyAt:0};items.push(item);
 return {
  ready:()=>Date.now()>=item.readyAt,
  setOn(value,noCooldown=false){
   if(item.on&&!value&&!noCooldown){item.readyAt=Date.now()+COOLDOWN_MS;refreshCooldown(item);}
   item.on=value;item.dirty=true;button.classList.toggle('mana-burn-on',value);start();
  },
  tick(amount=cost){
   if(quietFx())return;
   const tick=document.createElement('span');tick.className='mana-burn-tick';tick.textContent='−'+String(amount).replace('.',',');button.append(tick);
   tick.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-26px)'}],{duration:800,easing:'ease-out',fill:'forwards'}).onfinish=()=>tick.remove();
  }
 };
};
// Новая попытка в подземелье восстанавливает навыки, как и остальные перезарядки.
window.manaBurnFx.resetCooldowns=()=>items.forEach(item=>{item.readyAt=0;refreshCooldown(item);});
})();
