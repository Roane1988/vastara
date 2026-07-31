import { Fragment } from 'react'
import { parseBlocks, tokenizeInline, isSafeUrl } from '../utils/markdown'

function Inline({ text, onTag }) {
  const tokens = tokenizeInline(text)
  const nodes = []
  let key = 0
  tokens.forEach((tok) => {
    if (tok.type === 'text') {
      const lines = tok.value.split('\n')
      lines.forEach((line, li) => {
        if (li > 0) nodes.push(<br key={`br-${key++}`} />)
        if (line) nodes.push(<Fragment key={`t-${key++}`}>{line}</Fragment>)
      })
    } else if (tok.type === 'bold') {
      nodes.push(<strong key={`b-${key++}`} className="font-bold text-brand-text">{tok.value}</strong>)
    } else if (tok.type === 'italic') {
      nodes.push(<em key={`i-${key++}`} className="italic">{tok.value}</em>)
    } else if (tok.type === 'code') {
      nodes.push(
        <code key={`c-${key++}`} className="bg-brand-bg border border-brand-border rounded px-1.5 py-0.5 text-[12px] font-mono text-brand-accent">
          {tok.value}
        </code>
      )
    } else if (tok.type === 'link') {
      nodes.push(
        isSafeUrl(tok.url)
          ? <a key={`l-${key++}`} href={tok.url} target="_blank" rel="noopener noreferrer" className="text-brand-accent underline decoration-brand-accent/40 hover:decoration-brand-accent">{tok.text}</a>
          : <Fragment key={`l-${key++}`}>{tok.text}</Fragment>
      )
    } else if (tok.type === 'tag') {
      nodes.push(
        onTag
          ? <button key={`g-${key++}`} type="button" onClick={() => onTag(tok.value)} className="text-brand-accent font-semibold hover:underline">#{tok.value}</button>
          : <span key={`g-${key++}`} className="text-brand-accent font-semibold">#{tok.value}</span>
      )
    }
  })
  return nodes
}

const blockClass = {
  paragraph: 'text-sm text-brand-text leading-relaxed',
  h1: 'text-lg font-bold text-brand-text mt-4 mb-1.5',
  h2: 'text-base font-bold text-brand-text mt-4 mb-1.5',
  h3: 'text-sm font-bold text-brand-text mt-3 mb-1',
  quote: 'border-l-[3px] border-brand-accent/40 bg-brand-bg/60 rounded-r-lg px-3 py-2 my-2 text-sm text-brand-muted',
}

export default function Markdown({ content, className = '', onTag = null }) {
  const blocks = parseBlocks(content)
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.type === 'paragraph') {
          return (
            <p key={i} className={`${blockClass.paragraph} ${i > 0 ? 'mt-2.5' : ''}`}>
              <Inline text={block.text} onTag={onTag} />
            </p>
          )
        }
        if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
          const Tag = block.type
          return (
            <Tag key={i} className={blockClass[block.type]}>
              <Inline text={block.text} onTag={onTag} />
            </Tag>
          )
        }
        if (block.type === 'quote') {
          return (
            <blockquote key={i} className={blockClass.quote}>
              <Inline text={block.text} onTag={onTag} />
            </blockquote>
          )
        }
        if (block.type === 'ul' || block.type === 'ol') {
          const Tag = block.type
          return (
            <Tag key={i} className={`${block.type === 'ul' ? 'list-disc' : 'list-decimal'} list-inside space-y-1 my-2 text-sm text-brand-text`}>
              {block.items.map((item, ii) => (
                <li key={ii}>
                  <Inline text={item} onTag={onTag} />
                </li>
              ))}
            </Tag>
          )
        }
        return null
      })}
    </div>
  )
}
