// Боссы-куклы подземелья: собраны из отдельных частей (assets/bosses/<id>/), «дышат» и получают удар.
// Кукла встраивается в обычный svg врага через foreignObject, поэтому смерть, разрезы и свечение работают как раньше.
// Куклами сделаны все двенадцать боссов; картинки monster-dungeon-<id>.svg остаются запасным вариантом.
(()=>{
// Каждая кукла: холст w×h, точка опоры тела body, масштаб частей scale и список частей.
// Часть: файл, ширина и высота картинки, центр на холсте, группа и (необязательно) поворот в градусах.
// Порядок частей — порядок отрисовки (первые — сзади). У группы — точка поворота и своя анимация.
const PUPPETS={
 'dark-knight':{path:'assets/bosses/dark-knight/',w:620,h:800,body:[310,760],scale:1.12,
  parts:[
   ['cape-l',220,304,121,578,'cape-l'],['cape-r',222,302,470,578,'cape-r'],['mantle',314,136,292,353,'body'],
   ['upper-arm-l',96,120,145,412,'arm-l'],['forearm-l',78,100,137,476,'arm-l'],
   ['upper-arm-r',94,120,452,430,'arm-r'],['forearm-r',78,100,488,400,'arm-r'],
   ['thigh-l',102,128,236,610,'legs'],['thigh-r',102,128,362,610,'legs'],['boot-l',126,200,220,693,'legs'],['boot-r',126,200,378,693,'legs'],
   ['belt',200,114,292,558,'body'],['torso',268,242,301,425,'body'],['gem',82,112,300,402,'gem'],
   ['fist-l',96,88,130,566,'arm-l'],
   ['pauldron-l',178,174,149,330,'pauldrons'],['pauldron-r',176,174,441,333,'pauldrons'],
   // Кулак с мечом лежат поверх наплечника, плечо и предплечье — под ним; двигаются вместе.
   ['sword',158,430,531,521,'hand-r'],['fist-r',96,84,527,363,'hand-r'],['helmet',326,288,298,166,'head']
  ],
  pivots:{'head':[298,270],'arm-l':[150,380],'arm-r':[445,380],'hand-r':[445,380],'cape-l':[200,360],'cape-r':[400,360],'pauldrons':[298,340],'gem':[300,402],'body':[300,560],'legs':[300,760]}},
 'shadow-reaper':{path:'assets/bosses/shadow-reaper/',w:460,h:762,body:[230,740],scale:1,
  parts:[
   // Коса — за спиной. Руки: шарнир каждой части утоплен в край предыдущей, кисть и нижний рукав — под верхним.
   ['scythe',346,795,268,372,'scythe',24],
   ['skirt-l',176,249,136,600,'skirt-l',10],['skirt-r',163,247,324,600,'skirt-r',-10],['skirt',310,281,230,618,'skirt'],
   ['robe',308,361,230,440,'robe'],
   ['hand-l',94,107,86,579,'arm-l'],['sleeve-lower-l',122,137,103,494,'arm-l'],['sleeve-upper-l',119,144,116,395,'arm-l'],
   ['hand-r',92,108,387,577,'arm-r'],['sleeve-lower-r',122,137,367,492,'arm-r'],['sleeve-upper-r',126,142,351,394,'arm-r'],
   ['hood',245,320,230,216,'head'],['eyes',112,29,230,246,'head'],['mouth',66,27,230,286,'head']
  ],
  pivots:{'head':[230,300],'robe':[230,560],'arm-l':[138,337],'arm-r':[328,337],'scythe':[268,420],'skirt':[234,520],'skirt-l':[164,520],'skirt-r':[304,520]}},
 'void-maw':{path:'assets/bosses/void-maw/',w:563,h:920,body:[300,381],scale:1,
  parts:[
   // Основания щупалец и шипов спрятаны под корпусом с запасом, чтобы при качании не открывались щели.
   ['tentacle-1',213,316,155,638,'t1'],['tentacle-2',168,335,208,681,'t2'],['tentacle-5',224,316,451,638,'t5'],['tentacle-4',156,332,385,681,'t4'],['tentacle-3',103,373,292,726,'t3'],
   ['spike-left',162,179,168,190,'spike-l'],['spike-right',154,175,434,190,'spike-r'],['spike-center',188,226,318,122,'spike-c'],
   ['body',429,459,300,381,'core'],
   // Радужка обрезана по контуру белка (маска) и оглядывается внутри него.
   ['eye-white',261,149,300,338,'eye'],['iris',166,165,300,340,'eye',0,'eye-white'],
   ['upper-lid',330,122,300,250,'lid-u'],['lower-lid',274,92,300,398,'lid-d'],
   ['mouth',153,101,300,440,'mouth']
  ],
  pivots:{'t1':[215,490],'t2':[250,525],'t3':[300,550],'t4':[350,525],'t5':[385,490],'spike-l':[178,250],'spike-r':[424,250],'spike-c':[300,215],'core':[300,381],'eye':[300,338],'lid-u':[300,295],'lid-d':[300,390],'mouth':[300,430]}},
 // Дракон нарезан прямо из цельного образца позы: крылья, голова и два звена хвоста двигаются поверх неподвижного тела.
 // Подложка (ref-under) — дракон из деталей листа полосой вдоль тела: закрывает щёлки швов, когда части сдвигаются.
 // Длинный и низкий — рамка шире обычной.
 'fire-dragon':{path:'assets/bosses/fire-dragon/',w:1645,h:845,body:[800,830],scale:1,maxW:240,
  parts:[
   ['ref-under',1177,593,592.5,526.5,'under'],
   ['ref-tail-1',319,159,1300.5,360.5,'tail-1'],['ref-tail-2',506,456,1369,591,'tail-2'],
   ['ref-body',1158,565,583,540.5,'body'],
   ['ref-wings',801,507,822.5,256.5,'wings'],
   ['ref-head',327,416,172.5,506,'head']
  ],
  parents:{'tail-2':['tail-1',true]},
  pivots:{'under':[800,480],'body':[800,480],'wings':[600,495],'head':[298,460],'tail-1':[1150,365],'tail-2':[1460,410]}},
 // Владыка пламени тоже нарезан из цельной картинки: рука с булавой (шов у локтя), когтистая рука (под наплечником),
 // голова с короной (по шее) и огненный вихрь (по поясу). Подложка — размытая копия картинки полосой вдоль тела.
 'flame-lord':{path:'assets/bosses/flame-lord/',w:1312,h:1199,body:[650,600],scale:1,
  parts:[
   ['under',900,623,820,526.5,'under'],['tail',489,487,718.5,948.5,'tail'],['body',870,599,835,512.5,'body'],
   ['arm-r',312,399,1145,673.5,'arm-r'],['arm-l',561,730,284.5,544,'arm-l'],['head',567,415,820.5,212.5,'head']
  ],
  pivots:{'under':[650,600],'body':[650,600],'arm-l':[560,610],'arm-r':[1000,560],'head':[780,415],'tail':[740,710]}},
 // Пепельный феникс нарезан из цельной картинки: крылья (у плеч, левое — за телом), голова с хохолком (по шее),
 // хвост (за лапами). Подложка — размытая копия картинки полосой вдоль тела.
 'ash-phoenix':{path:'assets/bosses/ash-phoenix/',w:1199,h:1312,body:[640,600],scale:1,
  parts:[
   ['under',316,526,619,560,'under'],['tail',650,661,463,973.5,'tail'],['wing-l',584,636,365,325,'wing-l'],
   ['body',275,482,630.5,570,'body'],['wing-r',406,482,915,711,'wing-r'],['head',313,327,649.5,281.5,'head']
  ],
  pivots:{'under':[640,600],'body':[640,600],'wing-l':[640,560],'wing-r':[740,600],'head':[720,440],'tail':[600,700]}},
 // Порождение света нарезано из цельной картинки: главный кристалл, обруч по своей трубке (задняя дуга — за кристаллом,
 // передняя — перед ним; след передней дуги на кристалле заполнен его гранями) и четыре кристалла-спутника.
 'light-spawn':{path:'assets/bosses/light-spawn/',w:1341,h:1173,body:[665,577],scale:1,
  parts:[
   ['ring-back',817,456,689.5,483,'ring-back'],['crystal',612,1136,665,577,'crystal'],['ring-front',884,413,647,545.5,'ring-front'],
   ['sat-tl',120,191,240,284.5,'sat-tl'],['sat-tr',125,197,1082.5,322.5,'sat-tr'],['sat-bl',122,189,265,813.5,'sat-bl'],['sat-br',130,197,1068,832.5,'sat-br']
  ],
  // верхний левый спутник сидит на обруче — летает вместе с передней дугой
  parents:{'sat-tl':['ring-front']},
  pivots:{'ring-back':[650,520],'ring-front':[650,520],'crystal':[665,577],'sat-tl':[240,284],'sat-tr':[1082,322],'sat-bl':[265,813],'sat-br':[1068,832]}},
 // Сияющий страж нарезан из цельной картинки: крылья (у плеч, за телом), шлем (по шее), щит (по контуру),
 // копьё с кулаком (перья за древком отделены по цвету). Подложка — размытая копия картинки вдоль тела. Широкий — рамка шире.
 'radiant-guardian':{path:'assets/bosses/radiant-guardian/',w:1585,h:992,body:[790,600],scale:1,maxW:230,
  parts:[
   ['under',557,780,782.5,572,'under'],['wing-l',612,487,315,344.5,'wing-l'],['wing-r',603,531,1276.5,325.5,'wing-r'],
   ['body',551,759,786.5,582.5,'body'],['head',218,166,795,162,'head'],['spear',154,956,995,484,'spear'],['shield',232,379,608,514.5,'shield']
  ],
  pivots:{'under':[790,600],'body':[790,600],'wing-l':[700,280],'wing-r':[880,280],'head':[800,245],'shield':[690,430],'spear':[960,410]}},
 // Небесный серафим нарезан из цельной картинки: шесть крыльев (секторами вокруг лика, лежат за ним) и лик с нимбом
 // и обручем (нимб отделён от перьев по цвету, поэтому не рвётся). Подложка — размытая копия картинки вокруг лика.
 'seraph':{path:'assets/bosses/seraph/',w:1536,h:1024,body:[770,490],scale:1,maxW:230,
  parts:[
   ['under',772,664,763,464,'under'],
   ['wing-tl',429,400,503.5,203,'wing-tl'],['wing-tr',425,362,1035.5,186,'wing-tr'],['wing-ml',495,220,276.5,495,'wing-ml'],['wing-mr',490,219,1263,495.5,'wing-mr'],
   ['wing-bl',576,280,430,769,'wing-bl'],['wing-br',571,321,1108.5,748.5,'wing-br'],
   ['core',708,665,763,463.5,'core']
  ],
  pivots:{'under':[770,490],'core':[770,490],'wing-tl':[567,383],'wing-tr':[975,383],'wing-ml':[550,500],'wing-mr':[1000,500],'wing-bl':[567,633],'wing-br':[975,633]}},
 // Ледяной голем нарезан из цельной картинки: голова (блок с глазами) и кулаки с предплечьями (от локтей);
 // плечи, грудь с кристаллом и ноги — неподвижное тело. Подложка — размытая копия картинки вдоль тела.
 'ice-golem':{path:'assets/bosses/ice-golem/',w:1359,h:1158,body:[680,1150],scale:1,maxW:220,
  parts:[
   ['under',1045,1128,649.5,577,'under'],['body',1046,1130,650,576,'body'],['head',242,231,764,415.5,'head'],
   ['arm-l',378,501,203,765.5,'arm-l'],['arm-r',416,501,1131,857.5,'arm-r']
  ],
  pivots:{'under':[680,700],'body':[680,700],'head':[764,500],'arm-l':[300,560],'arm-r':[960,640]}},
 // Морозная ведьма нарезана из цельной картинки: снежинка с осколками (отдельно над ладонью), посох с кистью,
 // голова с короной (по шее); мантия, крылья и волосы — неподвижное тело. Подложка — размытая копия вдоль тела.
 'frost-witch':{path:'assets/bosses/frost-witch/',w:1108,h:1420,body:[560,1410],scale:1,
  parts:[
   ['under',1065,1400,545.5,715,'under'],['body',1067,1402,545.5,714,'body'],['head',194,317,555,163.5,'head'],
   ['staff',201,1390,930.5,715,'staff'],['snow',231,220,184.5,360,'snow']
  ],
  pivots:{'under':[560,900],'body':[560,900],'head':[555,300],'staff':[928,1400],'snow':[190,362]}},
 // Морозный волк-исполин нарезан из цельной картинки: голова (по гриве за ушами) и хвост (от крупа);
 // корпус с лапами и кристаллами — неподвижное тело. Подложка — размытая копия вдоль тела. Длинный — рамка шире.
 'frost-wolf':{path:'assets/bosses/frost-wolf/',w:1536,h:1024,body:[700,1000],scale:1,maxW:235,
  parts:[
   ['under',1264,989,679,500.5,'under'],['tail',348,367,1346,692.5,'tail'],['body',1234,989,664,500.5,'body'],['head',379,441,247.5,492.5,'head']
  ],
  pivots:{'under':[700,600],'body':[700,600],'head':[400,520],'tail':[1190,580]}}
};
const BOX_W=200,BOX_H=175;

const style=document.createElement('style');
style.textContent=`
.bp{position:relative}
.bp-body,.bp-grp,.bp-mask{position:absolute;inset:0}
.bp img{position:absolute;display:block;pointer-events:none;max-width:none}

/* ── Тёмный рыцарь ── */
/* Дыхание: выше пояса всё плавно поднимается и опускается (ноги стоят), плащ колышется в своём ритме, кристалл тлеет */
.bp-dark-knight .i-body{animation:bp-idle-chest 3.4s ease-in-out infinite}
.bp-dark-knight .i-gem{animation:bp-idle-gem 3.4s ease-in-out infinite}
.bp-dark-knight .i-pauldrons{animation:bp-idle-shoulders 3.4s ease-in-out infinite}
.bp-dark-knight .i-head{animation:bp-idle-head 3.4s ease-in-out infinite}
.bp-dark-knight .i-arm-l{animation:bp-idle-arm-l 3.4s ease-in-out infinite}
.bp-dark-knight .i-arm-r,.bp-dark-knight .i-hand-r{animation:bp-idle-arm-r 3.4s ease-in-out infinite}
.bp-dark-knight .i-cape-l{animation:bp-idle-cape-l 4.6s ease-in-out infinite}
.bp-dark-knight .i-cape-r{animation:bp-idle-cape-r 4.6s ease-in-out infinite}
@keyframes bp-idle-chest{0%,100%{transform:none}50%{transform:translateY(-4px) scale(1.015,1.02)}}
@keyframes bp-idle-gem{0%,100%{transform:none;filter:none}50%{transform:translateY(-5px);filter:brightness(1.35) drop-shadow(0 0 10px #b98bff)}}
@keyframes bp-idle-shoulders{0%,100%{transform:none}50%{transform:translateY(-7px)}}
@keyframes bp-idle-head{0%,100%{transform:none}50%{transform:translateY(-8px) rotate(-.6deg)}}
@keyframes bp-idle-arm-l{0%,100%{transform:none}50%{transform:translateY(-6px) rotate(1.4deg)}}
@keyframes bp-idle-arm-r{0%,100%{transform:none}50%{transform:translateY(-6px) rotate(-1deg)}}
@keyframes bp-idle-cape-l{0%,100%{transform:none}50%{transform:rotate(1.6deg) skewY(.6deg)}}
@keyframes bp-idle-cape-r{0%,100%{transform:none}50%{transform:rotate(-1.6deg) skewY(-.6deg)}}
/* Удар «Разлёт брони»: части на миг разлетаются и с дрожью собираются, вспышка фиолетовой тьмы */
.bp-dark-knight.hit .bp-body{animation:bp-shake .55s linear}
.bp-dark-knight.hit .g-head{animation:bp-head .55s cubic-bezier(.2,.9,.3,1)}
.bp-dark-knight.hit .g-pauldrons{animation:bp-pauldrons .55s cubic-bezier(.2,.9,.3,1)}
.bp-dark-knight.hit .g-arm-l{animation:bp-arm-l .55s cubic-bezier(.2,.9,.3,1)}
.bp-dark-knight.hit .g-arm-r,.bp-dark-knight.hit .g-hand-r{animation:bp-arm-r .55s cubic-bezier(.2,.9,.3,1)}
.bp-dark-knight.hit .g-cape-l{animation:bp-cape-l .6s cubic-bezier(.2,.9,.3,1)}
.bp-dark-knight.hit .g-cape-r{animation:bp-cape-r .6s cubic-bezier(.2,.9,.3,1)}
.bp-dark-knight.hit .g-gem{animation:bp-gem .55s ease-out}
.bp-dark-knight.hit img{animation:bp-flash .5s ease-out}
@keyframes bp-shake{0%,100%{transform:none}10%{transform:translateX(-10px)}20%{transform:translateX(9px)}30%{transform:translateX(-7px)}40%{transform:translateX(6px)}55%{transform:translateX(-3px)}70%{transform:translateX(2px)}}
@keyframes bp-head{0%{transform:none}14%{transform:translateY(-34px) rotate(-6deg)}60%{transform:translateY(3px)}100%{transform:none}}
@keyframes bp-pauldrons{0%{transform:none}14%{transform:translateY(-14px) scaleX(1.14)}60%{transform:scaleX(.98)}100%{transform:none}}
@keyframes bp-arm-l{0%{transform:none}14%{transform:translate(-26px,-6px) rotate(8deg)}60%{transform:translate(3px,0)}100%{transform:none}}
@keyframes bp-arm-r{0%{transform:none}14%{transform:translate(26px,-6px) rotate(-8deg)}60%{transform:translate(-3px,0)}100%{transform:none}}
@keyframes bp-cape-l{0%{transform:none}16%{transform:translateX(-22px) rotate(-5deg)}60%{transform:translateX(3px)}100%{transform:none}}
@keyframes bp-cape-r{0%{transform:none}16%{transform:translateX(22px) rotate(5deg)}60%{transform:translateX(-3px)}100%{transform:none}}
@keyframes bp-gem{0%{filter:none;transform:none}10%{filter:brightness(3) drop-shadow(0 0 30px #b26bff);transform:scale(1.6)}100%{filter:none;transform:none}}
@keyframes bp-flash{0%{filter:none}10%{filter:brightness(.4) drop-shadow(0 0 14px #9a4cff) saturate(2)}35%{filter:brightness(1.4)}100%{filter:none}}

/* ── Теневой жнец ── */
/* Парение: жнец целиком медленно поднимается и опускается, лоскуты подола колышутся каждый в своём ритме, глаза тлеют */
.bp-shadow-reaper .bp-body{animation:bp-r-float 3.6s ease-in-out infinite}
.bp-shadow-reaper .i-skirt{animation:bp-r-hem 2.4s ease-in-out infinite}
.bp-shadow-reaper .i-skirt-l{animation:bp-r-hem-l 2.8s ease-in-out infinite}
.bp-shadow-reaper .i-skirt-r{animation:bp-r-hem-r 2.6s ease-in-out infinite}
.bp-shadow-reaper .i-head{animation:bp-r-head 3.6s ease-in-out infinite}
.bp-shadow-reaper .i-scythe{animation:bp-r-scythe 3.6s ease-in-out infinite}
.bp-shadow-reaper .i-arm-l,.bp-shadow-reaper .i-arm-r{animation:bp-r-arms 3.6s ease-in-out infinite}
.bp-shadow-reaper .p-eyes,.bp-shadow-reaper .p-mouth{animation:bp-r-eyes 2.2s ease-in-out infinite}
@keyframes bp-r-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes bp-r-hem{0%,100%{transform:none}50%{transform:skewX(3deg) scaleY(1.03)}}
@keyframes bp-r-hem-l{0%,100%{transform:none}50%{transform:rotate(4deg) skewX(-3deg)}}
@keyframes bp-r-hem-r{0%,100%{transform:none}50%{transform:rotate(-4deg) skewX(3deg)}}
@keyframes bp-r-head{0%,100%{transform:none}50%{transform:translateY(-3px) rotate(-1.5deg)}}
@keyframes bp-r-scythe{0%,100%{transform:none}50%{transform:rotate(-2deg)}}
@keyframes bp-r-arms{0%,100%{transform:none}50%{transform:translateY(-2px)}}
@keyframes bp-r-eyes{0%,100%{filter:none}50%{filter:brightness(1.6) drop-shadow(0 0 8px #d58bff)}}
/* Удар: капюшон, руки, коса и лоскуты подола разлетаются и, дрожа, стягиваются обратно; вспышка слабая */
.bp-shadow-reaper.hit .g-robe{animation:bp-r-hit-robe .55s cubic-bezier(.2,.9,.3,1)}
.bp-shadow-reaper.hit .g-head{animation:bp-r-hit-head .55s cubic-bezier(.2,.9,.3,1)}
.bp-shadow-reaper.hit .g-arm-l{animation:bp-r-hit-arm-l .55s cubic-bezier(.2,.9,.3,1)}
.bp-shadow-reaper.hit .g-arm-r{animation:bp-r-hit-arm-r .55s cubic-bezier(.2,.9,.3,1)}
.bp-shadow-reaper.hit .g-scythe{animation:bp-r-hit-scythe .6s cubic-bezier(.2,.9,.3,1)}
.bp-shadow-reaper.hit .g-skirt{animation:bp-r-hit-skirt .6s cubic-bezier(.2,.9,.3,1)}
.bp-shadow-reaper.hit .g-skirt-l{animation:bp-r-hit-skirt-l .6s cubic-bezier(.2,.9,.3,1)}
.bp-shadow-reaper.hit .g-skirt-r{animation:bp-r-hit-skirt-r .6s cubic-bezier(.2,.9,.3,1)}
.bp-shadow-reaper.hit img{animation:bp-r-hit-flash .5s ease-out}
.bp-shadow-reaper.hit .bp-shake{animation:bp-shake .55s linear}
@keyframes bp-r-hit-head{0%{transform:none}14%{transform:translateY(-30px) rotate(-7deg)}60%{transform:translateY(3px)}100%{transform:none}}
@keyframes bp-r-hit-arm-l{0%{transform:none}14%{transform:translate(-24px,-4px) rotate(10deg)}60%{transform:translate(3px,0)}100%{transform:none}}
@keyframes bp-r-hit-arm-r{0%{transform:none}14%{transform:translate(24px,-8px) rotate(-10deg)}60%{transform:translate(-3px,0)}100%{transform:none}}
@keyframes bp-r-hit-scythe{0%{transform:none}14%{transform:translate(18px,-14px) rotate(-9deg)}60%{transform:rotate(2deg)}100%{transform:none}}
@keyframes bp-r-hit-skirt{0%{transform:none}16%{transform:translateY(18px) scaleX(1.08)}60%{transform:translateY(-3px)}100%{transform:none}}
@keyframes bp-r-hit-skirt-l{0%{transform:none}16%{transform:translate(-26px,10px) rotate(-8deg)}60%{transform:translate(3px,0)}100%{transform:none}}
@keyframes bp-r-hit-skirt-r{0%{transform:none}16%{transform:translate(26px,10px) rotate(8deg)}60%{transform:translate(-3px,0)}100%{transform:none}}
@keyframes bp-r-hit-robe{0%{transform:none}14%{transform:scale(1.06,.96)}60%{transform:scale(.99,1.01)}100%{transform:none}}
@keyframes bp-r-hit-flash{0%{filter:none}10%{filter:brightness(.82) saturate(1.25)}35%{filter:brightness(1.15)}100%{filter:none}}

/* ── Пожиратель бездны ── */
/* Парение: корпус плавно поднимается, щупальца качаются каждое в своей фазе, шипы чуть шевелятся, глаз оглядывается и моргает */
.bp-void-maw .bp-body{animation:bp-v-float 3.4s ease-in-out infinite}
.bp-void-maw .i-t1{animation:bp-v-sway-l 3.1s ease-in-out infinite}
.bp-void-maw .i-t2{animation:bp-v-sway-l 2.7s ease-in-out -.9s infinite}
.bp-void-maw .i-t3{animation:bp-v-sway-c 2.9s ease-in-out -.4s infinite}
.bp-void-maw .i-t4{animation:bp-v-sway-r 2.6s ease-in-out -1.3s infinite}
.bp-void-maw .i-t5{animation:bp-v-sway-r 3.2s ease-in-out -.6s infinite}
.bp-void-maw .i-spike-l{animation:bp-v-spike-l 3.4s ease-in-out infinite}
.bp-void-maw .i-spike-r{animation:bp-v-spike-r 3.4s ease-in-out infinite}
.bp-void-maw .i-spike-c{animation:bp-v-spike-c 3.4s ease-in-out infinite}
.bp-void-maw .p-iris{animation:bp-v-look 6s ease-in-out infinite}
.bp-void-maw .i-eye{animation:bp-v-blink 5.2s ease-in-out infinite}
.bp-void-maw .i-lid-u{animation:bp-v-lid-blink 5.2s ease-in-out infinite}
.bp-void-maw .i-mouth{animation:bp-v-mouth 3.4s ease-in-out infinite}
@keyframes bp-v-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
/* щупальце закреплено сверху: поворот + перекос — кончик ходит сильнее основания */
@keyframes bp-v-sway-l{0%,100%{transform:rotate(-3deg) skewX(2deg)}50%{transform:rotate(4deg) skewX(-3deg)}}
@keyframes bp-v-sway-c{0%,100%{transform:rotate(-2.5deg) skewX(2deg)}50%{transform:rotate(2.5deg) skewX(-2deg)}}
@keyframes bp-v-sway-r{0%,100%{transform:rotate(3deg) skewX(-2deg)}50%{transform:rotate(-4deg) skewX(3deg)}}
@keyframes bp-v-spike-l{0%,100%{transform:none}50%{transform:rotate(-3deg)}}
@keyframes bp-v-spike-r{0%,100%{transform:none}50%{transform:rotate(3deg)}}
@keyframes bp-v-spike-c{0%,100%{transform:none}50%{transform:translateY(-3px) rotate(1.5deg)}}
@keyframes bp-v-look{0%,12%,100%{transform:none}22%,40%{transform:translate(-16px,2px)}52%,70%{transform:translate(14px,-2px)}80%{transform:none}}
@keyframes bp-v-blink{0%,90%,100%{transform:none}94%{transform:scaleY(.06)}}
@keyframes bp-v-lid-blink{0%,90%,100%{transform:none}94%{transform:translateY(22px)}}
@keyframes bp-v-mouth{0%,100%{transform:none}50%{transform:scale(1.03,1.06)}}
/* Удар: корпус отшатывается назад, шипы и веки разлетаются, щупальца разом вскидываются веером и, дрожа, возвращаются */
.bp-void-maw.hit .bp-shake{animation:bp-v-recoil .55s cubic-bezier(.2,.9,.3,1)}
.bp-void-maw.hit .g-spike-l{animation:bp-v-hit-spike-l .55s cubic-bezier(.2,.9,.3,1)}
.bp-void-maw.hit .g-spike-r{animation:bp-v-hit-spike-r .55s cubic-bezier(.2,.9,.3,1)}
.bp-void-maw.hit .g-spike-c{animation:bp-v-hit-spike-c .55s cubic-bezier(.2,.9,.3,1)}
.bp-void-maw.hit .g-lid-u{animation:bp-v-hit-lid-u .5s cubic-bezier(.2,.9,.3,1)}
.bp-void-maw.hit .g-lid-d{animation:bp-v-hit-lid-d .5s cubic-bezier(.2,.9,.3,1)}
.bp-void-maw.hit .g-eye{animation:bp-v-hit-eye .5s cubic-bezier(.2,.9,.3,1)}
.bp-void-maw.hit .g-mouth{animation:bp-v-hit-mouth .5s cubic-bezier(.2,.9,.3,1)}
.bp-void-maw.hit .g-t1{animation:bp-v-hit-t1 .6s cubic-bezier(.2,.9,.3,1)}
.bp-void-maw.hit .g-t2{animation:bp-v-hit-t2 .6s cubic-bezier(.2,.9,.3,1)}
.bp-void-maw.hit .g-t3{animation:bp-v-hit-t3 .6s cubic-bezier(.2,.9,.3,1)}
.bp-void-maw.hit .g-t4{animation:bp-v-hit-t4 .6s cubic-bezier(.2,.9,.3,1)}
.bp-void-maw.hit .g-t5{animation:bp-v-hit-t5 .6s cubic-bezier(.2,.9,.3,1)}
.bp-void-maw.hit img:not(.p-iris){animation:bp-r-hit-flash .5s ease-out}
@keyframes bp-v-recoil{0%,100%{transform:none}12%{transform:translateY(-10px) scale(.95)}24%{transform:translate(-8px,-6px) scale(.97)}36%{transform:translate(7px,-3px)}50%{transform:translateX(-4px)}68%{transform:translateX(2px)}}
@keyframes bp-v-hit-spike-l{0%{transform:none}14%{transform:translate(-22px,-14px) rotate(-12deg)}60%{transform:translate(2px,1px)}100%{transform:none}}
@keyframes bp-v-hit-spike-r{0%{transform:none}14%{transform:translate(22px,-14px) rotate(12deg)}60%{transform:translate(-2px,1px)}100%{transform:none}}
@keyframes bp-v-hit-spike-c{0%{transform:none}14%{transform:translateY(-26px) rotate(4deg)}60%{transform:translateY(2px)}100%{transform:none}}
@keyframes bp-v-hit-lid-u{0%{transform:none}14%{transform:translateY(-18px)}60%{transform:translateY(2px)}100%{transform:none}}
@keyframes bp-v-hit-lid-d{0%{transform:none}14%{transform:translateY(14px)}60%{transform:translateY(-2px)}100%{transform:none}}
@keyframes bp-v-hit-eye{0%{transform:none}14%{transform:scale(1.08)}60%{transform:scale(.98)}100%{transform:none}}
@keyframes bp-v-hit-mouth{0%{transform:none}14%{transform:translateY(12px) scale(1.1)}60%{transform:translateY(-2px)}100%{transform:none}}
@keyframes bp-v-hit-t1{0%{transform:none}16%{transform:rotate(14deg)}60%{transform:rotate(-2deg)}100%{transform:none}}
@keyframes bp-v-hit-t2{0%{transform:none}16%{transform:rotate(8deg)}60%{transform:rotate(-1.5deg)}100%{transform:none}}
@keyframes bp-v-hit-t3{0%{transform:none}16%{transform:translateY(16px) scaleY(.94)}60%{transform:translateY(-2px)}100%{transform:none}}
@keyframes bp-v-hit-t4{0%{transform:none}16%{transform:rotate(-8deg)}60%{transform:rotate(1.5deg)}100%{transform:none}}
@keyframes bp-v-hit-t5{0%{transform:none}16%{transform:rotate(-14deg)}60%{transform:rotate(2deg)}100%{transform:none}}

/* ── Огненный дракон ── */
/* Дыхание: крылья мерно приподнимаются, голова чуть покачивается, хвост лениво водит звеньями. Амплитуды малые — швы лишь едва смещаются над подложкой */
.bp-fire-dragon .i-wings{animation:bp-d-wing 3.6s ease-in-out infinite}
.bp-fire-dragon .i-head{animation:bp-d-head 3.6s ease-in-out -.4s infinite}
.bp-fire-dragon .i-tail-1{animation:bp-d-tail-1 4.4s ease-in-out infinite}
.bp-fire-dragon .i-tail-2{animation:bp-d-tail-2 4.4s ease-in-out -.6s infinite}
@keyframes bp-d-wing{0%,100%{transform:none}50%{transform:rotate(-1.6deg)}}
@keyframes bp-d-head{0%,100%{transform:none}50%{transform:rotate(1.6deg)}}
@keyframes bp-d-tail-1{0%,100%{transform:rotate(.6deg)}50%{transform:rotate(-.8deg)}}
@keyframes bp-d-tail-2{0%,100%{transform:rotate(1.5deg)}50%{transform:rotate(-2deg)}}
/* Удар: дракон вздрагивает, голова вскидывается, крылья взмётываются, хвост хлещет */
.bp-fire-dragon.hit .bp-shake{animation:bp-d-shake .5s linear}
.bp-fire-dragon.hit .g-head{animation:bp-d-hit-head .55s cubic-bezier(.2,.9,.3,1)}
.bp-fire-dragon.hit .g-wings{animation:bp-d-hit-wing .6s cubic-bezier(.2,.9,.3,1)}
.bp-fire-dragon.hit .g-tail-1{animation:bp-d-hit-tail-1 .6s cubic-bezier(.2,.9,.3,1)}
.bp-fire-dragon.hit .g-tail-2{animation:bp-d-hit-tail-2 .6s cubic-bezier(.2,.9,.3,1)}
.bp-fire-dragon.hit img{animation:bp-r-hit-flash .5s ease-out}
@keyframes bp-d-shake{0%,100%{transform:none}10%{transform:translateX(12px)}22%{transform:translateX(-9px)}34%{transform:translateX(7px)}48%{transform:translateX(-4px)}64%{transform:translateX(2px)}}
@keyframes bp-d-hit-head{0%{transform:none}14%{transform:rotate(4.5deg)}60%{transform:rotate(-1deg)}100%{transform:none}}
@keyframes bp-d-hit-wing{0%{transform:none}16%{transform:rotate(-4deg)}60%{transform:rotate(1deg)}100%{transform:none}}
@keyframes bp-d-hit-tail-1{0%{transform:none}16%{transform:rotate(-1.5deg)}60%{transform:rotate(.6deg)}100%{transform:none}}
@keyframes bp-d-hit-tail-2{0%{transform:none}18%{transform:rotate(-4deg)}62%{transform:rotate(1.5deg)}100%{transform:none}}

/* ── Владыка пламени ── */
/* Парение: владыка медленно всплывает и опускается, огонь мерцает, вихрь под ним колышется, руки и голова чуть покачиваются */
.bp-flame-lord .bp-body{animation:bp-f-float 3.4s ease-in-out infinite}
.bp-flame-lord .i-tail{animation:bp-f-tail 2.6s ease-in-out infinite}
.bp-flame-lord .i-head{animation:bp-f-head 3.4s ease-in-out -.5s infinite}
.bp-flame-lord .i-arm-l{animation:bp-f-arm-l 3.4s ease-in-out infinite}
.bp-flame-lord .i-arm-r{animation:bp-f-arm-r 3.4s ease-in-out -.3s infinite}
@keyframes bp-f-float{0%,100%{transform:translateY(0);filter:none}25%{filter:brightness(1.06)}50%{transform:translateY(-16px);filter:brightness(.97)}75%{filter:brightness(1.05)}}
@keyframes bp-f-tail{0%,100%{transform:rotate(-1.8deg) skewX(1.5deg)}50%{transform:rotate(1.8deg) skewX(-2deg)}}
@keyframes bp-f-head{0%,100%{transform:none}50%{transform:rotate(-1.5deg) translateY(-3px)}}
@keyframes bp-f-arm-l{0%,100%{transform:none}50%{transform:rotate(1.6deg)}}
@keyframes bp-f-arm-r{0%,100%{transform:none}50%{transform:rotate(-1.6deg)}}
/* Удар: владыка вздрагивает, голова откидывается, булава и когтистая рука вскидываются, вихрь хлещет */
.bp-flame-lord.hit .bp-shake{animation:bp-f-shake .5s linear}
.bp-flame-lord.hit .g-head{animation:bp-f-hit-head .55s cubic-bezier(.2,.9,.3,1)}
.bp-flame-lord.hit .g-arm-l{animation:bp-f-hit-arm-l .6s cubic-bezier(.2,.9,.3,1)}
.bp-flame-lord.hit .g-arm-r{animation:bp-f-hit-arm-r .6s cubic-bezier(.2,.9,.3,1)}
.bp-flame-lord.hit .g-tail{animation:bp-f-hit-tail .6s cubic-bezier(.2,.9,.3,1)}
.bp-flame-lord.hit img{animation:bp-r-hit-flash .5s ease-out}
@keyframes bp-f-shake{0%,100%{transform:none}10%{transform:translateX(-12px)}22%{transform:translateX(10px)}34%{transform:translateX(-7px)}48%{transform:translateX(4px)}64%{transform:translateX(-2px)}}
@keyframes bp-f-hit-head{0%{transform:none}14%{transform:rotate(-4deg) translateY(-6px)}60%{transform:rotate(1deg)}100%{transform:none}}
@keyframes bp-f-hit-arm-l{0%{transform:none}16%{transform:rotate(5deg)}60%{transform:rotate(-1deg)}100%{transform:none}}
@keyframes bp-f-hit-arm-r{0%{transform:none}16%{transform:rotate(-5deg)}60%{transform:rotate(1deg)}100%{transform:none}}
@keyframes bp-f-hit-tail{0%{transform:none}18%{transform:rotate(3deg) skewX(-3deg)}62%{transform:rotate(-1deg)}100%{transform:none}}

/* ── Пепельный феникс ── */
/* Полёт: феникс парит и машет крыльями, хвост струится, голова поворачивается, огонь мерцает */
.bp-ash-phoenix .bp-body{animation:bp-f-float 3.6s ease-in-out infinite}
.bp-ash-phoenix .i-wing-l{animation:bp-p-flap-l 1.8s ease-in-out infinite}
.bp-ash-phoenix .i-wing-r{animation:bp-p-flap-r 1.8s ease-in-out infinite}
.bp-ash-phoenix .i-tail{animation:bp-p-tail 3.2s ease-in-out infinite}
.bp-ash-phoenix .i-head{animation:bp-p-head 4s ease-in-out -.6s infinite}
@keyframes bp-p-flap-l{0%,100%{transform:none}50%{transform:rotate(-4deg)}}
@keyframes bp-p-flap-r{0%,100%{transform:none}50%{transform:rotate(4deg)}}
@keyframes bp-p-tail{0%,100%{transform:rotate(-1.6deg) skewX(1.5deg)}50%{transform:rotate(1.8deg) skewX(-2deg)}}
@keyframes bp-p-head{0%,100%{transform:none}50%{transform:rotate(-2deg)}}
/* Удар: феникс вздрагивает, голова откидывается, крылья вскидываются, хвост хлещет */
.bp-ash-phoenix.hit .bp-shake{animation:bp-f-shake .5s linear}
.bp-ash-phoenix.hit .g-head{animation:bp-p-hit-head .55s cubic-bezier(.2,.9,.3,1)}
.bp-ash-phoenix.hit .g-wing-l{animation:bp-p-hit-wing-l .6s cubic-bezier(.2,.9,.3,1)}
.bp-ash-phoenix.hit .g-wing-r{animation:bp-p-hit-wing-r .6s cubic-bezier(.2,.9,.3,1)}
.bp-ash-phoenix.hit .g-tail{animation:bp-f-hit-tail .6s cubic-bezier(.2,.9,.3,1)}
.bp-ash-phoenix.hit img{animation:bp-r-hit-flash .5s ease-out}
@keyframes bp-p-hit-head{0%{transform:none}14%{transform:rotate(-5deg) translateY(-6px)}60%{transform:rotate(1deg)}100%{transform:none}}
@keyframes bp-p-hit-wing-l{0%{transform:none}16%{transform:rotate(6deg)}60%{transform:rotate(-1.5deg)}100%{transform:none}}
@keyframes bp-p-hit-wing-r{0%{transform:none}16%{transform:rotate(-6deg)}60%{transform:rotate(1.5deg)}100%{transform:none}}

/* ── Порождение света ── */
/* Левитация: кристалл всплывает и пульсирует золотым свечением, обруч подлетает вверх-вниз, спутники парят каждый в свой такт */
.bp-light-spawn .bp-body{animation:bp-l-float 4.2s ease-in-out infinite}
.bp-light-spawn .i-ring-back,.bp-light-spawn .i-ring-front{animation:bp-l-ring 3s ease-in-out infinite}
.bp-light-spawn .i-sat-tl{animation:bp-l-sat-small 2.4s ease-in-out -.8s infinite}
.bp-light-spawn .i-sat-tr{animation:bp-l-sat 3.1s ease-in-out -.3s infinite}
.bp-light-spawn .i-sat-bl{animation:bp-l-sat 2.6s ease-in-out -1.4s infinite}
.bp-light-spawn .i-sat-br{animation:bp-l-sat 3.6s ease-in-out -2.1s infinite}
@keyframes bp-l-float{0%,100%{transform:translateY(0);filter:drop-shadow(0 0 14px rgba(255,205,90,.55))}50%{transform:translateY(-12px);filter:drop-shadow(0 0 30px rgba(255,215,110,.95))}}
@keyframes bp-l-ring{0%,100%{transform:translateY(-14px)}50%{transform:translateY(14px)}}
@keyframes bp-l-sat{0%,100%{transform:translateY(-16px)}50%{transform:translateY(16px)}}
@keyframes bp-l-sat-small{0%,100%{transform:translateY(-5px)}50%{transform:translateY(5px)}}
/* Удар: всё вздрагивает, обруч подбрасывает, спутники разлетаются в стороны и возвращаются */
.bp-light-spawn.hit .bp-shake{animation:bp-f-shake .5s linear}
.bp-light-spawn.hit .g-crystal{animation:bp-l-hit-crystal .5s cubic-bezier(.2,.9,.3,1)}
.bp-light-spawn.hit .g-ring-back,.bp-light-spawn.hit .g-ring-front{animation:bp-l-hit-ring .6s cubic-bezier(.2,.9,.3,1)}
.bp-light-spawn.hit .g-sat-tl{animation:bp-l-hit-tl .6s cubic-bezier(.2,.9,.3,1)}
.bp-light-spawn.hit .g-sat-tr{animation:bp-l-hit-tr .6s cubic-bezier(.2,.9,.3,1)}
.bp-light-spawn.hit .g-sat-bl{animation:bp-l-hit-bl .6s cubic-bezier(.2,.9,.3,1)}
.bp-light-spawn.hit .g-sat-br{animation:bp-l-hit-br .6s cubic-bezier(.2,.9,.3,1)}
.bp-light-spawn.hit img{animation:bp-r-hit-flash .5s ease-out}
@keyframes bp-l-hit-crystal{0%{transform:none}14%{transform:scale(1.04)}60%{transform:scale(.99)}100%{transform:none}}
@keyframes bp-l-hit-ring{0%{transform:none}16%{transform:translateY(-24px) rotate(-2deg)}60%{transform:translateY(3px)}100%{transform:none}}
@keyframes bp-l-hit-tl{0%{transform:none}16%{transform:translate(-26px,-18px)}60%{transform:translate(2px,1px)}100%{transform:none}}
@keyframes bp-l-hit-tr{0%{transform:none}16%{transform:translate(30px,-22px)}60%{transform:translate(-2px,1px)}100%{transform:none}}
@keyframes bp-l-hit-bl{0%{transform:none}16%{transform:translate(-30px,22px)}60%{transform:translate(2px,-1px)}100%{transform:none}}
@keyframes bp-l-hit-br{0%{transform:none}16%{transform:translate(30px,22px)}60%{transform:translate(-2px,-1px)}100%{transform:none}}

/* ── Сияющий страж ── */
/* Стойка: крылья мерно взмахивают, шлем чуть приподнимается, щит и копьё покачиваются; доспех мягко сияет */
.bp-radiant-guardian .bp-body{animation:bp-g-glow 3.6s ease-in-out infinite}
.bp-radiant-guardian .i-wing-l{animation:bp-g-flap-l 2.8s ease-in-out infinite}
.bp-radiant-guardian .i-wing-r{animation:bp-g-flap-r 2.8s ease-in-out infinite}
.bp-radiant-guardian .i-head{animation:bp-g-head 3.6s ease-in-out infinite}
.bp-radiant-guardian .i-shield{animation:bp-g-shield 3.6s ease-in-out -.4s infinite}
.bp-radiant-guardian .i-spear{animation:bp-g-spear 3.6s ease-in-out -.8s infinite}
@keyframes bp-g-glow{0%,100%{filter:drop-shadow(0 0 8px rgba(255,220,130,.35))}50%{filter:drop-shadow(0 0 22px rgba(255,225,140,.7))}}
@keyframes bp-g-flap-l{0%,100%{transform:none}50%{transform:rotate(-3deg)}}
@keyframes bp-g-flap-r{0%,100%{transform:none}50%{transform:rotate(3deg)}}
@keyframes bp-g-head{0%,100%{transform:none}50%{transform:translateY(-4px)}}
@keyframes bp-g-shield{0%,100%{transform:none}50%{transform:rotate(1.2deg) translateY(-3px)}}
@keyframes bp-g-spear{0%,100%{transform:none}50%{transform:rotate(-1deg) translateY(-3px)}}
/* Удар: страж вздрагивает, шлем откидывается, щит вскидывается, копьё кренится, крылья распахиваются */
.bp-radiant-guardian.hit .bp-shake{animation:bp-f-shake .5s linear}
.bp-radiant-guardian.hit .g-head{animation:bp-g-hit-head .55s cubic-bezier(.2,.9,.3,1)}
.bp-radiant-guardian.hit .g-shield{animation:bp-g-hit-shield .55s cubic-bezier(.2,.9,.3,1)}
.bp-radiant-guardian.hit .g-spear{animation:bp-g-hit-spear .6s cubic-bezier(.2,.9,.3,1)}
.bp-radiant-guardian.hit .g-wing-l{animation:bp-p-hit-wing-l .6s cubic-bezier(.2,.9,.3,1)}
.bp-radiant-guardian.hit .g-wing-r{animation:bp-p-hit-wing-r .6s cubic-bezier(.2,.9,.3,1)}
.bp-radiant-guardian.hit img{animation:bp-r-hit-flash .5s ease-out}
@keyframes bp-g-hit-head{0%{transform:none}14%{transform:translateY(-8px) rotate(-3deg)}60%{transform:translateY(1px)}100%{transform:none}}
@keyframes bp-g-hit-shield{0%{transform:none}14%{transform:translate(-10px,-14px) rotate(-4deg)}60%{transform:translate(1px,1px)}100%{transform:none}}
@keyframes bp-g-hit-spear{0%{transform:none}16%{transform:rotate(5deg)}60%{transform:rotate(-1deg)}100%{transform:none}}

/* ── Небесный серафим ── */
/* Парение: лик парит и мягко сияет, три пары крыльев взмахивают волной — верхняя, средняя, нижняя */
.bp-seraph .bp-body{animation:bp-s-float 3.6s ease-in-out infinite}
.bp-seraph .i-wing-tl{animation:bp-s-flap-l 2.4s ease-in-out infinite}
.bp-seraph .i-wing-tr{animation:bp-s-flap-r 2.4s ease-in-out infinite}
.bp-seraph .i-wing-ml{animation:bp-s-flap-l 2.4s ease-in-out -.3s infinite}
.bp-seraph .i-wing-mr{animation:bp-s-flap-r 2.4s ease-in-out -.3s infinite}
.bp-seraph .i-wing-bl{animation:bp-s-flap-l 2.4s ease-in-out -.6s infinite}
.bp-seraph .i-wing-br{animation:bp-s-flap-r 2.4s ease-in-out -.6s infinite}
@keyframes bp-s-float{0%,100%{transform:translateY(0);filter:drop-shadow(0 0 10px rgba(255,225,140,.45))}50%{transform:translateY(-14px);filter:drop-shadow(0 0 26px rgba(255,230,150,.85))}}
@keyframes bp-s-flap-l{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(5deg)}}
@keyframes bp-s-flap-r{0%,100%{transform:rotate(3deg)}50%{transform:rotate(-5deg)}}
/* Удар: серафим вздрагивает, лик чуть раздувается, все крылья разом распахиваются */
.bp-seraph.hit .bp-shake{animation:bp-f-shake .5s linear}
.bp-seraph.hit .g-core{animation:bp-l-hit-crystal .5s cubic-bezier(.2,.9,.3,1)}
.bp-seraph.hit .g-wing-tl,.bp-seraph.hit .g-wing-ml,.bp-seraph.hit .g-wing-bl{animation:bp-s-hit-l .6s cubic-bezier(.2,.9,.3,1)}
.bp-seraph.hit .g-wing-tr,.bp-seraph.hit .g-wing-mr,.bp-seraph.hit .g-wing-br{animation:bp-s-hit-r .6s cubic-bezier(.2,.9,.3,1)}
.bp-seraph.hit img{animation:bp-r-hit-flash .5s ease-out}
@keyframes bp-s-hit-l{0%{transform:none}16%{transform:rotate(8deg)}60%{transform:rotate(-1.5deg)}100%{transform:none}}
@keyframes bp-s-hit-r{0%{transform:none}16%{transform:rotate(-8deg)}60%{transform:rotate(1.5deg)}100%{transform:none}}

/* ── Ледяной голем ── */
/* Стойка: тяжёлое медленное дыхание — кулаки покачиваются, голова кивает; голем мерцает холодным светом */
.bp-ice-golem .bp-body{animation:bp-i-glow 3.8s ease-in-out infinite}
.bp-ice-golem .i-arm-l{animation:bp-i-arm-l 3.8s ease-in-out infinite}
.bp-ice-golem .i-arm-r{animation:bp-i-arm-r 3.8s ease-in-out -.4s infinite}
.bp-ice-golem .i-head{animation:bp-i-head 3.8s ease-in-out -.2s infinite}
@keyframes bp-i-glow{0%,100%{filter:drop-shadow(0 0 6px rgba(120,220,255,.25))}50%{filter:drop-shadow(0 0 18px rgba(130,225,255,.6))}}
@keyframes bp-i-arm-l{0%,100%{transform:none}50%{transform:rotate(-2deg) translateY(-4px)}}
@keyframes bp-i-arm-r{0%,100%{transform:none}50%{transform:rotate(2deg) translateY(-4px)}}
@keyframes bp-i-head{0%,100%{transform:none}50%{transform:translateY(5px) rotate(1deg)}}
/* Удар: голем тяжело вздрагивает, голова откидывается, кулаки разлетаются и с силой возвращаются */
.bp-ice-golem.hit .bp-shake{animation:bp-i-shake .55s linear}
.bp-ice-golem.hit .g-head{animation:bp-i-hit-head .55s cubic-bezier(.2,.9,.3,1)}
.bp-ice-golem.hit .g-arm-l{animation:bp-i-hit-arm-l .6s cubic-bezier(.2,.9,.3,1)}
.bp-ice-golem.hit .g-arm-r{animation:bp-i-hit-arm-r .6s cubic-bezier(.2,.9,.3,1)}
.bp-ice-golem.hit img{animation:bp-r-hit-flash .5s ease-out}
@keyframes bp-i-shake{0%,100%{transform:none}10%{transform:translateX(-10px)}22%{transform:translateX(8px)}34%{transform:translateX(-6px)}48%{transform:translateX(3px)}64%{transform:translateX(-1px)}}
@keyframes bp-i-hit-head{0%{transform:none}14%{transform:translateY(-12px) rotate(-4deg)}60%{transform:translateY(2px)}100%{transform:none}}
@keyframes bp-i-hit-arm-l{0%{transform:none}16%{transform:translate(-14px,-10px) rotate(4deg)}60%{transform:translate(1px,1px)}100%{transform:none}}
@keyframes bp-i-hit-arm-r{0%{transform:none}16%{transform:translate(14px,-10px) rotate(-4deg)}60%{transform:translate(-1px,1px)}100%{transform:none}}

/* ── Морозная ведьма ── */
/* Стойка: снежинка парит над ладонью, вращается и мерцает; посох покачивается, голова величаво поводится */
.bp-frost-witch .bp-body{animation:bp-i-glow 3.8s ease-in-out infinite}
.bp-frost-witch .i-snow{animation:bp-w-snow-float 2.8s ease-in-out infinite}
.bp-frost-witch .p-snow{animation:bp-w-snow-spin 9s linear infinite,bp-w-snow-glow 2.2s ease-in-out infinite;transform-origin:50% 50%}
.bp-frost-witch .i-staff{animation:bp-w-staff 3.8s ease-in-out -.5s infinite}
.bp-frost-witch .i-head{animation:bp-w-head 4.6s ease-in-out infinite}
@keyframes bp-w-snow-float{0%,100%{transform:translateY(-12px)}50%{transform:translateY(10px)}}
@keyframes bp-w-snow-spin{to{transform:rotate(360deg)}}
@keyframes bp-w-snow-glow{0%,100%{filter:brightness(1) drop-shadow(0 0 6px #8fe6ff)}50%{filter:brightness(1.35) drop-shadow(0 0 18px #bff3ff)}}
@keyframes bp-w-staff{0%,100%{transform:none}50%{transform:rotate(-1.2deg)}}
@keyframes bp-w-head{0%,100%{transform:none}50%{transform:rotate(-1.4deg)}}
/* Удар: ведьма вздрагивает, голова откидывается, посох кренится, снежинку отбрасывает в сторону */
.bp-frost-witch.hit .bp-shake{animation:bp-f-shake .5s linear}
.bp-frost-witch.hit .g-head{animation:bp-w-hit-head .55s cubic-bezier(.2,.9,.3,1)}
.bp-frost-witch.hit .g-staff{animation:bp-w-hit-staff .6s cubic-bezier(.2,.9,.3,1)}
.bp-frost-witch.hit .g-snow{animation:bp-w-hit-snow .6s cubic-bezier(.2,.9,.3,1)}
.bp-frost-witch.hit img:not(.p-snow){animation:bp-r-hit-flash .5s ease-out}
@keyframes bp-w-hit-head{0%{transform:none}14%{transform:rotate(-4deg) translateY(-6px)}60%{transform:rotate(1deg)}100%{transform:none}}
@keyframes bp-w-hit-staff{0%{transform:none}16%{transform:rotate(3deg)}60%{transform:rotate(-.8deg)}100%{transform:none}}
@keyframes bp-w-hit-snow{0%{transform:none}16%{transform:translate(-40px,-30px) scale(1.15)}60%{transform:translate(3px,2px)}100%{transform:none}}

/* ── Морозный волк-исполин ── */
/* Стойка: волк тяжело дышит, голова рычит вперёд-вниз, хвост медленно водит; мерцает холодным светом */
.bp-frost-wolf .bp-body{animation:bp-i-glow 3.4s ease-in-out infinite}
.bp-frost-wolf .i-head{animation:bp-o-head 3.4s ease-in-out infinite}
.bp-frost-wolf .i-tail{animation:bp-o-tail 2.8s ease-in-out infinite}
@keyframes bp-o-head{0%,100%{transform:none}50%{transform:rotate(-1.8deg) translate(-4px,3px)}}
@keyframes bp-o-tail{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(4deg)}}
/* Удар: волк отшатывается, голова вскидывается с рыком, хвост хлещет */
.bp-frost-wolf.hit .bp-shake{animation:bp-d-shake .5s linear}
.bp-frost-wolf.hit .g-head{animation:bp-o-hit-head .55s cubic-bezier(.2,.9,.3,1)}
.bp-frost-wolf.hit .g-tail{animation:bp-o-hit-tail .6s cubic-bezier(.2,.9,.3,1)}
.bp-frost-wolf.hit img{animation:bp-r-hit-flash .5s ease-out}
@keyframes bp-o-hit-head{0%{transform:none}14%{transform:rotate(6deg) translate(8px,-8px)}60%{transform:rotate(-1deg)}100%{transform:none}}
@keyframes bp-o-hit-tail{0%{transform:none}18%{transform:rotate(-9deg)}62%{transform:rotate(2deg)}100%{transform:none}}

.no-animations .bp *{animation:none!important}
@media (prefers-reduced-motion:reduce){.bp *{animation:none!important}}
`;
document.head.append(style);

// svg врага с куклой: холст куклы вписан в рамку 200×175 (длинным куклам можно шире — maxW), стоит по центру на нижней кромке.
// Тело обёрнуто в слой .bp-shake: дрожь от удара складывается с «парением» тела, а не заменяет его.
function html(id,name){
 const p=PUPPETS[id],k=Math.min((p.maxW||BOX_W)/p.w,BOX_H/p.h),dx=(BOX_W-p.w*k)/2,dy=BOX_H-p.h*k,groups=[],byGroup={};
 const box=([,w,h,cx,cy])=>{const sw=w*p.scale,sh=h*p.scale;return {w:sw,h:sh,l:cx-sw/2,t:cy-sh/2};};
 for(const part of p.parts){
  const [file,,,,,g,rot=0,mask]=part,b=box(part);
  if(!byGroup[g]){byGroup[g]=[];groups.push(g);}
  let img=`<img class="p-${file}" src="${p.path}${file}.png" alt="" style="width:${b.w}px;height:${b.h}px;left:${b.l}px;top:${b.t}px${rot?`;transform:rotate(${rot}deg)`:''}">`;
  // Часть с маской видна только внутри контура другой части (радужка — внутри белка).
  if(mask){const m=box(p.parts.find(q=>q[0]===mask)),url=`url(${p.path}${mask}.png) ${m.l}px ${m.t}px/${m.w}px ${m.h}px no-repeat`;img=`<div class="bp-mask" style="-webkit-mask:${url};mask:${url}">${img}</div>`;}
  byGroup[g].push(img);
 }
 // Группа несёт анимацию удара, вложенный слой — дыхание; так они складываются, а не перебивают друг друга.
 // Дочерняя группа (parents: {ребёнок:[родитель, под_ним]}) лежит внутри родителя и движется вместе с ним — звенья хвоста.
 const parents=p.parents||{},kids=g=>groups.filter(c=>parents[c]?.[0]===g);
 const group=g=>{const o=p.pivots[g].map(v=>v+'px').join(' '),under=kids(g).filter(c=>parents[c][1]).map(group).join(''),over=kids(g).filter(c=>!parents[c][1]).map(group).join('');
  return `<div class="bp-grp g-${g}" style="transform-origin:${o}"><div class="bp-grp i-${g}" style="transform-origin:${o}">${under}${byGroup[g].join('')}${over}</div></div>`;};
 const body=groups.filter(g=>!parents[g]).map(group).join('');
 const origin=p.body.map(v=>v+'px').join(' ');
 return `<svg viewBox="0 0 ${BOX_W} ${BOX_H}" role="img" aria-label="${name}" style="overflow:visible"><foreignObject x="0" y="0" width="${p.w}" height="${p.h}" transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${k})" style="overflow:visible"><div xmlns="http://www.w3.org/1999/xhtml" class="bp bp-${id}" style="width:${p.w}px;height:${p.h}px"><div class="bp-grp bp-shake" style="transform-origin:${origin}"><div class="bp-body" style="transform-origin:${origin}">${body}</div></div></div></foreignObject></svg>`;
}
function preload(id){const p=PUPPETS[id];if(p)for(const [file] of p.parts)new Image().src=p.path+file+'.png';}
window.bossPuppets={has:id=>!!PUPPETS[id],html,preload};

// При ударе кукла не подменяет картинку на «-hurt», а играет анимацию удара.
const originalHurt=showMonsterHurt;
showMonsterHurt=function(){
 const puppet=document.querySelector('#monster .bp');
 if(!puppet)return originalHurt();
 if(!settings.animations)return;
 puppet.classList.remove('hit');void puppet.getBoundingClientRect();puppet.classList.add('hit');
};
})();
