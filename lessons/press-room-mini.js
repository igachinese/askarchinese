const game = document.querySelector('#lesson-play');
const progressKey = 'press-room-mini.round';
const audio = new Audio();

const words = {
  football: {picture: '⚽', ru: 'Футбол', zh: '足球', py: 'zúqiú'},
  basketball: {picture: '🏀', ru: 'Баскетбол', zh: '篮球', py: 'lánqiú'},
  goal: {picture: '🥅', ru: 'Гол', zh: '进球', py: 'jìn qiú'},
};
const hunt = ['basketball', 'football', 'goal'];
const shots = [
  {count: 2, clip: 'two', zh: '我进了两个球！', py: 'Wǒ jìn le liǎng ge qiú!'},
  {count: 1, clip: 'one', zh: '我进了一个球！', py: 'Wǒ jìn le yí ge qiú!'},
  {count: 3, clip: 'three', zh: '我进了三个球！', py: 'Wǒ jìn le sān ge qiú!'},
];
const question = {zh: '你喜欢什么运动？', py: 'Nǐ xǐhuan shénme yùndòng?'};
const answers = {
  football: {zh: '我喜欢足球。', py: 'Wǒ xǐhuan zúqiú.', ru: 'Я люблю футбол.'},
  basketball: {zh: '我喜欢篮球。', py: 'Wǒ xǐhuan lánqiú.', ru: 'Я люблю баскетбол.'},
};

const penaltyStart = hunt.length;
const interviewRound = penaltyStart + shots.length;
const finishRound = interviewRound + 1;
let round = 0;
try {
  const saved = Number(localStorage.getItem(progressKey));
  if (Number.isInteger(saved) && saved >= 0 && saved <= finishRound) round = saved;
} catch {}

function phrase({zh, py}) {
  return `<span lang="zh">${zh}</span><br><span class="pinyin">${py}</span>`;
}

function listen(clip, onError) {
  const source = new URL(`media/press-room/mini/${clip}.mp3`, document.baseURI).href;
  if (audio.src !== source) audio.src = source;
  audio.currentTime = 0;
  audio.play().catch(error => {
    if (error.name !== 'AbortError') onError();
  });
}

function pictureTile(key) {
  const word = words[key];
  return `<button type="button" class="tile" data-choice="${key}">
    <span class="picture" aria-hidden="true">${word.picture}</span><span>${word.ru}</span>
  </button>`;
}

function listener(label, clue) {
  return `<div class="listen-row">
    <button type="button" class="button listen">${label}</button>
    <details class="hint"><summary>Подсказка</summary><p>${phrase(clue)}</p></details>
  </div>`;
}

function setRound(value) {
  round = value;
  audio.pause();
  try { localStorage.setItem(progressKey, round); } catch {}
  render(true);
}

function showScore(label, stars) {
  return `<p class="score"><span>${label}</span>
    <span aria-hidden="true">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
  </p>`;
}

function bindListen(panel, clip) {
  const play = panel.querySelector('.listen');
  play.addEventListener('click', () => listen(clip, () => {
    panel.querySelector('details').open = true;
    panel.querySelector('.status').textContent = 'Звук не открылся. В подсказке есть фраза.';
  }));
}

function bindChoices(panel, correct, feedback, onCorrect) {
  const choices = [...panel.querySelectorAll('[data-choice]')];
  const status = panel.querySelector('.status');
  const next = panel.querySelector('.next');
  for (const button of choices) {
    button.addEventListener('click', () => {
      if (button.dataset.choice !== correct) {
        status.textContent = round < penaltyStart ? 'Послушай ещё раз!' : 'Посчитай мячи и попробуй ещё!';
        return;
      }
      for (const choice of choices) choice.disabled = true;
      button.dataset.right = '';
      status.textContent = feedback;
      onCorrect?.(button);
      next.hidden = false;
      next.focus({preventScroll: true});
    });
  }
  next.addEventListener('click', () => setRound(round + 1));
}

function drawHunt() {
  const target = hunt[round];
  const word = words[target];
  game.innerHTML = `${showScore('Поиск · ' + (round + 1) + ' из ' + hunt.length, 0)}
    <div class="panel" tabindex="-1">
      <h2>Найди картинку</h2>
      <p>Послушай слово и нажми на картинку.</p>
      ${listener('🔊 Слушать слово', word)}
      <div class="picture-grid">${Object.keys(words).map(pictureTile).join('')}</div>
      <p class="status" role="status"></p>
      <button type="button" class="button next" hidden>${round + 1 === penaltyStart ? 'К воротам' : 'Дальше'}</button>
    </div>`;
  const panel = game.querySelector('.panel');
  bindListen(panel, target);
  bindChoices(panel, target, 'Есть! ' + word.zh + ' · ' + word.py + ' · ' + word.ru.toLowerCase() + '.');
}

function drawPenalty() {
  const shotNumber = round - penaltyStart;
  const shot = shots[shotNumber];
  game.innerHTML = `${showScore('Пенальти · ' + (shotNumber + 1) + ' из ' + shots.length, 1)}
    <div class="panel" tabindex="-1">
      <h2>Пробей пенальти</h2>
      <p>Послушай игрока. В каких воротах столько же мячей?</p>
      ${listener('🔊 Слушать игрока', shot)}
      <div class="pitch">
        <div class="goal-grid">
          ${[3, 2, 1].map(count => `<button type="button" class="tile goal" data-choice="${count}"
            aria-label="Ворота с ${count} ${count === 1 ? 'мячом' : 'мячами'}">
            <span class="goal-balls" aria-hidden="true">${'⚽'.repeat(count)}</span>
          </button>`).join('')}
        </div>
        <span class="shot" aria-hidden="true">⚽</span>
      </div>
      <p class="status" role="status"></p>
      <button type="button" class="button next" hidden>${round + 1 === interviewRound ? 'К интервью' : 'Следующий удар'}</button>
    </div>`;
  const panel = game.querySelector('.panel');
  bindListen(panel, shot.clip);
  bindChoices(panel, String(shot.count), 'Гол! ' + shot.count + (shot.count === 1 ? ' мяч.' : ' мяча.'), button => {
    const pitch = panel.querySelector('.pitch');
    const {left, width} = button.getBoundingClientRect();
    pitch.style.setProperty('--shot-left', (left - pitch.getBoundingClientRect().left + width / 2) + 'px');
    pitch.dataset.shot = '';
  });
}

function drawInterview() {
  game.innerHTML = `${showScore('Интервью', 2)}
    <div class="panel" tabindex="-1">
      <h2>Твой выход, Аскар!</h2>
      <p>Журналист спрашивает, какой спорт ты любишь.</p>
      ${listener('🎙️ Слушать вопрос', question)}
      <div class="picture-grid interview">${['football', 'basketball'].map(pictureTile).join('')}</div>
      <p class="status" role="status"></p>
      <div class="answer" hidden>
        <p class="answer-phrase"></p>
        <div class="listen-row">
          <button type="button" class="button model">🔊 Слушать ответ</button>
          <button type="button" class="button button-gold after-speaking">Я сказал!</button>
        </div>
      </div>
    </div>`;
  const panel = game.querySelector('.panel');
  const status = panel.querySelector('.status');
  const answer = panel.querySelector('.answer');
  const model = panel.querySelector('.model');
  const choices = [...panel.querySelectorAll('[data-choice]')];
  let selected;
  bindListen(panel, 'question');
  for (const choice of choices) {
    choice.setAttribute('aria-pressed', 'false');
    choice.addEventListener('click', () => {
      selected = choice.dataset.choice;
      for (const item of choices) item.setAttribute('aria-pressed', String(item === choice));
      panel.querySelector('.answer-phrase').innerHTML = phrase(answers[selected]) + '<br>' + answers[selected].ru;
      status.textContent = 'Послушай и скажи эту фразу вслух.';
      answer.hidden = false;
    });
  }
  model.addEventListener('click', () => listen('answer-' + selected, () => {
    status.textContent = 'Звук не открылся. Попробуй прочитать ответ по пиньиню.';
  }));
  panel.querySelector('.after-speaking').addEventListener('click', () => setRound(finishRound));
}

function drawFinish() {
  game.innerHTML = `${showScore('Кубок Аскара', 3)}
    <div class="panel" tabindex="-1">
      <span class="trophy" aria-hidden="true">🏆</span>
      <h2>Кубок твой!</h2>
      <p>Мячи найдены. Три удара — три гола. Интервью готово!</p>
      <button type="button" class="button after">Сыграть ещё раз</button>
    </div>`;
  game.querySelector('button').addEventListener('click', () => setRound(0));
}

function render(focus = false) {
  if (round < penaltyStart) drawHunt();
  else if (round < interviewRound) drawPenalty();
  else if (round === interviewRound) drawInterview();
  else drawFinish();

  if (focus) {
    game.querySelector('.panel').focus({preventScroll: true});
    game.scrollIntoView({block: 'start'});
  }
}

for (const button of document.querySelectorAll('[data-audio]')) {
  button.addEventListener('click', () => listen(button.dataset.audio, () => {
    document.querySelector('#warmup-status').textContent = 'Звук не открылся. Произношение написано под картинкой.';
  }));
}
render();
