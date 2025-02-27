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
    const origin = req.headers.get("origin") || 'http://localhost:3000'; // Fallback origin
    
    console.log("create-checkout-session: Request data:", {
      price,
      quantity, 
      mode,
      customerId,
      purchaseType,
      origin
    });

    // Validate required fields
    if (!price) {
      throw new Error("Missing price ID");
    }
    
    if (!customerId) {
      throw new Error("Missing customer ID");
    }

    // Create checkout session
    console.log("create-checkout-session: Creating checkout session with stripe secret key length:", stripeSecretKey.length);
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: price,
            quantity: quantity || 1,
          },
        ],
        mode: mode || 'payment',
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
    } catch (stripeError: unknown) {
      console.error("create-checkout-session: Stripe API error:", stripeError);
      const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
      throw new Error(`Stripe API error: ${errorMessage}`);
    }
  } catch (error: unknown) {
    console.error("create-checkout-session: Error creating session:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: String(error)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
