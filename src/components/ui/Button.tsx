import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', fullWidth = false, className = '', disabled, ...props }, ref) => {
    const baseStyles =
      'min-h-[48px] px-6 py-3 rounded-xl font-bold text-lg inline-flex items-center justify-center gap-3 transition-colors active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm';

    const variantStyles = {
      primary: 'bg-brand-orange text-brand-black hover:bg-orange-500 focus:ring-orange-400',
      secondary: 'bg-brand-blue text-white hover:bg-blue-800 focus:ring-blue-400',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400',
      outline: 'bg-white border-2 border-brand-black text-brand-black hover:bg-gray-100 focus:ring-gray-400',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseStyles} ${variantStyles[variant]} ${widthStyle} ${className}`.trim()}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
