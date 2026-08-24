"use client";

import { lazy, Suspense } from "react";

const LabWorkspace = lazy(() => import("./LabWorkspace").then((module) => ({ default: module.LabWorkspace })));

export function LabApp({ displayName }: { displayName: string }) {
  return <Suspense fallback={<div className="lab-loading" role="status">Opening your private Lab…</div>}>
    <LabWorkspace displayName={displayName} />
  </Suspense>;
}
