
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  
  try {
    console.log("create-checkout-session: Function invoked");
    
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("create-checkout-session: Missing Stripe secret key");
      throw new Error("Missing Stripe secret key");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const requestData = await req.json();
    const { price, quantity, mode, customerId, purchaseType = 'one_time' } = requestData;
    const origin = req.headers.get("origin");
    
    console.log("create-checkout-session: Request data:", {
      price,
      quantity, 
      mode,
      customerId,
      purchaseType,
      origin
    });

    // Create checkout session
    console.log("create-checkout-session: Creating checkout session");
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: price,
          quantity: quantity,
        },
      ],
      mode: mode,
      success_url: `${origin}?payment_status=success`,
      cancel_url: `${origin}?payment_status=cancel`,
      client_reference_id: customerId,
      metadata: {
        supabase_user_id: customerId,
        purchase_type: purchaseType,
      },
    });
    
    console.log("create-checkout-session: Session created with ID:", session.id);
    console.log("create-checkout-session: Session URL:", session.url);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("create-checkout-session: Error creating session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
