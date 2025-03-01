// Type definitions for Deno APIs
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): { [key: string]: string };
  }
  
  export const env: Env;
}

// Type definitions for Deno modules
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export interface ServeInit {
    port?: number;
    hostname?: string;
    handler?: (request: Request) => Response | Promise<Response>;
    onError?: (error: unknown) => Response | Promise<Response>;
    onListen?: (params: { hostname: string; port: number }) => void;
  }

  export type Handler = (request: Request) => Response | Promise<Response>;
  
  export function serve(
    handler: Handler | ServeInit,
    options?: ServeInit
  ): void;
}

declare module "https://esm.sh/stripe@13.2.0" {
  interface StripeConstructor {
    new (apiKey: string, options?: {
      apiVersion?: string;
      maxNetworkRetries?: number;
      httpAgent?: unknown;
      timeout?: number;
      host?: string;
      port?: number;
      protocol?: string;
      telemetry?: boolean;
      appInfo?: {
        name?: string;
        version?: string;
        url?: string;
      };
    }): Stripe;
    
    (apiKey: string, options?: {
      apiVersion?: string;
      maxNetworkRetries?: number;
      httpAgent?: unknown;
      timeout?: number;
      host?: string;
      port?: number;
      protocol?: string;
      telemetry?: boolean;
      appInfo?: {
        name?: string;
        version?: string;
        url?: string;
      };
    }): Stripe;
  }
  
  interface PaymentIntent {
    id: string;
    client_secret: string;
    status: string;
    amount: number;
    currency: string;
    [key: string]: any;
  }
  
  interface CheckoutSession {
    id: string;
    url: string;
    status: string;
    [key: string]: any;
  }
  
  interface StripeEvent {
    type: string;
    data: {
      object: Record<string, any>;
    };
    [key: string]: any;
  }
  
  interface Stripe {
    paymentIntents: {
      create(params: Record<string, any>): Promise<PaymentIntent>;
    };
    checkout: {
      sessions: {
        create(params: Record<string, any>): Promise<CheckoutSession>;
      };
    };
    webhooks: {
      constructEvent(payload: string, signature: string, secret: string): StripeEvent;
    };
  }
  
  // Export the Stripe constructor as default export
  const Stripe: StripeConstructor;
  export default Stripe;
}

declare module "https://esm.sh/@supabase/supabase-js@2.7.1" {
  interface SupabaseClient {
    from(table: string): {
      select(columns?: string): any;
      update(data: Record<string, any>): any;
      upsert(data: Record<string, any>, options?: { onConflict: string }): Promise<{ error: Error | null }>;
      [key: string]: any;
    };
  }
  
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any
  ): SupabaseClient;
} 