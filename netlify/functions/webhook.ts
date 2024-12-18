import { Handler } from "@netlify/functions";
import stripe from "stripe";
import dotenv from "dotenv";
import { Plans } from "../../src/utils/Plans";
import dbAdmin from "../../src/services/adminSDK";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

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
              expand: ["line_items", "customer", "subscription"],
            }
          );
      
          console.log("Session data:", JSON.stringify(session, null, 2));
      
          const customerId = session.customer;
          const userEmail = session.customer_details?.email;
          const lineItem = session.line_items?.data[0];
          const planId = lineItem?.price?.id;
          const quantity = lineItem?.quantity || 1;
      
          console.log("Extracted data:", {
            customerId,
            userEmail,
            planId,
            quantity
          });
      
          if (!userEmail || !planId || !customerId) {
            throw new Error(`Missing required fields: ${JSON.stringify({
              userEmail,
              planId,
              customerId
            })}`);
          }
      
          const plan = getPlanNameByPriceId(planId);
          console.log("Found plan:", plan);
          
          if (!plan) {
            throw new Error(`No plan found for price ID: ${planId}`);
          }
      
          // Find organization where user is admin
          const orgRef = collection(dbAdmin, 'organizations');
          const orgQuery = query(orgRef, where('admins', 'array-contains', userEmail));
          const orgSnapshot = await getDocs(orgQuery);
      
          console.log("Organization query result:", {
            exists: !orgSnapshot.empty,
            count: orgSnapshot.size
          });
      
          if (!orgSnapshot.empty) {
            const orgDoc = orgSnapshot.docs[0];
            const currentData = (await getDoc(orgDoc.ref)).data();
            
            console.log("Current org data:", currentData);
      
            const subscriptionUpdate = {
              subscription: {
                plan: plan,
                status: 'Active',
                startedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                stripeCustomerId: customerId,
                subscriptionId: planId,
                seats: quantity,
                usedSeats: currentData?.members?.length || 1,
              }
            };
      
            console.log("Updating organization with:", subscriptionUpdate);
      
            await updateDoc(orgDoc.ref, subscriptionUpdate);
            console.log("Organization update completed");
      
            // Update admin's subscription
            const userRef = collection(dbAdmin, 'User');
            const userQuery = query(userRef, where('email', '==', userEmail));
            const userSnapshot = await getDocs(userQuery);
      
            if (!userSnapshot.empty) {
              const userDoc = userSnapshot.docs[0];
              await updateDoc(userDoc.ref, {
                subscription: {
                  plan: plan,
                  status: 'Active',
                  startedAt: new Date(),
                  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                  stripeCustomerId: customerId,
                  subscriptionId: planId,
                }
              });
              console.log("Admin user update completed");
            } else {
              console.error("Admin user document not found");
            }
          } else {
            console.error("No organization found for admin:", userEmail);
          }
        } catch (error) {
          console.error("Error in checkout.session.completed:", error);
          // Important: Re-throw the error so it's properly logged
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
          const orgRef = collection(dbAdmin, 'organizations');
          const orgQuery = query(orgRef, where('subscription.stripeCustomerId', '==', customerId));
          const orgSnapshot = await getDocs(orgQuery);

          if (!orgSnapshot.empty) {
            const orgDoc = orgSnapshot.docs[0];
            const currentData = (await getDoc(orgDoc.ref)).data();
            const currentMembers = currentData?.members || [];

            // Update organization subscription
            await updateDoc(orgDoc.ref, {
              'subscription.plan': plan,
              'subscription.status': subscription.status,
              'subscription.seats': quantity,
              'subscription.usedSeats': currentMembers.length,
            });

            // Update all member subscriptions
            if (currentMembers.length > 0) {
              const usersQuery = query(
                collection(dbAdmin, 'User'),
                where('email', 'in', currentMembers)
              );
              const usersSnapshot = await getDocs(usersQuery);

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
          const orgRef = collection(dbAdmin, 'organizations');
          const orgQuery = query(orgRef, where('subscription.stripeCustomerId', '==', customerId));
          const orgSnapshot = await getDocs(orgQuery);

          if (!orgSnapshot.empty) {
            const orgDoc = orgSnapshot.docs[0];
            const currentData = (await getDoc(orgDoc.ref)).data();
            const currentMembers = currentData?.members || [];

            // Reset organization subscription
            await updateDoc(orgDoc.ref, {
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
              const usersQuery = query(
                collection(dbAdmin, 'User'),
                where('email', 'in', currentMembers)
              );
              const usersSnapshot = await getDocs(usersQuery);

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