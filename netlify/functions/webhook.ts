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
          console.log('Processing checkout session');
          const session = await stripeClient.checkout.sessions.retrieve(
            eventReceived.data.object.id,
            {
              expand: ["line_items"],
            }
          );

          const customerId = session.customer;
          const userEmail = session.customer_details?.email;
          const planId = session.line_items?.data[0]?.price?.id;
          const quantity = session.line_items?.data[0]?.quantity || 1;

          console.log('Session details:', { customerId, userEmail, planId, quantity });

          if (!userEmail || !planId || !customerId) {
            console.log("Missing required fields:", { userEmail, planId, customerId });
            break;
          }

          const plan = getPlanNameByPriceId(planId);
          if (!plan) {
            console.log("Invalid plan ID:", planId);
            break;
          }

          console.log('Found plan:', plan);

          // Find organization where user is admin
          const orgSnapshot = await dbAdmin
            .collection('organizations')
            .where('admins', 'array-contains', userEmail)
            .get();

          if (!orgSnapshot.empty) {
            const orgDoc = orgSnapshot.docs[0];
            console.log('Found organization:', orgDoc.id);
            
            const currentData = (await orgDoc.ref.get()).data();
            const currentMembers = currentData?.members || [];

            // Update organization subscription
            await orgDoc.ref.update({
              subscription: {
                plan: plan,
                status: 'Active',
                startedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                stripeCustomerId: customerId,
                subscriptionId: planId,
                seats: quantity,
                usedSeats: currentMembers.length,
              }
            });

            console.log('Updated organization subscription');

            // Update admin user's subscription
            const userSnapshot = await dbAdmin
              .collection('User')
              .where('email', '==', userEmail)
              .get();

            if (!userSnapshot.empty) {
              await userSnapshot.docs[0].ref.update({
                subscription: {
                  plan: plan,
                  status: 'Active',
                  startedAt: new Date(),
                  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                  stripeCustomerId: customerId,
                  subscriptionId: planId,
                }
              });
              console.log('Updated admin user subscription');
            }

            // Update other members' subscriptions
            const otherMembers = currentMembers.filter(member => member !== userEmail);
            if (otherMembers.length > 0) {
              const otherUsersSnapshot = await dbAdmin
                .collection('User')
                .where('email', 'in', otherMembers)
                .get();

              const batch = dbAdmin.batch();
              otherUsersSnapshot.docs.forEach((userDoc) => {
                batch.update(userDoc.ref, {
                  subscription: {
                    plan: plan,
                    status: 'Active',
                    startedAt: new Date(),
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    stripeCustomerId: customerId,
                    subscriptionId: planId,
                  }
                });
              });
              await batch.commit();
              console.log('Updated other members subscriptions');
            }
          }
        } catch (error) {
          console.error("Error handling checkout.session.completed:", error);
          throw error;
        }
        break;
      }

      case "customer.subscription.updated": {
        try {
          const subscription = eventReceived.data.object;
          const customerId = subscription.customer;
          const planId = subscription.items.data[0]?.price.id;
          const quantity = subscription.items.data[0]?.quantity || 1;

          if (!customerId || !planId) {
            console.error("Missing required fields:", { customerId, planId });
            break;
          }

          const plan = getPlanNameByPriceId(planId);
          if (!plan) {
            console.error("Invalid plan ID:", planId);
            break;
          }

          // Find organization by stripeCustomerId
          const orgSnapshot = await dbAdmin
            .collection('organizations')
            .where('subscription.stripeCustomerId', '==', customerId)
            .get();

          if (!orgSnapshot.empty) {
            const orgDoc = orgSnapshot.docs[0];
            const currentData = (await orgDoc.ref.get()).data();
            const currentMembers = currentData?.members || [];

            // Update organization subscription
            await orgDoc.ref.update({
              'subscription.plan': plan,
              'subscription.status': subscription.status,
              'subscription.seats': quantity,
              'subscription.usedSeats': currentMembers.length,
            });

            // Update all member subscriptions
            if (currentMembers.length > 0) {
              const usersSnapshot = await dbAdmin
                .collection('User')
                .where('email', 'in', currentMembers)
                .get();

              const batch = dbAdmin.batch();
              usersSnapshot.docs.forEach((userDoc) => {
                batch.update(userDoc.ref, {
                  'subscription.plan': plan,
                  'subscription.status': subscription.status,
                });
              });
              await batch.commit();
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

          // Find organization by stripeCustomerId
          const orgSnapshot = await dbAdmin
            .collection('organizations')
            .where('subscription.stripeCustomerId', '==', customerId)
            .get();

          if (!orgSnapshot.empty) {
            const orgDoc = orgSnapshot.docs[0];
            const currentData = (await orgDoc.ref.get()).data();
            const currentMembers = currentData?.members || [];

            // Reset organization subscription
            await orgDoc.ref.update({
              subscription: {
                plan: "Free",
                status: "Inactive",
                startedAt: new Date(0),
                expiresAt: new Date(0),
                stripeCustomerId: null,
                subscriptionId: null,
                seats: 0,
                usedSeats: currentMembers.length,
              }
            });

            // Reset all member subscriptions
            if (currentMembers.length > 0) {
              const usersSnapshot = await dbAdmin
                .collection('User')
                .where('email', 'in', currentMembers)
                .get();

              const batch = dbAdmin.batch();
              usersSnapshot.docs.forEach((userDoc) => {
                batch.update(userDoc.ref, {
                  subscription: {
                    plan: "Free",
                    status: "Inactive",
                    startedAt: new Date(0),
                    expiresAt: new Date(0),
                    stripeCustomerId: null,
                    subscriptionId: null,
                  }
                });
              });
              await batch.commit();
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