import {joinRoom as joinPeerRoom,selfId} from 'https://esm.run/@trystero-p2p/mqtt';

const COLS=20,ROWS=18,BOMB_FUSE=1500,BOMB_PLACE_DELAY=180,BOMB_COOLDOWN=3000,MAX_ACTIVE_BOMBS=3,NEW_SEEKER_GRACE=1500,INITIAL_HEAD_START=3000;
const DIFFICULTY={easy:{ratio:.05,vision:Infinity,bot:340},medium:{ratio:.12,vision:5,bot:240},hard:{ratio:.2,vision:3,bot:155}};
const BOT_NAMES=['민지','도윤','서준','하린','유나','지후','수아','현우','지민'];
const $=s=>document.querySelector(s);
const els={grid:$('#sheetGrid'),lobby:$('#lobbyModal'),result:$('#resultModal'),timer:$('#timer'),playerList:$('#playerList'),playerCount:$('#playerCount'),goal:$('#captureGoal'),progress:$('#captureProgress'),mode:$('#modeLabel'),countdown:$('#countdown'),bombStatus:$('#bombStatus'),bombCooldown:$('#bombCooldown'),toast:$('#toast'),chat:$('#chatLog'),nameBox:$('#nameBox'),formula:$('#formulaBox')};
const templates={
 sales:{title:'월간 매출 현황',subtitle:'2026년 상반기 채널별 매출 실적 및 목표 달성 현황 · 경영기획팀 내부 공유용',file:'월간_매출현황_최종_v7.xlsx',heads:['구분','1월','2월','3월','4월','5월','6월','상반기 누계','목표 달성률','전년 대비','담당 메모'],rows:['온라인','강남점','성수점','부산점','법인영업','해외영업','파트너 채널','합계'],values:['₩ 24,800','₩ 31,420','₩ 27,950','₩ 84,170','₩ 36,500','₩ 42,700','92.6%','+12.4%'],notes:['프로모션 유입 증가로 전월 대비 주문량 상승','리뉴얼 공사 이후 주말 매출 회복세','신규 고객 비중 증가 · 객단가 유지','지역 제휴 캠페인 효과 반영 예정','대형 계약 검토 중 · 확정 금액은 다음 달 반영','환율 변동분을 포함한 잠정 집계','신규 파트너 온보딩 비용 포함','마감 전 회계 검증이 필요한 잠정 합계']},
 estimate:{title:'거래처 견적서',subtitle:'야근방지연구소 업무환경 개선 프로젝트 · 공급가액 및 납품 조건 상세 견적',file:'견적서_야근방지연구소.xlsx',heads:['품목','상세 규격','수량','단위','단가','공급가액','세액','납기','담당 부서','진행 상태','비고'],rows:['클라우드 이용권','협업 도구','보안 점검','유지보수','노트북 거치대','커피 정기배송','교육 세션','총 견적'],values:['10 EA','12개월','₩ 120,000','₩ 1,200,000','₩ 120,000','영업일 7일','협의 중','발주 대기'],notes:['계정 추가 시 동일 단가 적용 · 월별 정산 가능','관리자 교육 1회와 초기 설정 지원 포함','취약점 진단 보고서 및 개선 권고안 제공','장애 대응 SLA와 분기별 점검 비용 포함','색상과 수량은 발주 확정 전 변경 가능','회의가 길어질 경우 추가 원두는 별도 협의','온라인 교육 녹화본과 실습 자료 제공','유효기간 30일 · 부가세와 배송비 포함 최종 금액']},
 inventory:{title:'재고 관리대장',subtitle:'본사 공용 비품 및 IT 장비 입출고 현황 · 실사 기준일 2026-11-10',file:'재고관리_11월.xlsx',heads:['상품코드','상품명','분류','입고','출고','현재고','안전재고','보관 위치','최근 입고일','상태','관리 메모'],rows:['A-1024','B-2048','C-4096','D-0815','E-1120','F-3310','G-7721','합계'],values:['모니터암','기계식 키보드','노트북 거치대','커피 원두','42 EA','18 EA','충분','재주문'],notes:['3층 창고 A열 · 신규 입사자 지급분 확보','테스트용 4개 제외 후 사용 가능 수량','회의실 교체분 예약 · 반출 전 확인 필요','다음 정기 배송은 금요일 오전 도착 예정','안전재고 미만으로 구매 요청 승인 대기','검수 완료 제품만 출고 가능','장기 미사용 재고는 다음 달 자산 정리 예정','실사 차이 2건은 자산 담당자가 확인 중']},
 schedule:{title:'직원 근무 일정표',subtitle:'제품개발팀 주간 근무 및 당직 일정 · 변경 사항은 매일 오전 10시까지 반영',file:'근무일정_공유용.xlsx',heads:['이름','월요일','화요일','수요일','목요일','금요일','근무 형태','당직','휴가 잔여','담당 업무','공유 사항'],rows:['김민지','이도윤','박서준','최하린','정유나','한지후','윤수아','팀 공지'],values:['09:00~18:00','재택','오피스','반차','당직','외근','12일','백엔드'],notes:['오후 고객 인터뷰 참석 · 회의실 B 예약','배포 점검 후 재택 전환 예정','신규 기능 QA 지원과 운영 이슈 대응','금요일 오전 반차 · 인수인계 문서 업데이트','디자인 리뷰 일정에 따라 출근 시간 조정','야간 당직 후 다음 날 오전 재택','채용 인터뷰 패널 참석으로 오후 일정 비움','긴급 변경은 팀 채널에 먼저 공유해주세요']},
 project:{title:'프로젝트 예산 현황',subtitle:'2026년 주요 프로젝트 예산 집행 및 리스크 검토 현황 · PMO 주간 보고',file:'프로젝트_예산_진행현황.xlsx',heads:['프로젝트','담당','승인 예산','집행액','잔여 예산','집행률','진행률','예상 완료일','리스크','상태','PM 메모'],rows:['오로라','셀피하기','제우스','블루문','아틀라스','그린라이트','노바','합계'],values:['₩ 45,000','₩ 28,500','₩ 16,500','63%','72%','2026-12-18','주의','진행 중'],notes:['외부 API 비용 증가 가능성 · 다음 주 재산정','실시간 네트워크 안정화 테스트 진행 중','고객 검수 일정이 확정되면 잔금 집행 예정','디자인 범위 변경 요청에 대한 영향도 분석 중','데이터 이전 리허설 완료 · 본 작업 승인 대기','계약서 법무 검토로 착수 일정 조정','베타 피드백 반영 후 운영 이관 예정','예비비를 포함한 전체 포트폴리오 잠정 합계']}
};

let state={phase:'lobby',players:[],blocked:new Set(),bombs:[],captures:0,duration:240,endsAt:0,startedAt:0,countdownEndsAt:0,headStartEndsAt:0,speed:100,difficulty:'easy',template:'sales',keys:[],lastInput:0,roundId:0,winner:null,finishReason:''};
let cells=new Map(),raf=0,toastTimer=0,captureTimer=0,copyTooltipTimer=0,nicknameTimer=0;
const input={keys:[],lastSent:0,pressed:new Set()};
const touchMove={pointerId:null,startX:0,startY:0,x:0,y:0,direction:null,wanted:0,sent:0,lastStep:0,joystick:null,raf:0};
const network={active:false,isHost:false,room:null,code:'',playerId:'',hostPeer:'',hello:null,welcome:null,snapshot:null,command:null,chat:null,event:null,profile:null,hostClaim:null,peers:new Set(),lastSync:0,connectTimer:0,recoveryTimer:0,turnReady:false,snapshotSeq:0,lastSnapshotSeq:0};
const directory={room:null,announce:null,rooms:new Map(),timer:0,ready:false};
const coord=(r,c)=>`${r}:${c}`;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.abs(a.row-b.row)+Math.abs(a.col-b.col);
const local=()=>state.players.find(p=>p.local);
const activePlayers=()=>state.players.filter(p=>p.connected!==false);
const currentSeeker=()=>activePlayers().find(p=>p.role==='seeker');
const seekerCount=()=>activePlayers().filter(p=>p.role==='seeker').length;
const runners=()=>activePlayers().filter(p=>p.role==='runner');
const urlParams=new URLSearchParams(location.search);
const invitedCode=urlParams.get('room')?.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6)||'';
const forceTurn=urlParams.get('turn')==='relay';
const turnCredentialUrl='https://cellchase.metered.live/api/v1/turn/credentials?apiKey=08ab9e58ddd017f4fc8007d1b027298b8bae';
const publicOrigin=location.hostname==='127.0.0.1'||location.hostname==='localhost'?'https://cellchase.madebyus.kr':location.origin;
let turnServersPromise=null;

function roomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join('')}
function playerRecord(id,name,isLocal=false){return{id,name:name.slice(0,10)||'게스트',row:0,col:0,role:'runner',local:isLocal,score:0,seekerTime:0,seekerSince:0,timesCaught:0,caughtAt:null,seekerActiveAt:0,lastMove:0,bombReadyAt:0,bombReady:0,botMove:0,connected:true}}
function defaultDurationForPlayers(count){if(count<=2)return 120;if(count<=4)return 180;if(count<=6)return 240;return 300}
function updateAutoDurationOption(count=network.active?activePlayers().length:5){const seconds=defaultDurationForPlayers(Math.max(2,count)),option=$('#durationSelect option[value="auto"]');if(option)option.textContent=`자동 · ${seconds/60}분 (${Math.max(2,count)}명)`}
function seekerTimeAt(player,now=performance.now()){return Math.max(0,player.seekerTime||0)+(player.role==='seeker'&&player.seekerSince?Math.max(0,now-player.seekerSince):0)}
function stopSeekerClock(player,now){if(player?.role==='seeker'&&player.seekerSince){player.seekerTime=Math.max(0,player.seekerTime||0)+Math.max(0,now-player.seekerSince);player.seekerSince=0}}
function snapshotData(){const now=performance.now();return{now,seq:++network.snapshotSeq,state:{...state,blocked:[...state.blocked],keys:[],players:state.players.map(({local,...p})=>p)}}}
function sendSnapshot(target){if(!network.active||!network.isHost||!network.snapshot)return;network.snapshot.send(snapshotData(),target?{target}:undefined)}
function applySnapshot(packet){
  if(network.isHost||!packet?.state||!Number.isFinite(packet.seq)||packet.seq<=network.lastSnapshotSeq)return;network.lastSnapshotSeq=packet.seq;const previous=state.phase,offset=performance.now()-packet.now,s=packet.state;
  state={...s,blocked:new Set(s.blocked),keys:[],startedAt:s.startedAt? s.startedAt+offset:0,endsAt:s.endsAt? s.endsAt+offset:0,countdownEndsAt:s.countdownEndsAt? s.countdownEndsAt+offset:0,headStartEndsAt:s.headStartEndsAt? s.headStartEndsAt+offset:0,players:s.players.map(p=>({...p,local:p.id===network.playerId,seekerSince:p.seekerSince? p.seekerSince+offset:0,seekerActiveAt:p.seekerActiveAt? p.seekerActiveAt+offset:0,lastMove:p.lastMove? p.lastMove+offset:0,bombReady:p.bombReady? p.bombReady+offset:0})),bombs:s.bombs.map(b=>({...b,explodesAt:b.explodesAt+offset}))};
  if(previous!==state.phase&&state.phase==='countdown'){els.lobby.classList.add('hidden');els.result.classList.add('hidden');els.countdown.classList.add('show')}
  if(state.phase==='playing'&&performance.now()>=state.headStartEndsAt)els.countdown.classList.remove('show');
  if(state.phase==='finished'&&previous!=='finished')showResult();if(state.phase==='lobby')updateRoomLobby();paintTemplate();render();
}
function updateRoomLobby(message=''){
  const box=$('#roomLobbyStatus');box.classList.remove('hidden');const count=state.players.filter(p=>p.connected!==false).length;
  updateAutoDurationOption(count);
  const guestLocked=network.active&&!network.isHost;for(const id of ['difficultySelect','durationSelect','speedSelect']){const control=$(`#${id}`);control.disabled=guestLocked;control.title=guestLocked?'방장만 변경할 수 있습니다.':''}
  box.textContent=message||`방 코드 ${network.code} · ${count}/10명 연결${network.isHost?(count<2?' · 친구를 기다리는 중':' · 게임 시작 가능'):' · 방장의 시작을 기다리는 중'}`;
  const list=$('#roomPlayerList');list.classList.remove('hidden');list.textContent='';const hostId=network.isHost?network.playerId:network.hostPeer;
  for(const player of state.players){const row=document.createElement('div');row.className=`room-player${player.connected===false?' disconnected':''}`;const dot=document.createElement('i');dot.className='room-player-dot';const name=document.createElement('span');name.className='room-player-name';name.textContent=player.name;row.append(dot,name);if(player.id===hostId){const badge=document.createElement('span');badge.className='room-player-badge';badge.textContent='👑 방장';row.append(badge)}const status=document.createElement('span');status.className='room-player-state';status.textContent=player.connected===false?'재접속 중':player.id===network.playerId?'나':'접속됨';row.append(status);list.append(row)}
  const copyWrap=$('#inviteCopyWrap'),copyButton=$('#copyInviteLink');copyWrap.classList.toggle('hidden',!network.isHost);copyButton.dataset.invite=`${publicOrigin}/?room=${network.code}`;
  $('#quickStart').textContent=network.isHost?'게임 시작':'방장 시작 대기';$('#quickStart').disabled=!network.isHost||count<2;
  $('#leaveAndBot').classList.toggle('hidden',!network.active);
  $('#connectionState').textContent=network.active?`WebRTC${network.turnReady?' + TURN':''} · 방 ${network.code}`:'로컬 데모 · 연결됨';
}
function renderOpenRooms(){
  const now=Date.now();for(const [code,room] of directory.rooms){if(now-room.updatedAt>10000)directory.rooms.delete(code)}
  const rooms=[...directory.rooms.values()].filter(room=>!room.closed&&room.count<10).sort((a,b)=>b.updatedAt-a.updatedAt),list=$('#openRoomList');$('#openRoomCount').textContent=rooms.length;list.textContent='';
  if(!rooms.length){const empty=document.createElement('p');empty.className='open-room-empty';empty.textContent=directory.ready?'현재 참가 가능한 방이 없습니다.':'열린 방을 찾는 중입니다…';list.append(empty);return}
  for(const room of rooms){const card=document.createElement('article');card.className='open-room-card';const top=document.createElement('div');top.className='open-room-top';const code=document.createElement('strong');code.className='open-room-code';code.textContent=room.code;const capacity=document.createElement('span');capacity.className='open-room-capacity';capacity.textContent=`${room.count}/10`;top.append(code,capacity);const meta=document.createElement('div');meta.className='open-room-meta';for(const value of [templates[room.template]?.title||'스프레드시트',String(room.difficulty||'easy').toUpperCase()]){const tag=document.createElement('span');tag.textContent=value;meta.append(tag)}const join=document.createElement('button');const current=network.active&&network.code===room.code;join.textContent=current?'현재 참가 중':'참가하기';join.disabled=current;join.addEventListener('click',()=>{$('#roomCodeInput').value=room.code;joinOnlineRoom()});card.append(top,meta,join);list.append(card)}
}
function publishOpenRoom(closed=false){
  if(!directory.announce||!network.code)return;const room={code:network.code,count:activePlayers().length,template:state.template,difficulty:state.difficulty,closed:closed||!network.isHost||state.phase!=='lobby',updatedAt:Date.now()};directory.announce.send(room);if(network.isHost&&!room.closed){directory.rooms.set(room.code,room);renderOpenRooms()}else if(room.closed){directory.rooms.delete(room.code);renderOpenRooms()}
}
async function openRoomDirectory(){
  try{let rtcConfig;try{rtcConfig={iceServers:await loadTurnServers()}}catch{}directory.room=joinPeerRoom({appId:'kr.madebyus.cellchase.directory.v1',relayConfig:{redundancy:2},...(rtcConfig?{rtcConfig}:{})},'public-lobby');directory.announce=directory.room.makeAction('room');directory.announce.onMessage=data=>{const code=String(data?.code||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);if(code.length!==6)return;if(data.closed)directory.rooms.delete(code);else directory.rooms.set(code,{code,count:clamp(Number(data.count)||1,1,10),template:String(data.template||'sales'),difficulty:String(data.difficulty||'easy'),closed:false,updatedAt:Date.now()});renderOpenRooms()};directory.room.onPeerJoin=()=>{if(network.isHost)publishOpenRoom()};directory.ready=true;renderOpenRooms();directory.timer=setInterval(()=>{if(network.isHost)publishOpenRoom();renderOpenRooms()},3000)}catch{directory.ready=true;renderOpenRooms()}
}
async function leaveNetwork(){clearTimeout(network.connectTimer);clearTimeout(network.recoveryTimer);if(network.isHost)publishOpenRoom(true);if(network.room)await network.room.leave();Object.assign(network,{active:false,isHost:false,room:null,code:'',playerId:'',hostPeer:'',hello:null,welcome:null,snapshot:null,command:null,chat:null,event:null,profile:null,hostClaim:null,peers:new Set(),lastSync:0,connectTimer:0,recoveryTimer:0,turnReady:false,snapshotSeq:0,lastSnapshotSeq:0})}
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
  clearTimeout(network.connectTimer);network.connectTimer=setTimeout(()=>{if(network.active&&!network.isHost&&!network.hostPeer){updateRoomLobby('기존 방장을 찾지 못해 방을 복구하고 있습니다…');scheduleHostRecovery('',400)}},8000)
}
function scheduleHostRecovery(formerHost='',delay=900){
  clearTimeout(network.recoveryTimer);network.recoveryTimer=setTimeout(()=>{if(!network.active||network.isHost||network.hostPeer)return;const candidates=[selfId,...network.peers].sort();if(candidates[0]!==selfId){updateRoomLobby('새 방장 연결을 기다리는 중입니다…');network.recoveryTimer=setTimeout(()=>scheduleHostRecovery(formerHost,0),2200);return}promoteLocalToHost(formerHost)},delay)
}
function promoteLocalToHost(formerHost=''){
  if(!network.active||network.isHost)return;clearTimeout(network.connectTimer);clearTimeout(network.recoveryTimer);const departedId=formerHost||network.hostPeer;if(departedId)state.players=state.players.filter(player=>player.id!==departedId);let me=state.players.find(player=>player.id===selfId);if(!me){me=playerRecord(selfId,$('#nickname').value.trim()||'새 방장',true);state.players.push(me)}state.players.forEach(player=>{player.local=player.id===selfId;player.connected=player.id===selfId||network.peers.has(player.id)});network.isHost=true;network.hostPeer='';network.playerId=selfId;state.phase='lobby';state.roundId++;state.bombs=[];els.countdown.classList.remove('show','head-start');els.result.classList.add('hidden');els.lobby.classList.remove('hidden');network.hostClaim?.send({hostPeer:selfId,code:network.code});updateRoomLobby('이전 방장이 나가 방장 권한을 이어받았습니다.');sendSnapshot();publishOpenRoom();render();notify('이 방의 새 방장이 되었습니다.')
}
function acceptHostClaim(claimedHost){
  if(!network.active||!claimedHost||claimedHost===selfId)return;if(network.isHost&&selfId<claimedHost){network.hostClaim?.send({hostPeer:selfId,code:network.code});return}clearTimeout(network.connectTimer);clearTimeout(network.recoveryTimer);network.isHost=false;network.hostPeer=claimedHost;network.playerId=selfId;network.hello?.send({name:$('#nickname').value.trim().slice(0,10)||'게스트'},{target:claimedHost});updateRoomLobby('새 방장이 연결되었습니다 · 게임 시작을 기다리는 중')
}
function setupActions(){
  network.hello=network.room.makeAction('hello');network.welcome=network.room.makeAction('welcome');network.snapshot=network.room.makeAction('snapshot');network.command=network.room.makeAction('command');network.chat=network.room.makeAction('chat');network.event=network.room.makeAction('event');network.profile=network.room.makeAction('profile');network.hostClaim=network.room.makeAction('host-claim');
  network.hello.onMessage=(data,{peerId})=>{if(!network.isHost)return;const incomingName=String(data.name||'게스트').trim().slice(0,10)||'게스트';let player=state.players.find(p=>p.id===peerId);if(player){player.connected=true;player.name=incomingName}else{if(state.players.length>=10){network.welcome.send({error:'방이 가득 찼습니다.'},{target:peerId});return}player=playerRecord(peerId,incomingName);state.players.push(player)}network.welcome.send({playerId:peerId,hostPeer:selfId,code:network.code},{target:peerId});sendSnapshot(peerId);updateRoomLobby();publishOpenRoom();render();announce(`${incomingName}님이 입장했습니다.`)};
  network.welcome.onMessage=(data,{peerId})=>{if(network.isHost)return;if(data.error){updateRoomLobby(data.error);return}clearTimeout(network.connectTimer);clearTimeout(network.recoveryTimer);network.playerId=data.playerId;network.hostPeer=data.hostPeer||peerId;$('#joinRoom').disabled=true;$('#joinRoom').textContent='코드로 참가';updateRoomLobby('방에 연결되었습니다 · 방장의 시작을 기다리는 중')};
  network.snapshot.onMessage=(data,{peerId})=>{if(!network.hostPeer||peerId===network.hostPeer)applySnapshot(data)};
  network.command.onMessage=(data,{peerId})=>{if(!network.isHost||state.phase!=='playing')return;const p=state.players.find(x=>x.id===peerId);if(!p)return;const now=performance.now(),dirs={up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]};if(data.type==='move'&&dirs[data.direction])tryMove(p,...dirs[data.direction],now);if(data.type==='bomb')placeBomb(p,now);if(data.type==='chat'&&String(data.text||'').trim()){const text=String(data.text).trim().slice(0,80);appendChat(p.name,text);network.chat.send({name:p.name,text})}sendSnapshot()};
  network.chat.onMessage=data=>{if(!network.isHost)appendChat(String(data.name||'친구'),String(data.text||'').slice(0,80))};
  network.event.onMessage=(data,{peerId})=>{if(!network.isHost&&(!network.hostPeer||peerId===network.hostPeer))showCaptureEvent(data)};
  network.profile.onMessage=(data,{peerId})=>{if(!network.isHost||state.phase!=='lobby')return;const player=state.players.find(p=>p.id===peerId),name=String(data.name||'').trim().slice(0,10);if(!player||!name)return;player.name=name;updateRoomLobby();sendSnapshot();render()};
  network.hostClaim.onMessage=(data,{peerId})=>{const claimed=String(data?.hostPeer||peerId);acceptHostClaim(claimed)};
  network.room.onPeerJoin=peerId=>{network.peers.add(peerId);if(network.isHost)network.hostClaim?.send({hostPeer:selfId,code:network.code},{target:peerId});else network.hello.send({name:$('#nickname').value.trim().slice(0,10)||'게스트'},{target:peerId})};
  network.room.onPeerLeave=peerId=>{network.peers.delete(peerId);if(network.isHost){const p=state.players.find(x=>x.id===peerId);if(p){const now=performance.now();p.connected=false;if(state.phase==='playing'&&p.role==='seeker'){stopSeekerClock(p,now);p.role='runner';const next=activePlayers().filter(x=>x!==p).sort((a,b)=>seekerTimeAt(a,now)-seekerTimeAt(b,now))[0];if(next){setPlayerRole(next,'seeker',now);announce(`${p.name}님의 연결이 끊겨 ${next.name}님이 새로운 술래가 되었습니다.`)}}else announce(`${p.name}님의 연결이 끊겼습니다.`);sendSnapshot();publishOpenRoom();render();setTimeout(()=>{if(!p.connected&&state.phase==='lobby'){state.players=state.players.filter(x=>x!==p);updateRoomLobby();sendSnapshot();publishOpenRoom()}},15000)}}else if(peerId===network.hostPeer){network.hostPeer='';state.phase='lobby';els.result.classList.add('hidden');els.lobby.classList.remove('hidden');updateRoomLobby('방장이 나가 새 방장을 정하는 중입니다…');scheduleHostRecovery(peerId)}};
}
async function createOnlineRoom(){await leaveNetwork();const nickname=$('#nickname').value.trim()||'방장';localStorage.setItem('cellChaseNickname',nickname);network.active=true;network.isHost=true;network.code=roomCode();network.playerId=selfId;$('#createRoom').disabled=true;$('#joinRoom').disabled=true;updateRoomLobby('TURN 중계 서버를 준비하는 중입니다…');try{network.room=await openPeerRoom(network.code)}catch{network.active=false;updateRoomLobby('TURN 중계 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.');$('#createRoom').disabled=false;$('#joinRoom').disabled=false;return}state.phase='lobby';state.players=[playerRecord(selfId,nickname,true)];setupActions();$('#roomCodeInput').value=network.code;updateRoomLobby();publishOpenRoom();render();notify(`방 코드 ${network.code} · 친구에게 공유하세요`)}
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
    else if(r===2&&c===1){text=t.subtitle;el.classList.add('spill','sheet-subtitle')}
    else if(r===3&&c>=1&&c<=t.heads.length){text=t.heads[c-1];el.classList.add('report-head')}
    else if(r>=4&&r<4+t.rows.length&&c>=1&&c<=t.heads.length){const rowIndex=r-4;text=c===1?t.rows[rowIndex]:c===t.heads.length?t.notes[rowIndex]:t.values[(rowIndex+c-2)%t.values.length];if(/^₩|%$|^\+| EA$/.test(text))el.classList.add('money');if(c===t.heads.length)el.classList.add('spill','row-note');if(rowIndex===t.rows.length-1)el.classList.add('total')}
    else if(r===14&&c===2){text='※ 내부 공유용 · 본 자료는 마감 전 잠정 수치를 포함하고 있습니다.';el.classList.add('spill','sheet-note')}
    else if(r===15&&c===2){text='최종 수정 2026-11-10 09:30 · 담당자 검토 완료 · 외부 전송 금지';el.classList.add('spill','sheet-note')}
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
  names.forEach((n,i)=>{const pos=randomFree(players),player=playerRecord(`p${i}`,n,i===0);player.row=pos.row;player.col=pos.col;players.push(player)});
  const chosen=players[Math.floor(Math.random()*players.length)];chosen.role='seeker';
  const seekerPos={row:chosen.row,col:chosen.col};for(const p of players){if(p!==chosen){const pos=randomFree(players.filter(x=>x!==p),seekerPos);p.row=pos.row;p.col=pos.col}}
  return players;
}

function prepareOnlinePlayers(){
  const players=state.players.filter(p=>p.connected!==false).map(p=>playerRecord(p.id,p.name,p.id===network.playerId));
  players.forEach((p,i)=>{const pos=randomFree(players.slice(0,i));p.row=pos.row;p.col=pos.col});
  const chosen=players[Math.floor(Math.random()*players.length)];chosen.role='seeker';
  const seekerPos={row:chosen.row,col:chosen.col};for(const p of players){if(p!==chosen){const pos=randomFree(players.filter(x=>x!==p),seekerPos);p.row=pos.row;p.col=pos.col}}
  return players;
}

function startGame(reuse=false){
  if(network.active&&!network.isHost)return;if(network.active&&state.players.filter(p=>p.connected!==false).length<2){notify('친구가 한 명 이상 입장해야 시작할 수 있습니다.');return}
  const nick=$('#nickname').value.trim().slice(0,10)||'나';state.template=$('#templateSelect').value;state.difficulty=$('#difficultySelect').value;state.speed=Number($('#speedSelect').value);state.roundId++;input.keys=[];input.lastSent=0;input.pressed.clear();
  generateObstacles();state.players=network.active?prepareOnlinePlayers():createPlayers(nick);const durationSetting=$('#durationSelect').value;state.duration=durationSetting==='auto'?defaultDurationForPlayers(state.players.length):Number(durationSetting);state.bombs=[];state.captures=0;state.winner=null;state.finishReason='';state.headStartEndsAt=0;state.phase='countdown';state.countdownEndsAt=performance.now()+2400;paintTemplate();els.lobby.classList.add('hidden');els.result.classList.add('hidden');publishOpenRoom(true);sendSnapshot();
  let count=3;els.countdown.textContent=count;els.countdown.classList.remove('head-start');els.countdown.classList.add('show');render();const round=state.roundId;
  const tick=setInterval(()=>{if(round!==state.roundId){clearInterval(tick);return}count--;if(count>0)els.countdown.textContent=count;else{clearInterval(tick);state.phase='playing';state.startedAt=performance.now();state.endsAt=state.startedAt+state.duration*1000;state.headStartEndsAt=state.startedAt+INITIAL_HEAD_START;state.players.forEach(p=>{p.seekerTime=0;p.seekerSince=0;p.timesCaught=0;if(p.role==='seeker'){p.seekerSince=state.headStartEndsAt;p.seekerActiveAt=state.headStartEndsAt}});announce(`게임 시작 · 도망자는 ${INITIAL_HEAD_START/1000}초 먼저 출발합니다.`);sendSnapshot();render() }},800);
}

function tryMove(player,dr,dc,now){
  if(state.phase!=='playing'||now-player.lastMove<state.speed)return false;if(player.role==='seeker'&&now<player.seekerActiveAt)return false;
  const nr=player.row+dr,nc=player.col+dc,k=coord(nr,nc);if(nr<0||nr>=ROWS||nc<0||nc>=COLS||state.blocked.has(k))return false;
  const protectedSeeker=state.players.find(p=>p.connected!==false&&p.role==='seeker'&&p.row===nr&&p.col===nc&&now<p.seekerActiveAt);if(player.role==='runner'&&protectedSeeker)return false;
  const previous={row:player.row,col:player.col};player.row=nr;player.col=nc;player.lastMove=now;resolveContact(player,now,previous);return true;
}
function setPlayerRole(player,role,now){
  if(player.role==='seeker'&&role!=='seeker')stopSeekerClock(player,now);
  player.role=role;
  if(role==='seeker'){player.caughtAt=now;player.seekerSince=now;player.timesCaught=(player.timesCaught||0)+1;player.seekerActiveAt=now+NEW_SEEKER_GRACE;player.bombReadyAt=now+BOMB_COOLDOWN;player.bombReady=now+BOMB_COOLDOWN}
  else{player.caughtAt=null;player.seekerActiveAt=0;player.bombReadyAt=0;player.bombReady=0}
}
function dispatchMove(direction,now=performance.now()){
  const map={up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]},delta=map[direction];if(!delta||state.phase!=='playing')return;
  if(network.active&&!network.isHost)network.command?.send({type:'move',direction},{target:network.hostPeer});else tryMove(local(),...delta,now);input.lastSent=now
}

function capture(victims,owner,method,now,origin=owner,ownerEscape=null){
  if(owner?.role!=='seeker'||now<owner.seekerActiveAt)return;const fresh=victims.filter(p=>p.role==='runner'&&p.connected!==false);if(!fresh.length)return;
  const chosen=fresh.reduce((best,p)=>distance(p,origin)<distance(best,origin)?p:best);setPlayerRole(owner,'runner',now);setPlayerRole(chosen,'seeker',now);if(ownerEscape&&!state.blocked.has(coord(ownerEscape.row,ownerEscape.col))){owner.row=ownerEscape.row;owner.col=ownerEscape.col;owner.lastMove=now}state.captures++;
  const event={type:'capture',method,ownerId:owner.id,ownerName:owner.name,ownerWasSeeker:true,victims:[{id:chosen.id,name:chosen.name,row:chosen.row,col:chosen.col}]};showCaptureEvent(event);if(network.active&&network.isHost)network.event?.send(event);
}

function resolveContact(mover,now,previous){
  const seeker=currentSeeker();if(!seeker||now<seeker.seekerActiveAt)return;
  if(mover.role==='seeker'){const victims=state.players.filter(p=>p.connected!==false&&p.role==='runner'&&p.row===mover.row&&p.col===mover.col);if(victims.length)capture(victims,mover,'contact',now,mover,previous);return}
  if(mover.role==='runner'&&mover.row===seeker.row&&mover.col===seeker.col)capture([mover],seeker,'contact',now,seeker,previous)
}

function placeBomb(player,now){
  const active=state.bombs.filter(b=>b.owner===player.id&&!b.resolved).length;
  if(state.phase!=='playing'||player.role!=='seeker'||now<player.seekerActiveAt||now<player.bombReady||active>=MAX_ACTIVE_BOMBS){if(player.local&&player.role!=='seeker')notify('폭탄은 술래만 사용할 수 있습니다.');else if(player.local&&active>=MAX_ACTIVE_BOMBS)notify('폭탄은 동시에 3개까지 설치할 수 있습니다.');return}
  state.bombs.push({id:crypto.randomUUID(),owner:player.id,row:player.row,col:player.col,explodesAt:now+BOMB_FUSE,resolved:false});player.bombReady=now+BOMB_PLACE_DELAY;notify(`폭탄 설치 · ${active+1}/3`);
}

function explodeBomb(b,now){
  b.resolved=true;const radius={easy:2,medium:3,hard:4}[state.difficulty]||2,ranges=[[b.row,b.col]];
  for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]])for(let step=1;step<=radius;step++){const r=b.row+dr*step,c=b.col+dc*step;if(r<0||r>=ROWS||c<0||c>=COLS)break;if(state.blocked.has(coord(r,c)))break;ranges.push([r,c])}
  const keys=new Set(ranges.map(x=>coord(...x)));for(const k of keys){const el=cells.get(k);if(el){el.classList.add('blast');setTimeout(()=>el.classList.remove('blast'),360)}}const victims=state.players.filter(p=>p.role==='runner'&&p.connected!==false&&keys.has(coord(p.row,p.col)));capture(victims,state.players.find(p=>p.id===b.owner),'bomb',now,b)
}

function botStep(p,now){
  if(now<p.botMove||state.phase!=='playing')return;p.botMove=now+DIFFICULTY[state.difficulty].bot+Math.random()*80;
  const targets=p.role==='seeker'?runners():activePlayers().filter(x=>x.role==='seeker');if(!targets.length)return;const near=targets.reduce((a,b)=>distance(p,a)<distance(p,b)?a:b);
  if(p.role==='seeker'&&distance(p,near)<=1&&Math.random()<.18)placeBomb(p,now);
  const choices=[[1,0],[-1,0],[0,1],[0,-1]].map(([dr,dc])=>({dr,dc,row:p.row+dr,col:p.col+dc})).filter(x=>x.row>=0&&x.row<ROWS&&x.col>=0&&x.col<COLS&&!state.blocked.has(coord(x.row,x.col)));
  choices.sort((a,b)=>{const da=Math.abs(a.row-near.row)+Math.abs(a.col-near.col),db=Math.abs(b.row-near.row)+Math.abs(b.col-near.col);return p.role==='seeker'?da-db:db-da});if(choices[0])tryMove(p,choices[0].dr,choices[0].dc,now)
}

function finish(reason='제한 시간 종료'){
  if(state.phase==='finished')return;const now=performance.now();for(const p of state.players)if(p.role==='seeker')stopSeekerClock(p,now);state.phase='finished';state.finishReason=reason;const ranking=activePlayers().sort((a,b)=>(a.seekerTime||0)-(b.seekerTime||0)||(a.timesCaught||0)-(b.timesCaught||0));state.winner=ranking[0]?.id||null;
  state.bombs=[];showResult(reason);sendSnapshot();render();
}

function showResult(reason){const ranking=activePlayers().sort((a,b)=>(a.seekerTime||0)-(b.seekerTime||0)||(a.timesCaught||0)-(b.timesCaught||0));$('#resultTitle').textContent='최종 순위';$('#resultCopy').textContent=`${reason||state.finishReason||'게임 종료'} · 술래 시간이 짧을수록 높은 순위 · 교대 ${state.captures}회`;const grid=$('#scoreGrid');grid.textContent='';ranking.forEach((player,index)=>{const row=document.createElement('div');row.className='rank-row';const rank=document.createElement('span');rank.className='rank-number';rank.textContent=`${index+1}위`;const name=document.createElement('span');name.className='rank-name';name.textContent=`${player.name}${player.local?' · 나':''}`;const time=document.createElement('span');time.className='rank-time';time.textContent=formatTime((player.seekerTime||0)/1000);row.append(rank,name,time);grid.append(row)});setTimeout(()=>els.result.classList.remove('hidden'),380)}

function visibleToMe(p){const me=local();if(!me||p.local||me.role==='seeker'||p.role==='seeker')return true;return distance(me,p)<=DIFFICULTY[state.difficulty].vision}

function renderGrid(){
  for(const el of cells.values())el.querySelectorAll('.player-stack,.bomb').forEach(x=>x.remove());const groups=new Map();
  for(const p of state.players.filter(visibleToMe)){const k=coord(p.row,p.col);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p)}
  for(const [k,ps] of groups){const el=cells.get(k);if(!el)continue;const main=ps.find(p=>p.local)||ps.find(p=>p.role==='seeker')||ps[0];const chip=document.createElement('div');chip.className=`player-stack ${main.role}${main.local?' self':''}`;chip.textContent=main.name;chip.title=ps.map(p=>`${p.name} (${p.role==='seeker'?'술래':'도망'})`).join(', ');if(ps.length>1){const count=document.createElement('span');count.className='stack-count';count.textContent=`+${ps.length-1}`;chip.append(count)}el.append(chip)}
  for(const b of state.bombs.filter(x=>!x.resolved)){const el=cells.get(coord(b.row,b.col));if(el){const bomb=document.createElement('div');bomb.className='bomb';bomb.title='폭탄';el.append(bomb)}}
  const me=local();if(me){els.nameBox.textContent=`${String.fromCharCode(65+me.col)}${me.row+1}`;els.formula.textContent=me.role==='seeker'?'=CHASE( runners )':`=SURVIVE( ${Math.max(0,Math.ceil((state.endsAt-performance.now())/1000))} )`}
}

function renderPlayers(){
  const now=performance.now();els.playerList.textContent='';for(const p of [...state.players].sort((a,b)=>a.role.localeCompare(b.role))){const el=document.createElement('div');el.className=`player-item${p.local?' local':''}`;const dot=document.createElement('i');dot.className=`role-dot ${p.role}`;const name=document.createElement('span');name.className='name';name.textContent=p.name;const status=document.createElement('span');status.className='state';status.textContent=p.connected===false?'순위 제외':`${p.role==='seeker'?'술래':'누적'} · ${formatTime(seekerTimeAt(p,now)/1000)}`;el.append(dot,name,status);els.playerList.append(el)}els.playerCount.textContent=`${activePlayers().length} / 10`;
}

function render(){
  renderGrid();renderPlayers();keepLocalVisible();const me=local(),now=performance.now(),meSeekerTime=me?seekerTimeAt(me,now):0,seeker=currentSeeker(),remaining=state.phase==='playing'?Math.max(0,state.endsAt-now):0,remainingRatio=state.duration?Math.min(1,remaining/(state.duration*1000)):0,trackWidth=els.progress.parentElement.clientWidth;els.goal.textContent=formatTime(meSeekerTime/1000);els.progress.style.width=trackWidth?`${trackWidth*remainingRatio}px`:`${remainingRatio*100}%`;els.mode.textContent=state.phase==='playing'?`${seeker?.name||'새 술래'} 술래 · 교대 ${state.captures}회`:state.phase==='finished'?'게임 종료':'시작 준비';
  if(me){const active=state.bombs.filter(b=>b.owner===me.id&&!b.resolved).length,ready=Math.max(0,me.bombReady-now);els.bombStatus.textContent=me.role!=='seeker'?'술래 전용':active>=MAX_ACTIVE_BOMBS?'3/3 설치됨':ready>0?'설치 준비 중':`${MAX_ACTIVE_BOMBS-active}/3 설치 가능`;els.bombCooldown.style.width=`${active/MAX_ACTIVE_BOMBS*100}%`}
}

function formatTime(seconds){const s=Math.max(0,Math.ceil(seconds));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function announce(text){const p=document.createElement('p');p.className='system';p.textContent=text;els.chat.append(p);els.chat.scrollTop=els.chat.scrollHeight}
function appendChat(name,text){const p=document.createElement('p'),b=document.createElement('b');b.textContent=`${name} `;p.append(b,document.createTextNode(text));els.chat.append(p);els.chat.scrollTop=els.chat.scrollHeight}
function notify(text){clearTimeout(toastTimer);els.toast.textContent=text;els.toast.classList.add('show');toastTimer=setTimeout(()=>els.toast.classList.remove('show'),1500)}
function showCaptureEvent(event){
  if(!event?.victims?.length)return;const me=local(),victim=event.victims[0],caughtMe=victim.id===me?.id,ownerMe=event.ownerId===me?.id,bomb=event.method==='bomb';
  const title=caughtMe?(bomb?'폭탄에 잡혔습니다!':'술래에게 잡혔습니다!'):ownerMe?'잡기 성공!':`${victim.name}님이 새로운 술래!`;const subtitle=ownerMe?`${victim.name}님에게 술래를 넘기고 도망자가 됐습니다`:`${event.ownerName}님과 역할 교대 · 1.5초 보호`;
  $('#captureIcon').textContent=bomb?'💥':'!';$('#captureTitle').textContent=title;$('#captureSubtitle').textContent=subtitle;const banner=$('#captureBanner');banner.classList.toggle('bomb',bomb);banner.classList.remove('hidden');banner.style.animation='none';void banner.offsetWidth;banner.style.animation='';clearTimeout(captureTimer);captureTimer=setTimeout(()=>banner.classList.add('hidden'),1150);
  const cell=cells.get(coord(victim.row,victim.col));if(cell){cell.classList.remove('captured-flash');void cell.offsetWidth;cell.classList.add('captured-flash');setTimeout(()=>cell.classList.remove('captured-flash'),1000)}
  announce(`${bomb?'💥 ':''}${event.ownerName}님이 ${victim.name}님에게 술래를 넘겼습니다. 게임은 계속됩니다.`);
}

function loop(now){
  if(state.phase==='countdown'&&!network.isHost&&network.active){const left=Math.max(0,state.countdownEndsAt-now);els.countdown.textContent=left>0?Math.max(1,Math.ceil(left/800)):'GO';els.countdown.classList.add('show');render()}
  if(state.phase==='playing'){
    if(now<state.headStartEndsAt){els.countdown.textContent=`도망자 먼저 출발\n${Math.max(1,Math.ceil((state.headStartEndsAt-now)/1000))}초`;els.countdown.classList.add('head-start','show')}else if(els.countdown.classList.contains('show')&&els.countdown.textContent!=='술래 출발!'){els.countdown.textContent='술래 출발!';setTimeout(()=>{if(state.phase==='playing'&&performance.now()>=state.headStartEndsAt){els.countdown.classList.remove('show','head-start')}},500)}
    stepKeyboardMove(now);
    if(!network.active||network.isHost){if(!network.active)state.players.filter(p=>!p.local).forEach(p=>botStep(p,now));state.bombs.filter(b=>!b.resolved&&now>=b.explodesAt).forEach(b=>explodeBomb(b,now));state.bombs=state.bombs.filter(b=>!b.resolved||now-b.explodesAt<500);if(now>=state.endsAt)finish('제한 시간 종료')}
    els.timer.textContent=formatTime((state.endsAt-now)/1000);render();
  }
  if(network.active&&network.isHost&&now-network.lastSync>=50){sendSnapshot();network.lastSync=now;updateRoomLobby()}
  raf=requestAnimationFrame(loop);
}

const keyDirections={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
const keyDirection=e=>keyDirections[e.code]||({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'})[e.key];
function clearKeyboardMove(){input.pressed.clear();input.keys.length=0}
function stepKeyboardMove(now){const key=input.keys[input.keys.length-1],direction=keyDirections[key];if(!direction||state.phase!=='playing')return;const interval=Math.max(60,state.speed);if(now-input.lastSent>=interval)dispatchMove(direction,now)}
document.addEventListener('keydown',e=>{const form=e.target.matches('input,select,textarea,[contenteditable]');if(form)return;const d=keyDirection(e);if(d&&state.phase==='playing'){e.preventDefault();const key=e.code||d;if(!input.pressed.has(key)){input.pressed.add(key);input.keys.push(key);dispatchMove(d)}}if(e.code==='Space'&&state.phase==='playing'){e.preventDefault();if(!e.repeat){if(network.active&&!network.isHost)network.command?.send({type:'bomb'},{target:network.hostPeer});else placeBomb(local(),performance.now())}}if(e.key==='Enter'&&state.phase==='playing'){e.preventDefault();clearKeyboardMove();$('#chatInput').focus()}});
document.addEventListener('keyup',e=>{if(!e.code)return;input.pressed.delete(e.code);input.keys=input.keys.filter(key=>key!==e.code);if(input.keys.length)input.lastSent=performance.now()-Math.max(60,state.speed)});window.addEventListener('blur',clearKeyboardMove);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeyboardMove()});
const gridWrap=$('#gridWrap');
function keepLocalVisible(){if(!matchMedia('(max-width: 700px)').matches||state.phase==='lobby'||state.phase==='finished')return;const me=local(),cell=me&&cells.get(coord(me.row,me.col));if(!cell)return;const a=cell.getBoundingClientRect(),b=gridWrap.getBoundingClientRect(),pad=48;if(a.right<b.left||a.left>b.right||a.bottom<b.top||a.top>b.bottom){gridWrap.scrollLeft+=a.left-b.left-(b.width-a.width)/2;gridWrap.scrollTop+=a.top-b.top-(b.height-a.height)/2;return}if(a.left<b.left+pad)gridWrap.scrollLeft-=b.left+pad-a.left;else if(a.right>b.right-pad)gridWrap.scrollLeft+=a.right-(b.right-pad);if(a.top<b.top+pad)gridWrap.scrollTop-=b.top+pad-a.top;else if(a.bottom>b.bottom-pad)gridWrap.scrollTop+=a.bottom-(b.bottom-pad)}
function clearTouchMove(){touchMove.pointerId=null;touchMove.direction=null;touchMove.wanted=0;touchMove.sent=0;if(touchMove.raf)cancelAnimationFrame(touchMove.raf);touchMove.raf=0;touchMove.joystick?.remove();touchMove.joystick=null}
function updateJoystick(){if(touchMove.pointerId===null)return;const dx=touchMove.x-touchMove.startX,dy=touchMove.y-touchMove.startY,dist=Math.hypot(dx,dy);touchMove.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');touchMove.wanted=dist>=8;const knob=touchMove.joystick?.querySelector('.mobile-stick-knob');if(knob){const length=Math.min(34,dist);knob.style.transform=`translate(${dist?dx/dist*length:0}px,${dist?dy/dist*length:0}px)`}if(!touchMove.raf)touchMove.raf=requestAnimationFrame(stepTouchMove)}
function stepTouchMove(now){touchMove.raf=0;if(touchMove.pointerId===null||!touchMove.wanted||state.phase!=='playing')return;if(now-touchMove.lastStep>=Math.max(60,state.speed)){dispatchMove(touchMove.direction,now);touchMove.lastStep=now;keepLocalVisible()}touchMove.raf=requestAnimationFrame(stepTouchMove)}
gridWrap.addEventListener('pointerdown',e=>{if(!matchMedia('(max-width: 700px)').matches||state.phase!=='playing'||e.button!==0)return;e.preventDefault();clearTouchMove();touchMove.pointerId=e.pointerId;touchMove.startX=touchMove.x=e.clientX;touchMove.startY=touchMove.y=e.clientY;touchMove.lastStep=performance.now()-Math.max(60,state.speed);const stick=document.createElement('div');stick.className='mobile-stick';stick.style.left=`${e.clientX}px`;stick.style.top=`${e.clientY}px`;stick.innerHTML='<i class="mobile-stick-knob"></i>';document.body.append(stick);touchMove.joystick=stick;gridWrap.setPointerCapture(e.pointerId);updateJoystick()});
gridWrap.addEventListener('pointermove',e=>{if(e.pointerId!==touchMove.pointerId)return;touchMove.x=e.clientX;touchMove.y=e.clientY;updateJoystick()});
gridWrap.addEventListener('pointerup',e=>{if(e.pointerId===touchMove.pointerId)clearTouchMove()});gridWrap.addEventListener('pointercancel',clearTouchMove);
gridWrap.addEventListener('selectstart',e=>{if(matchMedia('(max-width: 700px)').matches)e.preventDefault()});gridWrap.addEventListener('dragstart',e=>e.preventDefault());
document.addEventListener('gesturestart',e=>{if(matchMedia('(max-width: 700px)').matches)e.preventDefault()},{passive:false});
document.addEventListener('gesturechange',e=>{if(matchMedia('(max-width: 700px)').matches)e.preventDefault()},{passive:false});
document.addEventListener('touchmove',e=>{if(matchMedia('(max-width: 700px)').matches&&e.touches.length>1)e.preventDefault()},{passive:false});
$('#abilityCard').addEventListener('click',()=>{if(state.phase!=='playing')return;if(network.active&&!network.isHost)network.command?.send({type:'bomb'},{target:network.hostPeer});else placeBomb(local(),performance.now())});
$('#chatInput').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.target.blur()} });
$('#chatForm').addEventListener('submit',e=>{e.preventDefault();const input=$('#chatInput'),text=input.value.trim();if(!text)return;if(network.active&&!network.isHost)network.command?.send({type:'chat',text},{target:network.hostPeer});else{appendChat(local()?.name||'나',text);if(network.active)network.chat?.send({name:local()?.name||'방장',text})}input.value='';input.blur()});
$('#roomCodeInput').addEventListener('input',e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6));
function fallbackCopy(text){const area=document.createElement('textarea');area.value=text;area.readOnly=true;area.style.position='fixed';area.style.left='-9999px';area.style.top='0';document.body.append(area);area.focus();area.select();area.setSelectionRange(0,text.length);const copied=document.execCommand('copy');area.remove();if(!copied)throw new Error('copy failed')}
$('#copyInviteLink').addEventListener('click',async e=>{const button=e.currentTarget,url=button.dataset.invite||`${publicOrigin}/?room=${network.code}`;try{if(navigator.clipboard?.writeText&&window.isSecureContext)await navigator.clipboard.writeText(url);else fallbackCopy(url);button.textContent='복사됨 ✓';const tooltip=$('#copyTooltip');tooltip.classList.add('show');notify('초대 링크를 복사했습니다.');clearTimeout(copyTooltipTimer);copyTooltipTimer=setTimeout(()=>{button.textContent='초대 링크 복사';tooltip.classList.remove('show')},1800)}catch{button.textContent='복사 실패';notify('복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해주세요.');setTimeout(()=>{button.textContent='초대 링크 복사'},1800)}});
$('#nickname').addEventListener('input',e=>{clearTimeout(nicknameTimer);nicknameTimer=setTimeout(()=>{const name=e.target.value.trim().slice(0,10);if(!name)return;localStorage.setItem('cellChaseNickname',name);const me=local();if(!network.active||!me)return;me.name=name;updateRoomLobby();render();if(network.isHost)sendSnapshot();else if(network.hostPeer)network.profile?.send({name},{target:network.hostPeer})},250)});
$('#quickStart').addEventListener('click',()=>{if(!network.active||network.isHost)startGame()});
$('#leaveAndBot').addEventListener('click',async()=>{if(network.active)await leaveNetwork();$('#createRoom').disabled=false;$('#joinRoom').disabled=false;$('#joinRoom').textContent='코드로 참가';$('#roomLobbyStatus').classList.add('hidden');$('#roomPlayerList').classList.add('hidden');$('#inviteCopyWrap').classList.add('hidden');$('#leaveAndBot').classList.add('hidden');$('#quickStart').textContent='봇과 빠른 시작';$('#quickStart').disabled=false;$('#connectionState').textContent='로컬 데모 · 연결됨';startGame()});
$('#createRoom').addEventListener('click',createOnlineRoom);$('#joinRoom').addEventListener('click',joinOnlineRoom);
$('#playAgain').addEventListener('click',()=>{if(!network.active||network.isHost)startGame(true)});$('#backToLobby').addEventListener('click',()=>{state.phase='lobby';state.roundId++;els.result.classList.add('hidden');els.lobby.classList.remove('hidden');if(network.active){updateRoomLobby();sendSnapshot();publishOpenRoom()}});
$('#collapsePanel').addEventListener('click',()=>notify('게임 정보 패널은 모든 참가자에게 동일하게 표시됩니다.'));

buildGrid();generateObstacles();paintTemplate();state.players=[playerRecord('preview-self','나',true),playerRecord('preview-seeker','민지'),playerRecord('preview-2','도윤'),playerRecord('preview-3','서준'),playerRecord('preview-4','하린')];[[8,7],[12,13],[5,15],[14,4],[3,10]].forEach(([row,col],i)=>Object.assign(state.players[i],{row,col}));state.players[1].role='seeker';const savedNickname=localStorage.getItem('cellChaseNickname');if(savedNickname)$('#nickname').value=savedNickname.slice(0,10);updateAutoDurationOption();render();raf=requestAnimationFrame(loop);openRoomDirectory();if(invitedCode.length===6){$('#roomCodeInput').value=invitedCode;if(!savedNickname)$('#nickname').value=`게스트${Math.floor(100+Math.random()*900)}`;$('#inviteNicknameHint').classList.remove('hidden');const box=$('#roomLobbyStatus');box.classList.remove('hidden');box.textContent=`초대받은 방 ${invitedCode}에 자동으로 참여합니다…`;setTimeout(joinOnlineRoom,600)}
