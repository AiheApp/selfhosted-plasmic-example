"use client";

import { getPlasmicLoader } from "@/plasmic-init";
import { PlasmicRootProvider } from "@plasmicapp/loader-nextjs";
import React from "react";

type RootProviderProps = React.ComponentProps<typeof PlasmicRootProvider>;

export function PlasmicClientRootProvider({
  slug,
  children,
  ...props
}: { slug: string } & Omit<RootProviderProps, "loader">) {
  const loader = getPlasmicLoader(slug);
  if (!loader) return <>{children}</>;
  return (
    <PlasmicRootProvider loader={loader} {...props}>
      {children}
    </PlasmicRootProvider>
  );
}
