import { getPlasmicLoader } from "@/plasmic-init";
import { PlasmicClientRootProvider } from "@/plasmic-init-client";
import { PlasmicComponent } from "@plasmicapp/loader-nextjs";
import { Metadata, ResolvingMetadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface Params {
  catchall: string[] | undefined;
}

interface LoaderPageProps {
  params: Params;
  searchParams?: Record<string, string | string[]>;
}

function getSlug(): string {
  const slug = headers().get("x-plasmic-slug");
  if (!slug) notFound();
  return slug;
}

export async function generateMetadata(
  { params }: LoaderPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const slug = getSlug();
  const { pageMeta } = await fetchData(slug, params.catchall);
  return {
    ...((await parent) as Metadata),
    ...pageMeta.pageMetadata,
  };
}

export default async function PlasmicLoaderPage({
  params,
  searchParams,
}: LoaderPageProps) {
  const slug = getSlug();
  const { pageMeta, prefetchedData } = await fetchData(slug, params.catchall);
  return (
    <PlasmicClientRootProvider
      slug={slug}
      prefetchedData={prefetchedData}
      pageParams={pageMeta.params}
      pageQuery={searchParams}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicClientRootProvider>
  );
}

async function fetchData(slug: string, catchall: string[] | undefined) {
  const loader = getPlasmicLoader(slug);
  if (!loader) notFound();
  const plasmicPath = catchall ? `/${catchall.join("/")}` : "/";
  const prefetchedData = await loader.maybeFetchComponentData(plasmicPath);
  if (!prefetchedData || prefetchedData.entryCompMetas.length === 0) {
    notFound();
  }
  return { pageMeta: prefetchedData.entryCompMetas[0], prefetchedData };
}
