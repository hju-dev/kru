// Simulates many Gossip Circle rounds and prints repeated pairs + group sizes per round.
// Usage: node scripts/simulate-groups.cjs [students...]   (default 30 31 32 40)
const fs = require('fs'), path = require('path')
const m = { exports: {} }
new Function('module', fs.readFileSync(path.join(__dirname, '../public/games/group-maker/groups.js'), 'utf8'))(m)
const G = m.exports
const sizesList = process.argv.slice(2).map(Number).filter(Boolean)
for (const n of sizesList.length ? sizesList : [30, 31, 32, 40]) {
  let rounds = [], firstRepeat = null
  console.log(`\n== ${n} students ==`)
  for (let r = 1; r <= 20; r++) {
    const ids = Array.from({ length: n }, (_, i) => 'S' + (i + 1))
    const teacher = G.teacherJoins('auto', n, 3)
    const players = teacher ? ids.concat('T') : ids
    const counts = G.pairCounts(rounds)
    const res = G.shuffle(players, 3, counts)
    rounds.push({ groups: res.groups })
    if (res.repeats && firstRepeat == null) firstRepeat = r
    const sz = {}; res.groups.forEach((g) => (sz[g.length] = (sz[g.length] || 0) + 1))
    console.log(`round ${String(r).padStart(2)}: teacher ${teacher ? 'yes' : 'no '} sizes ${JSON.stringify(sz)} repeated pairs ${res.repeats}`)
  }
  console.log(firstRepeat ? `first round with an unavoidable repeat: ${firstRepeat}` : 'no repeats in 20 rounds')
}
