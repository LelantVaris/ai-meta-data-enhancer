
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get secrets from Supabase
    const { data: secretData, error: secretError } = await supabaseClient
      .from('secrets')
      .select('value')
      .eq('name', 'OPENAI_API_KEY')
      .single();

    if (secretError) {
      // Fall back to environment variable if secret retrieval fails
      console.error('Error fetching secret:', secretError);
    }

    // Use the secret from the database or fall back to environment variable
    const openAIApiKey = secretData?.value || Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const { text, isTitle, maxLength } = await req.json();
    
    // Skip empty text
    if (!text) {
      return new Response(JSON.stringify({ enhancedText: "" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = isTitle 
      ? `You are an expert SEO specialist. Optimize the given meta title to be compelling, concise, and under ${maxLength} characters. Include important keywords, maintain clarity, and ensure it accurately represents the content. Only return the optimized text without any explanation or quotes.`
      : `You are an expert SEO specialist. Optimize the given meta description to be informative, engaging, and under ${maxLength} characters. Include a clear value proposition, relevant keywords, and a subtle call to action when appropriate. Only return the optimized text without any explanation or quotes.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.7,
        max_tokens: maxLength * 2,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }
    
    const enhancedText = data.choices[0].message.content.trim();

    return new Response(JSON.stringify({ enhancedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error enhancing meta:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
