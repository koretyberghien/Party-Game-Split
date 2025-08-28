/**********************
 * STORAGE & DEFAULTS
 **********************/
const store = {
  get(k, fallback){ try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};

// defaults (eenmalig)
if (!store.get('players', null)) store.set('players', []);
if (!store.get('activeMap', null)) store.set('activeMap', 'jungle');
if (!store.get('maps', null)) store.set('maps', [
  { id:'jungle',  name:'Jungle Run',   steps: 26, tint:'#6bbf59' },
  { id:'desert',  name:'Desert Dash',  steps: 22, tint:'#e0b27a' },
  { id:'volcano', name:'Volcano Rush', steps: 24, tint:'#a64b2a' }
]);
if (!store.get('questions', null)) store.set('questions', {
  jungle:  [{id:crypto.randomUUID(), text:'Armworstel duel!', speak:'Kies twee kampioenen voor een armworstel duel!', count:2}],
  desert:  [{id:crypto.randomUUID(), text:'Doe een zand-sprint! 1 speler.', speak:'Wie kan het snelst? Klaar voor de start!', count:1}],
  volcano: [{id:crypto.randomUUID(), text:'Lava-jump! 3 spelers springen op 1 been.', speak:'Pas op voor de lava!', count:3}],
});

const $ = (q, d=document)=> d.querySelector(q);
const sections = { home:$('#home'), players:$('#players'), maps:$('#maps'), questions:$('#questions'), game:$('#game') };
function go(name){
  Object.values(sections).forEach(s=>s.classList.add('hidden'));
  sections[name].classList.remove('hidden');
  if (name==='home') renderMini();
  if (name==='players') renderPlayers();
  if (name==='maps') renderMaps();
  if (name==='questions'){ renderQMapName(); renderQuestions(); }
}

/**********************
 * HOME
 **********************/
const mini = $('#miniPlayerList');
function renderMini(){
  const players = store.get('players', []);
  mini.innerHTML='';
  players.forEach(p=>{
    const wrap = document.createElement('div'); wrap.className='mini-player';
    const head = document.createElement('div'); head.className='mini-head'; head.style.background = p.skin||'#ffd6b0';
    const name = document.createElement('div'); name.className='mini-name'; name.textContent = p.name||'Player'; name.style.color = p.color||'#5a1a1a';
    wrap.append(head,name); mini.appendChild(wrap);
  });
}
renderMini();
$('#btnPlayers').onclick   = ()=> go('players');
$('#btnMaps').onclick      = ()=> go('maps');
$('#btnQuestions').onclick = ()=> go('questions');
$('#btnPlay').onclick      = ()=> startGame();

/**********************
 * PLAYERS + 3D AVATAR BUILDER
 **********************/
const pList = $('#playerList');
function renderPlayers(){
  const players = store.get('players', []);
  pList.innerHTML='';
  players.forEach((p,i)=>{
    const row = document.createElement('div'); row.className='item';
    const ava = document.createElement('div'); ava.className='item-avatar'; ava.style.background = p.skin||'#ffd6b0';
    const info = document.createElement('div');
    info.innerHTML = `<div style="font-weight:900;color:${p.color||'#5a1a1a'}">${p.name}</div>
                      <div style="opacity:.8;font-size:13px">${p.gender} • face:${p.face} • hair:${p.hairStyle}</div>`;
    const rm = document.createElement('button'); rm.className='btn btn-dark'; rm.textContent='❌';
    rm.onclick = ()=>{ const a=store.get('players',[]); a.splice(i,1); store.set('players',a); renderPlayers(); renderMini(); };
    row.append(ava,info,rm); pList.appendChild(row);
  });
}
renderPlayers();

const fields = {
  name: $('#pName'), gender: $('#pGender'), face: $('#pFace'),
  skin: $('#pSkin'), color: $('#pColor'),
  hairColor: $('#pHairColor'), hairStyle: $('#pHairStyle'),
  eyes: $('#pEyes'), mouth: $('#pMouth')
};
$('#pSave').onclick = ()=>{
  const name = fields.name.value.trim();
  if (!name) return alert('Naam invullen!');
  const player = {
    id: crypto.randomUUID(),
    name,
    gender: fields.gender.value,
    face: fields.face.value,
    skin: fields.skin.value,
    color: fields.color.value,
    hairColor: fields.hairColor.value,
    hairStyle: fields.hairStyle.value,
    eyes: fields.eyes.value,
    mouth: fields.mouth.value,
    position: 0, score: 0, chosenCount: 0
  };
  const arr = store.get('players', []); arr.push(player); store.set('players', arr);
  fields.name.value='';
  renderPlayers(); renderMini();
};
$('#pClear').onclick = ()=> { if (confirm('Alle spelers wissen?')) { store.set('players', []); renderPlayers(); renderMini(); } };
document.querySelectorAll('[data-nav]').forEach(b=> b.onclick = ()=> go(b.dataset.nav));

/******** Avatar Builder (Three.js head preview) ********/
let avatarPreview = null;
function initAvatarPreview(){
  const canvas = $('#avatarCanvas'); if (!canvas) return;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  const w = canvas.clientWidth || 360, h = canvas.clientHeight || 360;
  renderer.setSize(w, h, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 100); camera.position.set(0,0,4);
  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(light);

  let headGroup = new THREE.Group(); scene.add(headGroup);

  function makeHair(style, colorHex){
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: .7, metalness: .05 });
    if (style==='none') return null;
    if (style==='short'){
      const g = new THREE.SphereGeometry(0.95, 24, 24, 0, Math.PI*2, 0, Math.PI/2.2);
      const m = new THREE.Mesh(g, mat); m.position.y = 0.15; return m;
    }
    if (style==='spikes'){
      const group = new THREE.Group();
      for(let i=0;i<12;i++){
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), mat);
        const a = (i/12)*Math.PI*2;
        cone.position.set(Math.cos(a)*0.6, 0.55, Math.sin(a)*0.6);
        cone.lookAt(0,1.4,0);
        group.add(cone);
      }
      return group;
    }
    if (style==='pony'){
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.92,24,24,0,Math.PI*2,0,Math.PI/2.4), mat);
      cap.position.y = 0.12;
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,0.9,10), mat);
      tail.position.set(0,-0.05,-0.65);
      const g = new THREE.Group(); g.add(cap, tail); return g;
    }
    return null;
  }
  function makeEyes(type){
    const g = new THREE.Group();
    const L = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), new THREE.MeshBasicMaterial({color:0x111}));
    const R = L.clone();
    L.position.set(-0.22, 0.1, 0.48); R.position.set(0.22, 0.1, 0.48);
    if (type==='wide'){ L.scale.set(1.3,1.1,1); R.scale.set(1.3,1.1,1); }
    if (type==='smile'){ L.position.y = 0.06; R.position.y = 0.06; }
    g.add(L,R); return g;
  }
  function makeMouth(type){
    const mat = new THREE.MeshBasicMaterial({ color: 0x111 });
    if (type==='line'){
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.02), mat);
      m.position.set(0, -0.18, 0.48); return m;
    }
    if (type==='smile'){
      const arc = new THREE.TorusGeometry(0.16, 0.03, 8, 24, Math.PI);
      const m = new THREE.Mesh(arc, mat);
      m.rotation.x = Math.PI/2; m.position.set(0,-0.18,0.45); return m;
    }
    if (type==='oh'){
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.04,16), mat);
      m.rotation.x = Math.PI/2; m.position.set(0,-0.18,0.48); return m;
    }
  }
  function rebuild(){
    scene.remove(headGroup); headGroup = new THREE.Group(); scene.add(headGroup);
    const skin = fields.skin.value || '#ffd6b0';
    const face = fields.face.value;
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), new THREE.MeshStandardMaterial({ color: skin }));
    if (face==='oval') head.scale.set(0.9,1.15,0.95);
    if (face==='square') head.scale.set(1.15,1.0,1.15);
    headGroup.add(head);
    const hair = makeHair(fields.hairStyle.value, fields.hairColor.value); if (hair) headGroup.add(hair);
    headGroup.add(makeEyes(fields.eyes.value));
    headGroup.add(makeMouth(fields.mouth.value));
  }
  function tick(){ headGroup.rotation.y += 0.01; renderer.render(scene, camera); requestAnimationFrame(tick); }
  ['pSkin','pFace','pHairStyle','pHairColor','pEyes','pMouth'].forEach(id=>{
    $('#'+id)?.addEventListener('input', rebuild);
    $('#'+id)?.addEventListener('change', rebuild);
  });
  rebuild(); tick();

  avatarPreview = { renderer, scene, camera };
}
initAvatarPreview();

/**********************
 * MAPS
 **********************/
const mapList = $('#mapList');
function renderMaps(){
  const maps = store.get('maps', []);
  const active = store.get('activeMap', 'jungle');
  mapList.innerHTML='';
  maps.forEach(m=>{
    const row = document.createElement('div'); row.className='item';
    const box = document.createElement('div'); box.className='item-avatar'; box.style.borderRadius='10px'; box.style.background = m.tint||'#ccc';
    const info = document.createElement('div'); info.innerHTML = `<div style="font-weight:900">${m.name}</div><div style="opacity:.8">Steps: ${m.steps}</div>`;
    const btn = document.createElement('button'); btn.className='btn';
    btn.textContent = (active===m.id) ? 'Geselecteerd' : 'Selecteer';
    if (active===m.id) btn.disabled = true;
    btn.onclick = ()=> { store.set('activeMap', m.id); renderMaps(); };
    row.append(box, info, btn); mapList.appendChild(row);
  });
}

/**********************
 * QUESTIONS
 **********************/
const qMapName = $('#qMapName'), qList = $('#qList');
function renderQMapName(){
  const maps = store.get('maps', []), id = store.get('activeMap','jungle');
  qMapName.textContent = maps.find(m=>m.id===id)?.name || id;
}
function getQs(){
  const all = store.get('questions', {});
  const id = store.get('activeMap', 'jungle');
  return all[id] || [];
}
function setQs(list){
  const all = store.get('questions', {});
  const id = store.get('activeMap', 'jungle');
  all[id] = list; store.set('questions', all);
}
function renderQuestions(){
  const qs = getQs(); qList.innerHTML='';
  qs.forEach((q,i)=>{
    const row = document.createElement('div'); row.className='item';
    const dot = document.createElement('div'); dot.className='item-avatar'; dot.style.background = '#ffe7b6';
    const info = document.createElement('div');
    info.innerHTML = `<div style="font-weight:900">${q.text}</div><div style="opacity:.8">Deelnemers: ${q.count}${q.speak?` • Presentator: “${q.speak}”`:''}</div>`;
    const rm = document.createElement('button'); rm.className='btn btn-dark'; rm.textContent='❌';
    rm.onclick = ()=>{ const arr=getQs(); arr.splice(i,1); setQs(arr); renderQuestions(); };
    row.append(dot, info, rm); qList.appendChild(row);
  });
}
$('#qAdd').onclick = ()=>{
  const text = $('#qText').value.trim();
  const speak = $('#qSpeak').value.trim();
  const count = Math.max(1, +$('#qCount').value || 1);
  if (!text) return alert('Vul een vraag/opdracht in');
  const arr = getQs(); arr.push({ id: crypto.randomUUID(), text, speak, count });
  setQs(arr); $('#qText').value=''; $('#qSpeak').value=''; renderQuestions();
};

/**********************
 * GAME (Three.js wereld)
 **********************/
let three = null; // scene referenties voor cleanup

function startGame(){
  const players = store.get('players', []);
  if (players.length===0) { alert('Voeg eerst spelers toe.'); return; }

  // reset posities & HUD
  players.forEach(p=>{ p.position = 0; p.chosenCount = p.chosenCount||0; });
  store.set('players', players);
  go('game');
  renderHUD(players);

  setupThree(players);
  $('#btnNextQuestion').onclick = nextQuestionFlow;
  $('#ovClose').onclick = ()=> $('#overlay').style.display='none';
}

function renderHUD(players){
  const hud = $('#hud'); hud.innerHTML='';
  players.forEach(p=>{
    const chip = document.createElement('div'); chip.className='hud-chip';
    const dot = document.createElement('div'); dot.className='hud-dot'; dot.style.background = p.color||'#ff6b6b';
    const name = document.createElement('div'); name.textContent = p.name; name.style.fontWeight='900';
    chip.append(dot,name); hud.appendChild(chip);
  });
}

function setupThree(players){
  if (three?.renderer){ cancelAnimationFrame(three.raf); three.renderer.dispose(); three=null; }

  // renderer/camera/scene
  const canvas = $('#gameCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x87b86a, 0.003);

  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
  camera.position.set(-10, 12, 16);

  // lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x224422, 1.0); scene.add(hemi);
  const dir  = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(10,20,10); dir.castShadow=true; scene.add(dir);

  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300,300), new THREE.MeshLambertMaterial({color:0x6bbf59}));
  ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);

  // trees
  function addTree(x,z,s=1){
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18*s,0.22*s,2*s,8), new THREE.MeshLambertMaterial({color:0x7a4b2a}));
    trunk.position.set(x,1*s,z); trunk.castShadow=true; scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.0*s,16,16), new THREE.MeshLambertMaterial({color:0x2f7d32}));
    crown.position.set(x,2.6*s,z); crown.castShadow=true; scene.add(crown);
  }
  for (let i=0;i<26;i++) addTree((Math.random()-0.5)*90,(Math.random()-0.5)*90,0.7+Math.random()*1.2);

  // path
  const maps = store.get('maps', []);
  const activeMap = store.get('activeMap','jungle');
  const mapObj = maps.find(m=>m.id===activeMap) || {steps:20};
  const steps = Math.max(8, mapObj.steps||16);

  const pathPoints = [];
  let px=-12, pz=-8, dx=1.1, dz=0.8;
  for (let i=0;i<steps;i++){
    pathPoints.push(new THREE.Vector3(px,0.02,pz));
    px += dx; pz += dz;
    if (i%3===0){ dx=(Math.random()>.5?1:-1)*(0.8+Math.random()*1.3); dz=(Math.random()>.5?1:-1)*(0.5+Math.random()*1.1); }
  }

  const tiles=[];
  for (let i=0;i<pathPoints.length;i++){
    const tile = new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,0.2,28), new THREE.MeshStandardMaterial({color:0xf0d08a}));
    tile.position.copy(pathPoints[i]); tile.position.y=0.08; tile.rotation.y = Math.random();
    tile.castShadow = true; tile.receiveShadow = true; scene.add(tile); tiles.push(tile);
  }
  const finish = new THREE.Mesh(new THREE.BoxGeometry(0.1,2.2,0.1), new THREE.MeshStandardMaterial({color:0x111}));
  finish.position.copy(pathPoints[pathPoints.length-1]); finish.position.y=1.12; scene.add(finish);

  // avatars
  function makeAvatar(p){
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.36,0.9,12), new THREE.MeshStandardMaterial({color:p.color||'#ff6b6b'}));
    body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32,16,16), new THREE.MeshStandardMaterial({color:p.skin||'#ffd6b0'}));
    head.position.y=0.85; head.castShadow = true; g.add(head);
    // simpele haar-kap
    if (p.hairStyle && p.hairStyle!=='none'){
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.45,16,16), new THREE.MeshStandardMaterial({color:p.hairColor||'#2b1a10'}));
      m.scale.set(1.1,0.7,1.1); m.position.y=1.05; g.add(m);
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,0.12,12), new THREE.MeshStandardMaterial({color:0x333}));
    base.position.y=-0.55; base.receiveShadow=true; g.add(base);
    return g;
  }
  const avatars = store.get('players', []).map((p,idx)=>{
    const av = makeAvatar(p);
    const off = (idx-(players.length-1)/2)*0.6;
    av.position.copy(pathPoints[0]); av.position.y=0.3; av.position.x += off;
    scene.add(av);
    return av;
  });

  // loop
  const clock = new THREE.Clock();
  let raf = 0;
  function loop(){
    raf = requestAnimationFrame(loop);
    const t = clock.getElapsedTime();
    avatars.forEach((a,i)=> a.rotation.y = Math.sin(t*0.6+i)*0.12);
    renderer.render(scene, camera);
  }
  loop();

  // resize
  addEventListener('resize', ()=>{
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  });

  // store refs
  three = { renderer, scene, camera, pathPoints, avatars, players: store.get('players', []), raf };
}

function speak(text){
  try{ const u = new SpeechSynthesisUtterance(text); u.lang='nl-NL'; speechSynthesis.cancel(); speechSynthesis.speak(u); }catch{}
}

// selecteer N spelers: eerst laagste chosenCount, tie-break random
function selectPlayersEvenly(n){
  const arr = [...three.players].sort((a,b)=>(a.chosenCount??0)-(b.chosenCount??0) || Math.random()-0.5);
  return arr.slice(0, Math.min(n, arr.length));
}

// overlay helpers
const overlay = $('#overlay'), ovTitle = $('#ovTitle'), ovBody = $('#ovBody'), ovActions = $('#ovActions');
function showOverlay(title, html, buttons=[]){
  ovTitle.textContent = title;
  ovBody.innerHTML = html;
  ovActions.innerHTML = '';
  buttons.forEach(b=>{
    const el = document.createElement('button'); el.className='btn'; el.textContent = b.label; el.onclick = b.onClick;
    ovActions.appendChild(el);
  });
  overlay.style.display = 'flex';
}

// bewegen langs pad
function moveAvatarSmooth(playerIndex, targetStep, cb){
  const av = three.avatars[playerIndex]; const p = three.players[playerIndex];
  const current = p.position||0; const endStep = Math.min(targetStep, three.pathPoints.length-1);
  const seq = []; for (let s=current+1; s<=endStep; s++) seq.push(s);
  if (!seq.length){ cb && cb(); return; }

  const stepOnce = ()=>{
    const next = seq.shift(); if (next==null){ p.position=endStep; store.set('players', three.players); cb&&cb(); return; }
    const from = av.position.clone(); const to = three.pathPoints[next].clone(); to.y=0.3;
    const t0 = performance.now(), dur = 540;
    (function frame(now){
      const k = Math.min(1, (now-t0)/dur);
      av.position.lerpVectors(from, to, k); av.rotation.y += 0.03;
      three.renderer.render(three.scene, three.camera);
      if (k<1) requestAnimationFrame(frame);
      else setTimeout(stepOnce, 80);
    })(performance.now());
  };
  stepOnce();
}

function checkWin(pi){
  if ((three.players[pi].position||0) >= three.pathPoints.length-1){
    showOverlay('🎉 Proficiat!', `<b>${three.players[pi].name}</b> heeft gewonnen!`);
    speak(`${three.players[pi].name} heeft gewonnen!`);
  }
}

// vraag-flow
function nextQuestionFlow(){
  const mapId = store.get('activeMap','jungle');
  const all = store.get('questions', {});
  const list = all[mapId]||[];
  // fallback als geen vragen
  if (list.length===0){
    list.push({id:crypto.randomUUID(), text:'Kies 2 spelers voor een duel!', count:2},
              {id:crypto.randomUUID(), text:'Eén speler doet een dansje!', count:1});
    all[mapId]=list; store.set('questions', all);
  }
  // roteer
  const idxKey = `qIndex_${mapId}`;
  let i = store.get(idxKey, 0) || 0;
  const q = list[i % list.length];
  store.set(idxKey, (i+1)%list.length);

  // eerlijke selectie
  const count = Math.max(1, q.count||1);
  const chosen = selectPlayersEvenly(count);
  chosen.forEach(cp=> { const ref = three.players.find(p=>p.id===cp.id); ref.chosenCount = (ref.chosenCount||0)+1; });
  store.set('players', three.players);
  renderHUD(three.players);

  // presentator
  const say = (q.speak && q.speak.trim()) || q.text;
  speak(say);

  // overlay + acties
  if (chosen.length===2){
    const pA = chosen[0], pB = chosen[1];
    const html = `
      <div style="font-size:22px;margin-bottom:8px">${q.text}</div>
      <div style="opacity:.95;margin-bottom:12px">
        <b style="color:${pA.color}">${pA.name}</b> vs
        <b style="color:${pB.color}">${pB.name}</b>
      </div>
      <div style="font-size:14px;opacity:.8">Kies wie wint ↓</div>
    `;
    showOverlay('VERSUS', html, [
      { label:`🏆 ${pA.name}`, onClick: ()=>{ overlay.style.display='none'; winnerAdvance(pA.id); } },
      { label:`🏆 ${pB.name}`, onClick: ()=>{ overlay.style.display='none'; winnerAdvance(pB.id); } },
    ]);
  } else {
    const names = chosen.map(p=>`<b style="color:${p.color}">${p.name}</b>`).join(' • ');
    const html = `<div style="font-size:22px;margin-bottom:8px">${q.text}</div>
                  <div style="opacity:.95;">Deelnemers: ${names}</div>`;
    showOverlay('Opdracht', html, [{ label:'OK', onClick: ()=> overlay.style.display='none' }]);
  }
}

function winnerAdvance(playerId){
  const idx = three.players.findIndex(p=>p.id===playerId);
  if (idx<0) return;
  const current = three.players[idx].position||0;
  moveAvatarSmooth(idx, current+1, ()=> checkWin(idx));
}

/**********************
 * EXTRA: ga terug knoppen
 **********************/
document.querySelectorAll('[data-nav]').forEach(b=> b.onclick = ()=> go(b.dataset.nav));
