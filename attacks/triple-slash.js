// Анимация «Тройной росчерк»: три параллельных разреза подряд, как серия быстрых ударов.
// Самодостаточна: стили подключаются сами, от кода игры ничего не зависит.
//
// Подключение:  <script src="attacks/triple-slash.js"></script>
// Использование:
//   tripleSlash(document.getElementById('monster'));                    // обычный удар
//   tripleSlash($('monster'), {critical:true, shake:$('arena')});        // крит с тряской арены
//
// Параметры:
//   critical  — оранжевая палитра и более толстые росчерки (по умолчанию false)
//   shake     — элемент, который тряхнуть при крите (по умолчанию не трясёт)
//   mirror    — true/false, чтобы задать направление; по умолчанию чередуется с каждым вызовом
//   jolt      — покачивать цель на каждом росчерке (по умолчанию true)
// Возвращает длительность анимации в мс.
(()=>{
const NS='http://www.w3.org/2000/svg',LIFE=650;
let flip=1;

const style=document.createElement('style');
style.textContent=`
.triple-slash-fx{position:absolute;inset:-25%;width:150%;height:150%;pointer-events:none;overflow:visible;z-index:4}
.triple-slash-fx .ts-fade{animation:ts-fade .62s ease-out forwards}
.triple-slash-fx .ts-draw{stroke-dasharray:100;stroke-dashoffset:100;animation:ts-draw .13s cubic-bezier(.2,.7,.3,1) var(--ts-delay,0s) forwards}
@keyframes ts-fade{0%,55%{opacity:1}100%{opacity:0}}
@keyframes ts-draw{to{stroke-dashoffset:0}}
`;
document.head.append(style);

function tripleSlash(target,{critical=false,shake=null,mirror,jolt=true}={}){
 if(!target)return 0;
 const c=critical?{main:'#ffcf8a',glow:'#ff8a3d'}:{main:'#fff2cc',glow:'#eddb9c'};
 const dir=mirror===undefined?(flip=-flip):(mirror?-1:1);
 if(getComputedStyle(target).position==='static')target.style.position='relative';

 let paths='';
 for(let i=0;i<3;i++){
  const o=(i-1)*30,d=`M${70+o} 40 Q${135+o} 115 ${150+o} 200`,delay=`--ts-delay:${i*.07}s`;
  paths+=`<path d="${d}" pathLength="100" class="ts-draw" style="${delay}" fill="none" stroke="${c.glow}" stroke-width="12" stroke-linecap="round" opacity=".3"/>`
        +`<path d="${d}" pathLength="100" class="ts-draw" style="${delay}" fill="none" stroke="${i===1?'#fff':c.main}" stroke-width="${critical?5:3.5}" stroke-linecap="round"/>`;
 }
 const fx=document.createElementNS(NS,'svg');
 fx.setAttribute('viewBox','0 0 240 240');fx.setAttribute('aria-hidden','true');fx.classList.add('triple-slash-fx');
 fx.innerHTML=`<g class="ts-fade" style="filter:drop-shadow(0 0 4px ${c.glow})" transform="translate(120 120) scale(${dir} 1) translate(-120 -120)">${paths}</g>`;
 target.append(fx);setTimeout(()=>fx.remove(),LIFE);

 // Web Animations не перебивают CSS-анимации цели (покачивание, смерть и т.п.).
 if(jolt)[60,130,200].forEach(t=>setTimeout(()=>target.animate({rotate:['0deg','-6deg','4deg','0deg']},{duration:250,easing:'ease-out',composite:'add'}),t));
 if(critical&&shake)setTimeout(()=>shake.animate({translate:['0 0','-5px 3px','4px -3px','-3px 2px','2px -1px','0 0']},{duration:300,composite:'add'}),200);
 return LIFE;
}
window.tripleSlash=tripleSlash;
})();
