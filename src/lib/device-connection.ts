export type ProviderId = "alexa" | "ring" | "aws";
export type DeviceKind = "doorbell" | "camera" | "speaker" | "light" | "sensor" | "chime";

export interface ProviderConnection {
  status: "connected";
  connectedAt: string;
}

export type ProviderConnections = Partial<Record<ProviderId, ProviderConnection>>;

export interface SmartHomeDevice {
  id: string;
  provider: "ring" | "alexa";
  name: string;
  kind: DeviceKind;
  location: string;
  model: string;
  status: "online" | "offline" | "unknown";
  lastSeenAt: string | null;
  capabilities: string[];
}

export interface DeviceSetupState {
  connections: ProviderConnections;
  selectedDeviceId: string | null;
  completedAt: string | null;
}

export const DEVICE_SETUP_STORAGE_KEY = "recallos-device-setup-v1";

export const PROVIDERS: Array<{
  id: ProviderId;
  name: string;
  label: string;
  description: string;
}> = [
  {
    id: "alexa",
    name: "Alexa",
    label: "Voice layer",
    description: "Your Alexa home is the starting point for the handoff.",
  },
  {
    id: "ring",
    name: "Ring",
    label: "Device layer",
    description: "Bring your Ring doorbells and cameras into the same home.",
  },
  {
    id: "aws",
    name: "AWS",
    label: "Event bridge",
    description: "Route device events through a private AWS IoT bridge.",
  },
];

export function createDefaultDeviceSetupState(): DeviceSetupState {
  return {
    connections: {},
    selectedDeviceId: null,
    completedAt: null,
  };
}

export function getNextSetupStep(
  state: DeviceSetupState,
): "alexa" | "ring" | "aws" | "devices" | "review" {
  if (!state.connections.alexa) return "alexa";
  if (!state.connections.ring) return "ring";
  if (!state.connections.aws) return "aws";
  if (!state.selectedDeviceId) return "devices";
  return "review";
}

export function canConnectProvider(state: DeviceSetupState, provider: ProviderId) {
  if (provider === "alexa") return true;
  if (provider === "ring") return Boolean(state.connections.alexa);
  return Boolean(state.connections.alexa && state.connections.ring);
}

export function isSetupComplete(state: DeviceSetupState) {
  return Boolean(
    state.completedAt &&
    state.selectedDeviceId &&
    state.connections.alexa &&
    state.connections.ring &&
    state.connections.aws,
  );
}
