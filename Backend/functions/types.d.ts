// Minimal type declarations for Deno and remote imports used by Edge Functions
declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

declare module 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm' {
  export function createClient(url: string, key: string): any;
  const _default: { createClient: typeof createClient };
  export default _default;
}

declare module 'https://deno.land/std@0.177.0/http/server.ts' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}
