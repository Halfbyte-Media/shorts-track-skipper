import { Button } from '@ext/ui';

export function Hero() {
  return (
    <header className="hero">
      <div className="hero__art">
        <img src="/assets/icons/icon.svg" alt="Shorts Track Skipper icon" />
      </div>
      <div>
        <p className="hero__eyebrow">Skip the reruns</p>
        <h1>Block recycled Shorts music.</h1>
        <p>
          Shorts Track Skipper watches YouTube's song credit and quietly skips any Short that plays something you've
          already muted. There's no onboarding, no extra UI—just a Block Track button that sits in the Shorts action bar
          next to Like, Dislike, and Comment.
        </p>
        <div className="hero__actions">
          <Button variant="ghost" href="https://github.com/Halfbyte-Media/shorts-track-skipper">
            View on GitHub
          </Button>
        </div>
        <p className="hero__note">Works anywhere Chromium extensions run; Firefox and Safari builds are on the roadmap.</p>
      </div>
    </header>
  );
}
