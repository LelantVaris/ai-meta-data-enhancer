
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  
  try {
    // Use the server-side secret key with beta flag as specified in the docs
    const stripeSecretKey = "sk_test_51JmBHWIN4GhAoTF7hdVq57mDhlotp7NC9OgvtvrobJ3r4G6dc6pqzx8zgBMIEVCm0yWHfZG1oDzxKSagoxkfrddo00viiZiach";
    
    // Initialize Stripe with the beta flag
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2020-08-27; custom_checkout_beta=v1" as any,
    });

    // Get request body
    const requestData = await req.json();
    const { priceId, customerId, paymentType, email } = requestData;

    console.log("Request data:", { priceId, customerId, paymentType, email });

    if (!priceId || !customerId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // For testing purposes, we're using hardcoded amounts
    const amount = paymentType === 'one_time' ? 99 : 399; // $0.99 or $3.99
    const currency = 'usd';
    
    console.log("Creating payment intent:", { amount, currency, customerId });

    // Create a payment intent with additional params
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      receipt_email: email,
      metadata: {
        priceId,
        paymentType,
        customerId,
      },
      // Add any specific beta parameters here if needed
    });

    console.log("Payment intent created:", paymentIntent.id);

    // Return the client secret to the client
    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
