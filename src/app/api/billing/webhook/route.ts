import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { baseDb as db } from "@/lib/db-base";
import { getSmtpConfig, sendCampaignEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripeEnabled) {
    return new Response("Stripe not enabled", { status: 400 });
  }

  const body = await req.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return new Response("No signature found", { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const tier = session.metadata?.tier;
        const userId = session.metadata?.userId;

        if (userId && tier) {
          await db.user.update({
            where: { id: userId },
            data: {
              subscriptionTier: tier,
              stripeSubId: session.subscription as string,
            },
          });
          console.log(`Upgraded user ${userId} to ${tier}`);

          // Notify admins
          const smtp = await getSmtpConfig();
          if (smtp) {
            const user = await db.user.findUnique({ where: { id: userId } });
            if (user) {
              const admins = await db.user.findMany({ where: { role: "admin" } });
              for (const admin of admins) {
                await sendCampaignEmail(smtp, {
                  to: admin.email,
                  subject: `New Stripe Subscription: ${user.email} upgraded to ${tier}`,
                  text: `User ${user.email} has upgraded to the ${tier} tier via Stripe.\n\nLog in to your Admin Panel to view details.`,
                });
              }
            }
          }
        }
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        // Downgrade to free when subscription ends/is canceled
        await db.user.updateMany({
          where: { stripeSubId: subscription.id },
          data: {
            subscriptionTier: "free",
            subStatus: "canceled",
          },
        });
        console.log(`Downgraded subscription ${subscription.id} to free`);
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return new Response("Webhook handler failed", { status: 500 });
  }
}
