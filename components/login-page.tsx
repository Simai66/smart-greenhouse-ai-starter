import { IconLock, IconPlant2 } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

const greenhouseBackground = {
  backgroundImage: "url('/images/login-greenhouse-bg.png')",
  backgroundPosition: "center",
  backgroundSize: "cover",
};

const greenhouseOverlay = {
  backgroundColor: "color-mix(in oklab, var(--primary) 65%, transparent)",
};

function GoogleMark() {
  return (
    <svg className="size-7" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.27c0-.78-.07-1.54-.22-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.42Z" />
      <path fill="#34A853" d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.74 9.74 0 0 0 12 21.5Z" />
      <path fill="#FBBC05" d="M6.53 13.58A5.86 5.86 0 0 1 6.22 12c0-.55.1-1.08.31-1.58V7.89H3.29A9.5 9.5 0 0 0 2.25 12c0 1.49.36 2.9 1.04 4.11l3.24-2.53Z" />
      <path fill="#EA4335" d="M12 6.39c1.43 0 2.72.49 3.74 1.46l2.8-2.8C16.84 3.46 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.71 5.39l3.24 2.53C7.3 8.11 9.46 6.39 12 6.39Z" />
    </svg>
  );
}

function GreenhouseMark() {
  return (
    <svg className="size-16 text-primary" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M8 27 32 9l24 18v29H8V27Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 27h48M20 18v38M44 18v38M27 56V39h10v17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 48c-5-4-5-9-5-9s5 1 5 6c0-5 5-6 5-6s0 5-5 9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LoginPage() {
  return (
    <main className="flex min-h-svh items-center bg-background px-4 py-4 sm:px-6 md:py-8">
      <section
        className="login-shell mx-auto grid w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:grid-cols-2"
        style={{ maxWidth: "72rem" }}
      >
        <aside
          className="relative hidden h-full min-h-0 items-center overflow-hidden bg-primary md:flex"
          style={greenhouseBackground}
          aria-label="Smart Greenhouse"
        >
          <span className="absolute inset-0" style={greenhouseOverlay} aria-hidden="true" />
          <article className="relative z-10 max-w-xl p-8 text-primary-foreground sm:p-12">
            <IconPlant2 className="size-16" stroke={1.2} aria-hidden="true" />
            <h2 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">Smart Greenhouse</h2>
            <span className="mt-7 block h-1 w-16 rounded-full bg-sidebar-primary" aria-hidden="true" />
            <p className="mt-7 max-w-md text-lg text-primary-foreground">
              ระบบบริหารจัดการโรงเรือนอัจฉริยะ
              <br />
              เพื่อการปลูกที่แม่นยำและยั่งยืน
            </p>
          </article>
        </aside>

        <section className="flex min-h-0 items-center justify-center bg-card px-6 py-12 sm:px-10 md:px-12 lg:px-16">
          <article className="w-full max-w-md text-center">
            <GreenhouseMark />
            <h1 className="mt-10 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              ยินดีต้อนรับกลับ
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              เข้าสู่ระบบเพื่อดูแลโรงเรือนของคุณ
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-12 h-auto min-h-16 w-full border-border bg-card px-5 text-lg font-semibold shadow-none hover:bg-accent"
              aria-label="ดำเนินการต่อด้วย Google"
            >
              <GoogleMark />
              ดำเนินการต่อด้วย Google
            </Button>

            <p className="mt-10 flex items-center justify-center gap-2 text-base text-muted-foreground">
              <IconLock className="size-5 text-primary" stroke={1.8} aria-hidden="true" />
              เข้าใช้งานได้ด้วยบัญชี Google เท่านั้น
            </p>
          </article>
        </section>
      </section>
    </main>
  );
}
