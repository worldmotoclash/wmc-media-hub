export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      character_library: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          element_type: string
          id: string
          image_url: string
          name: string
          source_asset_id: string | null
          style_profile: Json | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          element_type: string
          id?: string
          image_url: string
          name: string
          source_asset_id?: string | null
          style_profile?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          element_type?: string
          id?: string
          image_url?: string
          name?: string
          source_asset_id?: string | null
          style_profile?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_library_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      content_review_activities: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          media_asset_id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          media_asset_id: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          media_asset_id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_review_activities_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      image_generations: {
        Row: {
          created_at: string
          error_message: string | null
          generation_data: Json
          id: string
          image_url: string | null
          progress: number
          prompt: string
          reference_image_url: string | null
          status: string
          template: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          generation_data?: Json
          id?: string
          image_url?: string | null
          progress?: number
          prompt: string
          reference_image_url?: string | null
          status?: string
          template?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          generation_data?: Json
          id?: string
          image_url?: string | null
          progress?: number
          prompt?: string
          reference_image_url?: string | null
          status?: string
          template?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      media_asset_tags: {
        Row: {
          created_at: string
          id: string
          media_asset_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_asset_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_asset_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_asset_tags_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_asset_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "media_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          asset_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration: number | null
          file_format: string | null
          file_size: number | null
          file_url: string | null
          id: string
          master_id: string | null
          metadata: Json | null
          platform: string | null
          resolution: string | null
          s3_key: string | null
          salesforce_id: string | null
          source: Database["public"]["Enums"]["media_source"]
          source_id: string | null
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          variant_name: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          asset_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: number | null
          file_format?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          master_id?: string | null
          metadata?: Json | null
          platform?: string | null
          resolution?: string | null
          s3_key?: string | null
          salesforce_id?: string | null
          source: Database["public"]["Enums"]["media_source"]
          source_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          variant_name?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          asset_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: number | null
          file_format?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          master_id?: string | null
          metadata?: Json | null
          platform?: string | null
          resolution?: string | null
          s3_key?: string | null
          salesforce_id?: string | null
          source?: Database["public"]["Enums"]["media_source"]
          source_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          variant_name?: string | null
        }
        Relationships: []
      }
      media_tags: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      s3_bucket_configs: {
        Row: {
          bucket_name: string
          cdn_base_url: string | null
          created_at: string
          endpoint_url: string
          id: string
          is_active: boolean | null
          last_scanned_at: string | null
          name: string
          region: string | null
          scan_frequency_hours: number | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          cdn_base_url?: string | null
          created_at?: string
          endpoint_url: string
          id?: string
          is_active?: boolean | null
          last_scanned_at?: string | null
          name: string
          region?: string | null
          scan_frequency_hours?: number | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          cdn_base_url?: string | null
          created_at?: string
          endpoint_url?: string
          id?: string
          is_active?: boolean | null
          last_scanned_at?: string | null
          name?: string
          region?: string | null
          scan_frequency_hours?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      social_kit_jobs: {
        Row: {
          completed_variants: number
          created_at: string
          error_message: string | null
          failed_variants: number
          id: string
          master_asset_id: string
          salesforce_master_id: string | null
          selected_model: string
          status: string
          total_variants: number
          updated_at: string
          user_id: string
          variants: Json
        }
        Insert: {
          completed_variants?: number
          created_at?: string
          error_message?: string | null
          failed_variants?: number
          id?: string
          master_asset_id: string
          salesforce_master_id?: string | null
          selected_model?: string
          status?: string
          total_variants?: number
          updated_at?: string
          user_id?: string
          variants?: Json
        }
        Update: {
          completed_variants?: number
          created_at?: string
          error_message?: string | null
          failed_variants?: number
          id?: string
          master_asset_id?: string
          salesforce_master_id?: string | null
          selected_model?: string
          status?: string
          total_variants?: number
          updated_at?: string
          user_id?: string
          variants?: Json
        }
        Relationships: []
      }
      video_generations: {
        Row: {
          created_at: string
          error_message: string | null
          generation_data: Json
          google_operation_id: string | null
          id: string
          media_url_key: string | null
          progress: number
          provider: string
          salesforce_record_id: string | null
          status: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          generation_data: Json
          google_operation_id?: string | null
          id?: string
          media_url_key?: string | null
          progress?: number
          provider?: string
          salesforce_record_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          generation_data?: Json
          google_operation_id?: string | null
          id?: string
          media_url_key?: string | null
          progress?: number
          provider?: string
          salesforce_record_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      video_scene_detections: {
        Row: {
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          media_asset_id: string | null
          processed_at: string | null
          processing_status: string
          results: Json | null
          threshold: number
          total_scenes: number
          updated_at: string
          video_duration: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          media_asset_id?: string | null
          processed_at?: string | null
          processing_status?: string
          results?: Json | null
          threshold?: number
          total_scenes?: number
          updated_at?: string
          video_duration?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          media_asset_id?: string | null
          processed_at?: string | null
          processing_status?: string
          results?: Json | null
          threshold?: number
          total_scenes?: number
          updated_at?: string
          video_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_scene_detections_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      media_source:
        | "salesforce"
        | "s3_bucket"
        | "youtube"
        | "generated"
        | "local_upload"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      media_source: [
        "salesforce",
        "s3_bucket",
        "youtube",
        "generated",
        "local_upload",
      ],
    },
  },
} as const
