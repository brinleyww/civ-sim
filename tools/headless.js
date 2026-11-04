// Runs the simulation with no screen, for balance checks: node tools/headless.js [seed] [years] [w] [h] [type]
const fs = require('fs'), path = require('path'), vm = require('vm');
for (const f of ['core', 'worldgen', 'earth', 'tech', 'inventions', 'content', 'traits', 'society', 'politics', 'people', 'money', 'life', 'weather', 'snow', 'canals', 'roads', 'ships', 'ports', 'war', 'battle', 'walls', 'food', 'revolutions', 'modern', 'labour', 'offices', 'education', 'citylife']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), { filename: f + '.js' });
}
const [seed, years, w, h, type, inv] = [+process.argv[2] || 7, +process.argv[3] || 1000, +process.argv[4] || 300, +process.argv[5] || 210, process.argv[6] || 'continents', +process.argv[7] || 1];
vm.runInThisContext(`
(function(){
  const t0 = Date.now();
  createWorld({ w: ${w}, h: ${h}, seed: ${seed}, type: '${type}', tribes: 8, perTribe: 22, maxPop: +process.env.MAXPOP || 6000, inv: ${inv}, agentCap: +process.env.AGENTS || 60000 });
  console.log('gen ms', Date.now() - t0, 'land', W.water.filter(v => !v).length, 'towns', W.towns.length, 'herds', W.herds.length);
  const c = {}; for (const v of W.ore) c[v] = (c[v] || 0) + 1; console.log('ore tiles', JSON.stringify(c));
  let logged = 0, tick0 = Date.now(), ticks0 = 0;
  const showLog = ${process.env.LOG ? 1 : 0};
  const limit = ${years} * TPY;
  while (W.tick < limit) {
    stepWorld();
    if (W.tick % (TPY * 100) === 0) {
      const dt = Date.now() - tick0; const ms = dt / (W.tick - ticks0); tick0 = Date.now(); ticks0 = W.tick;
      const big = W.towns.slice().sort((a, b) => b.members.length - a.members.length)[0];
      const jobs = new Array(J.N).fill(0); for (const p of W.people) jobs[p.job]++;
      const era = ERAS[W.eraNow];
      const alive = W.polities.filter(p => p.alive);
      const govs = {}; for (const p of alive) govs[GOV[p.gov].id] = (govs[GOV[p.gov].id] || 0) + 1;
      if (!process.env.QUIET) console.log('y' + W.tick / TPY, 'pop', W.people.length, 'towns', W.towns.length, 'nomad', W.towns.filter(t => t.nomad).length, 'big', big ? big.name + ':' + big.members.length : '-', 'techs', Object.keys(W.firsts).length, era, 'ms/tick', ms.toFixed(2), 'blds', W.blds.length, JSON.stringify(govs), 'wars', W.armies.length, 'herds', W.herds.length);
      if (showLog) { while (logged < W.log.length) { const e = W.log[logged++]; if (e.kind !== 'spread') console.log('   ', e.yr, e.kind, e.text); } }
      else logged = W.log.length;
      if (!W.people.length) { console.log('EXTINCT'); break; }
    }
  }
  console.log('END y' + Math.floor(W.tick/TPY), 'pop', W.people.length, 'towns', W.towns.length, 'realms', W.polities.filter(p=>p.alive&&p.pop>0).length, ERAS[W.eraNow], 'food?', W.towns.slice(0,3).map(t=>t.foodRate.toFixed(1)).join(','), JSON.stringify(W.causes));
  if (process.env.QUIET) return;
  console.log('deaths', JSON.stringify(W.causes), 'births', W.births);
  console.log('--- firsts ---');
  const f = Object.entries(W.firsts).sort((a, b) => a[1].year - b[1].year);
  console.log(f.map(([k, v]) => v.year + ' ' + k).join(', '));
  const big = W.towns.slice().sort((a, b) => b.members.length - a.members.length).slice(0, 4);
  for (const t of big) {
    console.log(t.name, townTier(t), t.members.length, 'fields', t.fields.length, 'foodRate', t.foodRate.toFixed(1), 'cap', t.cap, 'crop', t.crop, 'queue', t.queue.length);
    console.log('  stock', RES_NAME.map((n, i) => n + ':' + Math.round(t.stock[i])).join(' '));
    console.log('  jobs', JOB_NAME.map((n, i) => t.jobs[i] ? n + ':' + t.jobs[i] : '').filter(Boolean).join(' '));
    console.log('  bld', JSON.stringify(t.count));
    const hh = {}; for (const b of t.houses) hh[HOUSES[b.tier].id] = (hh[HOUSES[b.tier].id] || 0) + 1; console.log('  houses', JSON.stringify(hh));
  }
})();
`);
