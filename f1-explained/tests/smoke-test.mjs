// Smoke test: serve the site on :8765 (python3 -m http.server 8765), then: npm i playwright && node tests/smoke-test.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = process.env.OUT || 'tests/screenshots';
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:8765/index.html';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('[error] ' + m.text()); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
await page.goto(BASE);
await page.waitForFunction(() => window.__f1Booted === true, null, { timeout: 60000 });
await page.evaluate(() => window.gsap.ticker.lagSmoothing(0));
const go = async (id, wait = 4500) => { await page.evaluate(id => { const el = document.getElementById(id); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 40); }, id); await page.waitForTimeout(wait); };
const check = (label, ok) => console.log((ok ? 'PASS ' : 'FAIL ') + label);

// 1. car selector swaps model (hero)
await go('hero', 2500);
await page.click('#carSelect button[data-car=wingcar]');
await page.waitForTimeout(5000);
check('car select -> wingcar', await page.evaluate(() => window.__stage.current.id === 'wingcar' && document.querySelector('#carSelect .on').dataset.car === 'wingcar'));
await page.screenshot({ path: `${OUT}/i_wingcar.png`, timeout: 120000 });
await page.click('#carSelect button[data-car=classic]');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/i_morph.png`, timeout: 120000 });   // mid-dissolve
await page.waitForTimeout(4000);

// 2. points widget
await go('intro', 2500);
await page.selectOption('#drvA', '0'); await page.selectOption('#drvB', '4');
check('points calc 25+10=35', (await page.textContent('#calcOut')).includes('35'));
await page.click('#pointsWidget button[data-mode=sprint]');
check('sprint points 8+4=12', (await page.textContent('#calcOut')).includes('12'));

// 3. qualifying
await go('weekend', 2000);
await page.click('#qualiPlay');
await page.waitForTimeout(9500);
check('quali pole shown', (await page.textContent('#qualiStage')).startsWith('Pole'));
check('quali 12 knocked out', (await page.$$('#qualiList li.out')).length === 12);
await page.click('.seg button[data-fmt=sprint]');
check('sprint timeline', (await page.textContent('#weekendTimeline')).includes('Sprint Qualifying'));

// 4. anatomy: click part button and a label, locked selector
await go('anatomy', 6000);
check('anatomy forces modern car', await page.evaluate(() => window.__stage.current.id === 'modern'));
await page.click('#partGrid button[data-part=ERS_MGUK]');
await page.waitForTimeout(800);
check('part card MGU-K', (await page.textContent('#partName')).includes('MGU-K'));
const lbl = await page.$('.lbl[data-part=Halo]');
await lbl.click({ force: true });
await page.waitForTimeout(600);
check('label click -> Halo', (await page.textContent('#partName')) === 'Halo');
await page.screenshot({ path: `${OUT}/i_anatomy_pick.png`, timeout: 120000 });
// click on the 3D canvas directly on the halo label anchor to test raycast picking
const pt = await page.evaluate(() => { const o = {}; window.__stage.partScreen('FrontWing', o); const r = document.getElementById('gl').getBoundingClientRect(); return { x: r.left + o.x, y: r.top + o.y }; });
await page.mouse.click(pt.x, pt.y);
await page.waitForTimeout(800);
check('raycast pick front wing', (await page.textContent('#partName')) === 'Front wing');
await page.click('#carSelect button[data-car=v10]');
await page.waitForTimeout(800);
check('selector locked in anatomy', await page.evaluate(() => window.__stage.current.id === 'modern'));
await page.click('[data-explode="0"]');
await page.waitForTimeout(2500);
check('assemble button', await page.evaluate(() => window.__stage.current.parts.FrontWing.node.position.x < 0.05 + window.__stage.current.parts.FrontWing.base.x));

// 5. aero slider
await go('aero', 3000);
await page.fill('#spd', '340');
await page.dispatchEvent('#spd', 'input');
check('aero df 100 at 340 high?', (await page.textContent('#dfVal')) !== '');
await page.click('#aeroWidget button[data-wing=high]');
check('aero high df = 100', (await page.textContent('#dfVal')) === '100');

// 6. power modes
await go('power', 4000);
await page.click('#puWidget button[data-flow="2026"]');
await page.waitForTimeout(1500);
check('2026 hides MGU-H', await page.evaluate(() => window.__stage.current.parts.ERS_MGUH.node.visible === false));
await page.screenshot({ path: `${OUT}/i_power2026.png`, timeout: 120000 });
await page.click('#puWidget button[data-flow="brake"]');

// 7. tyres
await go('tyres', 4000);
await page.click('#compounds button[data-c=medium]');
await page.waitForTimeout(1500);
check('medium stripe yellow', await page.evaluate(() => { const m = window.__stage.cars.modern.stripeMats[0]; return m.color.r > 0.8 && m.color.g > 0.6 && m.color.b < 0.2; }));
await page.screenshot({ path: `${OUT}/i_tyres_medium.png`, timeout: 120000 });

// 8. strategy
await go('pit', 3000);
await page.click('#stratWidget button[data-strat=over]');
await page.waitForTimeout(2000);
check('overcut caption', (await page.textContent('#stratCaption')).includes('Overcut'));
await page.evaluate(() => document.getElementById('stratWidget').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/i_strategy.png`, timeout: 120000 });

// 9. flags
await go('flags', 3000);
const flagBtns = await page.$$('#flagGrid button');
check('11 flags', flagBtns.length === 11);
await flagBtns[3].click();
await page.waitForTimeout(1000);
check('red flag info', (await page.textContent('#flagInfo')).includes('Session stopped'));
check('stage tinted', await page.evaluate(() => document.getElementById('stage').classList.contains('tinted')));
await page.screenshot({ path: `${OUT}/i_flag_red.png`, timeout: 120000 });

// 10. eras: step through each era
await go('eras', 3000);
for (const era of ['classic', 'wingcar', 'v10', 'modern']) {
  await page.evaluate(era => { const el = document.querySelector(`.era[data-era=${era}]`); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 200); }, era);
  await page.waitForTimeout(4500);
  check('era ' + era, await page.evaluate(() => window.__stage.current.id) === era);
  await page.screenshot({ path: `${OUT}/i_era_${era}.png`, timeout: 120000 });
}

// 11. quiz: answer all correctly
await go('quiz', 2500);
const answers = [2, 1, 2, 1, 1, 1, 2, 2, 1, 1, 2, 2];
for (const a of answers) {
  await page.click(`#quizBox .opts button[data-k="${a}"]`);
  await page.click('#quizBox .q-next');
}
check('quiz 12/12', (await page.textContent('#quizBox .score')) === '12/12');
await page.screenshot({ path: `${OUT}/i_quiz_done.png`, timeout: 120000 });

// 12. nav link
await page.click('#nav a[href="#drs"]');
await page.waitForTimeout(3500);
check('nav -> drs active', await page.evaluate(() => document.querySelector('#nav a.active')?.getAttribute('href') === '#drs'));

console.log('ERRORS:\n' + (errors.join('\n') || 'none'));
await browser.close();
