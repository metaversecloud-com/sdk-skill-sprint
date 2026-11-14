import { APIRequestContext, Page, test as base, expect } from "@playwright/test";
import { INTERACTIVE_KEY, MOCK_TOPIA_URL } from "./constants";

export const KEY_ASSET_ID = "key-asset";
export const SCENE_DROP_ID = "scene-1";
export const VISITOR_ID = 42;
export const GAME_ENGINE_ID = "e2e-engine";

export type SeedOptions = {
  isAdmin?: boolean;
  /** Visitor is standing inside the asset's zone. */
  inZone?: boolean;
  /** false = the dropped asset the app was opened from doesn't exist in the world. */
  withAsset?: boolean;
  /** Extra dropped-asset fields (assetName, topLayerURL, uniqueName, ...). */
  asset?: Record<string, unknown>;
  /** The dropped asset's data object. */
  assetData?: Record<string, unknown>;
  /** The world's data object. */
  worldData?: Record<string, unknown>;
  /** The visitor's data object. */
  visitorData?: Record<string, unknown>;
  /** Badges the visitor already owns. */
  badges?: string[];
  /** Further dropped assets in the world, keyed by id. */
  extraAssets?: Record<string, Record<string, unknown>>;
  /** An Experience Engine is listening: the app's WebRTC offer waits for the test to answer it. */
  engine?: boolean;
  /** The Topia twilio-config endpoint fails (no ICE servers for the app). */
  twilioConfigError?: boolean;
};

export type Question = { questionNumber: number; text: string; options: string[]; correctIndex: number };

/** Questions the engine sends in its "start" message. */
export const SAMPLE_QUESTIONS: Record<string, Question> = {
  q1: { questionNumber: 1, text: "What planet is closest to the Sun?", options: ["Earth", "Mercury", "Venus", "Mars"], correctIndex: 1 },
  q2: { questionNumber: 2, text: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Venus"], correctIndex: 1 },
  q3: { questionNumber: 3, text: "What is 2 + 2?", options: ["1", "2", "3", "4"], correctIndex: 3 },
};

/** A message the iframe sent to the engine over the data channel. */
export type IframeMessage = { eventId: string; gameEngineId: string; payload: Record<string, any> };

/** One isolated Topia world in mock-topia, plus helpers to open the app inside it. */
export class TopiaWorld {
  readonly displayName = "E2E Player";

  constructor(
    readonly urlSlug: string,
    readonly profileId: string,
    private request: APIRequestContext,
  ) {}

  async seed({
    isAdmin = false,
    inZone = true,
    withAsset = true,
    asset = {},
    assetData = {},
    worldData = {},
    visitorData = {},
    badges = [],
    extraAssets = {},
    engine = false,
    twilioConfigError = false,
  }: SeedOptions = {}) {
    const assets: Record<string, any> = { ...extraAssets };
    if (withAsset) {
      assets[KEY_ASSET_ID] = {
        id: KEY_ASSET_ID,
        assetName: "E2E Asset",
        position: { x: 500, y: 500 },
        uniqueName: "e2e-asset",
        sceneDropId: SCENE_DROP_ID,
        topLayerURL: "https://example.invalid/e2e-asset.png",
        ...asset,
        dataObject: assetData,
      };
    }

    const response = await this.request.post(`${MOCK_TOPIA_URL}/__mock/worlds/${this.urlSlug}`, {
      data: {
        dataObject: worldData,
        engine,
        twilioConfigError,
        assets,
        visitors: {
          [VISITOR_ID]: {
            isAdmin,
            profileId: this.profileId,
            displayName: this.displayName,
            landmarkZonesString: inZone ? Object.keys(assets).join(",") : "",
            privateZoneId: "",
            dataObject: visitorData,
            inventory: badges.map((name) => ({
              id: `owned-${name}`,
              item_id: `owned-${name}`,
              status: "ACTIVE",
              item: { name, type: "BADGE", image_url: "" },
            })),
          },
        },
      },
    });
    if (!response.ok()) throw new Error(`Seeding mock world failed: ${response.status()}`);
  }

  async state() {
    const response = await this.request.get(`${MOCK_TOPIA_URL}/__mock/worlds/${this.urlSlug}`);
    return (await response.json()) as {
      dataObject: Record<string, any>;
      assets: Record<string, any>;
      visitors: Record<string, any>;
      events: Array<Record<string, any>>;
      unhandled: string[];
    };
  }

  async assetData(assetId = KEY_ASSET_ID) {
    return (await this.state()).assets[assetId]?.dataObject;
  }

  async visitorData() {
    return (await this.state()).visitors[VISITOR_ID].dataObject;
  }

  async events(type?: string) {
    const { events } = await this.state();
    return type ? events.filter((e) => e.type === type) : events;
  }

  /** Session credentials Topia appends to the app's iframe URL. */
  credentials(overrides: Record<string, string> = {}) {
    return new URLSearchParams({
      assetId: KEY_ASSET_ID,
      displayName: this.displayName,
      identityId: "identity-1",
      interactiveNonce: "e2e-nonce",
      interactivePublicKey: INTERACTIVE_KEY,
      profileId: this.profileId,
      sceneDropId: SCENE_DROP_ID,
      uniqueName: "e2e-asset",
      urlSlug: this.urlSlug,
      username: "e2e-player",
      visitorId: String(VISITOR_ID),
      // Topia adds these when the iframe is opened by an Experience Engine game, as Skill Sprint is.
      gameEngineId: GAME_ENGINE_ID,
      iframeId: "e2e-iframe",
      hasDataChannel: "true",
      ...overrides,
    });
  }

  /** App page URL as Topia opens it in the iframe. */
  url(path = "/", overrides: Record<string, string> = {}) {
    return `${path}?${this.credentials(overrides)}`;
  }

  /**
   * Plays the Experience Engine for the app opened in `page`: answers the WebRTC offer the app sent
   * through /api/signal with a real RTCPeerConnection inside the same page, and waits until the app
   * reports "connected" over the data channel. The page must be opened in a world seeded with engine: true.
   */
  async connectEngine(page: Page) {
    let offer: Record<string, unknown> | null = null;
    await expect
      .poll(
        async () => {
          offer = (await (await this.request.get(`${MOCK_TOPIA_URL}/__mock/worlds/${this.urlSlug}/offer`)).json()).offer;
          return offer;
        },
        { message: "app never sent its WebRTC offer to the engine" },
      )
      .not.toBeNull();

    const answerSignal = await page.evaluate(async (offer) => {
      const pc = new RTCPeerConnection({ iceServers: [] });
      const engine: any = { pc, channel: null, inbox: [] };
      (window as any).__engine = engine;
      pc.ondatachannel = ({ channel }) => {
        engine.channel = channel;
        channel.onmessage = ({ data }) => engine.inbox.push(JSON.parse(String(data)));
      };
      // Both peers live in this browser, so route them over loopback: the default-route interface
      // Chromium gathers candidates on (a VPN tunnel on some laptops) may not deliver UDP to itself.
      const toLoopback = (sdp: string) =>
        sdp.replace(/^(a=candidate:\S+ \d+ udp \d+ )\S+( \d+ typ host)/gm, "$1127.0.0.1$2");
      const { type, sdp } = offer as RTCSessionDescriptionInit;
      await pc.setRemoteDescription({ type, sdp: toLoopback(sdp!) });
      await pc.setLocalDescription(await pc.createAnswer());
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        pc.onicegatheringstatechange = () => pc.iceGatheringState === "complete" && resolve();
      });
      return { type: pc.localDescription!.type, sdp: toLoopback(pc.localDescription!.sdp) };
    }, offer);

    const response = await this.request.post(`${MOCK_TOPIA_URL}/__mock/worlds/${this.urlSlug}/answer`, {
      data: { answerSignal },
    });
    if (!response.ok()) throw new Error(`Answering the offer failed: ${response.status()}`);
    await expect
      .poll(async () => (await this.engineInbox(page)).map((m) => m.payload?.type), {
        message: "app never reported connected",
      })
      .toContain("connected");
  }

  /** Sends an engine event to the app, in the { payload: { type, payload } } shape the engine uses. */
  async engineSend(page: Page, type: string, payload: Record<string, unknown> = {}) {
    await page.evaluate(
      ({ type, payload }) => (window as any).__engine.channel.send(JSON.stringify({ payload: { type, payload } })),
      { type, payload },
    );
  }

  /** Every message the app has sent to the engine so far. */
  async engineInbox(page: Page): Promise<IframeMessage[]> {
    return page.evaluate(() => (window as any).__engine?.inbox ?? []);
  }

  /** App API path carrying the session credentials, as the client's backendAPI sends them. */
  api(path: string, overrides: Record<string, string> = {}) {
    return `/api${path}?${this.credentials(overrides)}`;
  }
}

export const test = base.extend<{ world: TopiaWorld }>({
  world: async ({ request }, use, testInfo) => {
    const id = `${testInfo.testId}-${testInfo.repeatEachIndex}-${testInfo.retry}`.replace(/[^a-zA-Z0-9-]/g, "");
    const world = new TopiaWorld(`world-${id}`, `profile-${id}`, request);
    await use(world);

    // Fail the test if the app called a public-API endpoint the mock doesn't implement (e.g. after an
    // @rtsdk/topia upgrade): it would otherwise pass against a 501 the real API never returns.
    expect((await world.state()).unhandled, "public-API calls mock-topia doesn't implement").toEqual([]);
    const outside = await (await request.get(`${MOCK_TOPIA_URL}/__mock/unhandled`)).json();
    expect(outside, "public-API calls mock-topia doesn't implement").toEqual([]);
  },
});

export { expect } from "@playwright/test";
