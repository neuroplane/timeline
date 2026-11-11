// Integrity helpers for merged slot groups.
// Model: parent {length: N, rest: [childKeys]}, children {h: true, length: 1}.
// normalizeSlots() rebuilds merges deterministically from slot order + flags;
// validateSlots() reports violations without mutating.

const keyTime = key => {
  const [h, m] = key.split(' ')[1].split(':')
  return +h * 60 + +m
}

const keyDate = key => key.split(' ')[0]

export function validateSlots(slotsInfo) {
  const issues = []
  const claimed = new Map()

  for (const [k, s] of Object.entries(slotsInfo)) {
    if (!s || !s.key) continue
    if (s.rest) {
      if (s.length !== 1 + s.rest.length) {
        issues.push(`${k}: length=${s.length} != 1+rest=${1 + s.rest.length}`)
      }
      let t = keyTime(k) + 15
      for (const r of s.rest) {
        const c = slotsInfo[r]
        if (!c) issues.push(`${k}: rest -> missing ${r}`)
        else if (!c.h) issues.push(`${k}: rest -> ${r} not hidden`)
        if (keyTime(r) !== t) issues.push(`${k}: rest -> ${r} not contiguous`)
        if (claimed.has(r)) issues.push(`${r}: claimed by ${claimed.get(r)} and ${k}`)
        claimed.set(r, k)
        t += 15
      }
    }
  }

  for (const [k, s] of Object.entries(slotsInfo)) {
    if (!s || !s.key) continue
    if (s.h && !claimed.has(k)) issues.push(`${k}: orphan hidden slot`)
    if (s.h && s.rest?.length) issues.push(`${k}: hidden slot is itself a parent`)
  }

  return issues
}

export function normalizeSlots(slotsInfo) {
  const issues = []
  const byDay = {}

  for (const info of Object.values(slotsInfo)) {
    if (!info || !info.key) continue
    ;(byDay[keyDate(info.key)] ||= []).push(info)
  }

  for (const day of Object.keys(byDay)) {
    const sorted = byDay[day].sort((a, b) => keyTime(a.key) - keyTime(b.key))
    const parents = []
    let parent = null
    let expected = null

    for (const s of sorted) {
      const t = keyTime(s.key)

      if (s.h && parent && t === expected) {
        parent.rest.push(s.key)
        s.length = 1
        expected += 15
        continue
      }

      if (s.h) {
        delete s.h
        delete s.rest
        s.length = 1
        issues.push(`unhidden orphan ${s.key}`)
      }

      delete s.rest
      s.rest = []
      parent = s
      parents.push(s)
      expected = t + 15
    }

    for (const p of parents) {
      if (p.rest.length) {
        p.length = 1 + p.rest.length
      } else {
        delete p.rest
        p.length = 1
      }
    }
  }

  return issues
}
