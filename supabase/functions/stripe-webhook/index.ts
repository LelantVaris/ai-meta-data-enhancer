import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.2.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    return new Response(
      JSON.stringify({ error: "Missing Stripe API key" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }

  // Verify we're using the correct environment (test vs live)
  const isTestMode = stripeSecretKey.startsWith('sk_test_');
  const stripeMode = isTestMode ? 'TEST MODE' : 'PRODUCTION MODE';
  console.log(`stripe-webhook: Using Stripe in ${stripeMode}`);
  
  if (isTestMode) {
    console.warn("stripe-webhook: WARNING - Using Stripe test mode. For production payments, use a live key.");
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
  });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase credentials" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing Stripe signature" }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      return new Response(
        JSON.stringify({ error: "Missing webhook secret" }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // Use client_reference_id which contains the Supabase user ID
        const userId = session.client_reference_id;
        const metadata = session.metadata || {};
        const purchaseType = metadata.purchase_type || 'one_time';
        
        if (userId) {
          console.log(`Processing completed checkout for user: ${userId}, purchase type: ${purchaseType}`);
          
          // Update subscription table
          const { error } = await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              subscription_status: 'active',
              subscription_type: purchaseType,
            }, { onConflict: 'user_id' });

          if (error) {
            console.error("Error updating subscription status:", error);
            throw error;
          }
        }
        break;
      }
      
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        // Subscription payments will keep active
        const { data, error: userError } = await supabase
          .from("user_subscriptions")
          .select("user_id")
          .eq("user_id", customerId)
          .maybeSingle();
          
        if (userError) {
          console.error("Error finding user by Stripe ID:", userError);
        } else if (data) {
          const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({ 
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', data.user_id);
          
          if (updateError) {
            console.error("Error updating subscription status:", updateError);
          }
        }
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Find the user and set their subscription to inactive
        const { data, error: userError } = await supabase
          .from("user_subscriptions")
          .select("user_id")
          .eq("user_id", customerId)
          .maybeSingle();
          
        if (userError) {
          console.error("Error finding user for canceled subscription:", userError);
        } else if (data) {
          const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({ 
              subscription_status: 'inactive',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', data.user_id);
          
          if (updateError) {
            console.error("Error updating subscription status to inactive:", updateError);
          }
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    console.error(`Error processing webhook: ${err.message}`);
    return new Response(
      JSON.stringify({ error: `Webhook Error: ${err.message}` }),
      { headers: { "Content-Type": "application/json" }, status: 400 }
    );
  }
});
