import { CSSProperties, PropsWithChildren } from 'react';
import { palette } from '../styles/tokens';

type ButtonVariant = 'primary' | 'ghost';

const baseStyle: CSSProperties = {
  border: 'none',
  borderRadius: 999,
  fontWeight: 600,
  padding: '14px 26px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    color: '#fff',
    background: `linear-gradient(120deg, ${palette.accent}, ${palette.accentAlt})`,
    boxShadow: '0 20px 35px rgba(255, 71, 87, 0.35)',
  },
  ghost: {
    color: palette.text,
    background: 'transparent',
    border: '1px solid rgba(31, 34, 48, 0.15)',
  },
};

export interface ButtonProps extends PropsWithChildren {
  variant?: ButtonVariant;
  href?: string;
}

export function Button({ variant = 'primary', href, children }: ButtonProps) {
  const style = { ...baseStyle, ...variantStyles[variant] };

  if (href) {
    return (
      <a href={href} style={style} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    );
  }

  return (
    <button type="button" style={style}>
      {children}
    </button>
  );
}
