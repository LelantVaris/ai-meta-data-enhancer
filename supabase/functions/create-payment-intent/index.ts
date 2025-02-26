
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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Missing Stripe secret key");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const { priceId, customerId, paymentType } = await req.json();

    if (!priceId || !customerId) {
      throw new Error("Missing required fields");
    }

    // Get price information from Stripe
    const price = await stripe.prices.retrieve(priceId);
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price.unit_amount || 0,
      currency: price.currency || 'usd',
      customer: customerId,
      metadata: {
        priceId,
        paymentType,
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
