import { useEffect, useState } from 'react';
import { screenshots } from '../data/screenshots';
import { SectionHeading } from '@ext/ui';

const AUTO_INTERVAL = 5000;

export function ScreenshotsShowcase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % screenshots.length);
    }, AUTO_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  return (
    <section id="screenshots" className="section-card screenshots">
      <SectionHeading
        title="See it in action"
        description="Glimpses of Shorts Track Skipper living inside the Shorts player, the block list, and the automation controls."
      />
      <div className="carousel" data-carousel>
        <div className="carousel__viewport">
          {screenshots.map((shot, shotIndex) => (
            <figure
              className={`carousel__slide${shotIndex === index ? ' is-active' : ''}`}
              key={shot.src}
              data-carousel-slide
            >
              <img src={shot.src} alt={shot.alt} loading="lazy" />
            </figure>
          ))}
        </div>
        <div className="carousel__dots" role="tablist" aria-label="Screenshot carousel navigation">
          {screenshots.map((shot, shotIndex) => (
            <button
              className={`carousel__dot${shotIndex === index ? ' is-active' : ''}`}
              type="button"
              key={shot.src}
              aria-label={`Show screenshot ${shotIndex + 1}`}
              aria-pressed={shotIndex === index}
              onClick={() => setIndex(shotIndex)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
