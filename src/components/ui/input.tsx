import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-[7px] border border-white/[0.09] bg-[#11141c] px-3 text-[12.5px] text-[#e2e5ea] placeholder:text-[#646b78] focus-visible:border-[#7b96c2]/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7b96c2]/35 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      'flex min-h-[64px] w-full resize-none rounded-[7px] border border-white/[0.09] bg-[#11141c] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#e2e5ea] placeholder:text-[#646b78] focus-visible:border-[#7b96c2]/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7b96c2]/35 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    ref={ref}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export { Input, Textarea }
