// Редактор анимации «Мощного удара»: F5 или кнопка в админ-панели. Только локально — на опубликованном сайте скрыт.
// Плавающая панель (не модальное окно), чтобы игра и сам удар оставались видны и кликабельны во время настройки.
(()=>{
if(window.IS_PUBLIC_SITE)return;
const DRAFT_KEY='forest-frontier-power-strike-draft-v1';
const clone=value=>JSON.parse(JSON.stringify(value));
const FIELDS=[
 {key:'durationScale',label:'Скорость замаха',min:.5,max:2,step:.05,fmt:v=>v.toFixed(2)+'×',hint:'меньше — быстрее, больше — медленнее'},
 {key:'swordScale',label:'Размер меча',min:.5,max:1.8,step:.05,fmt:v=>v.toFixed(2)+'×'},
 {key:'shakeScale',label:'Сила тряски моба',min:0,max:3,step:.1,fmt:v=>v.toFixed(1)+'×'}
];
function normalize(data){
 const d=data||{};
 return {version:1,
  durationScale:Math.min(2,Math.max(.5,Number(d.durationScale)||1)),
  swordScale:Math.min(1.8,Math.max(.5,Number(d.swordScale)||1)),
  trailColor:/^#[0-9a-f]{6}$/i.test(d.trailColor)?d.trailColor:'#9fdcff',
  shakeScale:Math.min(3,Math.max(0,Number(d.shakeScale)??1))};
}
function load(){try{const draft=localStorage.getItem(DRAFT_KEY);if(draft)return normalize(JSON.parse(draft));}catch{}return normalize(window.POWER_STRIKE);}
let cfg=load(),dirty=!!localStorage.getItem(DRAFT_KEY);

const style=document.createElement('style');
style.textContent=`
.pse-panel{position:fixed;top:12px;right:12px;z-index:2147483000;width:280px;max-height:calc(100vh - 24px);overflow:auto;background:linear-gradient(160deg,#0c1d22,#07120f);border:1px solid #7fe6c255;border-radius:14px;box-shadow:0 18px 60px #000a;padding:14px;color:#e4f6ee;font:12px Manrope,Segoe UI,sans-serif}
.pse-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-weight:800;font-size:14px}
.pse-head button{background:#0e2a2a;border:1px solid #7fe6c255;color:#d6f7ea;border-radius:7px;width:26px;height:26px;cursor:pointer;font-size:14px;line-height:1}
.pse-field{margin-bottom:12px}
.pse-field label{display:flex;justify-content:space-between;gap:6px;font-weight:700;color:#8fb8aa;margin-bottom:5px}
.pse-field label b{color:#8ff2c9;font-weight:800}
.pse-field input[type=range]{width:100%;accent-color:#5fe6b6}
.pse-field input[type=color]{width:100%;height:30px;padding:2px;border:1px solid #7fe6c255;border-radius:7px;background:#061214}
.pse-hint{display:block;margin-top:3px;font-size:10.5px;color:#6f948a}
.pse-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.pse-actions button{flex:1 1 auto;padding:8px 10px;border-radius:8px;border:1px solid #7fe6c255;background:#0e2a2a;color:#d6f7ea;cursor:pointer;font:700 12px Manrope,sans-serif}
.pse-actions button:hover{background:#123636}
.pse-actions button.pse-primary{color:#062018;border:0;background:linear-gradient(135deg,#d4ff7a,#5fe6b6)}
.pse-state{margin:10px 0 0;font-size:11px;font-weight:700;color:#9ff28f}
.pse-state.dirty{color:#edc77b}
.pse-state.warn{color:#ff9ab0}
`;
document.head.append(style);

const panel=document.createElement('div');panel.className='pse-panel';panel.hidden=true;
panel.innerHTML=`<div class="pse-head">🗡 Редактор «Мощного удара»<button type="button" data-a="close" aria-label="Закрыть">×</button></div>
<div data-fields></div>
<div class="pse-field"><label>Цвет следа клинка</label><input type="color" data-field="trailColor"></div>
<div class="pse-actions"><button type="button" data-a="play" class="pse-primary">▶ Проиграть</button><button type="button" data-a="save">Сохранить в файл</button><button type="button" data-a="revert">Сбросить</button></div>
<p class="pse-state"></p>`;
document.body.append(panel);
panel.addEventListener('keydown',event=>event.stopPropagation());

const fieldsBox=panel.querySelector('[data-fields]');
fieldsBox.innerHTML=FIELDS.map(f=>`<div class="pse-field"><label>${f.label}<b data-val="${f.key}"></b></label><input type="range" data-field="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}">${f.hint?`<span class="pse-hint">${f.hint}</span>`:''}</div>`).join('');

function render(){
 for(const f of FIELDS){
  panel.querySelector(`[data-field="${f.key}"]`).value=cfg[f.key];
  panel.querySelector(`[data-val="${f.key}"]`).textContent=f.fmt(cfg[f.key]);
 }
 panel.querySelector('[data-field="trailColor"]').value=cfg.trailColor;
 const state=panel.querySelector('.pse-state');
 state.textContent=dirty?'Есть изменения, не сохранённые в файл (в игре уже действуют)':'Всё сохранено в power-strike-data.js';
 state.className='pse-state'+(dirty?' dirty':'');
}
function commit(){window.POWER_STRIKE=clone(cfg);try{localStorage.setItem(DRAFT_KEY,JSON.stringify(cfg));}catch{}dirty=true;render();}

panel.addEventListener('input',event=>{
 const key=event.target.dataset.field;if(!key)return;
 cfg[key]=key==='trailColor'?event.target.value:Number(event.target.value);
 commit();
});
panel.addEventListener('click',async event=>{
 const b=event.target.closest('button');if(!b)return;
 if(b.dataset.a==='close'){panel.hidden=true;return;}
 if(b.dataset.a==='play'){preview();return;}
 if(b.dataset.a==='revert'){
  if(dirty&&!await gameConfirm({title:'Отменить изменения?',text:'Вернутся настройки анимации из файла.',ok:'Отменить правки'}))return;
  try{localStorage.removeItem(DRAFT_KEY);}catch{}cfg=normalize(window.POWER_STRIKE);window.POWER_STRIKE=clone(cfg);dirty=false;render();return;
 }
 if(b.dataset.a==='save'){save();}
});
async function save(){
 try{
  const response=await fetch('/api/power-strike',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)});
  if(!response.ok)throw new Error(response.status);
  try{localStorage.removeItem(DRAFT_KEY);}catch{}dirty=false;render();
 }catch{
  const url=URL.createObjectURL(new Blob(['// Настройки анимации «Мощного удара». Этот файл перезаписывает редактор анимации (F5 или кнопка в админ-панели).\nwindow.POWER_STRIKE='+JSON.stringify(cfg,null,1)+';\n'],{type:'text/javascript'})),a=document.createElement('a');a.href=url;a.download='power-strike-data.js';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  const state=panel.querySelector('.pse-state');state.textContent='Сервер сохранения не запущен: скачан power-strike-data.js — положи его в папку игры.';state.className='pse-state warn';
 }
}
// Проигрывает удар на текущем мобе без траты маны, перезарядки и урона — только чтобы увидеть результат.
function preview(){
 if(typeof playCustomPowerSwing!=='function')return;
 cancelCustomPowerSwing?.();cancelCustomPowerSwing=playCustomPowerSwing();
 const monster=document.getElementById('monster'),duration=powerStrikeDuration();
 setTimeout(()=>{
  monster.style.setProperty('--power-shake-scale',cfg.shakeScale);
  monster.classList.remove('hit','power-shaken');void monster.offsetWidth;monster.classList.add('power-shaken');
  setTimeout(()=>monster.classList.remove('power-shaken'),350);
 },Math.round(duration*POWER_HIT_RATIO));
}
function open(){window.POWER_STRIKE=clone(cfg);panel.hidden=false;render();}
addEventListener('keydown',event=>{if(event.code==='F5'){event.preventDefault();panel.hidden=!panel.hidden;if(!panel.hidden)open();}});
const admin=document.getElementById('adminPanel');
if(admin){const b=document.createElement('button');b.type='button';b.textContent='🗡 Редактор удара (F5)';b.style.cssText='width:100%;margin-top:10px';b.addEventListener('click',()=>{admin.close();open();});admin.append(b);}
window.powerStrikeEditor={open};
})();
