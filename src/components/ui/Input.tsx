import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-white/5 bg-[#172234]/50 px-3.5 py-2 text-sm text-white placeholder-muted-foreground transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
