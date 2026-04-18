import { PLASMIC } from "@/plasmic-init";
import { PlasmicClientRootProvider } from "@/plasmic-init-client";
import { PlasmicComponent } from "@plasmicapp/loader-nextjs";
import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 60;
export const dynamicParams = true;

interface Params {
  catchall: string[] | undefined;
}

export async function generateStaticParams(): Promise<Params[]> {
  const pageModules = await PLASMIC.fetchPages();
  return pageModules.map((mod) => {
    const catchall =
      mod.path === "/" ? undefined : mod.path.substring(1).split("/");
    return { catchall };
  });
}

interface LoaderPageProps {
  params: Params;
  searchParams?: Record<string, string | string[]>;
}

export async function generateMetadata(
  { params }: LoaderPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { pageMeta } = await fetchData(params.catchall);
  return {
    ...((await parent) as Metadata),
    ...pageMeta.pageMetadata,
  };
}

export default async function PlasmicLoaderPage({
  params,
  searchParams,
}: LoaderPageProps) {
  const { pageMeta, prefetchedData } = await fetchData(params.catchall);
  return (
    <PlasmicClientRootProvider
      prefetchedData={prefetchedData}
      pageParams={pageMeta.params}
      pageQuery={searchParams}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicClientRootProvider>
  );
}

async function fetchData(catchall: string[] | undefined) {
  const plasmicPath = catchall ? `/${catchall.join("/")}` : "/";
  const prefetchedData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!prefetchedData || prefetchedData.entryCompMetas.length === 0) {
    notFound();
  }
  return { pageMeta: prefetchedData.entryCompMetas[0], prefetchedData };
}
