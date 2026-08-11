import { IconBrandGoogle, IconLeaf, IconLock } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

const greenhouseBackground = {
  backgroundImage: "url('/images/login-greenhouse-bg.png')",
  backgroundPosition: "center",
  backgroundSize: "cover",
};

const greenhouseOverlay = {
  backgroundColor: "color-mix(in oklab, var(--primary) 65%, transparent)",
};

const mobileOverlay = {
  backgroundColor: "color-mix(in oklab, var(--primary) 70%, transparent)",
};

export function LoginPage() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-background">
      <span
        className="absolute inset-0 lg:hidden"
        style={greenhouseBackground}
        aria-hidden="true"
      />
      <span className="absolute inset-0 lg:hidden" style={mobileOverlay} aria-hidden="true" />

      <section className="relative grid min-h-svh min-w-0 md:grid-cols-2">
        <aside
          className="relative hidden min-h-svh items-end overflow-hidden bg-primary md:flex"
          style={greenhouseBackground}
          aria-label="Smart Greenhouse"
        >
          <span className="absolute inset-0" style={greenhouseOverlay} aria-hidden="true" />
          <article className="relative z-10 max-w-xl p-8 text-primary-foreground">
            <IconLeaf className="size-12" stroke={1.5} aria-hidden="true" />
            <h2 className="mt-5 text-3xl font-bold tracking-tight">Smart Greenhouse</h2>
            <span className="mt-5 block h-1 w-16 rounded-full bg-sidebar-primary" aria-hidden="true" />
            <p className="mt-5 max-w-md text-base text-primary-foreground">
              ระบบบริหารจัดการโรงเรือนอัจฉริยะ
              <br />
              เพื่อการปลูกที่แม่นยำและยั่งยืน
            </p>
          </article>
        </aside>

        <section className="flex min-h-svh min-w-0 items-center justify-center px-5 py-8 sm:px-8">
          <article className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
            <header className="text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                <IconLeaf className="size-7" stroke={1.7} aria-hidden="true" />
              </span>
              <p className="mt-5 text-sm font-semibold text-primary">SMART GREENHOUSE</p>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                ยินดีต้อนรับกลับ
              </h1>
              <p className="mt-3 text-base text-muted-foreground">
                เข้าสู่ระบบเพื่อดูแลโรงเรือนของคุณ
              </p>
            </header>

            <Button
              type="button"
              variant="outline"
              className="mt-8 h-auto min-h-12 w-full border-border bg-card px-5 text-base font-semibold shadow-none hover:bg-accent"
              aria-label="ดำเนินการต่อด้วย Google"
            >
              <IconBrandGoogle className="size-6 text-primary" stroke={1.8} aria-hidden="true" />
              ดำเนินการต่อด้วย Google
            </Button>

            <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <IconLock className="size-4 text-primary" stroke={1.8} aria-hidden="true" />
              เข้าใช้งานได้ด้วยบัญชี Google เท่านั้น
            </p>
          </article>
        </section>
      </section>
    </main>
  );
}
