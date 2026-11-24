const game = document.querySelector('#game');
const soundSwitch = document.querySelector('#effects');
const base = 'lessons/media/homework-penalties/';
const progressKey = 'askar-penalties-2026-11-22';
const completeKey = 'chinese-homework:askarchinese:task-penalties-nov22';

const words = {
  brazil: ['巴西', 'Bāxī', 'Бразилия'],
  france: ['法国', 'Fǎguó', 'Франция'],
  england: ['英国', 'Yīngguó', 'Великобритания'],
  argentina: ['阿根廷', 'Āgēntíng', 'Аргентина'],
  keeper: ['门将', 'ménjiàng', 'вратарь', '🧤'],
  player: ['球员', 'qiúyuán', 'полевой игрок', '🏃'],
  net: ['球门', 'qiúmén', 'ворота', '🥅'],
};
const rounds = [
  ['brazil', ['france', 'brazil', 'argentina']],
  ['france', ['france', 'england', 'brazil']],
  ['argentina', ['brazil', 'england', 'argentina']],
  ['england', ['england', 'argentina', 'france']],
  ['keeper', ['net', 'keeper', 'player']],
];
const state = readState();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let voice;
const crowd = new Audio(base + 'stadium.mp3');
const effects = Object.fromEntries(['whistle', 'kick', 'goal'].map(name => [name, new Audio(base + name + '.mp3')]));
crowd.loop = true;
let startedHere = false;
let voiceTurn = 0;

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey));
    if (saved && Number.isInteger(saved.goals) && saved.goals >= 0 && saved.goals <= rounds.length) {
      return {goals:saved.goals, mute:!!saved.mute};
    }
  } catch {}
  return {goals:0, mute:false};
}

function save() {
  try {
    localStorage.setItem(progressKey, JSON.stringify(state));
    if (state.goals === rounds.length) localStorage.setItem(completeKey, 'true');
  } catch {}
}

function playEffect(audio) {
  if (!state.mute && startedHere) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}

function playVoice(clip, onError) {
  const turn = ++voiceTurn;
  voice?.pause();
  const current = new Audio(base + clip + '.mp3');
  voice = current;
  return new Promise(resolve => {
    function finish(ok) {
      current.removeEventListener('ended', ended);
      current.removeEventListener('pause', paused);
      if (!ok && turn === voiceTurn) onError?.();
      resolve(ok && turn === voiceTurn);
    }
    const ended = () => finish(true);
    const paused = () => finish(current.ended);
    current.addEventListener('ended', ended, {once:true});
    current.addEventListener('pause', paused, {once:true});
    current.play().catch(() => finish(false));
  });
}

function ambience() {
  soundSwitch.setAttribute('aria-pressed', String(!state.mute));
  soundSwitch.textContent = state.mute ? 'Стадион: звук выкл.' : 'Стадион: звук вкл.';
  if (state.mute) {
    crowd.pause();
    Object.values(effects).forEach(effect => effect.pause());
  } else if (startedHere && state.goals < rounds.length) {
    crowd.play().catch(() => {});
  }
}

function scoreboard(goalCount) {
  return `<div class="scoreboard" aria-label="Голы: ${goalCount} из ${rounds.length}">
    <span>Голы · ${goalCount} / ${rounds.length}</span><span class="score" aria-hidden="true">${rounds.map((_,i) =>
      `<i class="${i<goalCount?'won':''}"></i>`).join('')}</span>
  </div>`;
}

function kickOff() {
  startedHere = true;
  ambience();
  playEffect(effects.whistle);
  renderRound();
  playVoice('intro').then(played => {
    if (played && game.querySelector('#listen-word') && voice.ended) game.querySelector('#listen-word').click();
  });
}

function showStart(finish = false) {
  crowd.pause();
  game.innerHTML = `${scoreboard(state.goals)}<div class="stands" aria-hidden="true"></div>
    <section class="panel" tabindex="-1">
      ${finish ? '<span class="trophy" aria-hidden="true">🏆</span><h2>Аскар, кубок твой!</h2><p>Пять слов на слух, пять голов. Домашка готова!</p>' :
        '<h2>Серия из пяти ударов</h2><p>Нажми на цель в воротах или перетащи туда мяч.</p>'}
      <div class="actions">
        <button type="button" class="primary start">${finish ? 'Сыграть ещё раз' : state.goals ? 'Продолжить' : 'На поле'}</button>
        ${finish ? '<a class="do" href="index.html#homework">К домашке</a>' : ''}
      </div>
    </section>`;
  game.querySelector('.start').addEventListener('click', () => {
    if (state.goals === rounds.length) {
      state.goals = 0;
      save();
    }
    kickOff();
  });
  if (finish) game.querySelector('.panel').focus({preventScroll:true});
}

function renderRound(focus = true) {
  const [target, choices] = rounds[state.goals];
  const word = words[target];
  game.innerHTML = `${scoreboard(state.goals)}<div class="stands" aria-hidden="true"></div>
    <div class="pitch" aria-label="Пенальти">
      <div class="goals">${choices.map(id => {
        const answer = words[id];
        return `<button class="goal" type="button" data-target="${id}" aria-label="${answer[2]}">
          ${answer[3] ? `<span class="target-icon" aria-hidden="true">${answer[3]}</span>` : `<span class="flag ${id}" aria-hidden="true"></span>`}
        </button>`;
      }).join('')}</div>
      <span class="keeper" aria-hidden="true"></span><span class="spot" aria-hidden="true"></span>
      <span class="ball" aria-hidden="true">⚽</span>
    </div>
    <div class="panel" tabindex="-1">
      <h2>Удар ${state.goals + 1} из ${rounds.length}</h2>
      <p>${target === 'keeper' ? 'Послушай и выбери картинку.' : 'Послушай название страны. Выбери её флаг.'}</p>
      <div class="actions">
        <button class="primary" type="button" id="listen-word">🔊 Слушать</button>
        <button class="primary next" type="button" hidden>${state.goals + 1 === rounds.length ? 'Забрать кубок' : 'Следующий удар'}</button>
      </div>
      <p class="status" role="status"></p>
      <details class="clue"><summary>Подсказка</summary><p><strong lang="zh">${word[0]}</strong> · ${word[1]} · ${word[2]}</p></details>
    </div>`;

  const panel = game.querySelector('.panel');
  const pitch = game.querySelector('.pitch');
  const flags = [...game.querySelectorAll('.goal')];
  const ball = game.querySelector('.ball');
  const keeper = game.querySelector('.keeper');
  const next = game.querySelector('.next');
  const status = game.querySelector('.status');
  const listen = game.querySelector('#listen-word');
  let playing = false;
  let resolved = false;
  let heard = false;
  let dragging;

  function hear() {
    heard = true;
    playVoice(target, () => {
      panel.querySelector('.clue').open = true;
      status.textContent = 'Звук не открылся. Подсказка уже открыта.';
    });
  }

  function clearDrag() {
    flags.forEach(flag => flag.removeAttribute('data-over'));
    ball.style.transform = '';
    delete ball.dataset.grab;
    dragging = undefined;
  }

  async function shoot(option) {
    if (playing || resolved) return;
    if (!heard) {
      status.textContent = 'Сначала послушай слово.';
      hear();
      return;
    }
    playing = true;
    const hit = option.dataset.target === target;
    const origin = ball.getBoundingClientRect();
    const dest = option.getBoundingClientRect();
    const dx = (dest.left + dest.width / 2) - (origin.left + origin.width / 2);
    const dy = (dest.top + dest.height * .75) - (origin.top + origin.height / 2);
    voiceTurn++;
    voice.pause();
    playEffect(effects.kick);
    if (!reduced.matches) {
      const flight = ball.animate([{transform:'translate(0,0) scale(1)'},
        {transform:`translate(${dx}px,${dy}px) scale(.52)`}], {duration:440,easing:'cubic-bezier(.2,.6,.3,1)',fill:'forwards'});
      const block = hit ? -Math.sign(dx || 1) * pitch.clientWidth * .22 : dx;
      keeper.animate([{transform:'translateX(0)'},{transform:`translateX(${block}px) rotate(${block < 0 ? -23 : 23}deg)`}],
        {duration:410,fill:'forwards',easing:'ease-out'});
      await flight.finished.catch(() => {});
    }
    if (hit) {
      resolved = true;
      flags.forEach(flag => { flag.disabled = true; });
      option.dataset.hit = '';
      state.goals++;
      save();
      game.querySelector('.scoreboard').outerHTML = scoreboard(state.goals);
      playEffect(effects.goal);
      status.textContent = 'Гол! ' + word[2] + ' · ' + word[0];
      next.hidden = false;
      next.focus({preventScroll:true});
      if (state.goals === rounds.length) playVoice('score');
    } else {
      status.textContent = 'Вратарь отбил! Переслушай и пробей ещё раз.';
      ball.getAnimations().forEach(animation => animation.cancel());
      keeper.getAnimations().forEach(animation => animation.cancel());
      listen.focus({preventScroll:true});
    }
    playing = false;
  }

  for (const flag of flags) flag.addEventListener('click', () => shoot(flag));
  listen.addEventListener('click', hear);
  next.addEventListener('click', () => {
    if (state.goals === rounds.length) showStart(true);
    else renderRound();
  });
  ball.addEventListener('pointerdown', event => {
    if (playing || resolved || event.button !== 0) return;
    dragging = {id:event.pointerId, x:event.clientX, y:event.clientY};
    ball.setPointerCapture(event.pointerId);
    ball.dataset.grab = '';
  });
  ball.addEventListener('pointermove', event => {
    if (dragging?.id !== event.pointerId) return;
    ball.style.transform = `translate(${event.clientX-dragging.x}px,${event.clientY-dragging.y}px)`;
    const goal = document.elementFromPoint(event.clientX,event.clientY)?.closest('.goal');
    flags.forEach(flag => flag.toggleAttribute('data-over', flag === goal));
  });
  ball.addEventListener('pointerup', event => {
    if (dragging?.id !== event.pointerId) return;
    const goal = document.elementFromPoint(event.clientX,event.clientY)?.closest('.goal');
    clearDrag();
    if (flags.includes(goal)) shoot(goal);
  });
  ball.addEventListener('lostpointercapture', clearDrag);
  ball.addEventListener('pointercancel', clearDrag);
  if (focus) listen.focus({preventScroll:true});
}

soundSwitch.addEventListener('click', () => { state.mute = !state.mute; save(); ambience(); });
window.addEventListener('pagehide', () => { crowd.pause(); voice?.pause(); Object.values(effects).forEach(audio => audio.pause()); });
ambience();
showStart(state.goals === rounds.length);
