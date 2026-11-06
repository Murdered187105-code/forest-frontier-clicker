// Pure charge/volley rules; the UI and renderer live in power-shot.js.
(()=>{
class PowerShotState {
 constructor(saved={}){this.restore(saved);}
 restore(saved={}){
  this.unlocked=saved.unlocked===true;this.active=this.unlocked&&saved.active===true;this.elapsed=0;this.volleyRank=saved.volleyRank===1?1:0;this.combined=false;
  this.quiverRank=Number.isInteger(saved.quiverRank)?Math.max(0,Math.min(18,saved.quiverRank)):0;
  const count=n=>Number.isInteger(n)?Math.max(0,Math.min(this.capacity(),n)):0;
  // Unfinished arrows survive reload, but a previous volley never resumes by itself.
  this.charges=this.unlocked?Math.min(this.capacity(),count(saved.charges)+Math.min(10,count(saved.pending))):0;this.pending=0;
 }
 nextRankCost(){return this.quiverRank<18?this.quiverRank*2+1:0;}
 spentPoints(){return this.quiverRank*this.quiverRank+this.volleyRank;}
 capacity(){return 10+this.quiverRank*5;}
 setRank(rank){this.quiverRank=Math.max(0,Math.min(18,rank));this.charges=Math.min(this.capacity(),this.charges);}
 activate(){if(!this.unlocked)return false;if(!this.active)this.elapsed=0;this.active=true;return true;}
 gain(amount=1){if(this.unlocked&&this.active)this.charges=Math.min(this.capacity(),this.charges+amount);}
 advance(ms){if(!this.unlocked||!this.active){this.elapsed=0;return false;}this.elapsed+=Math.max(0,ms);const arrows=Math.floor(this.elapsed/5000);this.elapsed%=5000;if(arrows)this.gain(arrows);return arrows>0;}
 cost(){return Math.min(10,this.charges)*2;}
 begin(mana){if(!this.unlocked||!this.active||this.pending||this.charges<1||mana<this.cost())return 0;this.pending=Math.min(10,this.charges);this.charges-=this.pending;this.combined=this.volleyRank===1&&this.pending===10;return this.pending;}
 projectileCost(){return this.combined?10:1;}
 consume(){if(!this.pending)return false;this.pending-=this.projectileCost();return true;}
 cancel(){this.charges=Math.min(this.capacity(),this.charges+this.pending);this.pending=0;this.combined=false;}
 serialize(){return {version:1,volleyRank:this.volleyRank,quiverRank:this.quiverRank,unlocked:this.unlocked,active:this.active,charges:this.charges,pending:this.pending};}
}
if(typeof module!=='undefined'&&module.exports)module.exports=PowerShotState;
else window.PowerShotState=PowerShotState;
})();
