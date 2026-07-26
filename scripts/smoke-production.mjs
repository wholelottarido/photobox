import { chromium } from "@playwright/test";

const baseUrl = process.env.PHOTOBOX_PRODUCTION_URL ?? "https://photobox-steel.vercel.app";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
});

let hostContext;
let guestContext;
let host;
let guest;
let roomId;

try {
  hostContext = await browser.newContext({ permissions: ["camera", "microphone"], baseURL: baseUrl });
  guestContext = await browser.newContext({ permissions: ["camera", "microphone"], baseURL: baseUrl });
  host = await hostContext.newPage();
  guest = await guestContext.newPage();
  host.on("response", (response) => {
    if (response.url().includes(".supabase.co/auth/")) {
      console.log(`SUPABASE_BROWSER_AUTH_STATUS=${response.status()}`);
    }
  });
  host.on("requestfailed", (request) => {
    if (request.url().includes(".supabase.co")) {
      console.log(`SUPABASE_BROWSER_REQUEST_FAILED=${request.failure()?.errorText ?? "UNKNOWN"}`);
    }
  });
  host.on("console", (message) => {
    if (message.type() === "error") console.log(`BROWSER_CONSOLE_ERROR=${message.text().slice(0, 300)}`);
  });

  await host.goto("/create");
  await host.getByLabel("Nama kamu").waitFor();
  await host.getByLabel("Nama kamu").fill("Production Host");
  await host.getByLabel("Jumlah foto").fill("1");
  await host.getByLabel("Countdown").selectOption("1");

  const createResponsePromise = host.waitForResponse(
    (response) => response.url().endsWith("/api/rooms") && response.request().method() === "POST"
  );
  await host.getByRole("button", { name: "Buat Room" }).click();
  const createResponse = await createResponsePromise;
  if (!createResponse.ok()) throw new Error(`Create room failed: ${createResponse.status()}`);
  const created = await createResponse.json();
  roomId = created.data.id;
  const invitationUrl = created.data.invitationUrl;
  if (!invitationUrl.startsWith(`${baseUrl}/invite/`)) throw new Error("Invitation URL does not use production domain");
  console.log("CREATE_ROOM=OK");
  console.log("INVITATION_DOMAIN=OK");

  const hostLiveKitPromise = host.waitForResponse(
    (response) => response.url().endsWith("/api/livekit/token") && response.request().method() === "POST"
  );
  await host.getByRole("button", { name: /Masuk waiting room/ }).click();
  const hostLiveKit = await hostLiveKitPromise;
  if (!hostLiveKit.ok()) throw new Error(`Host LiveKit token failed: ${hostLiveKit.status()}`);
  await host.locator(".lk-participant-tile").first().waitFor({ timeout: 30_000 });
  console.log("HOST_LIVEKIT=OK");

  await guest.goto(invitationUrl);
  await guest.getByLabel("Nama kamu").waitFor();
  await guest.getByLabel("Nama kamu").fill("Production Guest");
  const guestLiveKitPromise = guest.waitForResponse(
    (response) => response.url().endsWith("/api/livekit/token") && response.request().method() === "POST"
  );
  await guest.getByRole("button", { name: "Terima undangan" }).click();
  const guestLiveKit = await guestLiveKitPromise;
  if (!guestLiveKit.ok()) throw new Error(`Guest LiveKit token failed: ${guestLiveKit.status()}`);
  await guest.locator(".lk-participant-tile").first().waitFor({ timeout: 30_000 });
  await host.getByText("2/2 peserta").waitFor({ timeout: 30_000 });
  console.log("GUEST_INVITATION=OK");
  console.log("GUEST_LIVEKIT=OK");
  console.log("REALTIME_PARTICIPANTS=OK");

  await guest.getByRole("button", { name: "Saya siap" }).click();
  await host.getByRole("button", { name: "Saya siap" }).click();
  const startButton = host.getByRole("button", { name: "Mulai Photobox" });
  await startButton.waitFor();
  await startButton.isEnabled({ timeout: 30_000 });
  await startButton.click();

  await Promise.all([
    host.waitForURL(/\/result\/[^/]+$/, { timeout: 90_000 }),
    guest.waitForURL(/\/result\/[^/]+$/, { timeout: 90_000 })
  ]);
  const preview = host.getByAltText("Strip photobox hasil sesi");
  await preview.waitFor({ state: "visible", timeout: 30_000 });
  await preview.evaluate((image) => {
    if (image.complete && image.naturalWidth > 0) return;
    return new Promise((resolve, reject) => {
      image.addEventListener("load", () => resolve(undefined), { once: true });
      image.addEventListener("error", () => reject(new Error("JPEG preview failed")), { once: true });
    });
  });

  const resultId = new URL(host.url()).pathname.split("/").pop();
  const downloadResponse = await hostContext.request.post(
    `${baseUrl}/api/results/${resultId}/download-url`
  );
  if (!downloadResponse.ok())
    throw new Error(`JPEG download URL failed: ${downloadResponse.status()}`);
  const downloadBody = await downloadResponse.json();
  const jpegResponse = await hostContext.request.get(downloadBody.data.url);
  const jpeg = await jpegResponse.body();
  if (
    !jpegResponse.ok() ||
    !jpegResponse.headers()["content-type"]?.startsWith("image/jpeg") ||
    jpeg[0] !== 0xff ||
    jpeg[1] !== 0xd8
  ) {
    throw new Error("Downloaded result is not a valid JPEG");
  }
  console.log("JPEG_PREVIEW=OK");
  console.log("JPEG_DOWNLOAD=OK");
  console.log("PRODUCTION_SMOKE_TEST=OK");
} catch (error) {
  console.error("PRODUCTION_SMOKE_TEST=FAIL");
  console.error(`ERROR_TYPE=${error?.constructor?.name ?? "Unknown"}`);
  console.error(`ERROR_MESSAGE=${error?.message ?? "Unknown"}`);
  if (host) {
    console.error(`CURRENT_URL=${host.url()}`);
    const text = await host.locator("body").innerText().catch(() => "");
    console.error(`PAGE_TEXT=${text.slice(0, 500).replace(/\s+/g, " ")}`);
    await host.screenshot({ path: "test-results/production-smoke-failure.png", fullPage: true }).catch(() => {});
  }
  process.exitCode = 1;
} finally {
  if (roomId && hostContext) {
    const cleanup = await hostContext.request.delete(`${baseUrl}/api/rooms/${roomId}`);
    console.log(`TEST_ROOM_CLEANUP=${cleanup.ok() ? "OK" : "FAIL"}`);
  }
  await guestContext?.close();
  await hostContext?.close();
  await browser.close();
}
