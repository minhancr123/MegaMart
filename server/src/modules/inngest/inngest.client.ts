import { Inngest } from "inngest";

/**
 * Inngest client dùng chung cho mọi durable function của MegaMart.
 *
 * - Dev local (`npx inngest-cli dev`): không cần key, SDK tự bỏ qua verify chữ ký.
 * - Inngest Cloud: SDK tự đọc INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY từ env.
 *   Lấy key tại https://app.inngest.com → project → Keys.
 */
export const inngest = new Inngest({ id: "megamart" });
