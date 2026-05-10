import React, { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-none-none font-mono uppercase tracking-wider text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-[#5ce1e6] text-[#020813] hover:bg-[#06b6d4] focus-visible:ring-[#5ce1e6] font-bold',
        secondary: 'bg-[#1A2F45] text-white hover:bg-[#233F59] focus-visible:ring-[#5ce1e6]',
        success: 'bg-[#5ce1e6] text-[#020813] hover:bg-[#06b6d4] focus-visible:ring-[#5ce1e6]',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        warning: 'border border-[#5ce1e6] text-[#5ce1e6] hover:bg-[#5ce1e6] hover:text-[#020813] focus-visible:ring-[#5ce1e6]',
        outline: 'border border-[#233F59] bg-transparent text-[#5ce1e6] hover:bg-[#1A2F45] focus-visible:ring-[#5ce1e6]',
        ghost: 'text-[#5ce1e6] hover:bg-[#1A2F45] focus-visible:ring-[#5ce1e6]',
        link: 'text-[#5ce1e6] underline-offset-4 hover:underline focus-visible:ring-[#5ce1e6]',
        gradient: 'bg-gradient-to-r from-[#06b6d4] to-[#5ce1e6] text-[#020813] hover:from-[#5ce1e6] hover:to-[#a5f3fc] focus-visible:ring-[#5ce1e6] font-bold',
      },
      size: {
        xs: 'h-7 px-2 text-xs',
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 py-3 text-base',
        xl: 'h-14 px-8 py-4 text-lg',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

const Button = forwardRef(({
  className,
  variant,
  size,
  fullWidth,
  loading = false,
  children,
  disabled,
  ...props
}, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, fullWidth, className }))}
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

// Specialized button components
export const IconButton = forwardRef(({
  className,
  children,
  ...props
}, ref) => {
  return (
    <Button
      ref={ref}
      size="icon"
      variant="ghost"
      className={cn('rounded-none-full', className)}
      {...props}
    >
      {children}
    </Button>
  );
});

IconButton.displayName = 'IconButton';

export const LoadingButton = forwardRef(({
  loading,
  children,
  disabled,
  ...props
}, ref) => {
  return (
    <Button
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </Button>
  );
});

LoadingButton.displayName = 'LoadingButton';

export const ButtonGroup = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        'inline-flex rounded-none-none shadow-none',
        className
      )}
      role="group"
      {...props}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          const isFirst = index === 0;
          const isLast = index === React.Children.count(children) - 1;
          
          return React.cloneElement(child, {
            className: cn(
              child.props.className,
              !isFirst && '-ml-px',
              isFirst && 'rounded-none-r-none',
              isLast && 'rounded-none-l-none',
              !isFirst && !isLast && 'rounded-none-none'
            ),
          });
        }
        return child;
      })}
    </div>
  );
};

ButtonGroup.displayName = 'ButtonGroup';

export default Button;



