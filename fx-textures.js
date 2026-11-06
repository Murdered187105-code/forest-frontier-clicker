// Текстуры эффектов Kenney (assets/effects, лицензия CC0) для любых эффектов игры на Canvas.
// Список берётся из assets/effects/catalog.json: 345 PNG из наборов particle-pack, smoke-particles,
// light-masks и splat-pack. Посмотреть все текстуры: effects-preview.html.
//
// Как пользоваться в эффекте:
//   fxTextures.draw(ctx,'whitePuff00',x,y,64,{color:'#8a4aff',alpha:.5,rotation:a,additive:true});
// Имя — короткое ('spark_01') или с набором ('smoke-particles/whitePuff00'), если короткое повторяется.
// Картинка грузится при первом обращении; пока не загрузилась, draw ничего не рисует и возвращает false.
// Перекрашенные копии кэшируются, поэтому вызывать draw можно в каждом кадре.
(()=>{
 const byName=new Map(),images=new Map(),tinted=new Map();let items=[];
 const ready=fetch('assets/effects/catalog.json').then(r=>r.json()).then(data=>{
  items=data.items||[];const seen=new Map();
  for(const it of items){byName.set(it.pack+'/'+it.name,it);seen.set(it.name,(seen.get(it.name)||0)+1);}
  for(const it of items)if(seen.get(it.name)===1)byName.set(it.name,it);
  return items.length;
 }).catch(()=>0);
 function image(name){
  const it=byName.get(name);if(!it)return null;
  let img=images.get(it.url);if(!img){img=new Image();img.decoding='async';img.src=it.url;images.set(it.url,img);}
  return img.complete&&img.naturalWidth?img:null;
 }
 // Перекраска: текстура становится маской, цвет заливается внутрь неё. Размер кэша — по стороне size.
 function tint(name,color,size=128){
  const key=name+'|'+color+'|'+size;if(tinted.has(key))return tinted.get(key);
  const img=image(name);if(!img)return null;
  const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');
  g.drawImage(img,0,0,size,size);if(color){g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,size,size);}
  tinted.set(key,c);return c;
 }
 function draw(ctx,name,x,y,size,{color=null,alpha=1,rotation=0,additive=false,cache=128}={}){
  const src=color?tint(name,color,cache):image(name);if(!src)return false;
  ctx.save();ctx.globalAlpha*=alpha;if(additive)ctx.globalCompositeOperation='lighter';
  ctx.translate(x,y);if(rotation)ctx.rotate(rotation);ctx.drawImage(src,-size/2,-size/2,size,size);ctx.restore();return true;
 }
 // Заранее загрузить нужные текстуры, чтобы в первом кадре эффекта они уже были.
 function preload(...names){return ready.then(()=>Promise.all(names.map(n=>new Promise(res=>{image(n);const img=images.get(byName.get(n)?.url);if(!img||img.complete)return res();img.onload=img.onerror=()=>res();}))));}
 window.fxTextures={ready,image,tint,draw,preload,
  list:(pack)=>items.filter(it=>!pack||it.pack===pack).map(it=>it.pack+'/'+it.name),
  has:name=>byName.has(name)};
})();
