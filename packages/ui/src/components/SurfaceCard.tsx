import { CSSProperties, PropsWithChildren } from 'react';
import { palette } from '../styles/tokens';

const baseStyle: CSSProperties = {
  background: palette.surfaceAlt,
  border: '1px solid rgba(23, 31, 58, 0.12)',
  borderRadius: 22,
  padding: 32,
  boxShadow: '0 20px 45px rgba(17, 23, 41, 0.08)',
};

export function SurfaceCard({ children, style }: PropsWithChildren<{ style?: CSSProperties }>) {
  return (
    <section style={{ ...baseStyle, ...style }}>
      {children}
    </section>
  );
}
