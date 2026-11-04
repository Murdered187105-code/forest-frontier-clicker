// Рабочие помощники для нарезки боссов (подключаются из консоли страницы на 127.0.0.1:8765, в игру не входят).
window.cut={
 load:s=>new Promise((r,e)=>{const i=new Image();i.onload=()=>r(i);i.onerror=e;i.src=s;}),
 // отправить холст во временный приёмник PNG (scratchpad/png_receiver.py на порту 8799)
 send:async(name,c)=>{const png=c.toDataURL('image/png').split(',')[1];return (await fetch('http://127.0.0.1:8799/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,png})})).status;},
 canvas:(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},
 grid(x,X0,Y0,w,h,sc,step=50){x.save();x.lineWidth=1;x.font='13px sans-serif';for(let g=Math.ceil(X0/step)*step;g<X0+w;g+=step){x.strokeStyle=g%100?'rgba(0,255,255,.25)':'rgba(0,255,255,.6)';x.beginPath();x.moveTo((g-X0)*sc,0);x.lineTo((g-X0)*sc,h*sc);x.stroke();if(g%100==0){x.fillStyle='#0ff';x.fillText(g,(g-X0)*sc+2,12);}}for(let g=Math.ceil(Y0/step)*step;g<Y0+h;g+=step){x.strokeStyle=g%100?'rgba(0,255,255,.25)':'rgba(0,255,255,.6)';x.beginPath();x.moveTo(0,(g-Y0)*sc);x.lineTo(w*sc,(g-Y0)*sc);x.stroke();if(g%100==0){x.fillStyle='#0ff';x.fillText(g,2,(g-Y0)*sc-2);}}x.restore();},
 // кадр изображения с сеткой и (необязательно) контурами многоугольников
 async crop(name,img,X,Y,w,h,sc=1,polys=[],step=50){const c=cut.canvas(w*sc,h*sc),x=c.getContext('2d');x.fillStyle='#222';x.fillRect(0,0,c.width,c.height);x.drawImage(img,X,Y,w,h,0,0,w*sc,h*sc);cut.grid(x,X,Y,w,h,sc,step);
  const cols=['#0f0','#ff0','#f0f','#0ff','#fff','#f80'];polys.forEach((p,i)=>{x.strokeStyle=cols[i%cols.length];x.lineWidth=2;x.beginPath();p.forEach(([px,py],j)=>x[j?'lineTo':'moveTo']((px-X)*sc,(py-Y)*sc));x.closePath();x.stroke();});return cut.send(name,c);}
};
