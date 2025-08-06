import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'border' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', padding = 'md', className, ...props }, ref) => {
    const baseClasses = [
      'bg-white',
      'dark:bg-secondary-800',
      'rounded-lg',
      'transition-all',
      'duration-200',
    ];

    const variants = {
      default: [
        'border',
        'border-secondary-200',
        'dark:border-secondary-700',
      ],
      glass: [
        'backdrop-blur-sm',
        'bg-white/80',
        'dark:bg-secondary-800/80',
        'border',
        'border-white/20',
        'shadow-glass',
      ],
      border: [
        'border-2',
        'border-secondary-200',
        'dark:border-secondary-700',
      ],
      elevated: [
        'shadow-lg',
        'border',
        'border-secondary-100',
        'dark:border-secondary-700',
      ],
    };

    const paddings = {
      none: [],
      sm: ['p-4'],
      md: ['p-6'],
      lg: ['p-8'],
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant],
          paddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          'items-center',
          'justify-between',
          'border-b',
          'border-secondary-200',
          'dark:border-secondary-700',
          'pb-4',
          'mb-4',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex-1', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'border-t',
          'border-secondary-200',
          'dark:border-secondary-700',
          'pt-4',
          'mt-4',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardBody.displayName = 'CardBody';
CardFooter.displayName = 'CardFooter';

export default Card;
export { CardHeader, CardBody, CardFooter };