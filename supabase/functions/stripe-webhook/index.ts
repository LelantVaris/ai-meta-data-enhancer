
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
        
        if (userId) {
          console.log("Updating user:", userId);
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            userId,
            { user_metadata: { paid_user: true } }
          );

          if (updateError) {
            console.error("Error updating user metadata:", updateError);
            throw updateError;
          }
        }
        break;
      }
      
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        // Find user by Stripe customer ID in metadata
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("raw_user_meta_data->stripe_customer_id", customerId)
          .maybeSingle();
          
        if (userError) {
          console.error("Error finding user by Stripe ID:", userError);
        } else if (user) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { user_metadata: { paid_user: true } }
          );
          
          if (updateError) {
            console.error("Error updating user subscription metadata:", updateError);
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
