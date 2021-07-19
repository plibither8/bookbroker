import { Payment, PrismaClient, User } from "@prisma/client";
import fetch from "node-fetch";
import config from "../../config.json";
import api from "./api";
import messages from "./messages";
import { createHmac } from "crypto";

const prisma = new PrismaClient();

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1/";
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

export async function createPaymentLink(
  user: User,
  amount: number,
  currency: string
): Promise<Payment> {
  const paymentCount = await prisma.payment.count({
    where: { userId: user.id },
  });
  const response = await fetch(`${RAZORPAY_API_BASE}payment_links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " +
        Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString(
          "base64"
        ),
    },
    body: JSON.stringify({
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
      callback_url: `${config.domain}/donate`,
      callback_method: "get",
    }),
  });
  const razorpayPaymentLink = await response.json();
  const { short_url, id }: { short_url: string; id: string } =
    razorpayPaymentLink;
  return await prisma.payment.create({
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
  const payment = await prisma.payment.findFirst({
    where: {
      paymentLinkId: razorpay_payment_link_id,
      status: { not: "paid" },
    },
    include: { user: true },
  });
  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "paid" },
    });
    const user = await prisma.user.update({
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
