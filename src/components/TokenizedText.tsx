import { Fragment } from 'react'
import { KEY_INFO_META, tokenizeText } from '@/lib/key-info'
import { cn } from '@/lib/utils'

interface TokenizedTextProps {
  text: string
  className?: string
}

/** Renders URLs, dates, ticket ids and key numbers with distinct, quiet colors. */
export function TokenizedText({ text, className }: TokenizedTextProps) {
  const tokens = tokenizeText(text)
  return (
    <span className={className}>
      {tokens.map((token, index) => {
        if (!token.type) return <Fragment key={index}>{token.text}</Fragment>
        const meta = KEY_INFO_META[token.type]
        if (token.type === 'link') {
          return (
            <a
              key={index}
              href={token.text}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className={cn(
                'underline decoration-1 underline-offset-[3px] transition-colors hover:text-[#a8c3ea]',
                meta.className,
              )}
            >
              {token.text}
            </a>
          )
        }
        return (
          <span
            key={index}
            className={cn(
              'rounded-[3px] bg-white/[0.035] px-[0.16em]',
              meta.className,
            )}
          >
            {token.text}
          </span>
        )
      })}
    </span>
  )
}
