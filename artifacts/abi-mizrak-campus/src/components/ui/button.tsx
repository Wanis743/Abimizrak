import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-[hsl(var(--m3-primary))] text-[hsl(var(--m3-on-primary))] hover:bg-[hsl(var(--m3-primary))]/90 shadow-[var(--shadow-m3-elevation-1)] hover:shadow-[var(--shadow-m3-elevation-2)]',
        destructive:
          'bg-[hsl(var(--m3-error))] text-[hsl(var(--m3-on-error))] hover:bg-[hsl(var(--m3-error))]/90 shadow-[var(--shadow-m3-elevation-1)]',
        outline:
          'border border-[hsl(var(--m3-outline))] bg-transparent hover:bg-[hsl(var(--m3-surface-variant))] hover:text-[hsl(var(--m3-on-surface-variant))] text-[hsl(var(--m3-primary))]',
        secondary:
          'bg-[hsl(var(--m3-secondary-container))] text-[hsl(var(--m3-on-secondary-container))] hover:bg-[hsl(var(--m3-secondary-container))]/80',
        ghost: 'hover:bg-[hsl(var(--m3-surface-variant))] hover:text-[hsl(var(--m3-on-surface-variant))] text-[hsl(var(--m3-primary))]',
        link: 'text-[hsl(var(--m3-primary))] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };