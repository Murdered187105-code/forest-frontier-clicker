// Ромбовидная волна при изучении таланта в древе любого навыка (и при открытии самого навыка в корне древа).
// Работает для всех навыков сразу: перед кликом запоминает очки и вложенные таланты, после клика сравнивает.
// Сами обработчики талантов не трогает, поэтому новым навыкам ничего подключать не нужно.
(()=>{
const content=$('talentTreeContent');if(!content)return;
const style=document.createElement('style');
style.textContent=`
.talent-burst{position:fixed;z-index:1000;pointer-events:none;translate:-50% -50%}
.talent-burst i{position:absolute;left:0;top:0;width:var(--s);height:var(--s);margin:calc(var(--s)/-2) 0 0 calc(var(--s)/-2);rotate:45deg;border:2px solid #d6e8ffcc;box-shadow:0 0 8px #9cc8ff99,inset 0 0 6px #9cc8ff55;opacity:0}
.talent-burst i.fill{border:0;background:radial-gradient(circle,#ffffff99,#9cc8ff3a 55%,transparent 72%);box-shadow:none}
.talent-burst b{position:absolute;left:0;top:0;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;rotate:45deg;background:#d6e8ff;box-shadow:0 0 4px #9cc8ffaa;opacity:0}
`;
document.head.append(style);

const invested=()=>content.querySelectorAll('.talent-invested').length;
const rootLearned=()=>!!content.querySelector('.detail-root.talent-learned');
const spent=()=>{try{return spentTalentPoints();}catch{return 0;}};
const snapshot=()=>({points:talentPoints,spent:spent(),invested:invested(),root:rootLearned()});

function burst(rect){
 if(!settings.animations||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const host=content.closest('dialog')||document.body,size=Math.max(40,Math.min(rect.width,rect.height)*.72);
 const box=document.createElement('div');box.className='talent-burst';box.style.left=rect.left+rect.width/2+'px';box.style.top=rect.top+rect.height/2+'px';box.style.setProperty('--s',size+'px');
 const fill=document.createElement('i');fill.className='fill';box.append(fill);
 fill.animate([{opacity:.5,scale:.6},{opacity:0,scale:1.9}],{duration:520,easing:'ease-out'});
 // Три ромба-волны расходятся друг за другом.
 for(let k=0;k<3;k++){const w=document.createElement('i');box.append(w);w.animate([{opacity:0,scale:.8,borderWidth:'3px'},{opacity:.6,scale:1,offset:.12},{opacity:0,scale:3.2-k*.5,borderWidth:'1px'}],{duration:760,delay:k*120,easing:'cubic-bezier(.2,.6,.3,1)',fill:'both'});}
 // Искры-ромбики разлетаются по четырём углам ромба и между ними.
 for(let k=0;k<8;k++){const a=k*Math.PI/4+Math.PI/4,d=size*(k%2?1.15:1.6),s=document.createElement('b');box.append(s);
  s.animate([{opacity:.65,translate:'0 0',scale:1},{opacity:0,translate:`${Math.cos(a)*d}px ${Math.sin(a)*d}px`,scale:.3}],{duration:620,delay:60,easing:'ease-out',fill:'both'});}
 host.append(box);setTimeout(()=>box.remove(),1200);
}

// Захват клика до обработчиков древа: древо после изучения часто перерисовывается, поэтому место берём заранее.
content.addEventListener('click',event=>{
 const node=event.target.closest('.detail-talent,.detail-root');if(!node||!content.contains(node))return;
 const target=node.classList.contains('detail-root')?node:node.querySelector('.talent-node')||node,rect=target.getBoundingClientRect(),before=snapshot();
 setTimeout(()=>{
  const now=snapshot();
  if(now.points<before.points||now.spent>before.spent||now.invested>before.invested||(now.root&&!before.root))burst(rect);
 },0);
},true);
window.talentBurst=burst;
})();
