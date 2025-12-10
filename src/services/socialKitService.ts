import { supabase } from "@/integrations/supabase/client";
import { SocialVariant } from "@/constants/socialVariants";

export interface SocialKitJob {
  id: string;
  master_asset_id: string;
  status: "pending" | "generating" | "completed" | "failed";
  selected_model: string;
  total_variants: number;
  completed_variants: number;
  failed_variants: number;
  variants: VariantStatus[];
  salesforce_master_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface VariantStatus {
  id: string;
  platform: string;
  variant: string;
  width: number;
  height: number;
  status: "pending" | "generating" | "completed" | "failed";
  url?: string;
  error?: string;
  assetId?: string;
  s3Key?: string;
}

export interface GenerateSocialKitParams {
  masterAssetId: string;
  masterImageUrl: string;
  selectedVariants: SocialVariant[];
  salesforceMasterId?: string;
  selectedModel?: string;
}

export async function generateSocialKit(params: GenerateSocialKitParams): Promise<SocialKitJob> {
  const { masterAssetId, masterImageUrl, selectedVariants, salesforceMasterId, selectedModel = "native_resize" } = params;

  // Initialize variant statuses
  const variants: VariantStatus[] = selectedVariants.map(v => ({
    id: v.id,
    platform: v.platform,
    variant: v.variant,
    width: v.width,
    height: v.height,
    status: "pending" as const
  }));

  // Create job record - cast to any to bypass type checking for new table
  const { data: job, error: jobError } = await (supabase as any)
    .from("social_kit_jobs")
    .insert({
      master_asset_id: masterAssetId,
      user_id: "anonymous",
      status: "generating",
      selected_model: selectedModel,
      total_variants: selectedVariants.length,
      completed_variants: 0,
      failed_variants: 0,
      variants: variants,
      salesforce_master_id: salesforceMasterId
    })
    .select()
    .single();

  if (jobError) {
    console.error("Error creating social kit job:", jobError);
    throw new Error("Failed to create social kit job");
  }

  return job as SocialKitJob;
}

export async function processVariant(
  jobId: string,
  variant: SocialVariant,
  masterImageUrl: string,
  masterId: string,
  salesforceMasterId?: string,
  model: string = "native_resize"
): Promise<{ success: boolean; url?: string; error?: string; assetId?: string; s3Key?: string }> {
  try {
    const response = await supabase.functions.invoke("generate-social-variant", {
      body: {
        model,
        sourceUrl: masterImageUrl,
        targetWidth: variant.width,
        targetHeight: variant.height,
        outputFilename: variant.filename,
        masterId: masterId,
        platform: variant.platform,
        variantName: variant.variant,
        jobId: jobId,
        variantId: variant.id,
        sfMasterId: salesforceMasterId,
        salesforceData: salesforceMasterId ? {
          masterContentId: salesforceMasterId,
          platform: variant.platform,
          platformVariant: `${variant.platform} ${variant.variant} (${variant.width}x${variant.height})`,
          pixelWidth: variant.width,
          pixelHeight: variant.height,
          systemFlags: [
            "Auto Generated",
            "Social Kit Output",
            "Resized Variant",
            "Derived Asset"
          ]
        } : undefined
      }
    });

    if (response.error) {
      throw new Error(response.error.message || "Edge function error");
    }

    return {
      success: true,
      url: response.data?.url,
      assetId: response.data?.assetId,
      s3Key: response.data?.s3Key
    };
  } catch (error) {
    console.error(`Error processing variant ${variant.id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function updateJobVariantStatus(
  jobId: string,
  variantId: string,
  status: "generating" | "completed" | "failed",
  url?: string,
  error?: string,
  assetId?: string
): Promise<void> {
  // Fetch current job
  const { data: job, error: fetchError } = await (supabase as any)
    .from("social_kit_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (fetchError || !job) {
    console.error("Error fetching job:", fetchError);
    return;
  }

  const jobData = job as SocialKitJob;
  const variants = jobData.variants.map(v => {
    if (v.id === variantId) {
      return { ...v, status, url, error, assetId };
    }
    return v;
  });

  const completedCount = variants.filter(v => v.status === "completed").length;
  const failedCount = variants.filter(v => v.status === "failed").length;
  const allDone = completedCount + failedCount === variants.length;

  await (supabase as any)
    .from("social_kit_jobs")
    .update({
      variants,
      completed_variants: completedCount,
      failed_variants: failedCount,
      status: allDone ? (failedCount === variants.length ? "failed" : "completed") : "generating",
      updated_at: new Date().toISOString()
    })
    .eq("id", jobId);
}

export async function fetchSocialKitJob(jobId: string): Promise<SocialKitJob | null> {
  const { data, error } = await (supabase as any)
    .from("social_kit_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching social kit job:", error);
    return null;
  }

  return data as SocialKitJob | null;
}

export async function fetchJobsForMaster(masterAssetId: string): Promise<SocialKitJob[]> {
  const { data, error } = await (supabase as any)
    .from("social_kit_jobs")
    .select("*")
    .eq("master_asset_id", masterAssetId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching jobs for master:", error);
    return [];
  }

  return (data || []) as SocialKitJob[];
}

export async function fetchVariantsForMaster(masterAssetId: string): Promise<any[]> {
  // Query by master_id column or metadata field
  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .or(`master_id.eq.${masterAssetId},metadata->masterAssetId.eq."${masterAssetId}"`);

  if (error) {
    console.error("Error fetching variants for master:", error);
    return [];
  }

  return data || [];
}

export function validateMasterImage(
  url: string,
  mimeType?: string,
  width?: number,
  height?: number
): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: "Image URL is required" };
  }

  if (mimeType && !["image/jpeg", "image/png", "image/jpg"].includes(mimeType)) {
    return { valid: false, error: "Only JPG and PNG images are supported" };
  }

  if (width && width > 6000) {
    return { valid: false, error: "Image width exceeds maximum of 6000px" };
  }

  if (height && height > 6000) {
    return { valid: false, error: "Image height exceeds maximum of 6000px" };
  }

  return { valid: true };
}
