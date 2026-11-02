import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer grid h-[15px] w-[15px] shrink-0 place-content-center rounded-[3px] border border-white/[0.18] bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8a9fc0]/70 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[#8a9fc0]/70 data-[state=checked]:bg-[#4d6384] data-[state=checked]:text-[#eef2f7]',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="grid place-content-center">
      <Check className="h-2.5 w-2.5" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
