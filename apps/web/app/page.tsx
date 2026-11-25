import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold tracking-tight">SyncSpace</h1>
      <ThemeToggle />
    </main>
  );
}
