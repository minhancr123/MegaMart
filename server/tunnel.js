/**
 * Localtunnel runner với subdomain CỐ ĐỊNH cho webhook SePay.
 *
 * Mỗi lần chạy server, public URL luôn là:
 *   https://megamart-sepay-webhook.loca.lt
 * Webhook endpoint cố định để paste 1 lần vào SePay Dashboard:
 *   https://megamart-sepay-webhook.loca.lt/api/payment/webhook
 *
 * Chạy:  npm run tunnel            (chỉ tunnel, server chạy riêng)
 *        npm run dev:tunnel        (server + tunnel cùng lúc)
 *
 * Env hỗ trợ (xem .env.example):
 *   PORT=3001                        (cổng NestJS, mặc định 3001)
 *   TUNNEL_SUBDOMAIN=megamart-sepay-webhook
 */

// Nạp .env để đọc PORT / TUNNEL_SUBDOMAIN (nếu có dotenv đi kèm @nestjs/config)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config();
} catch {
  /* dotenv chưa cài trực tiếp thì bỏ qua, dùng process.env sẵn có */
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const localtunnel = require("localtunnel");

const PORT = Number(process.env.PORT || 3001);
const SUBDOMAIN = process.env.TUNNEL_SUBDOMAIN || "megamart-sepay-webhook";
const EXPECTED_URL = `https://${SUBDOMAIN}.loca.lt`;
const WEBHOOK_PATH = "/api/payment/webhook";

const RETRY_DELAY_MS = 5000;
const CONNECT_TIMEOUT_MS = 30000;
// Tự kiểm tra tunnel còn sống không bằng cách gọi ngược public URL.
// loca.lt free tier thỉnh thoảng kẹt nửa chừng (502/408) mà không bắn
// sự kiện close/error -> phải tự phát hiện và reconnect.
const HEALTH_CHECK_MS = 60000;
const HEALTH_MAX_FAILS = 3;
let tunnel = null;
let closing = false;
let retryTimer = null;
let healthTimer = null;
let healthFails = 0;

function stopHealthCheck() {
  if (healthTimer) clearInterval(healthTimer);
  healthTimer = null;
  healthFails = 0;
}

async function healthCheck() {
  if (closing || !tunnel) return;
  try {
    const res = await fetch(`${EXPECTED_URL}/api`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    healthFails = 0;
  } catch (err) {
    healthFails += 1;
    warn(
      `Health check fail ${healthFails}/${HEALTH_MAX_FAILS} (${err && err.message ? err.message : err}).`,
    );
    if (healthFails >= HEALTH_MAX_FAILS) {
      warn("Tunnel có vẻ đã kẹt, đóng và kết nối lại...");
      stopHealthCheck();
      try {
        await tunnel.close();
      } catch {
        /* bỏ qua */
      }
      tunnel = null;
      scheduleRetry();
    }
  }
}

function startHealthCheck() {
  stopHealthCheck();
  healthTimer = setInterval(healthCheck, HEALTH_CHECK_MS);
}

function log(...args) {
  console.log("[Tunnel]", ...args);
}

function warn(...args) {
  console.warn("[Tunnel]", ...args);
}

async function connect() {
  if (closing) return;
  try {
    log(`Đang mở tunnel cố định ${EXPECTED_URL} -> http://localhost:${PORT} ...`);
    // localtunnel retry nội bộ vô hạn khi loca.lt không phản hồi -> bọc timeout ngoài
    const t = await Promise.race([
      localtunnel({ port: PORT, subdomain: SUBDOMAIN }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Hết thời gian chờ loca.lt (${CONNECT_TIMEOUT_MS / 1000}s)`)), CONNECT_TIMEOUT_MS),
      ),
    ]);
    tunnel = t;

    // loca.lt có thể âm thầm cấp subdomain ngẫu nhiên khi tên bị chiếm/kẹt session.
    // Bắt buộc kiểm tra, sai là đóng + retry để giữ đúng domain cố định.
    if (t.url !== EXPECTED_URL) {
      warn(`Subdomain "${SUBDOMAIN}" đang bận (nhận được ${t.url}). Đóng và thử lại sau 5s...`);
      try {
        await t.close();
      } catch {
        /* bỏ qua */
      }
      tunnel = null;
      scheduleRetry();
      return;
    }

    log("Connected successfully!");
    log(`Public URL: ${t.url}`);
    log(`SePay Webhook Endpoint: ${t.url}${WEBHOOK_PATH}`);
    startHealthCheck();

    t.on("close", () => {
      if (closing) return;
      warn("Tunnel đã đóng (mất mạng hoặc server loca.lt ngắt). Tự kết nối lại sau 5s...");
      stopHealthCheck();
      tunnel = null;
      scheduleRetry();
    });

    t.on("error", (err) => {
      if (closing) return;
      stopHealthCheck();
      warn("Tunnel lỗi:", err && err.message ? err.message : err);
      // localtunnel không tự close khi error -> chủ động đóng để kích hoạt reconnect
      // (sự kiện 'close' sau đó cũng gọi scheduleRetry, hàm này tự xóa timer cũ nên an toàn)
      try {
        t.close();
      } catch {
        /* bỏ qua */
      }
      tunnel = null;
      scheduleRetry();
    });
  } catch (err) {
    warn("Không mở được tunnel:", err && err.message ? err.message : err);
    scheduleRetry();
  }
}

function scheduleRetry() {
  if (closing) return;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(connect, RETRY_DELAY_MS);
}

async function shutdown(signal) {
  closing = true;
  if (retryTimer) clearTimeout(retryTimer);
  stopHealthCheck();
  log(`Nhận ${signal}, đang đóng tunnel để giải phóng subdomain ${SUBDOMAIN}...`);
  try {
    if (tunnel) await tunnel.close();
  } catch {
    /* bỏ qua */
  }
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

connect();
