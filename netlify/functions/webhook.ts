case "checkout.session.completed": {
  try {
    const session = await stripeClient.checkout.sessions.retrieve(
      eventReceived.data.object.id,
      {
        expand: ["line_items"],
      }
    );

    const customerId = session.customer;
    const planId = session.line_items?.data[0]?.price?.id;
    const seats = session.line_items?.data[0]?.quantity || 1; // Get number of seats purchased
    const userEmail = session.customer_details?.email;

    if (!userEmail || !planId || !customerId) {
      console.log("Missing required fields.");
      break;
    }

    // Update organization with subscription and seats
    const orgRef = collection(dbAdmin, 'organizations');
    const orgQuery = query(orgRef, where('admins', 'array-contains', userEmail));
    const orgSnapshot = await getDocs(orgQuery);

    if (!orgSnapshot.empty) {
      const orgDoc = orgSnapshot.docs[0];
      await orgDoc.ref.update({
        subscription: {
          plan: plan,
          status: 'Active',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + getPlanDuration(plan)),
          stripeCustomerId: customerId,
          subscriptionId: planId,
          seats: seats,
          usedSeats: 1 // Initially just the admin
        }
      });
    }

    // Update user's subscription info
    const userRef = query(collection(dbAdmin, 'User'), where('email', '==', userEmail));
    const userSnapshot = await getDocs(userRef);
    
    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0];
      await userDoc.ref.update({
        subscription: {
          plan: plan,
          status: 'Active',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + getPlanDuration(plan)),
          stripeCustomerId: customerId,
          subscriptionId: planId,
        }
      });
    }
  } catch (error) {
    console.error("Error handling checkout.session.completed:", error);
  }
  break;
}