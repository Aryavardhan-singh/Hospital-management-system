import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-slate-100 text-slate-900 shadow hover:bg-slate-200 border border-slate-200",
        destructive:
          "bg-rose-950/80 text-rose-200 border border-rose-800/80 hover:bg-rose-900/80 shadow-sm",
        outline:
          "border border-slate-700 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-slate-100",
        secondary:
          "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700",
        ghost: "hover:bg-slate-800/60 hover:text-slate-100 text-slate-400",
        link: "text-slate-300 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
