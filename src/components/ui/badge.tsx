import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold font-mono tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700",
        secondary:
          "border border-slate-700/60 bg-slate-900/60 text-slate-400",
        outline:
          "border border-slate-600 text-slate-300",
        // Capacity Status Variants (Green / Yellow / Red strictly)
        good:
          "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold",
        warning:
          "border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold",
        critical:
          "border border-rose-500/30 bg-rose-500/10 text-rose-400 font-bold animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
