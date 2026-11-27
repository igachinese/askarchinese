const unit = 'riddle-fair';
let player;
const notice = document.querySelector('#lesson-audio-status');
function speak(clip) {
  player?.pause();
  const current = new Audio(`media/${unit}/studio/${clip}.mp3`);
  player = current;
  notice.textContent = '';
  current.play().catch(error => {
    if (player === current && error.name !== 'AbortError') notice.textContent = 'Запись не загрузилась. Открой текст рядом с заданием.';
  });
}
window.addEventListener('pagehide', () => player?.pause());
const riddles = [
  {"id": "apple", "zh": "苹果", "py": "píngguǒ", "ru": "яблоко", "hint": "Смотри на дерево: кожура бывает красной или зелёной.", "choices": ["phone", "apple", "crab"], "text": "我长在树上。我的皮有时候是红的，有时候是绿的。我是什么？"},
  {"id": "crab", "zh": "螃蟹", "py": "pángxiè", "ru": "краб", "hint": "Покажи руками «ножницы» и шагни вбок.", "choices": ["crab", "goalie", "elephant"], "text": "我会往左走，也会往右走。我有两把大剪刀。我是什么？"},
  {"id": "elephant", "zh": "大象", "py": "dàxiàng", "ru": "слон", "hint": "У этого животного очень длинный нос.", "choices": ["apple", "crab", "elephant"], "text": "我的耳朵很大，鼻子很长。我是什么动物？"},
  {"id": "phone", "zh": "手机", "py": "shǒujī", "ru": "телефон", "hint": "Как позвонить маме?", "choices": ["elephant", "phone", "apple"], "text": "我很小。你可以用我给妈妈打电话。我是什么？"},
  {"id": "goalie", "zh": "门将", "py": "ménjiàng", "ru": "вратарь", "hint": "Кто у ворот может ловить мяч руками?", "choices": ["goalie", "phone", "elephant"], "text": "我是一个球员。我站在球门前，可以用手接球。我是谁？"}
];
const tabs = document.querySelector('#riddle-tabs');
const panel = document.querySelector('#riddle-screen');
const progress = document.querySelector('#riddle-progress');
const solved = new Set();
let current = 0;

function render(focus = false) {
  player?.pause();
  const riddle = riddles[current];
  const finished = solved.has(riddle.id);
  progress.textContent = solved.size === riddles.length
    ? 'Все пять фонариков горят! Теперь загадай загадку преподавателю.'
    : 'Горят фонарики: ' + solved.size + ' из ' + riddles.length;
  tabs.innerHTML = riddles.map((item, index) =>
    `<button class="lantern-tab" type="button" data-index="${index}" aria-label="Фонарик ${index + 1}${solved.has(item.id) ? ', разгадан' : ''}"
      ${index === current ? 'aria-current="step"' : ''} ${solved.has(item.id) ? 'data-solved' : ''}>🏮 ${index + 1}</button>`).join('');
  panel.innerHTML = `<div class="lesson-cell">
    <h3 tabindex="-1">Фонарик ${current + 1}</h3>
    <p>Послушай. Попробуй ответить вслух: <span lang="zh">是……</span></p>
    <div class="actions"><button class="btn" type="button" data-riddle-audio="${riddle.id}">Слушать загадку</button>
      <button class="btn secondary" type="button" data-riddle-audio="${riddle.id}-slow">Медленнее</button></div>
    <details class="riddle-hint hint"><summary>Открыть подсказку</summary><p>${riddle.hint}</p>
      <details class="hint"><summary>Текст загадки</summary><p class="listen-line" lang="zh">${riddle.text}</p></details>
    </details>
    <button class="btn secondary pictures-toggle" type="button" aria-controls="riddle-choices" aria-expanded="${finished}">${finished ? 'Спрятать картинки' : 'Показать картинки'}</button>
    <div id="riddle-choices" class="riddle-options" ${finished ? '' : 'hidden'}>
      ${riddle.choices.map(id => {
        const item = riddles.find(record => record.id === id);
        return `<button class="riddle-option" type="button" data-guess="${id}" aria-label="${item.ru}"
          ${finished ? 'disabled' : ''} ${finished && id === riddle.id ? 'data-correct' : ''}>
          <img src="media/${unit}/${id}.webp" alt="" width="384" height="384"></button>`;
      }).join('')}
    </div>
    <p class="status riddle-feedback" role="status"></p>
    <div class="answer-box" ${finished ? '' : 'hidden'}>
      <p lang="zh">是${riddle.zh}！</p><p>${riddle.py} · ${riddle.ru}</p>
      <div class="actions"><button class="btn secondary" type="button" data-riddle-audio="${riddle.id}word">Послушать ответ</button>
        <a class="btn secondary" href="#your-riddle" ${solved.size === riddles.length ? '' : 'hidden'}>Загадать самому</a></div>
    </div>
  </div>`;
  if (focus) panel.querySelector('h3').focus();
}
tabs.addEventListener('click', event => {
  const tab = event.target.closest('[data-index]');
  if (!tab) return;
  current = Number(tab.dataset.index);
  render(true);
});
panel.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.riddleAudio) { speak(button.dataset.riddleAudio); return; }
  const choices = panel.querySelector('#riddle-choices');
  if (button.classList.contains('pictures-toggle')) {
    choices.hidden = !choices.hidden;
    button.setAttribute('aria-expanded', String(!choices.hidden));
    button.textContent = choices.hidden ? 'Показать картинки' : 'Спрятать картинки';
    return;
  }
  if (!button.dataset.guess) return;
  const riddle = riddles[current];
  if (button.dataset.guess === riddle.id) {
    solved.add(riddle.id);
    render();
    panel.querySelector('[data-riddle-audio$="word"]').focus({preventScroll:true});
  } else {
    panel.querySelector('.riddle-feedback').textContent = 'Попробуй ещё раз. Можно открыть подсказку.';
  }
});
render();
