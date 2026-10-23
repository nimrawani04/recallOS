import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/account";
import {
  claimRingConnection,
  discoverDevices,
  getAlexaSkillUrl,
  getDeviceBridge,
  getRingAppStoreUrl,
  selectAnchorDevice,
} from "@/lib/device-connections.functions";
type IconName =
  | "arrowLeft"
  | "arrowRight"
  | "badgeCheck"
  | "camera"
  | "check"
  | "checkCircle"
  | "chevronRight"
  | "cloud"
  | "doorOpen"
  | "house"
  | "lightbulb"
  | "loader"
  | "lock"
  | "mapPin"
  | "radio"
  | "refresh"
  | "router"
  | "scan"
  | "shield"
  | "signal"
  | "sparkles"
  | "speaker"
  | "wifi";

const iconGlyphs: Record<IconName, string> = {
  arrowLeft: "←",
  arrowRight: "→",
  badgeCheck: "✓",
  camera: "◉",
  check: "✓",
  checkCircle: "✓",
  chevronRight: "›",
  cloud: "☁",
  doorOpen: "⌂",
  house: "⌂",
  lightbulb: "✦",
  loader: "◌",
  lock: "◇",
  mapPin: "•",
  radio: "◌",
  refresh: "↻",
  router: "⌘",
  scan: "⌗",
  shield: "◈",
  signal: "▰",
  sparkles: "✦",
  speaker: "◖",
  wifi: "⌁",
};

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center leading-none ${className}`}
    >
      {iconGlyphs[name]}
    </span>
  );
}
import {
  canConnectProvider,
  createDefaultDeviceSetupState,
  getNextSetupStep,
  isSetupComplete,
  PROVIDERS,
  type DeviceKind,
  type DeviceSetupState,
  type ProviderId,
  type SmartHomeDevice,
} from "@/lib/device-connection";

type FlowStep = "alexa" | "ring" | "aws" | "devices" | "review";
type DeviceFilter = "all" | DeviceKind;

const FLOW_STEPS: Array<{ id: FlowStep; label: string }> = [
  { id: "alexa", label: "Alexa" },
  { id: "ring", label: "Ring" },
  { id: "aws", label: "AWS" },
  { id: "devices", label: "Device" },
  { id: "review", label: "Ready" },
];

const providerCopy: Record<
  ProviderId,
  { eyebrow: string; title: string; body: string; action: string; accent: string }
> = {
  alexa: {
    eyebrow: "01 / VOICE LAYER",
    title: "Start with Alexa",
    body: "Create the voice-first home that will receive your device alerts and RecallOS memory cards.",
    action: "Connect Alexa home",
    accent: "from-cyan-500/20 via-blue-500/10 to-transparent",
  },
  ring: {
    eyebrow: "02 / DEVICE LAYER",
    title: "Bring Ring into Alexa",
    body: "Pair your Ring home so cameras, doorbells, and motion events are available in one place.",
    action: "Connect Ring home",
    accent: "from-fuchsia-500/20 via-violet-500/10 to-transparent",
  },
  aws: {
    eyebrow: "03 / EVENT BRIDGE",
    title: "Route the handoff through AWS",
    body: "Create the private event bridge that keeps device state ready for RecallOS without exposing credentials.",
    action: "Connect AWS bridge",
    accent: "from-amber-400/25 via-orange-500/10 to-transparent",
  },
};

const deviceFilters: Array<{ id: DeviceFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "doorbell", label: "Doorbells" },
  { id: "camera", label: "Cameras" },
  { id: "speaker", label: "Speakers" },
  { id: "light", label: "Lights" },
];

const deviceIcons: Record<DeviceKind, IconName> = {
  doorbell: "doorOpen",
  camera: "camera",
  speaker: "speaker",
  light: "lightbulb",
  sensor: "signal",
  chime: "speaker",
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function providerName(id: ProviderId) {
  return PROVIDERS.find((provider) => provider.id === id)?.name ?? id;
}

function stepIndex(step: FlowStep) {
  return FLOW_STEPS.findIndex((item) => item.id === step);
}

function nextStepAfter(provider: ProviderId): FlowStep {
  if (provider === "alexa") return "ring";
  if (provider === "ring") return "aws";
  return "devices";
}

function ProviderMark({ provider, small = false }: { provider: ProviderId; small?: boolean }) {
  const styles = {
    alexa: "from-cyan-300 via-blue-500 to-indigo-700",
    ring: "from-fuchsia-300 via-violet-500 to-purple-800",
    aws: "from-amber-200 via-orange-500 to-rose-700",
  };
  const letters = { alexa: "A", ring: "R", aws: "AWS" };

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${styles[provider]} font-mono font-bold text-white shadow-lg shadow-black/20 ${small ? "h-9 w-9 text-[10px]" : "h-12 w-12 text-sm"}`}
    >
      {letters[provider]}
    </span>
  );
}

function ConnectionRail({
  state,
  active,
}: {
  state: DeviceSetupState;
  active?: ProviderId | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-1 rounded-2xl border border-border/80 bg-background/60 px-3 py-3 sm:px-5">
      {PROVIDERS.map((provider, index) => {
        const connected = Boolean(state.connections[provider.id]);
        const isActive = active === provider.id;
        return (
          <div key={provider.id} className="contents">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="relative">
                <ProviderMark provider={provider.id} small />
                {connected && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-confirmed text-background">
                    <Icon name="check" className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{provider.name}</div>
                <div
                  className={`truncate font-mono text-[9px] uppercase tracking-wider ${connected ? "text-confirmed" : isActive ? "text-primary" : "text-muted-foreground"}`}
                >
                  {connected ? "Connected" : isActive ? "Next" : "Waiting"}
                </div>
              </div>
            </div>
            {index < PROVIDERS.length - 1 && (
              <Icon
                name="chevronRight"
                className="mx-1 h-4 w-4 shrink-0 text-muted-foreground/50 sm:mx-3"
              />
            )}
          </div>
        );
      })}
      <Icon
        name="chevronRight"
        className="mx-1 h-4 w-4 shrink-0 text-muted-foreground/40 sm:mx-3"
      />
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary">
          <Icon name="radio" className="h-4 w-4" />
        </div>
        <div className="hidden min-w-0 sm:block">
          <div className="text-xs font-semibold">RecallOS</div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            Ready
          </div>
        </div>
      </div>
    </div>
  );
}

function StepTop({ step, state }: { step: FlowStep; state: DeviceSetupState }) {
  const currentIndex = stepIndex(step);
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Device bridge setup</span>
        <span>
          Step {currentIndex + 1} <span className="text-muted-foreground/50">/ 5</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Device bridge setup progress"
        aria-valuemin={1}
        aria-valuemax={FLOW_STEPS.length}
        aria-valuenow={currentIndex + 1}
        className="flex gap-1.5"
      >
        {FLOW_STEPS.map((item, index) => (
          <div key={item.id} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-colors ${index <= currentIndex ? "bg-primary" : "bg-secondary"}`}
            />
            <div
              className={`mt-1.5 hidden text-[10px] sm:block ${index === currentIndex ? "font-semibold text-primary" : "text-muted-foreground"}`}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <ConnectionRail
          state={state}
          active={step === "alexa" || step === "ring" || step === "aws" ? step : undefined}
        />
      </div>
    </div>
  );
}

function BackButton({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon name="arrowLeft" className="h-3.5 w-3.5" />
      Back
    </button>
  );
}

function ProviderStep({
  provider,
  state,
  connecting,
  onConnect,
  onOpenProvider,
  configured,
}: {
  provider: ProviderId;
  state: DeviceSetupState;
  connecting: boolean;
  onConnect: () => void;
  onOpenProvider: () => void;
  configured: boolean;
}) {
  const copy = providerCopy[provider];
  const connected = Boolean(state.connections[provider]);
  const previousProvider = provider === "alexa" ? null : provider === "ring" ? "alexa" : "ring";

  return (
    <div className="space-y-5">
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          {copy.eyebrow}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          {copy.body}
        </p>
      </div>

      {previousProvider && (
        <div className="flex items-center gap-2 rounded-xl border border-confirmed/25 bg-confirmed/5 px-3 py-2.5 text-xs text-confirmed">
          <Icon name="checkCircle" className="h-4 w-4 shrink-0" />
          <span>{providerName(previousProvider)} is connected. The next handoff is unlocked.</span>
        </div>
      )}

      <div
        className={`relative overflow-hidden rounded-3xl border border-border/90 bg-gradient-to-br ${copy.accent} p-5 sm:p-7`}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full border border-white/10 bg-white/5 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <ProviderMark provider={provider} />
              <div>
                <div className="text-lg font-semibold">{providerName(provider)} home</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {provider === "aws"
                    ? "AWS EventBridge"
                    : provider === "ring"
                      ? "Ring Appstore linking"
                      : "Alexa Smart Home skill"}
                </div>
              </div>
            </div>
            {connected && <Icon name="badgeCheck" className="h-6 w-6 text-confirmed" />}
          </div>

          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-white/10 bg-black/15 p-3 sm:gap-4 sm:p-4">
            <div className="text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                {provider === "alexa" ? "YOU" : provider === "ring" ? "A+" : "RING"}
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">
                {provider === "alexa"
                  ? "Your account"
                  : provider === "ring"
                    ? "Alexa home"
                    : "Ring events"}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 text-primary">
              <div className="h-px w-12 bg-primary/60 sm:w-20" />
              <Icon name="sparkles" className="h-4 w-4" />
              <div className="h-px w-12 bg-primary/60 sm:w-20" />
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
                {provider === "alexa" ? (
                  <Icon name="house" className="h-5 w-5" />
                ) : provider === "ring" ? (
                  <Icon name="doorOpen" className="h-5 w-5" />
                ) : (
                  <Icon name="cloud" className="h-5 w-5" />
                )}
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">
                {provider === "alexa"
                  ? "Alexa home"
                  : provider === "ring"
                    ? "Ring home"
                    : "AWS bridge"}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-confirmed" />
            <span>
              Credentials are handled by the provider and stored only on the server. This browser
              never receives Ring tokens or AWS credentials.
            </span>
          </div>

          <button
            type="button"
            onClick={configured ? onConnect : onOpenProvider}
            disabled={connecting || (!configured && !canConnectProvider(state, provider))}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {connecting ? (
              <Icon name="loader" className="h-4 w-4 animate-spin" />
            ) : connected ? (
              <Icon name="check" className="h-4 w-4" />
            ) : null}
            {connecting
              ? "Refreshing devices…"
              : connected
                ? `Continue to ${provider === "aws" ? "device scan" : providerName(provider === "alexa" ? "ring" : "aws")}`
                : configured
                  ? copy.action
                  : provider === "ring"
                    ? "Open Ring Appstore"
                    : provider === "alexa"
                      ? "Open Alexa linking"
                      : "Configure AWS bridge"}
            {!connecting && <Icon name="arrowRight" className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: "shield", label: "Private by design", value: "Owner-scoped" },
          { icon: "wifi", label: "Connection", value: "Encrypted bridge" },
          {
            icon: "signal",
            label: "Next",
            value: provider === "aws" ? "Scan devices" : "Continue",
          },
        ].map(({ icon: iconName, label, value }) => (
          <div key={label} className="rounded-2xl border border-border/80 bg-card/60 p-3">
            <Icon name={iconName as IconName} className="h-4 w-4 text-primary" />
            <div className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 text-xs font-medium">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeviceCard({
  device,
  selected,
  onSelect,
}: {
  device: SmartHomeDevice;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`group w-full rounded-2xl border p-4 text-left transition ${selected ? "border-primary bg-primary/10 ring-1 ring-primary/60" : "border-border/80 bg-card/60 hover:border-primary/50 hover:bg-card"}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${selected ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}
        >
          <Icon name={deviceIcons[device.kind]} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold">{device.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{device.model}</div>
            </div>
            <div
              className={`mt-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider ${device.status === "online" ? "text-confirmed" : "text-muted-foreground"}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${device.status === "online" ? "bg-confirmed" : "bg-muted-foreground"}`}
              />
              {device.status}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Icon name="mapPin" className="h-3 w-3" />
              {device.location}
            </span>
            <span>
              Seen {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "Unknown"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {device.capabilities.map((capability) => (
              <span
                key={capability}
                className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground"
              >
                {capability}
              </span>
            ))}
          </div>
        </div>
        <div
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent group-hover:border-primary/60"}`}
        >
          <Icon name="check" className="h-3 w-3" />
        </div>
      </div>
    </button>
  );
}

function DeviceDiscovery({
  state,
  onSelect,
  onContinue,
  onBack,
  devices,
  onRescan,
  discovering,
}: {
  state: DeviceSetupState;
  onSelect: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
  devices: SmartHomeDevice[];
  onRescan: () => void;
  discovering: boolean;
}) {
  const isDiscovering = discovering;
  const hasDiscovered = devices.length > 0;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DeviceFilter>("all");

  const filteredDevices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return devices.filter((device) => {
      const matchesFilter = filter === "all" || device.kind === filter;
      const matchesQuery =
        !normalizedQuery ||
        `${device.name} ${device.location} ${device.model}`.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [devices, filter, query]);

  return (
    <div className="space-y-5">
      <BackButton onClick={onBack} />
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          04 / DEVICE SELECT
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Choose your anchor device
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          This is the device RecallOS will use for the first alert and visual memory card.
        </p>
      </div>

      <div className="rounded-2xl border border-confirmed/25 bg-confirmed/5 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-confirmed/15 p-2 text-confirmed">
            <Icon name="shield" className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-confirmed">AWS bridge connected</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Your Ring and Alexa devices are now discoverable through the private event path.
            </p>
          </div>
        </div>
      </div>

      {isDiscovering ? (
        <div className="rounded-3xl border border-border/80 bg-card/60 px-5 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
            <Icon name="scan" className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="mt-5 text-lg font-semibold" aria-live="polite">
            Scanning your connected home…
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Looking for Alexa endpoints and Ring devices available through AWS.
          </p>
          <div className="mx-auto mt-6 h-1.5 max-w-xs overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{devices.length} devices found</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Select one device to finish setup.
              </div>
            </div>
            <button
              type="button"
              onClick={onRescan}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground"
            >
              <Icon name="refresh" className="h-3.5 w-3.5" /> Rescan
            </button>
          </div>

          <div className="relative">
            <label htmlFor="device-search" className="sr-only">
              Search devices or rooms
            </label>
            <input
              id="device-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search devices or rooms"
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {deviceFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${filter === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredDevices.length > 0 ? (
              filteredDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  selected={state.selectedDeviceId === device.id}
                  onSelect={() => onSelect(device.id)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-10 text-center">
                <Icon name="router" className="mx-auto h-6 w-6 text-muted-foreground" />
                <div className="mt-3 text-sm font-medium">No matching devices</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try another room, device type, or run a fresh scan.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onContinue}
            disabled={!state.selectedDeviceId || !hasDiscovered}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Review device <Icon name="arrowRight" className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

function ReviewStep({
  state,
  onComplete,
  onBack,
  onReset,
  devices,
}: {
  state: DeviceSetupState;
  onComplete: () => void;
  onBack: () => void;
  onReset: () => void;
  devices: SmartHomeDevice[];
}) {
  const selectedDevice = devices.find((device) => device.id === state.selectedDeviceId) ?? null;
  const complete = isSetupComplete(state);

  return (
    <div className="space-y-5">
      <BackButton onClick={onBack} />
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">05 / READY</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Your device bridge is ready
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          Review the handoff, then activate {selectedDevice?.name ?? "your device"} for RecallOS.
        </p>
      </div>

      <div className="rounded-3xl border border-border/90 bg-card/70 p-5 sm:p-7">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <Icon name="lock" className="h-3.5 w-3.5 text-confirmed" /> Private connection path
        </div>
        <div className="mt-5 space-y-3">
          {PROVIDERS.map((provider, index) => (
            <div key={provider.id} className="flex items-center gap-3">
              <ProviderMark provider={provider.id} small />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{provider.name}</div>
                <div className="text-xs text-muted-foreground">{provider.label}</div>
              </div>
              <Icon name="checkCircle" className="h-5 w-5 text-confirmed" />
              {index < PROVIDERS.length - 1 && <div className="absolute" />}
            </div>
          ))}
        </div>
        <div className="my-5 h-px bg-border" />
        {selectedDevice ? (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Icon name="radio" className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
                  Selected anchor device
                </div>
                <div className="mt-1 text-lg font-semibold">{selectedDevice.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {selectedDevice.model} · {selectedDevice.location}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-conflict/30 bg-conflict/5 p-4 text-sm text-conflict">
            Choose a device before activating the bridge.
          </div>
        )}
      </div>

      {complete ? (
        <div className="rounded-3xl border border-confirmed/30 bg-confirmed/10 p-5 text-center sm:p-7">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-confirmed text-background">
            <Icon name="checkCircle" className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">Setup complete</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            RecallOS is ready to receive context from{" "}
            {selectedDevice?.name ?? "your selected device"}.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              to="/alexa"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              Open Alexa simulator <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <Icon name="refresh" className="h-4 w-4" /> Set up another
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onComplete}
          disabled={!selectedDevice}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Activate device bridge <Icon name="check" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function DeviceSetup() {
  const { ready: accountReady, session } = useAccount();
  const [bridge, setBridge] = useState<{
    connections: Array<{
      provider: ProviderId;
      status: "connected" | "needs_reauth" | "revoked";
      displayName: string;
      id: string;
    }>;
    devices: SmartHomeDevice[];
    setup: { selectedDeviceId: string | null; status: string; completedAt: string | null } | null;
  }>({ connections: [], devices: [], setup: null });
  const [setupState, setSetupState] = useState<DeviceSetupState>(() =>
    createDefaultDeviceSetupState(),
  );
  const [step, setStep] = useState<FlowStep>("alexa");
  const [connectingProvider, setConnectingProvider] = useState<ProviderId | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const reloadBridge = useCallback(async () => {
    if (!session) return;
    const next = await getDeviceBridge();
    const devices = next.devices.map((device) => ({ ...device, lastSeenAt: device.lastSeenAt }));
    const selected = next.setup?.selectedDeviceId ?? null;
    setBridge({ ...next, devices });
    const connections = Object.fromEntries(
      next.connections.map((connection) => [
        connection.provider,
        { status: "connected" as const, connectedAt: connection.updatedAt },
      ]),
    );
    const state: DeviceSetupState = {
      connections,
      selectedDeviceId: selected,
      completedAt: next.setup?.completedAt ?? null,
    };
    setSetupState(state);
    setStep(getNextSetupStep(state));
  }, [session]);

  useEffect(() => {
    if (!accountReady) return;
    if (!session) {
      setBridge({ connections: [], devices: [], setup: null });
      setSetupState(createDefaultDeviceSetupState());
      setStep("alexa");
      setIsHydrated(true);
      return;
    }
    reloadBridge().catch((error: unknown) =>
      setErrorMessage(
        error instanceof Error ? error.message : "Could not load provider connections.",
      ),
    );
    setIsHydrated(true);
  }, [accountReady, reloadBridge, session]);

  useEffect(() => {
    if (!session || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const nonce = params.get("ring_nonce");
    const time = params.get("ring_time");
    if (!nonce || !time) return;
    window.history.replaceState({}, "", "/devices");
    claimRingConnection({ data: { nonce, time } })
      .then(() => reloadBridge())
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "Could not finish Ring linking.");
      });
  }, [reloadBridge, session]);

  const configured = (provider: ProviderId) =>
    bridge.connections.some(
      (connection) => connection.provider === provider && connection.status === "connected",
    );

  const openProvider = async (provider: ProviderId) => {
    if (!session) return;
    setErrorMessage("");
    try {
      if (provider === "ring") {
        const { url } = await getRingAppStoreUrl();
        window.location.assign(url);
      } else if (provider === "alexa") {
        const { url } = await getAlexaSkillUrl();
        window.location.assign(url);
      } else {
        setErrorMessage(
          "AWS EventBridge is configured by the deployment administrator. Set AWS_REGION, AWS_EVENT_BUS_NAME, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY on the server.",
        );
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Provider setup is not configured.");
    }
  };

  const refreshProvider = async (provider: ProviderId) => {
    if (provider === "aws") {
      setStep("devices");
      return;
    }
    setConnectingProvider(provider);
    setErrorMessage("");
    try {
      await reloadBridge();
      setStep(nextStepAfter(provider));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not refresh the provider connection.",
      );
    } finally {
      setConnectingProvider(null);
    }
  };

  const selectDevice = (id: string) => {
    setSetupState((current) => ({ ...current, selectedDeviceId: id, completedAt: null }));
  };

  const chooseDevice = async () => {
    if (!setupState.selectedDeviceId) return;
    setErrorMessage("");
    try {
      await selectAnchorDevice({ data: { deviceId: setupState.selectedDeviceId } });
      await reloadBridge();
      setStep("review");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not select that device.");
    }
  };

  const rescan = async () => {
    setConnectingProvider("aws");
    setErrorMessage("");
    try {
      const result = await discoverDevices();
      setBridge((current) => ({
        ...current,
        devices: result.devices.map((device) => ({ ...device, lastSeenAt: device.lastSeenAt })),
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not discover Ring devices.");
    } finally {
      setConnectingProvider(null);
    }
  };

  const goBack = () => {
    if (connectingProvider) return;
    if (step === "ring") setStep("alexa");
    else if (step === "aws") setStep("ring");
    else if (step === "devices") setStep("aws");
    else if (step === "review") setStep("devices");
  };

  if (!isHydrated)
    return (
      <div className="mx-auto max-w-md py-10 text-center text-sm text-muted-foreground">
        Loading your secure device bridge…
      </div>
    );

  if (!session) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-2xl sm:p-8">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Secure device setup
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Sign in before connecting devices
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Real Alexa, Ring, and AWS connections are owner-scoped. Sign in to continue; no provider
            credentials are stored in this browser.
          </p>
          <div className="mt-6">
            <Link
              to="/import"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              Sign in to RecallOS <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-7 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider">
          <span>
            RECALL<span className="text-primary">OS</span>
          </span>
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] text-primary">LIVE</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-confirmed/30 bg-confirmed/5 px-2.5 py-1.5 font-mono text-[10px] text-confirmed">
          <Icon name="shield" className="h-3 w-3" /> Server connections
        </div>
      </div>
      <StepTop step={step} state={setupState} />
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          {errorMessage}
        </div>
      )}
      <div className="mx-auto max-w-2xl">
        {step === "alexa" || step === "ring" || step === "aws" ? (
          <>
            {step !== "alexa" && (
              <BackButton onClick={goBack} disabled={Boolean(connectingProvider)} />
            )}
            <ProviderStep
              provider={step}
              state={setupState}
              connecting={connectingProvider === step}
              configured={configured(step)}
              onOpenProvider={() => openProvider(step)}
              onConnect={() => refreshProvider(step)}
            />
          </>
        ) : step === "devices" ? (
          <DeviceDiscovery
            state={setupState}
            onSelect={selectDevice}
            onContinue={chooseDevice}
            onBack={goBack}
            devices={bridge.devices}
            onRescan={rescan}
            discovering={connectingProvider === "aws"}
          />
        ) : (
          <ReviewStep
            state={setupState}
            onComplete={chooseDevice}
            onBack={goBack}
            onReset={() => window.location.reload()}
            devices={bridge.devices}
          />
        )}
      </div>
    </div>
  );
}
