export function Details() {
  return (
    <section id="details" className="section-card">
      <div className="section-heading">
        <h2>What you get</h2>
        <p>A tight feature set built for people who actually watch Shorts.</p>
      </div>
      <ul className="details-list">
        <li>
          <strong>Action bar block button.</strong>
          Drops a "Block track" control right into the Shorts action bar beside the standard like/dislike buttons, so
          you never dig through extra menus.
        </li>
        <li>
          <strong>Automatic skip flow.</strong>
          When a muted song reappears, the extension (optionally) drops a dislike, rolls to the next Short, and updates
          the skip counter.
        </li>
        <li>
          <strong>Local stats + quick search.</strong>
          Block list entries live in browser storage, along with skip counts and toggle states, and every row exposes
          one-click YouTube + Spotify searches.
        </li>
      </ul>
    </section>
  );
}
