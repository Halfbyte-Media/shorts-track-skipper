import { platforms } from '../data/platforms';
import { SectionHeading } from '@ext/ui';
import { PlatformIcon } from '../components/PlatformIcon';

export function InstallGrid() {
  return (
    <section id="platforms" className="platforms section-card">
      <SectionHeading title="Install it where you browse" description="One extension package works across every Chromium browser." />
      <div className="platforms__grid">
        {platforms.map((platform) => {
          const body = (
            <>
              <PlatformIcon icon={platform.icon} name={platform.name} />
              <div className="platform__info">
                <strong>{platform.name}</strong>
                <span>{platform.status}</span>
              </div>
            </>
          );

          return platform.disabled ? (
            <div className="platform platform--disabled" key={platform.name} aria-disabled="true">
              {body}
            </div>
          ) : (
            <a className="platform" href={platform.href} key={platform.name} target="_blank" rel="noreferrer noopener">
              {body}
            </a>
          );
        })}
      </div>
    </section>
  );
}
