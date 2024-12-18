import { Handler } from "@netlify/functions";
import stripe from "stripe";
import dotenv from "dotenv";
import { Plans } from "../../src/utils/Plans";
import dbAdmin from "../../src/services/adminSDK";
dotenv.config();

const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export const handler: Handler = async (event) => {
  const sig = event.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const rawBody = event.body;

  try {
    const eventReceived = stripeClient.webhooks.constructEvent(
      rawBody!,
      sig,
      endpointSecret
    );

    switch (eventReceived.type) {
      case "checkout.session.completed": {
        try {
          const session = await stripeClient.checkout.sessions.retrieve(
            eventReceived.data.object.id,
            {
              expand: ["line_items"],
            }
          );

          const customerId = session.customer;
          const userEmail = session.customer_details?.email;

          if (!userEmail || !customerId) {
            console.log("Missing required fields.");
            break;
          }

          // Check if this is an organization purchase
          const orgRef = collection(dbAdmin, 'organizations');
          const orgQuery = query(orgRef, where('primaryContactEmail', '==', userEmail));
          const orgSnapshot = await getDocs(orgQuery);

          if (!orgSnapshot.empty) {
            const orgDoc = orgSnapshot.docs[0];
            const lineItems = session.line_items?.data || [];

            // Process each line item
            for (const item of lineItems) {
              const planId = item.price?.id;
              if (!planId) continue;

              const plan = getPlanNameByPriceId(planId);
              const quantity = item.quantity || 1;

              if (plan) {
                const selectedPlanDetails = Object.values(Plans).find(p => p.priceId === planId);
                const basePrice = selectedPlanDetails?.price || 0;
                const seatPrice = selectedPlanDetails?.additionalSeatPrice || 0;

                // Calculate total amount for the subscription
                const totalAmount = basePrice + (seatPrice * (quantity - 1));

                // Update organization subscription
                await orgDoc.ref.update({
                  subscription: {
                    plan: plan,
                    status: 'Active',
                    startedAt: new Date(),
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    stripeCustomerId: customerId,
                    subscriptionId: planId,
                    seats: quantity,
                    totalAmount: totalAmount,
                  }
                });
                console.log(`Organization subscription updated with ${quantity} seats.`);

                // Update existing members' subscriptions
                const memberQuery = query(
                  collection(dbAdmin, 'User'),
                  where('organizationId', '==', orgDoc.id)
                );
                const memberSnapshot = await getDocs(memberQuery);

                const batch = dbAdmin.batch();
                memberSnapshot.docs.forEach((memberDoc) => {
                  batch.update(memberDoc.ref, {
                    'subscription.plan': plan,
                    'subscription.status': 'Active',
                  });
                });
                await batch.commit();
              }
            }
          } else {
            // Individual user subscription
            const userRef = collection(dbAdmin, 'User');
            const userQuery = query(userRef, where('email', '==', userEmail));
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
              const userDoc = userSnapshot.docs[0];
              const planId = session.line_items?.data[0]?.price?.id;
              const plan = planId ? getPlanNameByPriceId(planId) : null;

              if (plan) {
                await userDoc.ref.update({
                  subscription: {
                    plan: plan,
                    status: 'Active',
                    startedAt: new Date(),
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    stripeCustomerId: customerId,
                    subscriptionId: planId,
                  }
                });
              }
            }
          }
        } catch (error) {
          console.error("Error handling checkout.session.completed:", error);
        }
        break;
      }

      case "customer.subscription.updated": {
        // Handle subscription updates
        try {
          const subscription = eventReceived.data.object;
          const customerId = subscription.customer;
          const planId = subscription.items.data[0]?.price.id;

          if (!customerId || !planId) {
            console.error("Missing required fields: customerId or planId");
            break;
          }

          const plan = getPlanNameByPriceId(planId);
          if (!plan) {
            console.error("Invalid plan ID");
            break;
          }

          // Check if this is an organization subscription
          const orgRef = collection(dbAdmin, 'organizations');
          const orgQuery = query(orgRef, where('subscription.stripeCustomerId', '==', customerId));
          const orgSnapshot = await getDocs(orgQuery);

          if (!orgSnapshot.empty) {
            const orgDoc = orgSnapshot.docs[0];
            const quantity = subscription.items.data[0]?.quantity || 1;

            await orgDoc.ref.update({
              'subscription.plan': plan,
              'subscription.status': 'Active',
              'subscription.seats': quantity,
            });

            // Update all organization members
            const memberQuery = query(
              collection(dbAdmin, 'User'),
              where('organizationId', '==', orgDoc.id)
            );
            const memberSnapshot = await getDocs(memberQuery);

            const batch = dbAdmin.batch();
            memberSnapshot.docs.forEach((memberDoc) => {
              batch.update(memberDoc.ref, {
                'subscription.plan': plan,
                'subscription.status': 'Active',
              });
            });
            await batch.commit();
          } else {
            // Individual user subscription update
            const userRef = collection(dbAdmin, 'User');
            const userQuery = query(userRef, where('subscription.stripeCustomerId', '==', customerId));
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
              const userDoc = userSnapshot.docs[0];
              await userDoc.ref.update({
                'subscription.plan': plan,
                'subscription.status': 'Active',
              });
            }
          }
        } catch (error) {
          console.error("Error handling customer.subscription.updated:", error);
        }
        break;
      }

      case "customer.subscription.deleted": {
        try {
          const subscription = eventReceived.data.object;
          const customerId = subscription.customer;

          // Check organization subscriptions
          const orgRef = collection(dbAdmin, 'organizations');
          const orgQuery = query(orgRef, where('subscription.stripeCustomerId', '==', customerId));
          const orgSnapshot = await getDocs(orgQuery);

          if (!orgSnapshot.empty) {
            const orgDoc = orgSnapshot.docs[0];

            // Update organization subscription
            await orgDoc.ref.update({
              subscription: {
                plan: 'Free',
                status: 'Inactive',
                seats: 0,
                startedAt: new Date(0),
                expiresAt: new Date(0),
                stripeCustomerId: null,
                subscriptionId: null,
              }
            });

            // Update all organization members
            const memberQuery = query(
              collection(dbAdmin, 'User'),
              where('organizationId', '==', orgDoc.id)
            );
            const memberSnapshot = await getDocs(memberQuery);

            const batch = dbAdmin.batch();
            memberSnapshot.docs.forEach((memberDoc) => {
              batch.update(memberDoc.ref, {
                'subscription.plan': 'Free',
                'subscription.status': 'Inactive',
              });
            });
            await batch.commit();
          } else {
            // Individual user subscription deletion
            const userRef = collection(dbAdmin, 'User');
            const userQuery = query(userRef, where('subscription.stripeCustomerId', '==', customerId));
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
              const userDoc = userSnapshot.docs[0];
              await userDoc.ref.update({
                subscription: {
                  plan: 'Free',
                  status: 'Inactive',
                  startedAt: new Date(0),
                  expiresAt: new Date(0),
                  stripeCustomerId: null,
                  subscriptionId: null,
                }
              });
            }
          }
        } catch (error) {
          console.error("Error handling customer.subscription.deleted:", error);
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${eventReceived.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (err) {
    console.error("Webhook Error:", err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` }),
    };
  }
};

function getPlanNameByPriceId(priceId: string): string | null {
  for (const planKey in Plans) {
    const plan = Plans[planKey as keyof typeof Plans];
    if (plan.priceId === priceId) {
      return plan.name;
    }
  }
  return null;
}