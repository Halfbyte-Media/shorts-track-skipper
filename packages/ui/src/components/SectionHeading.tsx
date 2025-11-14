import { PropsWithChildren } from 'react';

interface SectionHeadingProps {
  title: string;
  eyebrow?: string;
  description?: string;
  align?: 'left' | 'center';
}

export function SectionHeading({
  title,
  eyebrow,
  description,
  align = 'left',
  children,
}: PropsWithChildren<SectionHeadingProps>) {
  return (
    <div style={{ textAlign: align }}>
      {eyebrow && (
        <p
          style={{
            textTransform: 'uppercase',
            letterSpacing: '0.26em',
            fontSize: '0.75rem',
            color: 'rgba(31,34,48,0.6)',
            margin: 0,
          }}
        >
          {eyebrow}
        </p>
      )}
      <h2 style={{ margin: '10px 0 8px' }}>{title}</h2>
      {description && (
        <p style={{ margin: 0, color: 'rgba(31,34,48,0.75)', lineHeight: 1.6 }}>{description}</p>
      )}
      {children}
    </div>
  );
}
