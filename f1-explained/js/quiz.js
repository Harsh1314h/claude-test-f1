// ============================================================================
// quiz.js: "test yourself" section
// ============================================================================
const QUESTIONS = [
  ['How many points does a Grand Prix winner score?', ['10', '20', '25', '30'], 2,
    'The top 10 score 25-18-15-12-10-8-6-4-2-1.'],
  ['How is the Constructors\' Championship scored?', ['Only the best driver counts', 'Both drivers\' points are added together', 'Points for pole positions', 'Fastest pit stop each race'], 1,
    'Each team runs two cars; both drivers\' points go into the team total.'],
  ['Which qualifying session decides pole position?', ['Q1', 'Q2', 'Q3', 'The Sprint'], 2,
    'Q3 is the top-10 shootout. The fastest driver in Q3 starts first.'],
  ['What does the diffuser do?', ['Cools the brakes', 'Slows the fast underfloor air back down, keeping pressure under the car low', 'Reduces tyre wear', 'Adds engine power'], 1,
    'Expanding the air gradually lets the floor keep generating strong suction (ground effect).'],
  ['To use DRS in a race (2011–25), how close did you need to be to the car ahead at the detection point?', ['Within 0.5 s', 'Within 1 second', 'Within 3 seconds', 'Any gap'], 1,
    'Within one second at the detection point, then it could be opened in the following activation zone.'],
  ['What does the MGU-K do under braking?', ['Heats the tyres', 'Turns kinetic energy into electricity for the battery', 'Opens the rear wing', 'Cools the engine'], 1,
    'It acts as a generator, recovering energy that would otherwise become brake heat.'],
  ['Which power-unit component was removed for 2026?', ['The turbocharger', 'The MGU-K', 'The MGU-H', 'The battery'], 2,
    'The MGU-H was dropped; the MGU-K became much more powerful (350 kW).'],
  ['Which compound has a red sidewall marking?', ['Hard', 'Medium', 'Soft', 'Intermediate'], 2,
    'Soft = red, Medium = yellow, Hard = white, Inter = green, Wet = blue.'],
  ['In a dry race, what must every driver do?', ['Use the soft tyre', 'Use at least two different dry compounds', 'Stop exactly twice', 'Start on hard tyres'], 1,
    'This rule forces at least one pit stop, unless the race is declared wet.'],
  ['What is an "undercut"?', ['Overtaking on the inside of a corner', 'Pitting before your rival to use fresh-tyre pace', 'Running a lower ride height', 'Cutting a chicane'], 1,
    'Fresh tyres are faster, so stopping first can let you jump ahead when the rival stops.'],
  ['A blue flag means…', ['The race is over', 'Slippery track', 'A faster car is lapping you: let it by', 'Return to the pits'], 2,
    'Blue flags go to drivers about to be lapped. Ignore them and you get a penalty.'],
  ['When did the halo become compulsory?', ['2010', '2014', '2018', '2022'], 2,
    'Introduced in 2018, it has since protected drivers in several serious accidents.'],
];

export function initQuiz(root) {
  let i = 0, score = 0;
  const render = () => {
    if (i >= QUESTIONS.length) return result();
    const [q, opts, ans, why] = QUESTIONS[i];
    root.innerHTML = `<div class="q-head"><span>Question ${i + 1} / ${QUESTIONS.length}</span><span>Score ${score}</span></div>
      <div class="q-bar"><i style="width:${(i / QUESTIONS.length) * 100}%"></i></div>
      <h4>${q}</h4><div class="opts">${opts.map((o, k) => `<button data-k="${k}">${o}</button>`).join('')}</div>`;
    root.querySelectorAll('.opts button').forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.k;
      const right = k === ans;
      if (right) score++;
      root.querySelectorAll('.opts button').forEach(x => { x.disabled = true; if (+x.dataset.k === ans) x.classList.add('right'); });
      if (!right) b.classList.add('wrong');
      const ex = document.createElement('div');
      ex.className = 'explain';
      ex.innerHTML = `<b>${right ? 'Correct!' : 'Not quite.'}</b> ${why}`;
      root.appendChild(ex);
      const nx = document.createElement('button');
      nx.className = 'btn small q-next';
      nx.textContent = i === QUESTIONS.length - 1 ? 'See my result →' : 'Next question →';
      nx.addEventListener('click', () => { i++; render(); });
      root.appendChild(nx);
      nx.focus({ preventScroll: true });
    }));
  };
  const result = () => {
    const pct = score / QUESTIONS.length;
    const title = pct === 1 ? 'World Champion! 🏆' : pct >= 0.75 ? 'Podium finish!' : pct >= 0.5 ? 'In the points.' : 'Back to the simulator…';
    root.innerHTML = `<div class="result"><b class="score">${score}/${QUESTIONS.length}</b><h4>${title}</h4>
      <p>${pct === 1 ? 'Flawless. You\'re ready for race day.' : 'Scroll back up to any chapter to review, then try again.'}</p>
      <button class="btn primary">Restart quiz</button></div>`;
    root.querySelector('button').addEventListener('click', () => { i = 0; score = 0; render(); });
  };
  render();
}
