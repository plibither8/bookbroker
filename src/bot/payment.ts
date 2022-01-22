import type { Payment, User } from "@prisma/client";
import { createHmac } from "crypto";
import got from "got";
import db from "../libs/database.js";
import api from "./api.js";
import domain from "./domain.js";
import messages from "./messages.js";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1/";
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

export async function createPaymentLink(
  user: User,
  amount: number,
  currency: string
): Promise<Payment> {
  const paymentCount = await db.payment.count({
    where: { userId: user.id },
  });
  const { short_url, id } = (await got
    .post(`${RAZORPAY_API_BASE}payment_links`, {
      username: RAZORPAY_KEY_ID,
      password: RAZORPAY_KEY_SECRET,
      json: {
        amount: amount * 100,
        currency,
        accept_partial: false,
        reference_id: `chat_${user.chatId}_${paymentCount + 1}`,
        description:
          "Payment to increase daily delivery limit for the BookBroker bot",
        customer: {
          name: `${user.firstName} ${user.lastName || ""}`.trim(),
        },
        notify: {
          sms: false,
          email: false,
        },
        callback_url: `${domain.domain}/donate`,
        callback_method: "get",
      },
    })
    .json()) as { short_url: string; id: string };
  return await db.payment.create({
    data: {
      amount,
      currency,
      userId: user.id,
      link: short_url,
      paymentLinkId: id,
    },
  });
}

export async function donateCallbackHandler(req: any, res: any) {
  const {
    razorpay_payment_id,
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
    razorpay_signature,
  } = req.query;
  const queries = [
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
    razorpay_payment_id,
  ];
  if (queries.map(Boolean).some(() => false) || !razorpay_signature)
    return res.end("Invalid request!");
  const isValidRequest =
    createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(queries.join("|"))
      .digest("hex") === razorpay_signature;
  if (!isValidRequest) return res.end("Signature mismatch!");
  const payment = await db.payment.findFirst({
    where: {
      paymentLinkId: razorpay_payment_link_id,
      status: { not: "paid" },
    },
    include: { user: true },
  });
  if (payment) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "paid" },
    });
    const user = await db.user.update({
      where: { id: payment.user.id },
      data: { dailyDeliveryLimit: payment.user.dailyDeliveryLimit + 10 },
    });
    await api.sendMessage(
      messages.donationReceived(
        payment.amount.toNumber(),
        payment.currency,
        user.dailyDeliveryLimit
      ),
      user.chatId
    );
    return res.end(
      "Success! I have received your payment, thank you! You may go back to Telegram now :D"
    );
  }
  res.end("No pending payment found against this donation");
}
