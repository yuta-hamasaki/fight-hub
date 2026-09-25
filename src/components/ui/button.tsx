import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 min-h-12 whitespace-normal rounded-xl text-sm font-semibold transition-colors active:translate-y-px focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-blue-700 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-blue-700 text-white shadow-sm hover:bg-blue-800 active:bg-blue-900",
        outline:
          "border border-slate-400 bg-white text-slate-800 hover:bg-slate-100",
        ghost: "hover:bg-muted",
      },
      size: {
        default: "min-h-12 px-5 py-3",
        sm: "min-h-11 px-3 py-2",
        lg: "min-h-13 px-6 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
