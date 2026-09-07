import Link from "next/link";
import { collaborationSignOut } from "../server/actions";

type AppHeaderProps = {
  displayName?: string;
};

export function AppHeader({ displayName }: AppHeaderProps) {
  return (
    <header className="collab-header">
      <Link href="/" className="brand" aria-label="Gauntlet home">
        <span className="brand-mark" aria-hidden="true">g.</span>
        gauntlet<span className="brand-period">.</span>
      </Link>
      <nav aria-label="Workspace navigation" className="collab-nav">
        <Link href="/workspace">Workspace</Link>
        <Link href="/onboarding">Profile</Link>
      </nav>
      <div className="collab-account">
        {displayName && <span>{displayName}</span>}
        <form action={collaborationSignOut}>
          <button type="submit" className="text-button">Sign out</button>
        </form>
      </div>
    </header>
  );
}

