export function LocalPromise() {
  return (
    <section className="local">
      <div className="local__card">
        <h2>Local-first data promise</h2>
        <p>
          Shorts Track Skipper never phones home. The block list, toggle states, and skip counters only touch the
          browser's sync/local storage APIs, meaning nothing leaves your profile.
        </p>
        <ul>
          <li>No accounts, analytics, or remote API calls.</li>
          <li>Reset everything from the options page whenever you want a clean slate.</li>
        </ul>
      </div>
    </section>
  );
}
