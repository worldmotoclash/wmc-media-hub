import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BucketConfig {
  id: string;
  name: string;
  bucket_name: string;
  endpoint_url: string;
  region?: string;
}

async function testS3Connection(bucket: BucketConfig): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    const accessKeyId = Deno.env.get('WASABI_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('WASABI_SECRET_ACCESS_KEY');
    
    if (!accessKeyId || !secretAccessKey) {
      return { success: false, error: 'Missing Wasabi credentials in server environment' };
    }

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: 's3',
      region: bucket.region || 'us-east-1',
    });

    // Test with a simple HEAD request to the bucket
    const url = `${bucket.endpoint_url}/${bucket.bucket_name}`;
    console.log(`[TEST] Testing connection to: ${url}`);
    
    const res = await aws.fetch(url, { method: 'HEAD' });
    const responseText = await res.text();
    
    if (res.ok) {
      return { success: true };
    } else {
      console.error(`[TEST] Connection failed: ${res.status} ${res.statusText}`, responseText);
      
      let errorMessage = `Connection failed (${res.status}): ${res.statusText}`;
      let details: any = { status: res.status, statusText: res.statusText };
      
      // Parse common S3 errors
      if (responseText.includes('<Code>')) {
        const codeMatch = /<Code>(.*?)<\/Code>/.exec(responseText);
        const messageMatch = /<Message>(.*?)<\/Message>/.exec(responseText);
        if (codeMatch && messageMatch) {
          errorMessage = `${codeMatch[1]}: ${messageMatch[1]}`;
          details = { ...details, code: codeMatch[1], message: messageMatch[1] };
        }
      }
      
      if (res.status === 403) {
        errorMessage = 'Access denied - check your credentials and bucket permissions';
      } else if (res.status === 404) {
        errorMessage = 'Bucket not found - verify bucket name and region';
      } else if (res.status === 400) {
        errorMessage = 'Bad request - check endpoint URL and region settings';
      }
      
      return { success: false, error: errorMessage, details };
    }
  } catch (e: any) {
    console.error('[TEST] Connection error:', e);
    return { 
      success: false, 
      error: `Connection error: ${e.message || 'Unknown error'}`,
      details: { exception: e.message }
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { bucketConfigId } = await req.json();
    if (!bucketConfigId) {
      return new Response(JSON.stringify({ error: 'bucketConfigId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate that bucketConfigId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(bucketConfigId)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid bucketConfigId - must be a valid UUID from the database' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load bucket configuration from database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: bucket, error: bucketError } = await supabase
      .from('s3_bucket_configs')
      .select('*')
      .eq('id', bucketConfigId)
      .maybeSingle();

    if (bucketError) {
      console.error('[DB] Error loading bucket config:', bucketError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to load bucket configuration', 
        details: bucketError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!bucket) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Bucket configuration not found: ${bucketConfigId}` 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[TEST] Testing connection for ${bucket.name} (${bucket.bucket_name})`);
    const result = await testS3Connection(bucket);

    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    console.error('[TEST] Error:', e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Test failed', 
      details: String(e?.message || e) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
