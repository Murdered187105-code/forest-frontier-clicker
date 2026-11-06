// Original synthesized frost sounds. No downloads or external audio dependencies.
(()=>{
const KEY='forest-frontier-sfx-v1',prefs={on:true,volume:45};
try{const s=JSON.parse(localStorage.getItem(KEY));if(s){prefs.on=s.on!==false;if(Number.isFinite(s.volume))prefs.volume=Math.max(0,Math.min(100,s.volume));}}catch{}
let ctx=null,master=null,flight=null,impact=null;
const voices=new Set();
function buffer(seconds,kind){
 const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*seconds),ctx.sampleRate),d=b.getChannelData(0);
 let smooth=0,phase=0;
 for(let i=0;i<d.length;i++){
  const t=i/ctx.sampleRate,u=t/seconds,n=Math.random()*2-1;smooth+=.18*(n-smooth);
  if(kind==='flight'){
   phase+=2*Math.PI*(2200-1500*u)/ctx.sampleRate;
   d[i]=(.65*smooth+.09*Math.sin(phase))*Math.sin(Math.PI*u)**1.4;
  }else{
   const attack=Math.min(1,t/.003),tail=(1-u)**2;
   const crack=(n-smooth)*Math.exp(-t*35)*.34;
   const ice=(Math.sin(t*2*Math.PI*1931)+.5*Math.sin(t*2*Math.PI*3173)+.3*Math.sin(t*2*Math.PI*4517))*.10*Math.exp(-t*12);
   const shards=(n-smooth)*.12*(.25+.75*Math.sin(t*111)**8)*Math.exp(-t*9);
   d[i]=(crack+ice+shards+smooth*.12*Math.exp(-t*7))*attack*tail;
  }
 }
 return b;
}
function applyVolume(){if(master)master.gain.setTargetAtTime(prefs.on&&!document.hidden?prefs.volume/100*.65:0,ctx.currentTime,.015);}
function wake(){
 if(!prefs.on||document.hidden)return;
 try{
  if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();master=ctx.createGain();master.gain.value=0;
   const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=12;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.12;
   master.connect(limiter).connect(ctx.destination);flight=buffer(.23,'flight');impact=buffer(.42,'impact');}
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});applyVolume();
 }catch{/* Audio must never interrupt combat. */}
}
function stop(){for(const source of voices){try{source.stop();}catch{}}voices.clear();}
function play(kind){
 if(!prefs.on||document.hidden||!ctx||ctx.state!=='running'||voices.size>=8)return;
 try{const source=ctx.createBufferSource();source.buffer=kind==='flight'?flight:impact;source.playbackRate.value=.94+Math.random()*.12;source.connect(master);voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();};source.start();}catch{}
}
for(const event of ['pointerdown','keydown'])addEventListener(event,wake,{capture:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();applyVolume();});
document.querySelector('#damageEnabled').closest('.setting-row').insertAdjacentHTML('afterend',
 '<label class="setting-row" for="sfxEnabled"><span>Звуковые эффекты</span><input type="checkbox" id="sfxEnabled"></label>'+
 '<label class="setting-row music-volume-row" for="sfxVolume"><span>Громкость эффектов</span><span style="display:flex;align-items:center;gap:10px"><input type="range" id="sfxVolume" min="0" max="100" step="1"><b id="sfxVolumeValue"></b></span></label>');
const toggle=document.getElementById('sfxEnabled'),slider=document.getElementById('sfxVolume'),value=document.getElementById('sfxVolumeValue');
toggle.checked=prefs.on;slider.value=prefs.volume;value.textContent=prefs.volume+'%';
function changed(){prefs.on=toggle.checked;prefs.volume=Number(slider.value);value.textContent=prefs.volume+'%';try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch{}if(!prefs.on)stop();wake();applyVolume();}
toggle.addEventListener('change',changed);slider.addEventListener('input',changed);
window.powerShotAudio={flight:()=>play('flight'),impact:()=>play('impact'),stop};
})();
