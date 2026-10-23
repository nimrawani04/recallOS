import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const DeviceSetup = lazy(() =>
  import("@/components/device-setup").then((module) => ({ default: module.DeviceSetup })),
);

export const Route = createFileRoute("/devices")({
  head: () => ({
    meta: [
      { title: "Connect Devices — RecallOS" },
      {
        name: "description",
        content: "Connect Alexa, Ring, and AWS, then choose the device RecallOS should watch.",
      },
    ],
  }),
  component: DevicesRoute,
});

function DevicesRoute() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-10 text-center text-sm text-muted-foreground">
          Loading your device bridge…
        </div>
      }
    >
      <DeviceSetup />
    </Suspense>
  );
}
