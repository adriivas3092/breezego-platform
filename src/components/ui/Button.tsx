import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={loading || props.disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          // Variants
          variant === "default" && "bg-brand-cyan text-[#0b0f19] hover:bg-brand-cyan/90 font-bold shadow-md shadow-brand-cyan/10",
          variant === "secondary" && "bg-brand-teal text-white hover:bg-brand-teal/90 font-medium",
          variant === "outline" && "border border-white/10 bg-transparent text-white hover:bg-white/5",
          variant === "ghost" && "bg-transparent text-white hover:bg-white/5",
          variant === "link" && "text-brand-cyan hover:underline p-0 underline-offset-4",
          // Sizes
          size === "default" && "h-11 px-5 py-2.5",
          size === "sm" && "h-9 rounded-lg px-3 text-xs",
          size === "lg" && "h-12 rounded-2xl px-8",
          size === "icon" && "h-10 w-10 p-0",
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Cargando...
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
