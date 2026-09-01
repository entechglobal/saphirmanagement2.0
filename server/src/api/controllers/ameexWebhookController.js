import asyncHandler from "express-async-handler";
import {
  saveAndEnqueue,
  AMEEX_TO_BL_STATUS,
} from "../services/ameexWebhookService.js";

/**
 * POST /api/webhooks/ameex
 *
 * Ameex sends application/x-www-form-urlencoded.
 * We save the payload + schedule in-process processing, then return 200.
 * Heavy processing runs async in the same server — never blocks this handler.
 */
export const receive = asyncHandler(async (req, res) => {
  const rawPayload = req.body; // parsed by express.urlencoded()
  const trackingCode = (rawPayload.CODE ?? rawPayload.code ?? "").trim();
  const ameexStatus = (rawPayload.STATUS ?? rawPayload.status ?? "").trim();
  // Always return 200 to Ameex — even for payloads we will ignore.
  // A non-200 causes Ameex to retry infinitely.
  if (!trackingCode || !ameexStatus) {
    return res.status(200).json({
      received: true,
      handled: false,
      reason: "Missing CODE or STATUS field",
    });
  }

  const isMapped = !!AMEEX_TO_BL_STATUS[ameexStatus];

  if (!isMapped) {
    return res.status(200).json({
      received: true,
      handled: false,
      reason: `Status "${ameexStatus}" is not mapped — ignored`,
    });
  }

  const { logId } = await saveAndEnqueue(rawPayload);

  res.status(200).json({
    received: true,
    handled: true,
    logId,
    trackingCode,
    ameexStatus,
  });
});
