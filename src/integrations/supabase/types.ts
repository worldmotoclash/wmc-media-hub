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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      album_pages: {
        Row: {
          album_id: string
          cached_image_url: string | null
          created_at: string
          drive_file_id: string | null
          file_size: number | null
          folder_path: string | null
          google_base_url: string
          google_drive_folder_id: string | null
          google_media_item_id: string
          id: string
          original_filename: string | null
          page_number: number
          updated_at: string
        }
        Insert: {
          album_id: string
          cached_image_url?: string | null
          created_at?: string
          drive_file_id?: string | null
          file_size?: number | null
          folder_path?: string | null
          google_base_url: string
          google_drive_folder_id?: string | null
          google_media_item_id: string
          id?: string
          original_filename?: string | null
          page_number: number
          updated_at?: string
        }
        Update: {
          album_id?: string
          cached_image_url?: string | null
          created_at?: string
          drive_file_id?: string | null
          file_size?: number | null
          folder_path?: string | null
          google_base_url?: string
          google_drive_folder_id?: string | null
          google_media_item_id?: string
          id?: string
          original_filename?: string | null
          page_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_pages_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "google_photos_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_webhook_channels: {
        Row: {
          channel_id: string
          created_at: string
          expiration: string
          folder_id: string
          id: string
          resource_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          expiration: string
          folder_id: string
          id?: string
          resource_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          expiration?: string
          folder_id?: string
          id?: string
          resource_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gallery_settings: {
        Row: {
          created_at: string
          id: string
          root_folder_id: string
          root_folder_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          root_folder_id: string
          root_folder_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          root_folder_id?: string
          root_folder_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_photos_albums: {
        Row: {
          album_name: string
          cover_image_url: string | null
          cover_photo_url: string | null
          created_at: string
          drive_file_id: string | null
          folder_path: string | null
          google_album_id: string
          google_drive_folder_id: string | null
          id: string
          media_items_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          album_name: string
          cover_image_url?: string | null
          cover_photo_url?: string | null
          created_at?: string
          drive_file_id?: string | null
          folder_path?: string | null
          google_album_id: string
          google_drive_folder_id?: string | null
          id?: string
          media_items_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          album_name?: string
          cover_image_url?: string | null
          cover_photo_url?: string | null
          created_at?: string
          drive_file_id?: string | null
          folder_path?: string | null
          google_album_id?: string
          google_drive_folder_id?: string | null
          id?: string
          media_items_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      processing_jobs: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          id: string
          image_url: string
          moved_to_out: boolean | null
          processing_notes: string | null
          results: Json | null
          stamp_count: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          image_url: string
          moved_to_out?: boolean | null
          processing_notes?: string | null
          results?: Json | null
          stamp_count?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          image_url?: string
          moved_to_out?: boolean | null
          processing_notes?: string | null
          results?: Json | null
          stamp_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          drive_folder_id: string | null
          full_name: string | null
          google_access_token: string | null
          google_photos_access_token: string | null
          google_photos_refresh_token: string | null
          google_photos_token_expires_at: string | null
          google_refresh_token: string | null
          google_sheet_id: string | null
          google_token_expires_at: string | null
          id: string
          in_folder_id: string | null
          out_folder_id: string | null
          subscription_status: string | null
          updated_at: string
          user_id: string
          user_sheet_id: string | null
        }
        Insert: {
          created_at?: string
          drive_folder_id?: string | null
          full_name?: string | null
          google_access_token?: string | null
          google_photos_access_token?: string | null
          google_photos_refresh_token?: string | null
          google_photos_token_expires_at?: string | null
          google_refresh_token?: string | null
          google_sheet_id?: string | null
          google_token_expires_at?: string | null
          id?: string
          in_folder_id?: string | null
          out_folder_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id: string
          user_sheet_id?: string | null
        }
        Update: {
          created_at?: string
          drive_folder_id?: string | null
          full_name?: string | null
          google_access_token?: string | null
          google_photos_access_token?: string | null
          google_photos_refresh_token?: string | null
          google_photos_token_expires_at?: string | null
          google_refresh_token?: string | null
          google_sheet_id?: string | null
          google_token_expires_at?: string | null
          id?: string
          in_folder_id?: string | null
          out_folder_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id?: string
          user_sheet_id?: string | null
        }
        Relationships: []
      }
      stamp_sheet_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          position_on_sheet: number | null
          stamp_id: string
          stamp_sheet_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          position_on_sheet?: number | null
          stamp_id: string
          stamp_sheet_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          position_on_sheet?: number | null
          stamp_id?: string
          stamp_sheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_stamp_sheet_items_sheet"
            columns: ["stamp_sheet_id"]
            isOneToOne: false
            referencedRelation: "stamp_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stamp_sheet_items_stamp"
            columns: ["stamp_id"]
            isOneToOne: false
            referencedRelation: "stamps"
            referencedColumns: ["id"]
          },
        ]
      }
      stamp_sheets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          page_number: number | null
          sheet_name: string
          total_stamps: number | null
          total_value_usd: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          page_number?: number | null
          sheet_name?: string
          total_stamps?: number | null
          total_value_usd?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          page_number?: number | null
          sheet_name?: string
          total_stamps?: number | null
          total_value_usd?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stamps: {
        Row: {
          cached_image_url: string | null
          color: string | null
          confidence_score: number | null
          country: string | null
          created_at: string
          denomination: string | null
          drive_file_id: string | null
          estimated_value_usd: number | null
          google_base_url: string | null
          google_media_item_id: string | null
          height: number | null
          id: string
          page_id: string | null
          position_x: number | null
          position_y: number | null
          processing_job_id: string
          stamp_description: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          width: number | null
          year: number | null
        }
        Insert: {
          cached_image_url?: string | null
          color?: string | null
          confidence_score?: number | null
          country?: string | null
          created_at?: string
          denomination?: string | null
          drive_file_id?: string | null
          estimated_value_usd?: number | null
          google_base_url?: string | null
          google_media_item_id?: string | null
          height?: number | null
          id?: string
          page_id?: string | null
          position_x?: number | null
          position_y?: number | null
          processing_job_id: string
          stamp_description: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          width?: number | null
          year?: number | null
        }
        Update: {
          cached_image_url?: string | null
          color?: string | null
          confidence_score?: number | null
          country?: string | null
          created_at?: string
          denomination?: string | null
          drive_file_id?: string | null
          estimated_value_usd?: number | null
          google_base_url?: string | null
          google_media_item_id?: string | null
          height?: number | null
          id?: string
          page_id?: string | null
          position_x?: number | null
          position_y?: number | null
          processing_job_id?: string
          stamp_description?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          width?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stamps_processing_job"
            columns: ["processing_job_id"]
            isOneToOne: false
            referencedRelation: "processing_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stamps_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "album_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
