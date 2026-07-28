import HomeProjects from "../components/HomeProjects";
import LogoutButton from "../components/LogoutButton";
import TopNav from "../components/TopNav";
import GuideButton from "../components/GuideButton";
import { getProjectTaskCounts, listProjects } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await listProjects();
  const taskCounts = await getProjectTaskCounts(projects.map((p) => p.id)).catch(() => ({}));

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold text-ink">
            dblzero<span className="text-accent">//</span><span className="text-dim">labs</span>
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Your projects
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <TopNav />
          <GuideButton />
          <LogoutButton />
        </div>
      </header>

      <HomeProjects initialProjects={projects} taskCounts={taskCounts} />
    </main>
  );
}
