import { describe, expect, it } from "vitest";
import {
  canConnectProvider,
  createDefaultDeviceSetupState,
  getNextSetupStep,
  isSetupComplete,
  type DeviceSetupState,
} from "@/lib/device-connection";

describe("Device bridge setup", () => {
  it("enforces the Alexa → Ring → AWS connection order", () => {
    const initial = createDefaultDeviceSetupState();
    expect(getNextSetupStep(initial)).toBe("alexa");
    expect(canConnectProvider(initial, "alexa")).toBe(true);
    expect(canConnectProvider(initial, "ring")).toBe(false);
    expect(canConnectProvider(initial, "aws")).toBe(false);

    const alexaConnected: DeviceSetupState = {
      ...initial,
      connections: { alexa: { status: "connected", connectedAt: "now" } },
    };
    expect(getNextSetupStep(alexaConnected)).toBe("ring");
    expect(canConnectProvider(alexaConnected, "ring")).toBe(true);
    expect(canConnectProvider(alexaConnected, "aws")).toBe(false);

    const ringConnected: DeviceSetupState = {
      ...alexaConnected,
      connections: {
        ...alexaConnected.connections,
        ring: { status: "connected", connectedAt: "now" },
      },
    };
    expect(getNextSetupStep(ringConnected)).toBe("aws");
    expect(canConnectProvider(ringConnected, "aws")).toBe(true);
  });

  it("requires a selected device before the setup can be activated", () => {
    const connected: DeviceSetupState = {
      connections: {
        alexa: { status: "connected", connectedAt: "now" },
        ring: { status: "connected", connectedAt: "now" },
        aws: { status: "connected", connectedAt: "now" },
      },
      selectedDeviceId: null,
      completedAt: null,
    };

    expect(getNextSetupStep(connected)).toBe("devices");
    expect(isSetupComplete(connected)).toBe(false);

    const complete = {
      ...connected,
      selectedDeviceId: "00000000-0000-0000-0000-000000000001",
      completedAt: "now",
    };
    expect(getNextSetupStep(complete)).toBe("review");
    expect(isSetupComplete(complete)).toBe(true);
  });
});
