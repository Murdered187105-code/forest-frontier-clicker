// «Теневой призрак» из attacks/power-shot-variants.html, в координатах экрана.
// Фиолетовая стрела оставляет гаснущие тени-копии. При попадании частицы втягиваются в точку,
// затем расходится тёмная волна. Радиус взрыва уменьшен примерно на треть относительно тестовой страницы.
(()=>{
const canvas=document.createElement('canvas');canvas.id='powerShotFx';
canvas.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:8;width:100%;height:100%';document.body.append(canvas);
const ctx=canvas.getContext('2d'),TAU=Math.PI*2,rnd=(a,b)=>a+Math.random()*(b-a);
let shots=[],parts=[],fx=[],timers=[],raf=0,last=0,w=0,h=0;
function fit(){if(w===innerWidth&&h===innerHeight)return;w=innerWidth;h=innerHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);}
// Частицы: glow — светящаяся точка, smoke — тёмное облако, spark — искра-чёрточка по направлению полёта.
function part(o){parts.push(Object.assign({x:0,y:0,vx:0,vy:0,life:.6,size:6,color:'#fff',type:'glow',drag:2,grow:0},o,{max:o.life||.6}));}
function drawPart(q){
 const t=1-q.life/q.max,a=q.type==='smoke'?1-t:Math.min(1,(1-t)*1.4),s=q.size*(1+q.grow*t);
 ctx.save();ctx.globalAlpha=Math.max(0,a);
 if(q.type==='spark'){ctx.globalCompositeOperation='lighter';ctx.strokeStyle=q.color;ctx.lineWidth=q.size;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x-q.vx*.03,q.y-q.vy*.03);ctx.stroke();}
 else{if(q.type==='glow')ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,s);g.addColorStop(0,q.color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(q.x-s,q.y-s,s*2,s*2);}
 ctx.restore();
}
// Короткие эффекты со своей отрисовкой, t идёт от 0 до 1.
function effect(life,draw){fx.push({life,max:life,draw});}
function ring(x,y,color,r0,r1,life,width){effect(life,t=>{ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=1-t;ctx.strokeStyle=color;ctx.lineWidth=width*(1-t)+.5;ctx.beginPath();ctx.arc(x,y,r0+(r1-r0)*(1-(1-t)**3),0,TAU);ctx.stroke();ctx.restore();});}
function flash(x,y,color,r,life){effect(life,t=>{ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(1-t)**2;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();});}
function arrow(c,line,head,fin,glow,blur){c.strokeStyle=line;c.fillStyle=head;c.lineWidth=3;c.shadowColor=glow;c.shadowBlur=blur;c.beginPath();c.moveTo(-94,0);c.lineTo(-14,0);c.stroke();c.beginPath();c.moveTo(0,0);c.lineTo(-23,-7);c.lineTo(-17,0);c.lineTo(-23,7);c.closePath();c.fill();c.fillStyle=fin;for(const side of [-1,1]){c.beginPath();c.moveTo(-75,0);c.lineTo(-98,side*9);c.lineTo(-106,side*9);c.lineTo(-91,0);c.fill();}}
function trail(s,x,y){
 if(s.ghost===undefined||s.travel-s.ghost>38){s.ghost=s.travel;const a=s.angle,sc=s.scale;
  effect(.32,t=>{ctx.save();ctx.globalAlpha=.45*(1-t);ctx.translate(x,y);ctx.rotate(a);ctx.scale(sc,sc);arrow(ctx,'#6a3ac9','#b98cff','#3a1a6a','#6a3ac9',6);ctx.restore();});}
 part({x:x-s.dx*50*s.scale,y:y-s.dy*50*s.scale,vx:-s.dx*40,vy:-s.dy*40,size:rnd(10,18)*s.scale,life:.6,color:'#1a0a2a99',type:'smoke',grow:1.6});
}
function impact(s,x,y){
 const k=s.scale;
 for(let i=0;i<30;i++){const a=rnd(0,TAU),r=rnd(50,105)*k,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;part({x:px,y:py,vx:(x-px)*4.5,vy:(y-py)*4.5,size:rnd(3,6),life:.22,color:'#c9a2ff',drag:0});}
 effect(.22,t=>{ctx.save();ctx.globalAlpha=t;const r=36*k*(1-t*.6),g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#000');g.addColorStop(.7,'#2a0a4acc');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();});
 // Волна выходит после схлопывания.
 timers.push(setTimeout(()=>{
  ring(x,y,'#8a4aff',8,115*k,.5,7);ring(x,y,'#e0ccff',8,82*k,.38,2);flash(x,y,'#b98cff',85*k,.38);
  for(let i=0;i<22;i++){const a=rnd(0,TAU),v=rnd(140,420);
   part({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,size:rnd(12,21)*k,life:rnd(.55,.9),color:'#1a0a2aaa',type:'smoke',grow:1.3,drag:2.8});
   part({x,y,vx:Math.cos(a)*v*1.3,vy:Math.sin(a)*v*1.3,size:2,life:.45,color:'#d8c0ff',type:'spark',drag:2.8});}
  start();
 },220));
}
function start(){if(!raf){last=performance.now();raf=requestAnimationFrame(frame);}}
function frame(now){
 const dt=Math.min((now-last)/1000,.05);last=now;fit();ctx.clearRect(0,0,w,h);
 // Верхняя панель (название локации, этапы, кнопка подземелий) остаётся чистой: залп рисуется только ниже неё.
 const top=Math.max(0,document.querySelector('.topbar')?.getBoundingClientRect().bottom||0);ctx.save();ctx.beginPath();ctx.rect(0,top,w,h-top);ctx.clip();
 const bodies=[];
 for(const s of [...shots]){
  s.travel=Math.min(s.impact,s.travel+s.speed*dt);const x=s.cx+s.dx*(s.travel-s.before),y=s.cy+s.dy*(s.travel-s.before);
  s.acc+=dt;while(s.acc>.012){s.acc-=.012;trail(s,x,y);}
  if(s.travel>=s.impact){shots=shots.filter(q=>q!==s);if(s.hit())impact(s,x,y);}else bodies.push([s,x,y]);
 }
 parts=parts.filter(q=>(q.life-=dt)>0);
 for(const q of parts){const d=Math.exp(-q.drag*dt);q.vx*=d;q.vy*=d;q.x+=q.vx*dt;q.y+=q.vy*dt;}
 for(const q of parts)if(q.type==='smoke')drawPart(q);
 fx=fx.filter(e=>(e.life-=dt)>0);for(const e of fx)e.draw(1-e.life/e.max);
 for(const q of parts)if(q.type!=='smoke')drawPart(q);
 for(const [s,x,y] of bodies){ctx.save();ctx.translate(x,y);ctx.rotate(s.angle);ctx.scale(s.scale,s.scale);arrow(ctx,'#b98cff','#f0e4ff','#5a2a9a','#8a4aff',14);ctx.restore();}
 ctx.restore();
 raf=shots.length||parts.length||fx.length?requestAnimationFrame(frame):0;
}
window.powerShotFx={
 fire(hit,scale=1){fit();const el=document.querySelector('#monster > svg:not(.slash-effect)')||$('monster'),r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height*.53;
  const angle=Math.random()*TAU,dx=Math.cos(angle),dy=Math.sin(angle),margin=150;
  const ray=(x,y)=>Math.min(x>0?(w+margin-cx)/x:x<0?(-margin-cx)/x:Infinity,y>0?(h+margin-cy)/y:y<0?(-margin-cy)/y:Infinity);
  const before=ray(-dx,-dy),total=before+ray(dx,dy),rx=Math.max(1,r.width*.34),ry=Math.max(1,r.height*.33);
  shots.push({scale,cx,cy,angle,dx,dy,before,impact:Math.max(1,before-1/Math.sqrt((dx/rx)**2+(dy/ry)**2)),travel:0,speed:Math.max(2200,total/.48),acc:0,hit});
  start();
 },
 clear(){shots=[];parts=[];fx=[];timers.forEach(clearTimeout);timers=[];cancelAnimationFrame(raf);raf=0;ctx.clearRect(0,0,w,h);}
};
})();
