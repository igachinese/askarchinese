const width = 720;
const height = 440;
const goals = [150, 360, 570];
const startY = 372;
const gamePlan = ['phone','elephant','goalie','apple','crab'];
const keys = {ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
const assets = 'media/homework-penalties/';

const bounded = (value,min,max) => Math.min(max,Math.max(min,value));
const near = (a,b,distance) => Math.hypot(a.x-b.x,a.y-b.y) < distance;

function drawPlayer(ctx, x, y, team, keeper = false) {
  ctx.fillStyle = '#102e2655';
  ctx.beginPath(); ctx.ellipse(x,y+18,17,6,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#17332c';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x-6,y+7); ctx.lineTo(x-9,y+17); ctx.moveTo(x+6,y+7); ctx.lineTo(x+10,y+17); ctx.stroke();
  ctx.fillStyle = team;
  ctx.beginPath(); ctx.roundRect(x-11,y-6,22,21,6); ctx.fill();
  ctx.strokeStyle = team;
  ctx.beginPath(); ctx.moveTo(x-8,y); ctx.lineTo(x-18,y+5); ctx.moveTo(x+8,y); ctx.lineTo(x+18,y+5); ctx.stroke();
  if (keeper) {
    ctx.fillStyle = '#fff2b3';
    ctx.fillRect(x-23,y+1,7,9);ctx.fillRect(x+16,y+1,7,9);
  }
  ctx.fillStyle = '#f4c695';
  ctx.beginPath(); ctx.arc(x,y-12,8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle = '#294039';
  ctx.beginPath(); ctx.arc(x,y-14,7,Math.PI,Math.PI*2);ctx.fill();
}
function drawBall(ctx, x, y) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();
  ctx.fillStyle = '#234539';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
}

export function setupFootball(riddles, speak) {
  const field = document.querySelector('#field');
  const ctx = field.getContext('2d');
  const start = document.querySelector('#field-start');
  const listen = document.querySelector('#field-listen');
  const kick = document.querySelector('#field-shoot');
  const status = document.querySelector('#field-status');
  const score = document.querySelector('#field-score');
  const roundLabel = document.querySelector('#field-round');
  const hints = document.querySelector('#field-text');
  const word = document.querySelector('#field-word');
  if (!ctx) {
    start.disabled = true;
    status.textContent = 'Этот браузер не может отобразить поле.';
    return;
  }

  const choices = new Map(riddles.map(item=>[item.id,item]));
  const sprites = new Map();
  const motions = new Set();
  const player = {x:width/2,y:startY};
  const defense = {x:240,y:257};
  const goalie = {x:width/2,y:114};
  const fx = {
    whistle:new Audio(assets+'whistle.mp3'),
    kick:new Audio(assets+'kick.mp3'),
    goal:new Audio(assets+'goal.mp3'),
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let roundIndex = 0;
  let riddle = choices.get(gamePlan[0]);
  let phase = 'ready';
  let shot;
  let elapsed = 0;
  let previous = 0;
  let animation = 0;

  function effect(id) {
    const sound=fx[id];
    sound.currentTime=0;
    sound.play().catch(()=>{});
  }

  function paint() {
    ctx.fillStyle = '#2b694f';
    ctx.fillRect(0,0,width,height);
    ctx.fillStyle = '#326e53';
    for (let x=20;x<width;x+=112) ctx.fillRect(x,72,56,height-85);
    ctx.strokeStyle = '#d7e8bb';
    ctx.lineWidth = 2;
    ctx.strokeRect(19,80,width-38,height-97);
    ctx.beginPath();ctx.moveTo(20,325); ctx.lineTo(width-20,325);ctx.stroke();
    ctx.beginPath();ctx.arc(width/2,325,54,0,Math.PI*2);ctx.stroke();
    ctx.strokeRect(73,80,width-146,95);

    for (const [index,x] of goals.entries()) {
      const image = sprites.get(riddle.choices[index]);
      ctx.fillStyle = '#164736';
      ctx.fillRect(x-81,9,162,71);
      ctx.strokeStyle = '#e6e7bc';
      ctx.strokeRect(x-81,9,162,71);
      ctx.strokeStyle = '#b5c9a65b';
      ctx.beginPath();
      for (let grid=0;grid<=160;grid+=16) {
        ctx.moveTo(x-80+grid,11);ctx.lineTo(x-80+grid,79);
      }
      for (let grid=18;grid<80;grid+=13) {ctx.moveTo(x-79,grid);ctx.lineTo(x+79,grid);}
      ctx.stroke();
      if (image?.complete && image.naturalWidth) ctx.drawImage(image,x-30,14,60,60);
    }
    drawPlayer(ctx,goalie.x,goalie.y,'#de8c35',true);
    drawPlayer(ctx,defense.x,defense.y,'#db5865');
    drawPlayer(ctx,player.x,player.y,'#5bcbee');
    if (!shot && phase !== 'won' && phase !== 'complete') drawBall(ctx,player.x+12,player.y-10);
    if (shot) drawBall(ctx,shot.x,shot.y);
  }
  for (const id of choices.keys()) {
    const image=new Image();
    image.onload=paint;
    image.src='media/riddle-fair/'+id+'.webp';
    sprites.set(id,image);
  }

  function resetPosition() {
    player.x=width/2;
    player.y=startY;
    shot=undefined;
  }
  function stopMotion() {
    motions.clear();
  }
  function nextFrame(now) {
    const dt=previous ? Math.min((now-previous)/1000,.042) : 0;
    previous=now;
    elapsed+=dt;
    const speed=reduced ? .65 : 1;
    goalie.x=width/2+Math.sin(elapsed*1.46*speed)*221;
    defense.x=width/2+Math.sin(elapsed*1.75*speed+.7)*229;
    if (phase==='dribble') {
      const dx=Number(motions.has('right'))-Number(motions.has('left'));
      const dy=Number(motions.has('down'))-Number(motions.has('up'));
      const step=220*dt/(Math.hypot(dx,dy)||1);
      player.x=bounded(player.x+dx*step,65,655);
      player.y=bounded(player.y+dy*step,175,400);
      if (near(player,defense,27)) {
        resetPosition();
        status.textContent='Защитник перехватил мяч. Обойди его сбоку.';
      }
    }
    if (phase==='shot') {
      const before=shot.y;
      shot.y-=550*dt;
      if (before>=goalie.y && shot.y<goalie.y && Math.abs(shot.x-goalie.x)<35) {
        miss('Вратарь поймал мяч. Дождись, пока он отойдёт в сторону.');
      } else if (shot.y<=76) {
        if (shot.id===riddle.id) win();
        else miss('Мяч попал в другие ворота. Переслушай слово и найди нужную картинку.');
      }
    }
    paint();
    if (phase==='dribble' || phase==='shot') animation=requestAnimationFrame(nextFrame);
    else animation=0;
  }

  function miss(message) {
    phase='dribble';
    resetPosition();
    kick.disabled=false;
    status.textContent=message;
  }
  function win() {
    roundIndex++;
    phase=roundIndex===gamePlan.length?'complete':'won';
    stopMotion();
    effect('goal');
    score.textContent='Голы: '+roundIndex+' из '+gamePlan.length;
    status.textContent=phase==='complete' ? 'Пять голов! Назови по-китайски любые два слова с поля.' : 'Гол! '+riddle.zh+' · '+riddle.ru;
    start.textContent=phase==='complete'?'Сыграть ещё раз':'Следующее слово';
    start.hidden=false;
    kick.disabled=true;
    start.focus({preventScroll:true});
  }
  function playWord() {
    if (phase==='dribble' || phase==='shot') speak(riddle.id+'word');
  }
  function begin() {
    if (phase==='complete') roundIndex=0;
    riddle=choices.get(gamePlan[roundIndex]);
    resetPosition();
    stopMotion();
    hints.hidden=false;
    hints.open=false;
    word.textContent=riddle.zh+' · '+riddle.py+' · '+riddle.ru;
    field.setAttribute('aria-label','Футбольное поле. Ворота слева направо: '+riddle.choices.map(id=>choices.get(id).ru).join(', '));
    score.textContent='Голы: '+roundIndex+' из '+gamePlan.length;
    roundLabel.textContent='Слово '+(roundIndex+1)+' из '+gamePlan.length;
    phase='dribble';
    kick.disabled=false;
    start.hidden=true;
    listen.hidden=false;
    status.textContent='Веди мяч и выбери ворота.';
    if (roundIndex===0) effect('whistle');
    playWord();
    previous=0;
    if (!animation) animation=requestAnimationFrame(nextFrame);
    field.focus({preventScroll:true});
  }
  function shoot() {
    if (phase!=='dribble') return;
    const lane=goals.findIndex(center=>Math.abs(center-player.x)<=72);
    if (player.y>305 || lane<0) {
      status.textContent='Подойди ближе и встань напротив ворот с нужной картинкой.';
      return;
    }
    phase='shot';
    shot={x:player.x,y:player.y-12,id:riddle.choices[lane]};
    kick.disabled=true;
    effect('kick');
  }
  field.addEventListener('keydown',event => {
    const direction=keys[event.key];
    if (direction || event.code==='Space') event.preventDefault();
    if (direction) motions.add(direction);
    if (event.code==='Space' && !event.repeat) shoot();
  });
  window.addEventListener('keyup',event=>motions.delete(keys[event.key]));
  field.addEventListener('blur',stopMotion);
  window.addEventListener('blur',stopMotion);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) stopMotion(); });
  window.addEventListener('pagehide',()=>{ stopMotion();for (const sound of Object.values(fx)) sound.pause(); });
  for (const control of document.querySelectorAll('.field-pad [data-move]')) {
    const direction=control.dataset.move;
    control.addEventListener('pointerdown',event=>{
      event.preventDefault();
      control.setPointerCapture(event.pointerId);
      motions.add(direction);
    });
    for (const event of ['pointerup','pointercancel','lostpointercapture','keyup','blur']) {
      control.addEventListener(event,()=>motions.delete(direction));
    }
    control.addEventListener('keydown',event=>{
      if(event.code==='Space' || event.code==='Enter'){
        event.preventDefault();
        motions.add(direction);
      }
    });
  }
  start.addEventListener('click',begin);
  listen.addEventListener('click',playWord);
  kick.addEventListener('click',shoot);
  paint();
}
