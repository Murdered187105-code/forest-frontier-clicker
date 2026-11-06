const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const State=require('../power-shot-state.js');
const s=new State();s.gain();assert.equal(s.charges,0);assert.equal(s.activate(),false);
s.unlocked=true;s.gain();assert.equal(s.charges,0);s.activate();
for(let i=0;i<15;i++)s.gain();assert.equal(s.charges,10);
assert.equal(s.begin(19),0);assert.equal(s.charges,10);
assert.equal(s.begin(20),10);assert.equal(s.charges,0);assert.equal(s.begin(100),0);
s.consume();s.gain();assert.equal(s.pending,9);assert.equal(s.charges,1);
const resumed=new State(s.serialize());assert.equal(resumed.pending,0);assert.equal(resumed.charges,10);
s.cancel();assert.equal(s.charges,10);assert.equal(s.pending,0);
s.begin(20);for(let i=0;i<10;i++)assert.equal(s.consume(),true);assert.equal(s.consume(),false);assert.equal(s.begin(20),0);
s.restore();assert.equal(s.unlocked,false);assert.equal(s.active,false);assert.equal(s.charges,0);
assert.equal(new State({unlocked:true,active:true,charges:999}).charges,10);
const timed=new State({unlocked:true});
const quiver=new State({unlocked:true,active:true,quiverRank:3,charges:25});
assert.equal(quiver.capacity(),25);assert.equal(quiver.cost(),20);
assert.equal(quiver.begin(19),0);assert.equal(quiver.begin(20),10);assert.equal(quiver.charges,15);
for(let i=0;i<10;i++)quiver.consume();assert.equal(quiver.charges,15);
quiver.begin(20);assert.equal(quiver.charges,5);quiver.cancel();assert.equal(quiver.charges,15);
const restoredQuiver=new State(quiver.serialize());assert.equal(restoredQuiver.capacity(),25);assert.equal(restoredQuiver.charges,15);
quiver.setRank(5);quiver.gain(50);assert.equal(quiver.charges,35);assert.equal(quiver.cost(),20);
quiver.begin(20);quiver.gain(2);assert.equal(quiver.charges,27);quiver.cancel();assert.equal(quiver.charges,35);
quiver.setRank(0);assert.equal(quiver.capacity(),10);assert.equal(quiver.charges,10);
let quiverTotal=0;
for(let rank=0;rank<18;rank++){quiver.setRank(rank);assert.equal(quiver.nextRankCost(),rank*2+1);assert.equal(quiver.spentPoints(),quiverTotal);quiverTotal+=quiver.nextRankCost();}
quiver.setRank(18);assert.equal(quiverTotal,324);assert.equal(quiver.spentPoints(),324);assert.equal(quiver.nextRankCost(),0);assert.equal(quiver.capacity(),100);
quiver.gain(200);assert.equal(quiver.charges,100);assert.equal(quiver.cost(),20);assert.equal(quiver.begin(20),10);assert.equal(quiver.charges,90);
assert.equal(new State(quiver.serialize()).capacity(),100);quiver.setRank(99);assert.equal(quiver.quiverRank,18);
const volley=new State({unlocked:true,active:true,volleyRank:1,quiverRank:3,charges:25});
assert.equal(volley.spentPoints(),10);assert.equal(volley.begin(19),0);
assert.equal(volley.begin(20),10);assert.equal(volley.projectileCost(),10);assert.equal(volley.charges,15);
volley.gain(2);assert.equal(volley.consume(),true);assert.equal(volley.pending,0);assert.equal(volley.charges,17);assert.equal(volley.consume(),false);
volley.begin(20);volley.cancel();assert.equal(volley.charges,17);
volley.begin(20);const restoredVolley=new State(volley.serialize());assert.equal(restoredVolley.charges,17);assert.equal(restoredVolley.volleyRank,1);assert.equal(restoredVolley.pending,0);
volley.restore({unlocked:true,active:true,volleyRank:1,charges:9});volley.begin(18);assert.equal(volley.projectileCost(),1);volley.consume();assert.equal(volley.pending,8);
volley.restore();assert.equal(volley.volleyRank,0);
timed.advance(10000);assert.equal(timed.charges,0);timed.activate();
timed.advance(4999);assert.equal(timed.charges,0);timed.advance(1);assert.equal(timed.charges,1);
assert.equal(timed.cost(),2);assert.equal(timed.begin(1),0);assert.equal(timed.begin(2),1);timed.consume();
timed.gain(2);assert.equal(timed.charges,2);assert.equal(timed.cost(),4);
assert.equal(timed.begin(3),0);assert.equal(timed.begin(4),2);
timed.advance(10000);assert.equal(timed.charges,2);assert.equal(timed.pending,2);
timed.advance(60000);assert.equal(timed.charges,10);assert.equal(timed.cost(),20);
timed.active=false;timed.advance(5000);timed.charges=0;timed.activate();timed.advance(4999);assert.equal(timed.charges,0);
// Exercise the actual shared attack function, including the new kill hook.
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const attack=html.slice(html.indexOf('function attack('),html.indexOf('function applySettings()'));
function battle(dungeon=false){
 const nodes=new Map(),noop=()=>{};
 const c={hp:100,maxHp:100,lastStrikeDamage:0,locked:false,cooldownUntil:0,rapidDamageRank:0,settings:{damage:false,animations:false},zone:1,zoneKills:0,kills:0,souls:0,gold:0,bossDeadline:0,
  Date,Math,Number,AUTO_COOLDOWN_SCALE:1.2,setTimeout:()=>1,checkBossTimer:noop,combatStats:()=>({damage:10,speed:0,crit:0,multiplier:2}),updateAttackButton:noop,showMonsterHurt:()=>c.hurts++,showSlash:()=>c.slashes++,showMonsterDeath:noop,render:noop,gainExperience:noop,enemyHealth:()=>5,characterParameters:()=>({goldBonus:0}),dropSouls:noop,isTimedBoss:()=>false,bossTimeLimit:()=>60000,
  hurts:0,slashes:0,killEvents:0,bossDeaths:0,
  $:id=>{if(!nodes.has(id))nodes.set(id,{open:false,textContent:'',classList:{add:noop,remove:noop}});return nodes.get(id);},
  window:{powerShotApi:{onKill:boss=>{c.killEvents++;c.killArrows=boss?1:2;}},dungeonApi:{active:()=>dungeon,damageFactor:()=>dungeon?.5:1,onBossKilled:()=>{c.bossDeaths++;c.locked=true;}}}};
 vm.createContext(c);vm.runInContext(attack,c);return c;
}
const normal=battle();normal.attack(true,2,true,false,null,true);assert.equal(normal.hp,80);assert.equal(normal.hurts,0);assert.equal(normal.slashes,0);assert.equal(normal.killEvents,0);
normal.hp=20;normal.attack(true,2,true,false,null,true);assert.equal(normal.killEvents,1);assert.equal(normal.kills,1);normal.attack(true,2,true,false,null,true);assert.equal(normal.killEvents,1);
const boss=battle(true);boss.hp=10;boss.attack(true,2,true,false,null,true);assert.equal(boss.hp,0);assert.equal(boss.killEvents,1);assert.equal(boss.bossDeaths,1);
const ordinary=battle();ordinary.attack();assert.equal(ordinary.hp,90);assert.equal(ordinary.hurts,1);assert.equal(ordinary.slashes,1);
const bigArrow=battle();bigArrow.hp=1000;bigArrow.attack(true,20,true,false,null,true);assert.equal(bigArrow.hp,800);assert.equal(bigArrow.hurts,0);assert.equal(bigArrow.slashes,0);
const bigBoss=battle(true);bigBoss.hp=1000;bigBoss.attack(true,20,true,false,null,true);assert.equal(bigBoss.hp,900);
assert.equal(normal.killArrows,2);assert.equal(boss.killArrows,1);
const forestBoss=battle();forestBoss.isTimedBoss=()=>true;forestBoss.hp=10;forestBoss.attack();assert.equal(forestBoss.killArrows,1);
for(const name of ['power-shot.js','power-shot-fx.js','skill-dock.js'])new vm.Script(fs.readFileSync(path.join(__dirname,'..',name),'utf8'));
console.log('Power Shot: charge cap, activation, volley, insufficient mana, reload, cancel, reset, 200% damage, resistance, both kill paths and existing attack behavior passed.');
