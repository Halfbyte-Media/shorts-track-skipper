interface PlatformIconProps {
  name: string;
  icon: string;
}

export function PlatformIcon({ icon, name }: PlatformIconProps) {
  return (
    <span className={`platform__icon platform__icon--${icon}`} aria-hidden="true">
      <span className="sr-only">{name}</span>
    </span>
  );
}
