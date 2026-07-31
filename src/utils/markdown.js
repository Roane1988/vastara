export function parseBlocks(source) {
  const lines = String(source || '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0
  let para = []

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'paragraph', text: para.join('\n') })
      para = []
    }
  }

  while (i < lines.length) {
    const trim = lines[i].trim()

    if (trim === '') {
      flushPara()
      i++
      continue
    }

    if (trim.startsWith('### ')) { flushPara(); blocks.push({ type: 'h3', text: trim.slice(4) }); i++; continue }
    if (trim.startsWith('## ')) { flushPara(); blocks.push({ type: 'h2', text: trim.slice(3) }); i++; continue }
    if (trim.startsWith('# ')) { flushPara(); blocks.push({ type: 'h1', text: trim.slice(2) }); i++; continue }

    if (/^>\s?/.test(trim)) {
      flushPara()
      const q = []
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        q.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'quote', text: q.join('\n') })
      continue
    }

    if (/^[-*]\s+/.test(trim)) {
      flushPara()
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    if (/^\d+[.)]\s+/.test(trim)) {
      flushPara()
      const items = []
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    para.push(lines[i])
    i++
  }
  flushPara()
  return blocks
}

const INLINE_RE = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|#([\w]+)/g

export function tokenizeInline(text) {
  const tokens = []
  let lastIndex = 0
  let m
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > lastIndex) tokens.push({ type: 'text', value: text.slice(lastIndex, m.index) })
    if (m[1]) tokens.push({ type: 'bold', value: m[1].slice(2, -2) })
    else if (m[2]) tokens.push({ type: 'italic', value: m[2].slice(1, -1) })
    else if (m[3]) tokens.push({ type: 'code', value: m[3].slice(1, -1) })
    else if (m[4]) {
      const inner = m[4]
      const close = inner.indexOf('](')
      tokens.push({ type: 'link', text: inner.slice(1, close), url: inner.slice(close + 2, -1) })
    } else if (m[5]) {
      tokens.push({ type: 'tag', value: m[5] })
    }
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) tokens.push({ type: 'text', value: text.slice(lastIndex) })
  return tokens
}

export function isSafeUrl(url) {
  return /^(https?:)?\/\//i.test(url) || url.startsWith('/')
}
