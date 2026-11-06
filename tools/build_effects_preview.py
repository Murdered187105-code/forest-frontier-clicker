"""Build an offline gallery for the installed Kenney particle textures."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
packs = [
    ('particle-pack', 'Частицы', 'PNG (Transparent)', 'License.txt'),
    ('smoke-particles', 'Дым и взрывы', 'PNG', 'license.txt'),
    ('light-masks', 'Свет и сияние', 'Transparent', 'License.txt'),
    ('splat-pack', 'Брызги и пятна', 'PNG/Double (512px)', 'License.txt'),
]
items = []
pack_info = []
for slug, label, folder, license_name in packs:
    base = root / 'assets/effects' / ('kenney-' + slug)
    files = sorted((base / folder).glob('*.png') if slug == 'particle-pack' else (base / folder).rglob('*.png'))
    if not files or not (base / license_name).is_file():
        raise SystemExit('Missing textures/license: ' + slug)
    items.extend({'name': p.stem, 'url': p.relative_to(root).as_posix(),
                  'pack': slug, 'label': label,
                  'category': p.parent.name} for p in files)
    pack_info.append({'id': slug, 'label': label, 'count': len(files),
                      'source': 'https://kenney.nl/assets/' + slug,
                      'license': (base / license_name).relative_to(root).as_posix()})
page = '''<!doctype html>
<html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Библиотека эффектов</title>
<style>
body{margin:0;padding:28px;background:#111a17;color:#eee;font:16px system-ui}h1{color:#edc77b}p{color:#b8c5be}
input,select{padding:12px;max-width:90%;background:#22352b;color:white;border:1px solid #667c6c;border-radius:8px}input{width:min(90%,400px)}
#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:12px;margin-top:22px}
button{background:#1d2c25;color:#ddd;border:1px solid #3b5144;border-radius:12px;padding:12px;cursor:pointer}
button img{display:block;width:100%;height:100px;object-fit:contain}button:hover{border-color:#edc77b}
button.splat img{background:#c6d8c9;border-radius:8px}button small{display:block;color:#a9bbae;font-size:11px;margin-top:6px}#sources{display:flex;gap:18px;flex-wrap:wrap;font-size:13px}#count{font-variant-numeric:tabular-nums}
.particle{position:fixed;width:60px;height:60px;pointer-events:none;z-index:10;object-fit:contain}a{color:#edc77b}
@media(prefers-reduced-motion:reduce){.particle{display:none}}
</style>
<h1>Библиотека эффектов · Kenney</h1>
<p>__COUNT__ изображений в четырёх наборах · CC0. Нажмите на карточку для пробной анимации. Это исходные текстуры для эффектов, а не готовые боевые навыки.</p>
<p><a href="index.html">Вернуться в игру</a></p><div id="sources"></div>
<p><input id="search" aria-label="Поиск текстур" placeholder="Поиск: smoke, spark, fire…"> <select id="pack" aria-label="Набор эффектов"><option value="">Все наборы</option></select></p><p id="count" role="status"></p><div id="grid"></div>
<script>
const items=__ITEMS__;
const packs=__PACKS__;
const grid=document.getElementById('grid'),search=document.getElementById('search');
const pack=document.getElementById('pack'),sources=document.getElementById('sources');
for(const p of packs){
 const option=document.createElement('option');option.value=p.id;option.textContent=p.label+' · '+p.count;pack.append(option);
 const group=document.createElement('span'),link=document.createElement('a'),license=document.createElement('a');
 link.href=p.source;link.textContent=p.label;link.target='_blank';link.rel='noopener';license.href=p.license;license.textContent='CC0';
 group.append(link,' · ',license);sources.append(group);
}
function render(){
 grid.replaceChildren();
 const filtered=items.filter(i=>(!pack.value||pack.value===i.pack)&&(i.name+' '+i.label+' '+i.category).toLowerCase().includes(search.value.trim().toLowerCase()));
 document.getElementById('count').textContent='Показано: '+filtered.length+' / '+items.length;
 for(const item of filtered){
  const b=document.createElement('button'),img=new Image(),label=document.createElement('span');
  img.src=item.url;img.alt='';img.loading='lazy';label.textContent=item.name;const small=document.createElement('small');small.textContent=item.label;b.append(img,label,small);b.title=item.url;b.classList.toggle('splat',item.pack==='splat-pack');
  b.onclick=()=>{
   if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   const r=b.getBoundingClientRect();
   const glow=item.pack==='light-masks',splat=item.pack==='splat-pack',smoke=item.pack==='smoke-particles';
   for(let i=0;i<(glow||splat?1:12);i++){
    const p=new Image();p.src=item.url;p.alt='';p.className='particle';p.style.left=(r.left+r.width/2-30)+'px';p.style.top=(r.top+r.height/2-30)+'px';document.body.append(p);
    const a=Math.random()*Math.PI*2,d=60+Math.random()*100;
    if(glow)p.style.mixBlendMode='screen';
    if(splat)p.style.filter='drop-shadow(0 0 3px white)';
    const dx=glow||splat?0:Math.cos(a)*d,dy=glow||splat?0:smoke?-d:Math.sin(a)*d;
    const anim=p.animate([{transform:'translate(0,0) scale(.3)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(${glow?4:smoke?2:1.8})`,opacity:0}],{duration:smoke?1600:900,easing:'ease-out'});
    anim.onfinish=()=>p.remove();
   }
  };grid.append(b);
 }
}
search.oninput=render;pack.onchange=render;render();
</script></html>'''
(root / 'effects-preview.html').write_text(page.replace('__ITEMS__', json.dumps(items)).replace('__PACKS__', json.dumps(pack_info)).replace('__COUNT__', str(len(items))), encoding='utf-8')
(root / 'assets/effects/catalog.json').write_text(json.dumps({'packs': pack_info, 'items': items}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Gallery created: {len(items)} textures')
for pack in pack_info:
    print(pack['id'], pack['count'])
