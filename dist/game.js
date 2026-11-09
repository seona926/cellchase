import {joinRoom as joinPeerRoom,selfId} from 'https://esm.run/@trystero-p2p/mqtt';

const COLS=20,ROWS=18,BOMB_FUSE=1500,BOMB_PLACE_DELAY=180,MAX_ACTIVE_BOMBS=3,NEW_SEEKER_GRACE=1500;
const DIFFICULTY={easy:{ratio:.05,vision:Infinity,bot:340},medium:{ratio:.12,vision:5,bot:240},hard:{ratio:.2,vision:3,bot:155}};
const BOT_NAMES=['민지','도윤','서준','하린','유나','지후','수아','현우','지민'];
const $=s=>document.querySelector(s);
const els={grid:$('#sheetGrid'),lobby:$('#lobbyModal'),result:$('#resultModal'),timer:$('#timer'),playerList:$('#playerList'),playerCount:$('#playerCount'),goal:$('#captureGoal'),progress:$('#captureProgress'),mode:$('#modeLabel'),countdown:$('#countdown'),bombStatus:$('#bombStatus'),bombCooldown:$('#bombCooldown'),toast:$('#toast'),chat:$('#chatLog'),nameBox:$('#nameBox'),formula:$('#formulaBox')};
const templates={
 sales:{title:'월간 매출 현황',file:'월간_매출현황_최종_v7.xlsx',heads:['구분','1월','2월','3월','1분기','전년비'],rows:['온라인','강남점','성수점','부산점','법인영업','해외영업','합계'],values:['₩ 24,800','₩ 31,420','₩ 27,950','₩ 84,170','+12.4%']},
 estimate:{title:'거래처 견적서',file:'견적서_야근방지연구소.xlsx',heads:['품목','규격','수량','단가','공급가액','비고'],rows:['클라우드 이용권','협업 도구','보안 점검','유지보수','커피 정기배송','총 견적'],values:['10 EA','₩ 120,000','₩ 1,200,000','별도 협의']},
 inventory:{title:'재고 관리대장',file:'재고관리_11월.xlsx',heads:['상품코드','상품명','입고','출고','현재고','상태'],rows:['A-1024','B-2048','C-4096','D-0815','E-1120','합계'],values:['모니터암','키보드','노트북 거치대','커피 원두','충분']},
 schedule:{title:'직원 근무 일정표',file:'근무일정_공유용.xlsx',heads:['이름','월','화','수','목','금'],rows:['김민지','이도윤','박서준','최하린','정유나','비고'],values:['09:00','재택','휴가','18:00','당직']},
 project:{title:'프로젝트 예산 현황',file:'프로젝트_예산_진행현황.xlsx',heads:['프로젝트','담당','예산','집행액','진행률','상태'],rows:['오로라','셀피하기','제우스','블루문','아틀라스','합계'],values:['₩ 45,000','₩ 28,500','63%','진행 중']}
};

let state={phase:'lobby',players:[],blocked:new Set(),bombs:[],captures:0,target:2,duration:180,endsAt:0,startedAt:0,countdownEndsAt:0,speed:100,difficulty:'easy',template:'sales',keys:[],lastInput:0,roundId:0,winner:null};
let cells=new Map(),raf=0,toastTimer=0,captureTimer=0;
const input={keys:[],lastSent:0,pressed:new Set()};
const touchMove={pointerId:null,startX:0,startY:0,x:0,y:0,direction:null,wanted:0,sent:0,lastStep:0,joystick:null,raf:0};
const network={active:false,isHost:false,room:null,code:'',playerId:'',hostPeer:'',hello:null,welcome:null,snapshot:null,command:null,chat:null,event:null,lastSync:0,connectTimer:0,turnReady:false,snapshotSeq:0,lastSnapshotSeq:0};
const coord=(r,c)=>`${r}:${c}`;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.abs(a.row-b.row)+Math.abs(a.col-b.col);
const local=()=>state.players.find(p=>p.local);
const seekerCount=()=>state.players.filter(p=>p.role==='seeker').length;
const runners=()=>state.players.filter(p=>p.role==='runner');
const urlParams=new URLSearchParams(location.search);
const invitedCode=urlParams.get('room')?.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6)||'';
const forceTurn=urlParams.get('turn')==='relay';
const turnCredentialUrl='https://cellchase.metered.live/api/v1/turn/credentials?apiKey=08ab9e58ddd017f4fc8007d1b027298b8bae';
const publicOrigin=location.hostname==='127.0.0.1'||location.hostname==='localhost'?'https://cellchase.madebyus.kr':location.origin;
let turnServersPromise=null;

function roomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join('')}
function playerRecord(id,name,isLocal=false){return{id,name:name.slice(0,10)||'게스트',row:0,col:0,role:'runner',local:isLocal,score:0,caughtAt:null,seekerActiveAt:0,lastMove:0,bombReady:0,botMove:0,connected:true}}
function snapshotData(){const now=performance.now();return{now,seq:++network.snapshotSeq,state:{...state,blocked:[...state.blocked],keys:[],players:state.players.map(({local,...p})=>p)}}}
function sendSnapshot(target){if(!network.active||!network.isHost||!network.snapshot)return;network.snapshot.send(snapshotData(),target?{target}:undefined)}
function applySnapshot(packet){
  if(network.isHost||!packet?.state||!Number.isFinite(packet.seq)||packet.seq<=network.lastSnapshotSeq)return;network.lastSnapshotSeq=packet.seq;const previous=state.phase,offset=performance.now()-packet.now,s=packet.state;
  state={...s,blocked:new Set(s.blocked),keys:[],startedAt:s.startedAt+offset,endsAt:s.endsAt+offset,countdownEndsAt:s.countdownEndsAt+offset,players:s.players.map(p=>({...p,local:p.id===network.playerId,seekerActiveAt:p.seekerActiveAt+offset,lastMove:p.lastMove+offset,bombReady:p.bombReady+offset})),bombs:s.bombs.map(b=>({...b,explodesAt:b.explodesAt+offset}))};
  if(previous!==state.phase&&state.phase==='countdown'){els.lobby.classList.add('hidden');els.result.classList.add('hidden');els.countdown.classList.add('show')}
  if(state.phase==='playing')els.countdown.classList.remove('show');
  if(state.phase==='finished'&&previous!=='finished')showResult();if(state.phase==='lobby')updateRoomLobby();paintTemplate();render();
}
function updateRoomLobby(message=''){
  const box=$('#roomLobbyStatus');box.classList.remove('hidden');const count=state.players.filter(p=>p.connected!==false).length;
  box.textContent=message||`방 코드 ${network.code} · ${count}/10명 연결${network.isHost?(count<2?' · 친구를 기다리는 중':' · 게임 시작 가능'):' · 방장의 시작을 기다리는 중'}`;
  const list=$('#roomPlayerList');list.classList.remove('hidden');list.textContent='';const hostId=network.isHost?network.playerId:network.hostPeer;
  for(const player of state.players){const row=document.createElement('div');row.className=`room-player${player.connected===false?' disconnected':''}`;const dot=document.createElement('i');dot.className='room-player-dot';const name=document.createElement('span');name.className='room-player-name';name.textContent=player.name;row.append(dot,name);if(player.id===hostId){const badge=document.createElement('span');badge.className='room-player-badge';badge.textContent='👑 방장';row.append(badge)}const status=document.createElement('span');status.className='room-player-state';status.textContent=player.connected===false?'재접속 중':player.id===network.playerId?'나':'접속됨';row.append(status);list.append(row)}
  const copyButton=$('#copyInviteLink');copyButton.classList.toggle('hidden',!network.isHost);copyButton.dataset.invite=`${publicOrigin}/?room=${network.code}`;
  $('#quickStart').textContent=network.isHost?'게임 시작':'방장 시작 대기';$('#quickStart').disabled=!network.isHost||count<2;
  $('#connectionState').textContent=network.active?`WebRTC${network.turnReady?' + TURN':''} · 방 ${network.code}`:'로컬 데모 · 연결됨';
}
async function leaveNetwork(){clearTimeout(network.connectTimer);if(network.room)await network.room.leave();Object.assign(network,{active:false,isHost:false,room:null,code:'',playerId:'',hostPeer:'',hello:null,welcome:null,snapshot:null,command:null,chat:null,event:null,lastSync:0,connectTimer:0,turnReady:false})}
async function loadTurnServers(){
  if(!turnServersPromise)turnServersPromise=fetch(turnCredentialUrl).then(async response=>{if(!response.ok)throw new Error(`TURN ${response.status}`);const servers=await response.json();if(!Array.isArray(servers)||!servers.some(server=>String(server.urls||'').startsWith('turn')))throw new Error('TURN 서버 목록이 올바르지 않습니다.');return servers}).catch(error=>{turnServersPromise=null;throw error});
  return turnServersPromise
}
async function openPeerRoom(code){
  let rtcConfig;
  try{const iceServers=await loadTurnServers();network.turnReady=true;rtcConfig={iceServers,...(forceTurn?{iceTransportPolicy:'relay'}:{})}}
  catch(error){network.turnReady=false;if(forceTurn)throw error;notify('TURN 중계 서버를 불러오지 못해 직접 연결로 시도합니다.')}
  return joinPeerRoom({appId:'kr.madebyus.cellchase.v3',relayConfig:{redundancy:3},...(rtcConfig?{rtcConfig}:{})},code,{onJoinError:()=>{if(!network.isHost&&!network.hostPeer){clearTimeout(network.connectTimer);updateRoomLobby('연결에 실패했습니다. 아래 다시 연결 버튼을 눌러주세요.');$('#joinRoom').disabled=false;$('#joinRoom').textContent='다시 연결'}}})
}
function watchGuestConnection(){
  clearTimeout(network.connectTimer);network.connectTimer=setTimeout(()=>{if(network.active&&!network.isHost&&!network.hostPeer){updateRoomLobby('연결이 지연되고 있습니다. 아래 다시 연결 버튼을 눌러주세요.');$('#joinRoom').disabled=false;$('#joinRoom').textContent='다시 연결'}},12000)
}
function setupActions(){
  network.hello=network.room.makeAction('hello');network.welcome=network.room.makeAction('welcome');network.snapshot=network.room.makeAction('snapshot');network.command=network.room.makeAction('command');network.chat=network.room.makeAction('chat');network.event=network.room.makeAction('event');
  network.hello.onMessage=(data,{peerId})=>{if(!network.isHost||state.players.some(p=>p.id===peerId))return;if(state.players.length>=10){network.welcome.send({error:'방이 가득 찼습니다.'},{target:peerId});return}state.players.push(playerRecord(peerId,String(data.name||'게스트')));network.welcome.send({playerId:peerId,hostPeer:selfId,code:network.code},{target:peerId});sendSnapshot(peerId);updateRoomLobby();render();announce(`${data.name||'친구'}님이 입장했습니다.`)};
  network.welcome.onMessage=(data,{peerId})=>{if(network.isHost)return;if(data.error){updateRoomLobby(data.error);return}clearTimeout(network.connectTimer);network.playerId=data.playerId;network.hostPeer=data.hostPeer||peerId;$('#joinRoom').disabled=true;$('#joinRoom').textContent='코드로 참가';updateRoomLobby('방에 연결되었습니다 · 방장의 시작을 기다리는 중')};
  network.snapshot.onMessage=(data,{peerId})=>{if(!network.hostPeer||peerId===network.hostPeer)applySnapshot(data)};
  network.command.onMessage=(data,{peerId})=>{if(!network.isHost||state.phase!=='playing')return;const p=state.players.find(x=>x.id===peerId);if(!p)return;const now=performance.now(),dirs={up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]};if(data.type==='move'&&dirs[data.direction])tryMove(p,...dirs[data.direction],now);if(data.type==='bomb')placeBomb(p,now);if(data.type==='chat'&&String(data.text||'').trim()){const text=String(data.text).trim().slice(0,80);appendChat(p.name,text);network.chat.send({name:p.name,text})}sendSnapshot()};
  network.chat.onMessage=data=>{if(!network.isHost)appendChat(String(data.name||'친구'),String(data.text||'').slice(0,80))};
  network.event.onMessage=(data,{peerId})=>{if(!network.isHost&&(!network.hostPeer||peerId===network.hostPeer))showCaptureEvent(data)};
  network.room.onPeerJoin=peerId=>{if(!network.isHost)network.hello.send({name:$('#nickname').value.trim().slice(0,10)||'게스트'},{target:peerId})};
  network.room.onPeerLeave=peerId=>{if(network.isHost){const p=state.players.find(x=>x.id===peerId);if(p){p.connected=false;announce(`${p.name}님의 연결이 끊겼습니다.`);setTimeout(()=>{if(!p.connected&&state.phase==='lobby'){state.players=state.players.filter(x=>x!==p);updateRoomLobby();sendSnapshot()}},15000)}}else if(peerId===network.hostPeer){state.phase='lobby';updateRoomLobby('방장과 연결이 끊겼습니다. 새로고침 후 다시 참가해주세요.')}};
}
async function createOnlineRoom(){await leaveNetwork();const nickname=$('#nickname').value.trim()||'방장';localStorage.setItem('cellChaseNickname',nickname);network.active=true;network.isHost=true;network.code=roomCode();network.playerId=selfId;$('#createRoom').disabled=true;$('#joinRoom').disabled=true;updateRoomLobby('TURN 중계 서버를 준비하는 중입니다…');try{network.room=await openPeerRoom(network.code)}catch{network.active=false;updateRoomLobby('TURN 중계 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.');$('#createRoom').disabled=false;$('#joinRoom').disabled=false;return}state.phase='lobby';state.players=[playerRecord(selfId,nickname,true)];setupActions();$('#roomCodeInput').value=network.code;updateRoomLobby();render();notify(`방 코드 ${network.code} · 친구에게 공유하세요`)}
async function joinOnlineRoom(){const code=$('#roomCodeInput').value.trim().toUpperCase().replace(/[^A-Z2-9]/g,'');if(code.length!==6){notify('6자리 방 코드를 입력해주세요.');return}await leaveNetwork();const nickname=$('#nickname').value.trim()||`게스트${Math.floor(100+Math.random()*900)}`;localStorage.setItem('cellChaseNickname',nickname);network.active=true;network.code=code;network.playerId=selfId;$('#createRoom').disabled=true;$('#joinRoom').disabled=true;updateRoomLobby('TURN 중계 서버를 준비하는 중입니다…');try{network.room=await openPeerRoom(code)}catch{network.active=false;updateRoomLobby('TURN 중계 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.');$('#createRoom').disabled=false;$('#joinRoom').disabled=false;return}state.phase='lobby';state.players=[playerRecord(selfId,nickname,true)];setupActions();updateRoomLobby('초대받은 방을 찾는 중입니다…');watchGuestConnection();render()}

function buildGrid(){
  els.grid.textContent='';cells.clear();
  const corner=document.createElement('div');corner.className='cell header-cell corner';els.grid.append(corner);
  for(let c=0;c<COLS;c++){const el=document.createElement('div');el.className='cell header-cell';el.textContent=String.fromCharCode(65+c);els.grid.append(el)}
  for(let r=0;r<ROWS;r++){
    const h=document.createElement('div');h.className='cell header-cell';h.textContent=r+1;els.grid.append(h);
    for(let c=0;c<COLS;c++){const el=document.createElement('div');el.className='cell data-cell';el.dataset.row=r;el.dataset.col=c;els.grid.append(el);cells.set(coord(r,c),el)}
  }
}

function paintTemplate(){
  const t=templates[state.template];document.querySelector('.file-title').textContent=t.file;document.querySelector('.sheet-tab').textContent=t.title;
  for(const [key,el] of cells){const [r,c]=key.split(':').map(Number);el.className='cell data-cell';let text='';
    if(r===1&&c===1){text=t.title;el.classList.add('report-title')}
    else if(r===3&&c>=1&&c<=6){text=t.heads[c-1];el.classList.add('report-head')}
    else if(r>=4&&r<=10&&c>=1&&c<=6){text=c===1?(t.rows[r-4]||''):t.values[(r+c)%t.values.length];if(c>=3)el.classList.add('money');if(r===10)el.classList.add('total')}
    else if((r===13&&c>=2&&c<=8)||(r===14&&c>=2&&c<=5)){text=['담당자','검토 완료','※ 내부 공유용','2026-11-09'][c%4]||''}
    el.textContent=text;if(state.blocked.has(key))el.classList.add('blocked')
  }
}

function isConnected(blocked){
  let start;for(let r=0;r<ROWS&&!start;r++)for(let c=0;c<COLS;c++)if(!blocked.has(coord(r,c))){start=[r,c];break}
  const seen=new Set([coord(...start)]),q=[start];
  while(q.length){const [r,c]=q.shift();for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const nr=r+dr,nc=c+dc,k=coord(nr,nc);if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!blocked.has(k)&&!seen.has(k)){seen.add(k);q.push([nr,nc])}}}
  return seen.size===ROWS*COLS-blocked.size;
}

function generateObstacles(){
  const wanted=Math.floor(ROWS*COLS*DIFFICULTY[state.difficulty].ratio);let best=new Set();
  for(let attempt=0;attempt<25;attempt++){const set=new Set();while(set.size<wanted){const r=Math.floor(Math.random()*ROWS),c=Math.floor(Math.random()*COLS);if((r<2&&c<2)||(r>ROWS-3&&c>COLS-3))continue;set.add(coord(r,c))}if(isConnected(set)){best=set;break}}
  state.blocked=best;
}

function randomFree(used=[],farFrom=null){
  const occupied=new Set(used.map(p=>coord(p.row,p.col)));let options=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(!state.blocked.has(coord(r,c))&&!occupied.has(coord(r,c))&&(!farFrom||Math.abs(r-farFrom.row)+Math.abs(c-farFrom.col)>=8))options.push({row:r,col:c});
  if(!options.length&&farFrom)return randomFree(used);return options[Math.floor(Math.random()*options.length)];
}

function createPlayers(name){
  const names=[name||'나',...BOT_NAMES.slice(0,4)];const players=[];
  names.forEach((n,i)=>{const pos=randomFree(players);players.push({id:`p${i}`,name:n,row:pos.row,col:pos.col,role:'runner',local:i===0,score:0,caughtAt:null,seekerActiveAt:0,lastMove:0,bombReady:0,botMove:0})});
  const chosen=players[Math.floor(Math.random()*players.length)];chosen.role='seeker';chosen.seekerActiveAt=performance.now();
  const seekerPos={row:chosen.row,col:chosen.col};for(const p of players){if(p!==chosen){const pos=randomFree(players.filter(x=>x!==p),seekerPos);p.row=pos.row;p.col=pos.col}}
  return players;
}

function prepareOnlinePlayers(){
  const players=state.players.filter(p=>p.connected!==false).map(p=>playerRecord(p.id,p.name,p.id===network.playerId));
  players.forEach((p,i)=>{const pos=randomFree(players.slice(0,i));p.row=pos.row;p.col=pos.col});
  const chosen=players[Math.floor(Math.random()*players.length)];chosen.role='seeker';chosen.seekerActiveAt=performance.now();
  const seekerPos={row:chosen.row,col:chosen.col};for(const p of players){if(p!==chosen){const pos=randomFree(players.filter(x=>x!==p),seekerPos);p.row=pos.row;p.col=pos.col}}
  return players;
}

function startGame(reuse=false){
  if(network.active&&!network.isHost)return;if(network.active&&state.players.filter(p=>p.connected!==false).length<2){notify('친구가 한 명 이상 입장해야 시작할 수 있습니다.');return}
  const nick=$('#nickname').value.trim().slice(0,10)||'나';state.template=$('#templateSelect').value;state.difficulty=$('#difficultySelect').value;state.duration=Number($('#durationSelect').value);state.speed=Number($('#speedSelect').value);state.roundId++;input.keys=[];input.lastSent=0;input.pressed.clear();network.snapshotSeq=0;network.lastSnapshotSeq=0;
  generateObstacles();state.players=network.active?prepareOnlinePlayers():createPlayers(nick);state.bombs=[];state.captures=0;state.target=Math.ceil((state.players.length-1)/2);state.winner=null;state.phase='countdown';state.countdownEndsAt=performance.now()+2400;paintTemplate();els.lobby.classList.add('hidden');els.result.classList.add('hidden');sendSnapshot();
  let count=3;els.countdown.textContent=count;els.countdown.classList.add('show');render();const round=state.roundId;
  const tick=setInterval(()=>{if(round!==state.roundId){clearInterval(tick);return}count--;if(count>0)els.countdown.textContent=count;else{clearInterval(tick);els.countdown.textContent='GO';setTimeout(()=>{if(round===state.roundId)els.countdown.classList.remove('show')},450);state.phase='playing';state.startedAt=performance.now();state.endsAt=state.startedAt+state.duration*1000;state.players.forEach(p=>{if(p.role==='seeker')p.seekerActiveAt=state.startedAt});announce('게임이 시작되었습니다. 들키지 마세요.');sendSnapshot();render() }},800);
}

function tryMove(player,dr,dc,now){
  if(state.phase!=='playing'||now-player.lastMove<state.speed)return false;if(player.role==='seeker'&&now<player.seekerActiveAt)return false;
  const nr=player.row+dr,nc=player.col+dc,k=coord(nr,nc);if(nr<0||nr>=ROWS||nc<0||nc>=COLS||state.blocked.has(k))return false;
  player.row=nr;player.col=nc;player.lastMove=now;resolveContact(player,now);return true;
}
function dispatchMove(direction,now=performance.now()){
  const map={up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]},delta=map[direction];if(!delta||state.phase!=='playing')return;
  if(network.active&&!network.isHost)network.command?.send({type:'move',direction},{target:network.hostPeer});else tryMove(local(),...delta,now);input.lastSent=now
}

function capture(victims,owner,method,now){
  const fresh=victims.filter(p=>p.role==='runner');if(!fresh.length)return;
  for(const p of fresh){p.role='seeker';p.caughtAt=now;p.seekerActiveAt=now+NEW_SEEKER_GRACE;p.bombReadyAt=now+BOMB_COOLDOWN;p.bombReady=now+BOMB_COOLDOWN;p.score+=Math.floor((now-state.startedAt)/1000);state.captures++;if(owner)owner.score+=method==='bomb'?40:60}
  const event={type:'capture',method,ownerName:owner?.name||'술래',victims:fresh.map(p=>({id:p.id,name:p.name,row:p.row,col:p.col}))};showCaptureEvent(event);if(network.active&&network.isHost)network.event?.send(event);
  if(state.captures>=state.target)finish('seekers','포획 목표 달성');
}

function resolveContact(mover,now){
  // Only a seeker entering a runner's cell can trigger contact capture. This
  // prevents an unrelated runner move from re-resolving a shared cell.
  if(mover.role!=='seeker'||now<mover.seekerActiveAt)return;
  const victims=state.players.filter(p=>p.role==='runner'&&p.row===mover.row&&p.col===mover.col);
  if(victims.length)capture(victims,mover,'contact',now)
}

function placeBomb(player,now){
  const active=state.bombs.filter(b=>b.owner===player.id&&!b.resolved).length;
  if(state.phase!=='playing'||player.role!=='seeker'||now<player.seekerActiveAt||now<player.bombReady||active>=MAX_ACTIVE_BOMBS){if(player.local&&player.role!=='seeker')notify('폭탄은 술래만 사용할 수 있습니다.');else if(player.local&&active>=MAX_ACTIVE_BOMBS)notify('폭탄은 동시에 3개까지 설치할 수 있습니다.');return}
  state.bombs.push({id:crypto.randomUUID(),owner:player.id,row:player.row,col:player.col,explodesAt:now+BOMB_FUSE,resolved:false});player.bombReady=now+BOMB_PLACE_DELAY;notify(`폭탄 설치 · ${active+1}/3`);
}

function explodeBomb(b,now){
  b.resolved=true;const radius={easy:2,medium:3,hard:4}[state.difficulty]||2,ranges=[[b.row,b.col]];
  for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]])for(let step=1;step<=radius;step++){const r=b.row+dr*step,c=b.col+dc*step;if(r<0||r>=ROWS||c<0||c>=COLS)break;if(state.blocked.has(coord(r,c)))break;ranges.push([r,c])}
  const keys=new Set(ranges.map(x=>coord(...x)));for(const k of keys){const el=cells.get(k);if(el){el.classList.add('blast');setTimeout(()=>el.classList.remove('blast'),360)}}const victims=state.players.filter(p=>p.role==='runner'&&keys.has(coord(p.row,p.col)));capture(victims,state.players.find(p=>p.id===b.owner),'bomb',now)
}

function botStep(p,now){
  if(now<p.botMove||state.phase!=='playing')return;p.botMove=now+DIFFICULTY[state.difficulty].bot+Math.random()*80;
  const targets=p.role==='seeker'?runners():state.players.filter(x=>x.role==='seeker');if(!targets.length)return;const near=targets.reduce((a,b)=>distance(p,a)<distance(p,b)?a:b);
  if(p.role==='seeker'&&distance(p,near)<=1&&Math.random()<.18)placeBomb(p,now);
  const choices=[[1,0],[-1,0],[0,1],[0,-1]].map(([dr,dc])=>({dr,dc,row:p.row+dr,col:p.col+dc})).filter(x=>x.row>=0&&x.row<ROWS&&x.col>=0&&x.col<COLS&&!state.blocked.has(coord(x.row,x.col)));
  choices.sort((a,b)=>{const da=Math.abs(a.row-near.row)+Math.abs(a.col-near.col),db=Math.abs(b.row-near.row)+Math.abs(b.col-near.col);return p.role==='seeker'?da-db:db-da});if(choices[0])tryMove(p,choices[0].dr,choices[0].dc,now)
}

function finish(winner,reason){
  if(state.phase==='finished')return;state.phase='finished';state.winner=winner;const now=performance.now();for(const p of state.players){if(p.role==='runner')p.score+=Math.floor((now-state.startedAt)/1000);if((winner==='seekers'&&p.role==='seeker')||(winner==='runners'&&p.role==='runner'))p.score+=100}
  state.bombs=[];showResult(reason);sendSnapshot();render();
}

function showResult(reason){const me=local()||{score:0};const now=performance.now();$('#resultTitle').textContent=state.winner==='seekers'?'술래 팀 승리':'도망자 팀 승리';$('#resultCopy').textContent=`${reason||'게임 종료'} · ${state.captures}명 포획`;$('#scoreGrid').innerHTML=`<div><strong>${me.score}</strong><span>내 점수</span></div><div><strong>${state.captures}</strong><span>총 포획</span></div><div><strong>${formatTime(Math.max(0,(now-state.startedAt)/1000))}</strong><span>플레이 시간</span></div>`;setTimeout(()=>els.result.classList.remove('hidden'),380)}

function visibleToMe(p){const me=local();if(!me||p.local||me.role==='seeker'||p.role==='seeker')return true;return distance(me,p)<=DIFFICULTY[state.difficulty].vision}

function renderGrid(){
  for(const el of cells.values())el.querySelectorAll('.player-stack,.bomb').forEach(x=>x.remove());const groups=new Map();
  for(const p of state.players.filter(visibleToMe)){const k=coord(p.row,p.col);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p)}
  for(const [k,ps] of groups){const el=cells.get(k);if(!el)continue;const main=ps.find(p=>p.local)||ps.find(p=>p.role==='seeker')||ps[0];const chip=document.createElement('div');chip.className=`player-stack ${main.role}${main.local?' self':''}`;chip.textContent=main.name;chip.title=ps.map(p=>`${p.name} (${p.role==='seeker'?'술래':'도망'})`).join(', ');if(ps.length>1){const count=document.createElement('span');count.className='stack-count';count.textContent=`+${ps.length-1}`;chip.append(count)}el.append(chip)}
  for(const b of state.bombs.filter(x=>!x.resolved)){const el=cells.get(coord(b.row,b.col));if(el){const bomb=document.createElement('div');bomb.className='bomb';bomb.title='폭탄';el.append(bomb)}}
  const me=local();if(me){els.nameBox.textContent=`${String.fromCharCode(65+me.col)}${me.row+1}`;els.formula.textContent=me.role==='seeker'?'=CHASE( runners )':`=SURVIVE( ${Math.max(0,Math.ceil((state.endsAt-performance.now())/1000))} )`}
}

function renderPlayers(){
  els.playerList.textContent='';for(const p of [...state.players].sort((a,b)=>a.role.localeCompare(b.role))){const el=document.createElement('div');el.className=`player-item${p.local?' local':''}`;const dot=document.createElement('i');dot.className=`role-dot ${p.role}`;const name=document.createElement('span');name.className='name';name.textContent=p.name;const status=document.createElement('span');status.className='state';status.textContent=p.connected===false?'재접속 중':p.role==='seeker'?'술래':'도망';el.append(dot,name,status);els.playerList.append(el)}els.playerCount.textContent=`${state.players.length} / 10`;
}

function render(){
  renderGrid();renderPlayers();keepLocalVisible();els.goal.textContent=`${state.captures} / ${state.target}`;els.progress.style.width=`${state.target?state.captures/state.target*100:0}%`;els.mode.textContent=state.phase==='playing'?`${state.difficulty.toUpperCase()} · ${seekerCount()} 술래`:state.phase==='finished'?'게임 종료':'시작 준비';
  const me=local(),now=performance.now();if(me){const active=state.bombs.filter(b=>b.owner===me.id&&!b.resolved).length,ready=Math.max(0,me.bombReady-now);els.bombStatus.textContent=me.role!=='seeker'?'술래 전용':active>=MAX_ACTIVE_BOMBS?'3/3 설치됨':ready>0?'설치 준비 중':`${MAX_ACTIVE_BOMBS-active}/3 설치 가능`;els.bombCooldown.style.width=`${active/MAX_ACTIVE_BOMBS*100}%`}
}

function formatTime(seconds){const s=Math.max(0,Math.ceil(seconds));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function announce(text){const p=document.createElement('p');p.className='system';p.textContent=text;els.chat.append(p);els.chat.scrollTop=els.chat.scrollHeight}
function appendChat(name,text){const p=document.createElement('p'),b=document.createElement('b');b.textContent=`${name} `;p.append(b,document.createTextNode(text));els.chat.append(p);els.chat.scrollTop=els.chat.scrollHeight}
function notify(text){clearTimeout(toastTimer);els.toast.textContent=text;els.toast.classList.add('show');toastTimer=setTimeout(()=>els.toast.classList.remove('show'),1500)}
function showCaptureEvent(event){
  if(!event?.victims?.length)return;const me=local(),caughtMe=event.victims.some(v=>v.id===me?.id),count=event.victims.length,first=event.victims[0].name;const label=count>1?`${first} 외 ${count-1}명`:`${first}님`;const chatSubject=count>1?`${label}이`:`${first}님이`;const bomb=event.method==='bomb';
  const title=caughtMe?(bomb?'폭탄에 잡혔습니다!':'술래에게 잡혔습니다!'):`${label} 술래!`;const subtitle=bomb?`${event.ownerName}님의 폭탄 · ${count>1?`${count}명 동시 포획`:'이제 술래입니다'}`:`${event.ownerName}님이 직접 잡았습니다`;
  $('#captureIcon').textContent=bomb?'💥':'!';$('#captureTitle').textContent=title;$('#captureSubtitle').textContent=subtitle;const banner=$('#captureBanner');banner.classList.toggle('bomb',bomb);banner.classList.remove('hidden');banner.style.animation='none';void banner.offsetWidth;banner.style.animation='';clearTimeout(captureTimer);captureTimer=setTimeout(()=>banner.classList.add('hidden'),1150);
  for(const victim of event.victims){const cell=cells.get(coord(victim.row,victim.col));if(cell){cell.classList.remove('captured-flash');void cell.offsetWidth;cell.classList.add('captured-flash');setTimeout(()=>cell.classList.remove('captured-flash'),1000)}}
  announce(bomb?`💥 ${chatSubject} ${event.ownerName}님의 폭탄에 잡혀 술래가 되었습니다!`:`${chatSubject} ${event.ownerName}님에게 잡혀 술래가 되었습니다!`);
}

function loop(now){
  if(state.phase==='countdown'&&!network.isHost&&network.active){const left=Math.max(0,state.countdownEndsAt-now);els.countdown.textContent=left>0?Math.max(1,Math.ceil(left/800)):'GO';els.countdown.classList.add('show');render()}
  if(state.phase==='playing'){
    // Movement is discrete: a key press moves once. Holding a key must not
    // generate repeat steps, which also made network snapshots appear to jump.
    if(!network.active||network.isHost){if(!network.active)state.players.filter(p=>!p.local).forEach(p=>botStep(p,now));state.bombs.filter(b=>!b.resolved&&now>=b.explodesAt).forEach(b=>explodeBomb(b,now));state.bombs=state.bombs.filter(b=>!b.resolved||now-b.explodesAt<500);if(now>=state.endsAt)finish('runners','제한 시간 생존')}
    els.timer.textContent=formatTime((state.endsAt-now)/1000);render();
  }
  if(network.active&&network.isHost&&now-network.lastSync>=50){sendSnapshot();network.lastSync=now;updateRoomLobby()}
  raf=requestAnimationFrame(loop);
}

const keyDirection=e=>({ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'})[e.code]||({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'})[e.key];
document.addEventListener('keydown',e=>{const form=e.target.matches('input,select,textarea,[contenteditable]');if(form)return;const d=keyDirection(e);if(d&&state.phase==='playing'){e.preventDefault();if(!e.repeat&&!input.pressed.has(e.code||d)){input.pressed.add(e.code||d);dispatchMove(d)}}if(e.code==='Space'&&state.phase==='playing'){e.preventDefault();if(!e.repeat){if(network.active&&!network.isHost)network.command?.send({type:'bomb'},{target:network.hostPeer});else placeBomb(local(),performance.now())}}if(e.key==='Enter'&&state.phase==='playing'){e.preventDefault();$('#chatInput').focus()}});
document.addEventListener('keyup',e=>{if(e.code)input.pressed.delete(e.code)});window.addEventListener('blur',()=>input.pressed.clear());
const gridWrap=$('#gridWrap');
function keepLocalVisible(){if(!matchMedia('(max-width: 700px)').matches||state.phase==='lobby'||state.phase==='finished')return;const me=local(),cell=me&&cells.get(coord(me.row,me.col));if(!cell)return;const a=cell.getBoundingClientRect(),b=gridWrap.getBoundingClientRect(),pad=48;if(a.right<b.left||a.left>b.right||a.bottom<b.top||a.top>b.bottom){gridWrap.scrollLeft+=a.left-b.left-(b.width-a.width)/2;gridWrap.scrollTop+=a.top-b.top-(b.height-a.height)/2;return}if(a.left<b.left+pad)gridWrap.scrollLeft-=b.left+pad-a.left;else if(a.right>b.right-pad)gridWrap.scrollLeft+=a.right-(b.right-pad);if(a.top<b.top+pad)gridWrap.scrollTop-=b.top+pad-a.top;else if(a.bottom>b.bottom-pad)gridWrap.scrollTop+=a.bottom-(b.bottom-pad)}
function clearTouchMove(){touchMove.pointerId=null;touchMove.direction=null;touchMove.wanted=0;touchMove.sent=0;if(touchMove.raf)cancelAnimationFrame(touchMove.raf);touchMove.raf=0;touchMove.joystick?.remove();touchMove.joystick=null}
function updateJoystick(){if(touchMove.pointerId===null)return;const dx=touchMove.x-touchMove.startX,dy=touchMove.y-touchMove.startY,dist=Math.hypot(dx,dy);touchMove.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');touchMove.wanted=dist<8?0:Math.min(12,Math.max(1,Math.floor(dist/30)));const knob=touchMove.joystick?.querySelector('.mobile-stick-knob');if(knob){const length=Math.min(34,dist);knob.style.transform=`translate(${dist?dx/dist*length:0}px,${dist?dy/dist*length:0}px)`}if(!touchMove.raf)touchMove.raf=requestAnimationFrame(stepTouchMove)}
function stepTouchMove(now){touchMove.raf=0;if(touchMove.pointerId===null||state.phase!=='playing')return;if(touchMove.sent<touchMove.wanted&&now-touchMove.lastStep>=Math.max(60,state.speed)){dispatchMove(touchMove.direction,now);touchMove.sent++;touchMove.lastStep=now;keepLocalVisible()}if(touchMove.sent<touchMove.wanted)touchMove.raf=requestAnimationFrame(stepTouchMove)}
gridWrap.addEventListener('pointerdown',e=>{if(!matchMedia('(max-width: 700px)').matches||state.phase!=='playing'||e.button!==0)return;e.preventDefault();clearTouchMove();touchMove.pointerId=e.pointerId;touchMove.startX=touchMove.x=e.clientX;touchMove.startY=touchMove.y=e.clientY;touchMove.lastStep=performance.now()-Math.max(60,state.speed);const stick=document.createElement('div');stick.className='mobile-stick';stick.style.left=`${e.clientX}px`;stick.style.top=`${e.clientY}px`;stick.innerHTML='<i class="mobile-stick-knob"></i>';document.body.append(stick);touchMove.joystick=stick;gridWrap.setPointerCapture(e.pointerId);updateJoystick()});
gridWrap.addEventListener('pointermove',e=>{if(e.pointerId!==touchMove.pointerId)return;touchMove.x=e.clientX;touchMove.y=e.clientY;updateJoystick()});
gridWrap.addEventListener('pointerup',e=>{if(e.pointerId===touchMove.pointerId)clearTouchMove()});gridWrap.addEventListener('pointercancel',clearTouchMove);
$('#abilityCard').addEventListener('click',()=>{if(state.phase!=='playing')return;if(network.active&&!network.isHost)network.command?.send({type:'bomb'},{target:network.hostPeer});else placeBomb(local(),performance.now())});
$('#chatInput').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.target.blur()} });
$('#chatForm').addEventListener('submit',e=>{e.preventDefault();const input=$('#chatInput'),text=input.value.trim();if(!text)return;if(network.active&&!network.isHost)network.command?.send({type:'chat',text},{target:network.hostPeer});else{appendChat(local()?.name||'나',text);if(network.active)network.chat?.send({name:local()?.name||'방장',text})}input.value='';input.blur()});
$('#roomCodeInput').addEventListener('input',e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6));
$('#copyInviteLink').addEventListener('click',async e=>{const url=e.currentTarget.dataset.invite||`${publicOrigin}/?room=${network.code}`;try{await navigator.clipboard.writeText(url)}catch{const area=document.createElement('textarea');area.value=url;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();document.execCommand('copy');area.remove()}e.currentTarget.textContent='복사됨 ✓';notify('초대 링크를 복사했습니다.');setTimeout(()=>{e.currentTarget.textContent='초대 링크 복사'},1600)});
$('#quickStart').addEventListener('click',async()=>{if(!network.active)await leaveNetwork();startGame()});$('#createRoom').addEventListener('click',createOnlineRoom);$('#joinRoom').addEventListener('click',joinOnlineRoom);
$('#playAgain').addEventListener('click',()=>{if(!network.active||network.isHost)startGame(true)});$('#backToLobby').addEventListener('click',()=>{state.phase='lobby';state.roundId++;els.result.classList.add('hidden');els.lobby.classList.remove('hidden');if(network.active){updateRoomLobby();sendSnapshot()}});
$('#collapsePanel').addEventListener('click',()=>notify('게임 정보 패널은 모든 참가자에게 동일하게 표시됩니다.'));

buildGrid();generateObstacles();paintTemplate();state.players=[{id:'preview-self',name:'나',row:8,col:7,role:'runner',local:true,score:0,bombReady:0},{id:'preview-seeker',name:'민지',row:12,col:13,role:'seeker',score:0,bombReady:0},{id:'preview-2',name:'도윤',row:5,col:15,role:'runner',score:0,bombReady:0},{id:'preview-3',name:'서준',row:14,col:4,role:'runner',score:0,bombReady:0},{id:'preview-4',name:'하린',row:3,col:10,role:'runner',score:0,bombReady:0}];const savedNickname=localStorage.getItem('cellChaseNickname');if(savedNickname)$('#nickname').value=savedNickname.slice(0,10);render();raf=requestAnimationFrame(loop);if(invitedCode.length===6){$('#roomCodeInput').value=invitedCode;if(!savedNickname)$('#nickname').value=`게스트${Math.floor(100+Math.random()*900)}`;const box=$('#roomLobbyStatus');box.classList.remove('hidden');box.textContent=`초대받은 방 ${invitedCode}에 자동으로 참여합니다…`;setTimeout(joinOnlineRoom,350)}
