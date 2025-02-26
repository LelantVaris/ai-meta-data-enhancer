
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@13.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    
    // Read the Stripe webhook secret from environment variables
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create Stripe client
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
    
    // Get the request body as text
    const payload = await req.text();
    
    // Get the Stripe signature from headers
    const signature = req.headers.get("stripe-signature");
    
    let event;
    
    // Verify the webhook signature
    try {
      if (webhookSecret && signature) {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        // If no webhook secret, parse the payload directly (not recommended for production)
        event = JSON.parse(payload);
      }
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 400,
        }
      );
    }
    
    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata.userId;
        
        if (userId === "anonymous") {
          console.log("Anonymous user checkout, no user to update");
          break;
        }
        
        if (session.mode === "payment") {
          // Handle one-time payment
          await supabase.from("purchases").insert({
            user_id: userId,
            stripe_payment_id: session.payment_intent,
            amount: session.amount_total / 100, // Convert from cents
            currency: session.currency,
            status: "succeeded",
          });
        } else if (session.mode === "subscription") {
          // For subscriptions, the subscription details will come in a separate event
          console.log("Subscription checkout completed, waiting for subscription event");
        }
        break;
      }
      
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Find the user associated with this Stripe customer
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();
        
        if (profile) {
          // Update or insert the subscription
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("stripe_subscription_id", subscription.id)
            .single();
          
          if (existingSub) {
            // Update existing subscription
            await supabase
              .from("subscriptions")
              .update({
                status: subscription.status,
                plan_type: subscription.items.data[0].price.id,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingSub.id);
          } else {
            // Insert new subscription
            await supabase.from("subscriptions").insert({
              user_id: profile.id,
              stripe_subscription_id: subscription.id,
              status: subscription.status,
              plan_type: subscription.items.data[0].price.id,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            });
          }
        }
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        
        // Update subscription status to canceled
        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
          
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return new Response(JSON.stringify({ received: true }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error handling webhook:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});
