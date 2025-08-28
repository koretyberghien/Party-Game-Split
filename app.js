/*************************
 *   STORAGE HELPERS
 *************************/
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
};

// init defaults
if (!store.get('players', null)) store.set('players', []);
if (!store.get('activeMap', null)) store.set('activeMap', 'jungle');
if (!store.get('maps', null)) store.set('maps', [
  { id:'jungle', name:'Jungle Run', steps: 24, tint:'#6bbf59' },
  { id:'desert', name:'Desert Dash', steps: 20, tint:'#e0b27a' },
]);
if (!store.get('questions', null)) store.set('questions', { jungle:[], desert:[] });

/*************************
 *   NAV / SECTIONS
 *************************/
const $ = (q, d=document)=> d.querySelector(q);
const sections = {
  home: $('#home'),
  players: $('#players'),
  maps: $('#maps'),
  questions: $('#questions'),
  game: $('#game')
};
function go(name) {
  Object.values(sections).forEach(s=>s.classList.add('hidden'));
  sections[name].classList.remove('hidden');
  if (name==='home') renderMini();
  if (name==='maps') renderMaps();
  if (name==='questions') { renderQMapName(); renderQuestions(); }
}

/*************************
 *   HOME (mini players)
 *************************/
const mini = $('#miniPlayerList');
function renderMini() {
  const players = store.get('players', []);
  mini.innerHTML = '';
  players.forEach(p=>{
    const wrap = document.createElement('div'); wrap.className='mini-player';
    const head = document.createElement('div'); head.className='mini-head'; head.style.background = p.skin||'#ffd6b0';
    head.style.borderColor = '#2d1a1a';
    const name = document.createElement('div'); name.className='mini-name'; name.textContent = p.name||'Player';
    name.style.color = p.color || '#5a1a1a';
    wrap.append(head,name); mini.appendChild(wrap);
  });
}
renderMini();

// home nav buttons
$('#btnPlayers').onclick = ()=> go('players');
$('#btnMaps').onclick = ()=> go('maps');
$('#btnQuestions').onclick = ()=> go('questions');
$('#btnPlay').onclick = ()=> startGame();

/*************************
 *   PLAYERS
 *************************/
const pList = $('#playerList');
function renderPlayers() {
  const players = store.get('players', []);
  pList.innerHTML = '';
  players.forEach((p, i)=>{
    const row = document.createElement('div'); row.className='item';
    const avatar = document.createElement('div'); avatar.className='item-avatar'; avatar.style.background = p.skin||'#ffd6b0';
    const info = document.createElement('div');
    info.innerHTML = `<div style="font-weight:900;color:${p.color||'#5a1a1a'}">${p.name}</div>
      <div style="opacity:.8;font-size:13px">${p.gender} • ${p.face}</div>`;
    const rm = document.createElement('button'); rm.className='btn btn-dark'; rm.textContent='❌';
    rm.onclick = ()=> { const arr=store.get('players',[]); arr.splice(i,1); store.set('players',arr); renderPlayers(); };
    row.append(avatar, info, rm); pList.appendChild(row);
  });
}
renderPlayers();

$('#pSave').onclick = ()=>{
  const name = $('#pName').value.trim();
  if (!name) return alert('Naam invullen!');
  const player = {
    id: crypto.randomUUID(),
    name,
    gender: $('#pGender').value,
    face: $('#pFace').value,
    skin: $('#pSkin').value,
    color: $('#pColor').value,
    position: 0,
    score: 0,
    chosenCount: 0
  };
  const arr = store.get('players', []);
  arr.push(player); store.set('players', arr);
  $('#pName').value = ''; renderPlayers(); renderMini();
};
$('#pClear').onclick = ()=> { if (confirm('Alle spelers wissen?')) { store.set('players',[]); renderPlayers(); renderMini(); } };
document.querySelectorAll('[data-nav]').forEach(b=> b.onclick = ()=> go(b.dataset.nav));

/*************************
 *   MAPS
 *************************/
const mapList = $('#mapList');
function renderMaps() {
  const maps = store.get('maps', []);
  const active = store.get('activeMap', 'jungle');
  mapList.innerHTML = '';
  maps.forEach(m=>{
    const row = document.createElement('div'); row.className='item';
    const box = document.createElement('div'); box.className='item-avatar';
    box.style.borderRadius='10px'; box.style.background = m.tint || '#ccc';
    const info = document.createElement('div');
    info.innerHTML = `<div style="font-weight:900">${m.name}</div><div style="opacity:.8">Steps: ${m.steps}</div>`;
    const btn = document.createElement('button'); btn.className='btn';
    btn.textContent = (active===m.id) ? 'Geselecteerd' : 'Selecteer';
    if (active===m.id) btn.disabled = true;
    btn.onclick = ()=> { store.set('activeMap', m.id); renderMaps(); };
    row.append(box, info, btn); mapList.appendChild(row);
  });
}

/*************************
 *   QUESTIONS
 *************************/
const qMapName = $('#qMapName');
function renderQMapName(){
  const maps = store.get('maps', []), id = store.get('activeMap','jungle');
  qMapName.textContent = maps.find(m=>m.id===id)?.name || id;
}
const qList = $('#qList');
function getQs() { const all = store.get('questions',{}); return all[store.get('activeMap','jungle')] || []; }
function setQs(list){ const all = store.get('questions',{}); all[store.get('activeMap','jungle')] = list; store.set('questions', all); }
function renderQuestions(){
  const qs = getQs(); qList.innerHTML = '';
  qs.forEach((q,i)=>{
    const row = document.createElement('div'); row.className='item';
    const dot = document.createElement('div'); dot.className='item-avatar'; dot.style.background = '#ffe7b6';
    const info = document.createElement('div');
    info.innerHTML = `<div style="font-weight:900">${q.text}</div><div style="opacity:.8">Deelnemers: ${q.count}${q.speak?` • Presentator: “${q.speak}”`:''}</div>`;
    const rm = document.createElement('button'); rm.className='btn btn-dark'; rm.textContent='❌';
    rm.onclick = ()=> { const arr=getQs(); arr.splice(i,1); setQs(arr); renderQuestions(); };
    row.append(dot, info, rm); qList.appendChild(row);
  });
}
$('#qAdd').onclick = ()=>{
  const text = $('#qText').value.trim();
  const speak = $('#qSpeak').value.trim();
  const count = Math.max(1, +$('#qCount').value || 1);
  if (!text) return alert('Vul een vraag/opdracht in');
  const arr = getQs();
  arr.push({ id: crypto.randomUUID(), text, speak, count });
  setQs(arr);
  $('#qText').value=''; $('#qSpeak').value=''; renderQuestions();
};

/*************************
 *   GAME (Three.js)
 *************************/
let three = null; // houd referenties bij voor cleanup

function startGame() {
  const players = store.get('players', []);
  if (players.length===0) { alert('Voeg eerst spelers toe.'); return; }
  // reset posities bij start
  players.forEach(p=>{ p.position=0; });
  store.set('players', players);

  // UI
  go('game');
  // HUD chips
  renderHUD(players);

  // THREE setup
  setupThree(players);
}

function renderHUD(players){
  const hud = $('#hud'); hud.innerHTML='';
  players.forEach(p=>{
    const chip = document.createElement('div'); chip.className='hud-chip';
    const dot = document.createElement('div'); dot.className='hud-dot'; dot.style.background = p.color||'#ff6b6b';
    const name = document.createElement('div'); name.textContent = p.name; name.style.fontWeight='900';
    name.style.color = '#1b1515';
    chip.append(dot,name); hud.appendChild(chip);
  });
}

function setupThree(players){
  // clear oude scene als nodig
  if (three?.renderer) {
    cancelAnimationFrame(three.raf);
    three.renderer.dispose();
    three = null;
  }

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
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(10,20,10); dir.castShadow = true; scene.add(dir);

  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300,300), new THREE.MeshLambertMaterial({color:0x6bbf59}));
  ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);

  // trees
  function addTree(x,z,s=1){
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18*s,0.22*s,2*s,8), new THREE.MeshLambertMaterial({color:0x7a4b2a}));
    trunk.position.set(x,1*s,z); trunk.castShadow = true; scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.0*s,16,16), new THREE.MeshLambertMaterial({color:0x2f7d32}));
    crown.position.set(x,2.6*s,z); crown.castShadow = true; scene.add(crown);
  }
  for(let i=0;i<24;i++) addTree((Math.random()-0.5)*90,(Math.random()-0.5)*90,0.7+Math.random()*1.2);

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
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,0.12,12), new THREE.MeshStandardMaterial({color:0x333}));
    base.position.y=-0.55; base.receiveShadow=true; g.add(base);
    return g;
  }
  const avatars = players.map((p,idx)=>{
    const av = makeAvatar(p);
    const off = (idx-(players.length-1)/2)*0.6;
    av.position.copy(pathPoints[0]); av.position.y=0.3; av.position.x += off;
    scene.add(av);
    return av;
  });

  // animate
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

  // helpers on object
  three = { renderer, scene, camera, pathPoints, avatars, players, raf };

  // buttons
  $('#btnNextQuestion').onclick = nextQuestionFlow;
  $('#ovClose').onclick = ()=> $('#overlay').style.display='none';
}
