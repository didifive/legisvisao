import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white font-semibold hover:bg-primary/90 shadow-soft hover:shadow-medium",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft",
        outline:
          "border border-input bg-background hover:bg-muted hover:text-foreground text-foreground",
        secondary:
          "bg-secondary text-white hover:bg-secondary/80 shadow-soft",
        ghost: "hover:bg-muted hover:text-foreground text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-primary text-white font-semibold hover:shadow-glow transition-all duration-300 hover:scale-[1.02]",
        gradient:
          "bg-gradient-secondary text-white font-semibold hover:bg-gradient-primary transition-all duration-300",
        success:
          "bg-success text-white font-semibold hover:bg-success/90 shadow-soft",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        xl: "h-12 rounded-lg px-8 text-base font-semibold",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  href?: string;
  target?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, href, target, ...props },
    ref
  ) => {
    if (href && !asChild && !props.disabled) {
      return (
        <a
          className={cn(buttonVariants({ variant, size, className }))}
          href={href}
          ref={ref as unknown as React.Ref<HTMLAnchorElement>}
          target={target}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        />
      );
    }

    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
