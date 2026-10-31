// Фоновая музыка без файлов: тихий эмбиент на Web Audio. Своя тема для леса, поля и подземелья,
// при смене локации темы плавно перетекают друг в друга. Браузер разрешает звук только после первого клика.
(()=>{
const KEY='forest-frontier-music-v1';
const prefs={on:true,volume:40};
try{const s=JSON.parse(localStorage.getItem(KEY));if(s){prefs.on=s.on!==false;if(Number.isFinite(s.volume))prefs.volume=Math.max(0,Math.min(100,s.volume));}}catch{}
const savePrefs=()=>{try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch{}};
const mtof=m=>440*2**((m-69)/12),rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const LOOKAHEAD=1.6;
let ctx=null,master=null,reverbIn=null,noise=null,current=null,beat=0,nextTime=0,mel=4;

function impulse(sec,decay){
 const len=Math.floor(ctx.sampleRate*sec),b=ctx.createBuffer(2,len,ctx.sampleRate);
 for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len)**decay;}
 return b;
}
function init(){
 if(ctx)return true;
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
 ctx=new AC();
 master=ctx.createGain();master.gain.value=0;
 const comp=ctx.createDynamicsCompressor();comp.threshold.value=-20;comp.ratio.value=3;
 master.connect(comp).connect(ctx.destination);
 const rev=ctx.createConvolver();rev.buffer=impulse(3.4,2.6);
 const wet=ctx.createGain();wet.gain.value=.5;rev.connect(wet).connect(master);reverbIn=rev;
 const len=ctx.sampleRate*2;noise=ctx.createBuffer(1,len,ctx.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
 return true;
}

// ── Голоса ──────────────────────────────────────────────────────────────
function out(bus,node,send){node.connect(bus.dry);if(send){const s=ctx.createGain();s.gain.value=send;node.connect(s).connect(bus.wet);}}
function env(g,t,attack,peak,hold,release){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+attack);g.gain.setValueAtTime(peak,t+attack+hold);g.gain.exponentialRampToValueAtTime(.0001,t+attack+hold+release);}
function osc(type,freq,t,stop,dest,detune=0){const o=ctx.createOscillator();o.type=type;o.frequency.value=freq;o.detune.value=detune;o.connect(dest);o.start(t);o.stop(stop);return o;}
function pad(bus,notes,t,dur,{cutoff=1100,level=.04,type='triangle'}={}){
 const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=cutoff;f.Q.value=.4;
 const g=ctx.createGain();env(g,t,1.6,level,Math.max(.1,dur-3),2.4);f.connect(g);out(bus,g,.8);
 for(const m of notes)for(const det of [-7,7])osc(type,mtof(m),t,t+dur+2.6,f,det);
}
function pluck(bus,m,t,level=.1,decay=1.6){
 const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+decay);out(bus,g,.7);
 for(const [mul,lv] of [[1,1],[2,.25],[3,.07]]){const og=ctx.createGain();og.gain.value=lv;og.connect(g);osc('sine',mtof(m)*mul,t,t+decay+.1,og);}
}
function bell(bus,m,t,level=.06,decay=4.5){
 const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+decay);out(bus,g,1);
 for(const [mul,lv] of [[1,1],[2.76,.32],[5.4,.1]]){const og=ctx.createGain();og.gain.value=lv;og.connect(g);osc('sine',mtof(m)*mul,t,t+decay+.1,og);}
}
function bass(bus,m,t,dur,level=.12){const g=ctx.createGain();env(g,t,.08,level,Math.max(.05,dur-.6),.5);out(bus,g,.15);osc('sine',mtof(m),t,t+dur+.7,g);}
function flute(bus,m,t,dur,level=.05){
 const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=2200;
 const g=ctx.createGain();env(g,t,.2,level,Math.max(.05,dur-.5),.7);f.connect(g);out(bus,g,.75);
 const o=osc('triangle',mtof(m),t,t+dur+.9,f);
 const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=5;lg.gain.value=mtof(m)*.006;lfo.connect(lg).connect(o.frequency);lfo.start(t);lfo.stop(t+dur+.9);
}
function chirp(bus,t){
 const g=ctx.createGain();g.gain.value=0;out(bus,g,.5);
 const base=rnd(2300,3400),n=Math.floor(rnd(2,5)),o=osc('sine',base,t,t+n*.1+.1,g);
 for(let i=0;i<n;i++){const s=t+i*.1;o.frequency.setValueAtTime(base,s);o.frequency.exponentialRampToValueAtTime(base*1.35,s+.05);g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(.02,s+.01);g.gain.linearRampToValueAtTime(0,s+.06);}
}
function cricket(bus,t){
 const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=4500;f.Q.value=8;
 const g=ctx.createGain();g.gain.value=0;f.connect(g);out(bus,g,.4);osc('square',rnd(4200,4800),t,t+.35,f);
 for(let i=0;i<6;i++){const s=t+i*.045;g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(.01,s+.01);g.gain.linearRampToValueAtTime(0,s+.03);}
}
function drip(bus,t){
 const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.045,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+.25);out(bus,g,1);
 const f0=rnd(1200,1800),o=osc('sine',f0,t,t+.3,g);o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f0*.45,t+.12);
}
// Постоянный фон темы (ветер, гул). Возвращает функцию остановки.
function bed(bus,{type='lowpass',freq=500,q=.5,level=.012,lfo=.07}){
 const src=ctx.createBufferSource();src.buffer=noise;src.loop=true;
 const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;
 const g=ctx.createGain();g.gain.value=level;
 const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=lfo;lg.gain.value=level*.8;l.connect(lg).connect(g.gain);
 src.connect(f).connect(g);out(bus,g,.3);src.start();l.start();
 return ()=>{try{src.stop();l.stop();}catch{}};
}
function drone(bus,m,level){
 const g=ctx.createGain();g.gain.value=0;g.gain.linearRampToValueAtTime(level,ctx.currentTime+4);out(bus,g,.5);
 const a=osc('sine',mtof(m),ctx.currentTime,ctx.currentTime+36000,g),b=osc('sine',mtof(m+7),ctx.currentTime,ctx.currentTime+36000,g,4);
 return ()=>{try{a.stop();b.stop();}catch{}};
}
function walk(scale){mel=Math.max(0,Math.min(scale.length-1,mel+pick([-2,-1,-1,0,1,1,2])));return scale[mel];}

// ── Темы: [бас, аккорд] по кругу, по 8 долей на аккорд ───────────────────
const THEMES={
 forest:{bpm:70,bpc:8,pad:{cutoff:1100},
  chords:[[38,[50,57,60,64,65]],[34,[46,53,57,62]],[41,[53,60,64,67]],[36,[48,55,62,64]]],
  scale:[62,64,65,67,69,72,74,76,77],
  beds:b=>[bed(b,{freq:420,level:.012,lfo:.07})],
  beat(b,step,t,spb,notes){
   if(Math.random()<.42)pluck(b,walk(this.scale),t,.09);
   if(Math.random()<.18)pluck(b,walk(this.scale),t+spb/2,.06);
   if(step===0&&Math.random()<.5)pluck(b,notes[notes.length-1]+12,t,.045,2.6);
   if(Math.random()<.045)chirp(b,t+rnd(0,spb));
  }},
 field:{bpm:84,bpc:8,pad:{cutoff:1400,level:.035},
  chords:[[43,[55,59,62,66]],[40,[52,55,59,62]],[36,[48,55,59,64]],[38,[50,54,57,62]]],
  scale:[67,69,71,74,76,79,81,83],
  beds:b=>[bed(b,{type:'bandpass',freq:900,q:.3,level:.007,lfo:.05})],
  beat(b,step,t,spb,notes){
   if(step%2===0&&Math.random()<.5)flute(b,walk(this.scale),t,spb*rnd(1.5,2),.05);
   if(Math.random()<.55)pluck(b,notes[step%notes.length]+12,t+spb/2,.04,1.2);
   if(Math.random()<.07)cricket(b,t+rnd(0,spb));
  }},
 dungeon:{bpm:56,bpc:8,pad:{cutoff:800,level:.04},
  chords:[[33,[57,60,64,69]],[29,[53,57,60,64]],[38,[50,57,62,65]],[28,[52,56,59,64]]],
  scale:[69,71,72,74,76,77,80,81],
  beds:b=>[drone(b,33,.03),bed(b,{freq:260,level:.01,lfo:.04})],
  beat(b,step,t,spb){
   if(Math.random()<.28)bell(b,walk(this.scale),t,.05);
   if(Math.random()<.07)drip(b,t+rnd(0,spb));
  }}
};
function wanted(){if(window.dungeonApi?.active())return 'dungeon';return Math.floor((zone-1)/100)===1?'field':'forest';}
function startTheme(name){
 const now=ctx.currentTime,old=current;
 if(old){
  for(const g of [old.bus.dry.gain,old.bus.wet.gain]){g.cancelScheduledValues(now);g.setValueAtTime(g.value,now);g.linearRampToValueAtTime(0,now+2.5);}
  setTimeout(()=>{old.stops.forEach(s=>s());old.bus.dry.disconnect();old.bus.wet.disconnect();},3200);
 }
 const dry=ctx.createGain(),wet=ctx.createGain();dry.connect(master);wet.connect(reverbIn);
 for(const g of [dry.gain,wet.gain]){g.setValueAtTime(0,now);g.linearRampToValueAtTime(1,now+2.5);}
 const bus={dry,wet};current={name,bus,stops:THEMES[name].beds(bus)};beat=0;nextTime=now+.15;mel=4;
}
function schedule(){
 const th=THEMES[current.name],spb=60/th.bpm;
 while(nextTime<ctx.currentTime+LOOKAHEAD){
  const step=beat%th.bpc,[root,notes]=th.chords[Math.floor(beat/th.bpc)%th.chords.length];
  if(step===0){pad(current.bus,notes,nextTime,th.bpc*spb+.5,th.pad);bass(current.bus,root,nextTime,spb*3.5);}
  if(step===4)bass(current.bus,root,nextTime,spb*3.5,.08);
  th.beat(current.bus,step,nextTime,spb,notes);
  beat++;nextTime+=spb;
 }
}
function applyVolume(){
 if(!ctx)return;
 const target=prefs.on?(prefs.volume/100)*.9:0,now=ctx.currentTime;
 master.gain.cancelScheduledValues(now);master.gain.setValueAtTime(master.gain.value,now);master.gain.linearRampToValueAtTime(target,now+.4);
}
function wake(){
 if(!prefs.on||document.hidden||!init())return;
 if(ctx.state!=='running')ctx.resume();
 applyVolume();
}
setInterval(()=>{
 if(!ctx||ctx.state!=='running'||!prefs.on)return;
 const w=wanted();if(!current||current.name!==w)startTheme(w);
 schedule();
},200);
// Первое касание страницы разрешает звук.
for(const ev of ['pointerdown','keydown'])addEventListener(ev,wake,{capture:true});
document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend();else if(prefs.on)ctx.resume();});

// ── Настройки ───────────────────────────────────────────────────────────
const style=document.createElement('style');
style.textContent='#settingsDialog .setting-row input[type=range]{width:150px;height:auto;accent-color:#5fe6b6;cursor:pointer}#settingsDialog .music-volume-row b{min-width:38px;text-align:right;font-size:12px;color:#9fd8c2}';
document.head.append(style);
$('damageEnabled').closest('.setting-row').insertAdjacentHTML('afterend',
 '<label class="setting-row" for="musicEnabled"><span>Музыка</span><input type="checkbox" id="musicEnabled"></label>'+
 '<label class="setting-row music-volume-row" for="musicVolume"><span>Громкость музыки</span><span style="display:flex;align-items:center;gap:10px"><input type="range" id="musicVolume" min="0" max="100" step="1"><b id="musicVolumeValue"></b></span></label>');
const toggle=$('musicEnabled'),volume=$('musicVolume'),volumeText=$('musicVolumeValue');
const sync=()=>{toggle.checked=prefs.on;volume.value=prefs.volume;volume.disabled=!prefs.on;volumeText.textContent=prefs.volume+'%';};
toggle.addEventListener('change',()=>{prefs.on=toggle.checked;savePrefs();sync();if(prefs.on)wake();else applyVolume();});
volume.addEventListener('input',()=>{prefs.volume=Number(volume.value);savePrefs();sync();applyVolume();});
sync();
window.gameMusic={theme:()=>current?.name||null,state:()=>ctx?.state||'off',prefs:()=>({...prefs})};
})();
