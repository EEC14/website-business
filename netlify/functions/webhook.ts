import { Handler } from "@netlify/functions";
import stripe from "stripe";
import dotenv from "dotenv";
import { Plans } from "../../src/utils/Plans";
import dbAdmin from "../../src/services/adminSDK";
dotenv.config();

const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

// Create Stripe webhook handler
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
      case "payment_intent.created": {
        const paymentIntent = eventReceived.data.object;
        console.log("Payment Intent created:", paymentIntent.id);
        break;
      }

      case "checkout.session.completed": {
        try {
          // Retrieve session details with customer and line_items expanded
          const session = await stripeClient.checkout.sessions.retrieve(
            eventReceived.data.object.id,
            {
              expand: ["line_items"],
            }
          );

          // Extract necessary details
          const customerId = session.customer; // This is the Stripe customer ID
          const planId = session.line_items?.data[0]?.price?.id; // Plan price ID
          const userEmail = session.customer_details?.email; // Customer email

          console.log("Customer ID:", customerId);
          console.log("User Email:", userEmail);
          console.log("Plan ID:", planId);

          // Validate required fields
          if (!userEmail || !planId || !customerId) {
            console.log("Missing required fields.");
            break;
          }

          // Get the plan name using the plan ID
          const plan = getPlanNameByPriceId(planId);
          if (!plan) {
            console.log("Invalid plan ID.");
            break;
          }
          console.log("Plan:", plan);

          // Find the user in the database by email
          const userRef = dbAdmin
            .collection("User")
            .where("email", "==", userEmail);
          const userSnapshot = await userRef.get();

          console.log("User:", userSnapshot);

          if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            const existingStripeCustomerId =
              userDoc.data()?.subscription.stripeCustomerId;
            console.log(userDoc.data());

            console.log(existingStripeCustomerId);
            console.log(customerId);
            if (existingStripeCustomerId) {
              console.log(
                "Customer already exists in the database, updating subscription."
              );
              await userDoc.ref.update({
                subscription: {
                  plan: plan,
                  status: "Active",
                  startedAt: new Date(),
                  expiresAt: new Date(Date.now() + getPlanDuration(plan)),
                  subscriptionId: planId,
                  stripeCustomerId: existingStripeCustomerId,
                },
              });
            } else {
              console.log(
                "Customer not found in the database, creating new Stripe customer."
              );
              await userDoc.ref.update({
                subscription: {
                  plan: plan,
                  status: "Active",
                  startedAt: new Date(),
                  expiresAt: new Date(Date.now() + getPlanDuration(plan)), // Assuming plan duration is in milliseconds
                  stripeCustomerId: customerId,
                  subscriptionId: planId,
                },
              });
            }

            console.log("User updated successfully.");
          } else {
            console.log("User not found in the database.");
          }
        } catch (error) {
          console.error("Error handling checkout.session.completed:", error);
        }
        break;
      }
      case "customer.subscription.updated": {
        try {
          const subscription = eventReceived.data.object;
          const customerId = subscription.customer;
          const planId = subscription.items.data[0]?.price.id;

          console.log("Customer ID:", customerId);
          console.log("Plan ID:", planId);

          if (!customerId || !planId) {
            console.error("Missing required fields: customerId or planId.");
            break;
          }
          const plan = getPlanNameByPriceId(planId);
          if (!plan) {
            console.error("Invalid plan ID provided.");
            break;
          }
          console.log("Plan Name:", plan);

          const userRef = dbAdmin
            .collection("User")
            .where("subscription.stripeCustomerId", "==", customerId);
          const userSnapshot = await userRef.get();
          if (userSnapshot.empty) {
            console.error(
              "User with the given Stripe customer ID not found in the database."
            );
            break;
          }
          const userDoc = userSnapshot.docs[0];

          await userDoc.ref.update({
            subscription: {
              plan: plan,
              status: "Active",
              startedAt: new Date(),
              expiresAt: new Date(Date.now() + getPlanDuration(plan)), // Assuming plan duration is in milliseconds
              stripeCustomerId: customerId,
              subscriptionId: planId,
            },
          });
          console.log("User subscription updated successfully.");
        } catch (error) {
          console.error("Error handling customer.subscription.updated:", error);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = eventReceived.data.object;
        const stripeCustomerId = subscription.customer;

        const usersRef = dbAdmin.collection("User");
        const userQuery = await usersRef
          .where("stripeCustomerId", "==", stripeCustomerId)
          .get();

        if (!userQuery.empty) {
          const userDoc = userQuery.docs[0];

          // Update user subscription status to inactive
          await userDoc.ref.update({
            subscription: {
              plan: "Free",
              status: "Inactive",
              startedAt: new Date(0), // Invalid date
              expiresAt: new Date(0), // Invalid date
            },
            stripeCustomerId: null,
            subscriptionId: null,
          });

          console.log("User subscription canceled, set to Free plan.");
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${eventReceived.type}`);
    }

    return {
      statusCode: 200,
      body: "Webhook handled successfully",
    };
  } catch (err) {
    console.error("Webhook Error:", err);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err}`,
    };
  }
};

// Helper function to map price ID to plan name
function getPlanNameByPriceId(priceId: string): string | null {
  for (const planKey in Plans) {
    const plan = Plans[planKey as keyof typeof Plans];
    if (plan.priceId === priceId) {
      return plan.name;
    }
  }
  return null; // Return null if priceId is not found
}

// Helper function to get plan duration in milliseconds (example durations)
function getPlanDuration(planName: string): number {
  return 30 * 24 * 60 * 60 * 1000; // 30 days
}
