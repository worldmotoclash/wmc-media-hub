import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WMC_CONTENT_API = "https://api.realintelligence.com/api/wmc-content-master.py";
const ORG_ID = "00D5e000000HEcP";
const CDN_HOST = "media.worldmotoclash.com";
const WASABI_HOST = "s3.wasabisys.com";

interface ContentRecord {
  salesforceId: string;
  name: string;
  url: string;
}

interface AuditResult {
  salesforceId: string;
  name: string;
  url: string;
  error: string;
}

function parseContentRecords(xml: string): ContentRecord[] {
  const records: ContentRecord[] = [];
  const blocks = xml.match(/<content>[\s\S]*?<\/content>/g) || [];

  for (const block of blocks) {
    const idMatch = block.match(/<id>([^<]+)<\/id>/);
    const nameMatch = block.match(/<name>([^<]+)<\/name>/);
    const urlMatch = block.match(/<url>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/url>/);

    if (idMatch && urlMatch) {
      const url = urlMatch[1].trim();
      if (url.includes(CDN_HOST) || url.includes(WASABI_HOST)) {
        records.push({
          salesforceId: idMatch[1].trim(),
          name: nameMatch ? nameMatch[1].trim() : "Unknown",
          url,
        });
      }
    }
  }
  return records;
}

function cdnUrlToS3Key(url: string): string | null {
  try {
    const parsed = new URL(url);
    // CDN URL: https://media.worldmotoclash.com/PATH
    if (parsed.hostname === CDN_HOST) {
      return parsed.pathname.replace(/^\//, "");
    }
    // Direct Wasabi: https://s3.wasabisys.com/BUCKET/PATH
    if (parsed.hostname.includes(WASABI_HOST)) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length > 1) {
        return parts.slice(1).join("/");
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function checkBatch(
  aws: AwsClient,
  records: ContentRecord[],
  endpoint: string,
  bucketName: string
): Promise<{ healthy: ContentRecord[]; broken: AuditResult[] }> {
  const healthy: ContentRecord[] = [];
  const broken: AuditResult[] = [];

  const results = await Promise.allSettled(
    records.map(async (record) => {
      const s3Key = cdnUrlToS3Key(record.url);
      if (!s3Key) {
        return { record, ok: false, error: "Could not parse S3 key from URL" };
      }
      const headUrl = `${endpoint}/${bucketName}/${s3Key}`;
      try {
        const res = await aws.fetch(headUrl, { method: "HEAD" });
        if (res.ok) {
          return { record, ok: true, error: "" };
        }
        return { record, ok: false, error: `HTTP ${res.status}` };
      } catch (e: any) {
        return { record, ok: false, error: e.message || "Network error" };
      }
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      if (r.value.ok) {
        healthy.push(r.value.record);
      } else {
        broken.push({ ...r.value.record, error: r.value.error });
      }
    } else {
      // Promise rejected unexpectedly
      broken.push({ salesforceId: "unknown", name: "unknown", url: "unknown", error: r.reason?.message || "Unknown" });
    }
  }

  return { healthy, broken };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessKeyId = Deno.env.get("WASABI_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("WASABI_SECRET_ACCESS_KEY");
    if (!accessKeyId || !secretAccessKey) {
      return new Response(JSON.stringify({ error: "Missing Wasabi credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = "https://s3.wasabisys.com";
    const bucketName = "worldmotoclash";
    const region = "us-east-1";

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region,
      service: "s3",
    });

    // 1. Fetch SFDC content feed
    console.log("Fetching SFDC content feed...");
    const feedUrl = `${WMC_CONTENT_API}?orgId=${ORG_ID}&sandbox=False`;
    const feedRes = await fetch(feedUrl);
    if (!feedRes.ok) {
      throw new Error(`Failed to fetch content feed: ${feedRes.status}`);
    }
    const xml = await feedRes.text();
    console.log(`Feed size: ${xml.length} chars`);

    // 2. Parse records
    const records = parseContentRecords(xml);
    console.log(`Found ${records.length} Wasabi/CDN records to audit`);

    // 3. HEAD-check in batches of 5
    const BATCH_SIZE = 5;
    const allHealthy: ContentRecord[] = [];
    const allBroken: AuditResult[] = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      console.log(`Checking batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)}`);
      const { healthy, broken } = await checkBatch(aws, batch, endpoint, bucketName);
      allHealthy.push(...healthy);
      allBroken.push(...broken);
    }

    const report = {
      total: records.length,
      healthy: allHealthy.length,
      broken: allBroken.length,
      brokenRecords: allBroken,
    };

    console.log(`Audit complete: ${report.healthy} healthy, ${report.broken} broken`);

    return new Response(JSON.stringify(report, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Audit error:", e);
    return new Response(JSON.stringify({ error: e.message || "Audit failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
