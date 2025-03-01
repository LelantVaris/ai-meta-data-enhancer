/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../../deno.d.ts" />
/* eslint-enable @typescript-eslint/triple-slash-reference */
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
    // Use the server-side secret key from environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("create-payment-intent: Missing Stripe secret key");
      throw new Error("Missing Stripe secret key");
    }

    // Force production mode only - no more test mode checks
    console.log(`create-payment-intent: Using Stripe in PRODUCTION MODE`);
    
    // Initialize Stripe with the appropriate API version
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16", // Using the latest stable API version
    });

    // Get request body
    const requestData = await req.json();
    const { priceId, customerId, paymentType, email } = requestData;

    console.log("create-payment-intent: Request data:", { 
      priceId, 
      customerId, 
      paymentType, 
      email
    });

    if (!priceId || !customerId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Set the amount based on the product type
    const amount = paymentType === 'one_time' ? 99 : 499; // $0.99 or $4.99
    const currency = 'usd';
    
    console.log("create-payment-intent: Creating payment intent:", { 
      amount, 
      currency, 
      customerId
    });

    // Create a payment intent with additional params
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      receipt_email: email,
      metadata: {
        priceId,
        paymentType,
        customerId
      },
    });

    console.log(`create-payment-intent: Payment intent created successfully: ${paymentIntent.id}`);

    // Return the client secret to the client
    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("create-payment-intent: Error processing request:", errorMessage);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
