import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-fd-muted/50">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:grid-cols-3 sm:px-8">
        <div>
          <h2 className="text-sm font-semibold">Documentation</h2>
          <div className="mt-3 grid gap-2 text-sm text-fd-muted-foreground">
            <Link className="hover:text-fd-foreground" href="/docs/getting-started">
              Installation
            </Link>
            <Link className="hover:text-fd-foreground" href="/docs">
              Browse all docs
            </Link>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Community</h2>
          <div className="mt-3 grid gap-2 text-sm text-fd-muted-foreground">
            <a className="hover:text-fd-foreground" href="https://discord.com/invite/aCsmEV5RgA">
              Discord
            </a>
            <a className="hover:text-fd-foreground" href="https://www.reddit.com/r/homarr/">
              Reddit
            </a>
            <a className="hover:text-fd-foreground" href="https://github.com/homarr-labs/homarr">
              GitHub
            </a>
            <a className="hover:text-fd-foreground" href="https://opencollective.com/homarr">
              Donate
            </a>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold">More</h2>
          <div className="mt-3 grid gap-2 text-sm text-fd-muted-foreground">
            <Link className="hover:text-fd-foreground" href="/workshop">
              Workshop
            </Link>
            <Link className="hover:text-fd-foreground" href="/blog">
              Blog
            </Link>
            <Link className="hover:text-fd-foreground" href="/about-us">
              About us
            </Link>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 text-center sm:col-span-3">
          <Image src="/img/logo.svg" alt="Homarr" width={58} height={40} />
          <p className="text-sm font-medium">Your dashboard for the services you run.</p>
          <p className="text-xs text-fd-muted-foreground">
            © 2026 Homarr ·{" "}
            <Link className="hover:text-fd-foreground" href="/docs/community/license">
              License
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
