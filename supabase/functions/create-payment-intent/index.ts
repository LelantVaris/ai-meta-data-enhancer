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

    // Verify we're using the correct environment (test vs live)
    const isTestMode = stripeSecretKey.startsWith('sk_test_');
    const stripeMode = isTestMode ? 'TEST MODE' : 'PRODUCTION MODE';
    console.log(`create-payment-intent: Using Stripe in ${stripeMode}`);
    
    if (isTestMode) {
      console.warn("create-payment-intent: WARNING - Using Stripe test mode. For production payments, use a live key.");
    }
    
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
      email,
      priceIdPrefix: priceId?.substring(0, 8)
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

    // Verify we're using the correct price ID environment
    const isPriceTestMode = priceId.startsWith('price_test_');
    const isPriceLiveMode = priceId.startsWith('price_');
    
    if (isTestMode && !isPriceTestMode && isPriceLiveMode) {
      console.error("create-payment-intent: Environment mismatch - Using test API key with live price ID");
      throw new Error("Environment mismatch: Cannot use live price IDs with test API keys");
    }
    
    if (!isTestMode && isPriceTestMode) {
      console.error("create-payment-intent: Environment mismatch - Using live API key with test price ID");
      throw new Error("Environment mismatch: Cannot use test price IDs with live API keys");
    }

    // Set the amount based on the product type
    const amount = paymentType === 'one_time' ? 99 : 399; // $0.99 or $3.99
    const currency = 'usd';
    
    console.log("create-payment-intent: Creating payment intent:", { 
      amount, 
      currency, 
      customerId,
      mode: stripeMode 
    });

    // Create a payment intent with additional params
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      receipt_email: email,
      metadata: {
        priceId,
        paymentType,
        customerId,
        mode: stripeMode,
      },
    });

    console.log(`create-payment-intent: Payment intent created successfully: ${paymentIntent.id} in ${stripeMode}`);

    // Return the client secret to the client
    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        mode: stripeMode,
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
    
    // Enhanced error details
    let detailedError = errorMessage;
    if (errorMessage.includes("No such payment_intent") && errorMessage.includes("test mode")) {
      detailedError = "Error: Stripe environment mismatch. You're likely using a live key to access test data. Make sure both frontend and backend are using the same environment (test or live).";
    } else if (errorMessage.includes("No such payment_intent") && errorMessage.includes("live mode")) {
      detailedError = "Error: Stripe environment mismatch. You're likely using a test key to access live data. Make sure both frontend and backend are using the same environment (test or live).";
    }
    
    return new Response(
      JSON.stringify({ 
        error: detailedError,
        originalError: errorMessage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
