import ProjectView from "./components/ProjectView";
import { readProject } from "@/lib/store";

// Siempre leer el estado fresco del JSON local.
export const dynamic = "force-dynamic";

export default async function Home() {
  const project = await readProject();

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <ProjectView initialProject={project} />
    </main>
  );
}
