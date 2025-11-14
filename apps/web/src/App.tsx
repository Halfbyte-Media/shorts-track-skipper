import { Hero } from './sections/Hero';
import { InstallGrid } from './sections/InstallGrid';
import { ScreenshotsShowcase } from './sections/Screenshots';
import { Details } from './sections/Details';
import { LocalPromise } from './sections/LocalPromise';

export default function App() {
  return (
    <div className="page">
      <Hero />
      <main>
        <InstallGrid />
        <ScreenshotsShowcase />
        <Details />
        <LocalPromise />
      </main>
      <footer>
        Built by people who watch too many Shorts —{' '}
        <a href="https://github.com/Halfbyte-Media/shorts-track-skipper" target="_blank" rel="noreferrer noopener">
          Contribute on GitHub
        </a>
      </footer>
    </div>
  );
}
