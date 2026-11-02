import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[7px] text-[12.5px] font-medium tracking-[0.01em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7b96c2]/70 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default:
          'border border-[#7594c5]/25 bg-[#3f5d88] text-[#eef2f8] hover:bg-[#496a99]',
        secondary:
          'border border-white/[0.08] bg-white/[0.04] text-[#d7dbe2] hover:border-white/[0.14] hover:bg-white/[0.065]',
        outline:
          'border border-white/[0.09] bg-transparent text-[#c7ccd5] hover:border-white/[0.16] hover:bg-white/[0.035]',
        ghost:
          'border border-transparent bg-transparent text-[#9299a6] hover:bg-white/[0.045] hover:text-[#dfe3ea]',
        danger:
          'border border-[#b96d6d]/25 bg-[#6e3f43]/35 text-[#e2b7b7] hover:bg-[#7d474c]/45',
        link: 'text-[#8ca9d3] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3',
        sm: 'h-7 rounded-[6px] px-2.5 text-[11.5px]',
        lg: 'h-9 px-4',
        icon: 'h-8 w-8 p-0',
        'icon-sm': 'h-7 w-7 rounded-[6px] p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
