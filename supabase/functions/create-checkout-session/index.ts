
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
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create Stripe client
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get the request body
    const { price, quantity, mode } = await req.json();
    
    // Get user from auth token
    const authHeader = req.headers.get("Authorization");
    let userId = null;
    let userEmail = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (user && !error) {
        userId = user.id;
        userEmail = user.email;
      }
    }
    
    // Create a Stripe checkout session
    let customerId = null;
    
    // If user is authenticated, try to find or create a Stripe customer
    if (userId && userEmail) {
      try {
        // Check if user has a Stripe customer ID
        const { data: profile } = await supabase
          .from("profiles")
          .select("stripe_customer_id")
          .eq("id", userId)
          .single();
          
        if (profile?.stripe_customer_id) {
          customerId = profile.stripe_customer_id;
        } else {
          // Create a new Stripe customer
          const customer = await stripe.customers.create({
            email: userEmail,
            metadata: {
              userId: userId,
            },
          });
          
          customerId = customer.id;
          
          // Update user profile with Stripe customer ID
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", userId);
        }
      } catch (err) {
        console.error("Error creating/finding customer:", err);
        // Continue without customer ID if there's an error
      }
    }
    
    // Define success and cancel URLs
    const origin = req.headers.get("origin") || "http://localhost:5173";
    const successUrl = `${origin}?payment_status=success`;
    const cancelUrl = `${origin}?payment_status=cancel`;
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: price, // Now using the actual Stripe price ID
          quantity: quantity,
        },
      ],
      mode: mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId || "anonymous",
      },
    });
    
    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    
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
