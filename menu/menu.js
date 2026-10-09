(function(){"use strict";
const $=s=>document.querySelector(s);
/* ===== SOUND (shares ebr.c with Bomb Race: snd + vol) ===== */
const K='ebr.c';let AC=null;
const cfg=()=>{try{return Object.assign({snd:true,vol:.5},JSON.parse(localStorage.getItem(K))||{})}catch(e){return{snd:true,vol:.5}}};
const saveCfg=p=>{try{localStorage.setItem(K,JSON.stringify(Object.assign(cfg(),p)))}catch(e){}};
function beep(f,d,ty,s){const c=cfg();if(!c.snd)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.resume)AC.resume();
 const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime+(s||0);o.type=ty||'sine';o.frequency.setValueAtTime(f,t);
 g.gain.setValueAtTime(.2*c.vol+.0002,t);g.gain.exponentialRampToValueAtTime(.0002,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d)}catch(e){}}
const SFX={hover:()=>beep(620,.06,'triangle'),click:()=>beep(440,.1,'square'),go:()=>[523,659,784].forEach((f,i)=>beep(f,.18,'sine',i*.1))};
/* ===== BACKGROUND (few DOM nodes, transform/opacity only) ===== */
const WORDS=['A','B','C','?','!','ABC','ENGLISH','PLAY','WIN','Hello','Quiz','Go!'];
(function(){const bg=$('#bg');for(let i=0;i<16;i++){const s=document.createElement('span');s.textContent=WORDS[i%WORDS.length];
 s.style.cssText=`left:${Math.random()*95}vw;font-size:${18+Math.random()*34}px;animation-duration:${16+Math.random()*16}s;animation-delay:-${Math.random()*24}s;--rot:${(Math.random()-.5)*60}deg`;bg.appendChild(s)}})();
/* ===== TITLE ===== */
(function(){const t=$('#title');t.innerHTML=[...t.textContent].map((c,i)=>c===' '?'<i class="sp"></i>':`<i style="animation-delay:${.1+i*.04}s">${c}</i>`).join('')})();
/* ===== CARDS ===== */
const ART={
 bomb:()=>'<div class="lanes"><b style="--lc:#ff5a5a"></b><b style="--lc:#3d9bff"></b><b style="--lc:#35d07f"></b></div><div class="q">What time do you wake up?</div><div class="bomb"></div>',
 wheel:()=>'<div class="wheel"></div><div class="ptr"></div>',
 mystery:()=>'<div class="mb"><i class="mb-glow"></i><div class="mb-lid"></div><div class="mb-body"><b>?</b></div><s class="sp1"></s><s class="sp2"></s><s class="sp3"></s></div>',
 dart:()=>'<div class="dt"><div class="dt-board"></div><div class="dt-dart"><i></i><u></u></div></div>',
 uno:()=>'<div class="ucards"><b style="--x:-72%;--r:-16deg;background:#e53935">7</b><b style="--x:72%;--r:16deg;background:#fdd835;color:#222">?</b><b style="--x:0%;--r:0deg;background:#1e88e5;z-index:2">+2</b></div>',
 icon:g=>`<div class="big">${g.icon}</div>`};
const cards=$('#cards');
GAMES.forEach(g=>{const el=document.createElement('article');el.className='card';el.style.setProperty('--c',g.color);el.dataset.id=g.id;
 el.innerHTML=`<h2>${g.title}</h2><div class="art">${(ART[g.art]||ART.icon)(g)}</div><p>${g.description}</p><button class="play">PLAY NOW</button>`;
 el.addEventListener('mouseenter',SFX.hover);
 el.addEventListener('mousemove',e=>{if(el._r)return;el._r=requestAnimationFrame(()=>{el._r=0;const b=el.getBoundingClientRect();
  el.style.setProperty('--ry',((e.clientX-b.left)/b.width-.5)*10+'deg');el.style.setProperty('--rx',(.5-(e.clientY-b.top)/b.height)*8+'deg')})});
 el.addEventListener('mouseleave',()=>{el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg')});
 el.addEventListener('click',e=>{if(e.target.closest('.play')||el.classList.contains('on'))play(g,el);
  else{document.querySelectorAll('.card.on').forEach(c=>c.classList.remove('on'));el.classList.add('on');SFX.click()}}); /* touch: 1st tap highlights, 2nd plays */
 cards.appendChild(el)});
/* ===== NAVIGATION + TRANSITION (~800 ms) ===== */
function play(g,el){if(document.body.classList.contains('leaving'))return;SFX.go();el.classList.add('on');document.body.classList.add('leaving');
 $('#veilName').textContent=g.title;$('#veil').classList.add('go');setTimeout(()=>{location.href=g.path},800)}
addEventListener('pageshow',e=>{if(e.persisted){document.body.classList.remove('leaving');$('#veil').classList.remove('go')}});
/* ===== MODALS ===== */
$('#howBody').innerHTML=GAMES.map(g=>`<p><b style="color:${g.color}">${g.icon} ${g.title}</b><br>${g.how||g.description}</p>`).join('');
const open=m=>{$(m).hidden=false;SFX.click()},shut=m=>{m.hidden=true;SFX.click()};
$('#howBtn').onclick=()=>open('#howModal');$('#gearBtn').onclick=()=>open('#setModal');
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m||e.target.hasAttribute('data-close'))shut(m)}));
addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal').forEach(m=>m.hidden=true)});
const sb=$('#sndBtn'),vl=$('#vol'),paint=()=>{const c=cfg();sb.textContent=c.snd?'ON':'OFF';vl.value=c.vol};paint();
sb.onclick=()=>{saveCfg({snd:!cfg().snd});paint();SFX.click()};vl.oninput=()=>saveCfg({vol:+vl.value});vl.onchange=SFX.click;
})();
