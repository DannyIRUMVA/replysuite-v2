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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          role: string | null
          session_id: string | null
          token_count: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          session_id?: string | null
          token_count?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          session_id?: string | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          chatbot_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          chatbot_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          chatbot_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbots: {
        Row: {
          created_at: string | null
          current_embedding_mb: number | null
          deleted_at: string | null
          id: string
          is_public: boolean | null
          name: string
          system_prompt: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_embedding_mb?: number | null
          deleted_at?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          system_prompt?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_embedding_mb?: number | null
          deleted_at?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          system_prompt?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_rates: {
        Row: {
          base_currency: string
          id: string
          is_active: boolean | null
          rate: number
          target_currency: string
          updated_at: string | null
        }
        Insert: {
          base_currency: string
          id?: string
          is_active?: boolean | null
          rate: number
          target_currency: string
          updated_at?: string | null
        }
        Update: {
          base_currency?: string
          id?: string
          is_active?: boolean | null
          rate?: number
          target_currency?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          chatbot_id: string | null
          content_text: string | null
          created_at: string | null
          data_size_bytes: number | null
          id: string
          metadata: Json | null
          status: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          chatbot_id?: string | null
          content_text?: string | null
          created_at?: string | null
          data_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          chatbot_id?: string | null
          content_text?: string | null
          created_at?: string | null
          data_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_sources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings: {
        Row: {
          chatbot_id: string | null
          content: string | null
          created_at: string | null
          id: string
          token_count: number | null
          vec: string | null
          vector: Json | null
        }
        Insert: {
          chatbot_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          token_count?: number | null
          vec?: string | null
          vector?: Json | null
        }
        Update: {
          chatbot_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          token_count?: number | null
          vec?: string | null
          vector?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_accounts: {
        Row: {
          access_token: string | null
          created_at: string | null
          id: string
          instagram_account_id: string | null
          last_synced: string | null
          platform_id: string | null
          profile_picture: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          instagram_account_id?: string | null
          last_synced?: string | null
          platform_id?: string | null
          profile_picture?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          instagram_account_id?: string | null
          last_synced?: string | null
          platform_id?: string | null
          profile_picture?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      instagram_comment_triggers: {
        Row: {
          chatbot_id: string | null
          created_at: string | null
          dm_template: string | null
          id: string
          instagram_post_id: string | null
          is_active: boolean | null
          keywords: string[] | null
          reply_in_comment: boolean | null
          reply_in_dm: boolean | null
          trigger_type: string | null
        }
        Insert: {
          chatbot_id?: string | null
          created_at?: string | null
          dm_template?: string | null
          id?: string
          instagram_post_id?: string | null
          is_active?: boolean | null
          keywords?: string[] | null
          reply_in_comment?: boolean | null
          reply_in_dm?: boolean | null
          trigger_type?: string | null
        }
        Update: {
          chatbot_id?: string | null
          created_at?: string | null
          dm_template?: string | null
          id?: string
          instagram_post_id?: string | null
          is_active?: boolean | null
          keywords?: string[] | null
          reply_in_comment?: boolean | null
          reply_in_dm?: boolean | null
          trigger_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_comment_triggers_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_comment_triggers_instagram_post_id_fkey"
            columns: ["instagram_post_id"]
            isOneToOne: false
            referencedRelation: "instagram_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_comments: {
        Row: {
          comment_id: string
          comment_text: string | null
          commenter_asid: string | null
          commenter_username: string | null
          created_at: string | null
          id: string
          instagram_account_id: string | null
          instagram_post_id: string | null
          payload: Json | null
        }
        Insert: {
          comment_id: string
          comment_text?: string | null
          commenter_asid?: string | null
          commenter_username?: string | null
          created_at?: string | null
          id?: string
          instagram_account_id?: string | null
          instagram_post_id?: string | null
          payload?: Json | null
        }
        Update: {
          comment_id?: string
          comment_text?: string | null
          commenter_asid?: string | null
          commenter_username?: string | null
          created_at?: string | null
          id?: string
          instagram_account_id?: string | null
          instagram_post_id?: string | null
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_comments_account_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_comments_post_fkey"
            columns: ["instagram_post_id"]
            isOneToOne: false
            referencedRelation: "instagram_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_message_jobs: {
        Row: {
          chatbot_id: string | null
          comment_id: string | null
          created_at: string
          id: string
          instagram_account_id: string | null
          instagram_post_id: string | null
          payload: Json | null
          recipient_asid: string | null
          status: string | null
          trigger_id: string | null
        }
        Insert: {
          chatbot_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          instagram_account_id?: string | null
          instagram_post_id?: string | null
          payload?: Json | null
          recipient_asid?: string | null
          status?: string | null
          trigger_id?: string | null
        }
        Update: {
          chatbot_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          instagram_account_id?: string | null
          instagram_post_id?: string | null
          payload?: Json | null
          recipient_asid?: string | null
          status?: string | null
          trigger_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_message_jobs_account_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_message_jobs_chatbot_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_message_jobs_trigger_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "instagram_comment_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_posts: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          instagram_account_id: string | null
          media_type: string | null
          media_url: string | null
          permalink: string | null
          thumbnail_height: number | null
          thumbnail_url: string | null
          thumbnail_width: number | null
          updated_at: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id: string
          instagram_account_id?: string | null
          media_type?: string | null
          media_url?: string | null
          permalink?: string | null
          thumbnail_height?: number | null
          thumbnail_url?: string | null
          thumbnail_width?: number | null
          updated_at?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          instagram_account_id?: string | null
          media_type?: string | null
          media_url?: string | null
          permalink?: string | null
          thumbnail_height?: number | null
          thumbnail_url?: string | null
          thumbnail_width?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_posts_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          created_at: string | null
          event: string
          id: string
          level: string | null
          message: string | null
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          event: string
          id?: string
          level?: string | null
          message?: string | null
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          event?: string
          id?: string
          level?: string | null
          message?: string | null
          payload?: Json | null
        }
        Relationships: []
      }
      mail: {
        Row: {
          created_at: string | null
          html: string | null
          id: string
          status: string | null
          subject: string
          to: string
        }
        Insert: {
          created_at?: string | null
          html?: string | null
          id?: string
          status?: string | null
          subject: string
          to: string
        }
        Update: {
          created_at?: string | null
          html?: string | null
          id?: string
          status?: string | null
          subject?: string
          to?: string
        }
        Relationships: []
      }
      onboarding_steps: {
        Row: {
          code: string
          description: string | null
          id: string
        }
        Insert: {
          code: string
          description?: string | null
          id?: string
        }
        Update: {
          code?: string
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          id: string
          plan_id: string | null
          provider: string | null
          reference: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          plan_id?: string | null
          provider?: string | null
          reference?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          plan_id?: string | null
          provider?: string | null
          reference?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          advanced_training: boolean | null
          api_access: boolean | null
          created_at: string | null
          description: string | null
          display_name: string | null
          has_auto_comment: boolean | null
          has_script_embed: boolean | null
          id: string
          instagram_access: boolean | null
          internal_slug: string | null
          max_auto_dms: number | null
          max_auto_dms_per_month: number | null
          max_chatbots: number | null
          max_embedding_mb: number | null
          max_instagram_accounts: number | null
          max_replies_per_month: number | null
          max_sources: number | null
          max_tokens: number | null
          max_training_units: number | null
          max_triggers: number | null
          monthly_price_usd: number | null
          name: string
          polar_payment_processor: string | null
          polar_product_id: string | null
          polar_product_price_id: string | null
          price_usd: number
          priority_support: boolean | null
          remove_branding: boolean | null
          yearly_price_usd: number | null
        }
        Insert: {
          advanced_training?: boolean | null
          api_access?: boolean | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          has_auto_comment?: boolean | null
          has_script_embed?: boolean | null
          id?: string
          instagram_access?: boolean | null
          internal_slug?: string | null
          max_auto_dms?: number | null
          max_auto_dms_per_month?: number | null
          max_chatbots?: number | null
          max_embedding_mb?: number | null
          max_instagram_accounts?: number | null
          max_replies_per_month?: number | null
          max_sources?: number | null
          max_tokens?: number | null
          max_training_units?: number | null
          max_triggers?: number | null
          monthly_price_usd?: number | null
          name: string
          polar_payment_processor?: string | null
          polar_product_id?: string | null
          polar_product_price_id?: string | null
          price_usd: number
          priority_support?: boolean | null
          remove_branding?: boolean | null
          yearly_price_usd?: number | null
        }
        Update: {
          advanced_training?: boolean | null
          api_access?: boolean | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          has_auto_comment?: boolean | null
          has_script_embed?: boolean | null
          id?: string
          instagram_access?: boolean | null
          internal_slug?: string | null
          max_auto_dms?: number | null
          max_auto_dms_per_month?: number | null
          max_chatbots?: number | null
          max_embedding_mb?: number | null
          max_instagram_accounts?: number | null
          max_replies_per_month?: number | null
          max_sources?: number | null
          max_tokens?: number | null
          max_training_units?: number | null
          max_triggers?: number | null
          monthly_price_usd?: number | null
          name?: string
          polar_payment_processor?: string | null
          polar_product_id?: string | null
          polar_product_price_id?: string | null
          price_usd?: number
          priority_support?: boolean | null
          remove_branding?: boolean | null
          yearly_price_usd?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_name: string | null
          contact_email: string | null
          country: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          phone: string | null
          timezone: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          is_verified?: boolean | null
          phone?: string | null
          timezone?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          phone?: string | null
          timezone?: string | null
          website?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          meta: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          message: string
          meta?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          meta?: Json | null
        }
        Relationships: []
      }
      training_jobs: {
        Row: {
          chatbot_id: string
          finished_at: string | null
          id: string
          meta: Json | null
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          chatbot_id: string
          finished_at?: string | null
          id?: string
          meta?: Json | null
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          chatbot_id?: string
          finished_at?: string | null
          id?: string
          meta?: Json | null
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_jobs_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      training_usage: {
        Row: {
          chatbot_id: string | null
          created_at: string | null
          id: string
          month_year: string
          training_count: number | null
          user_id: string | null
        }
        Insert: {
          chatbot_id?: string | null
          created_at?: string | null
          id?: string
          month_year: string
          training_count?: number | null
          user_id?: string | null
        }
        Update: {
          chatbot_id?: string | null
          created_at?: string | null
          id?: string
          month_year?: string
          training_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_usage_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          created_at: string
          id: string
          meta: Json | null
          source: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          meta?: Json | null
          source?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          meta?: Json | null
          source?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_memberships: {
        Row: {
          amount: number | null
          created_at: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          plan_id: string | null
          starts_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_id?: string | null
          starts_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_id?: string | null
          starts_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          id: string
          step_code: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          step_code?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          step_code?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_onboarding_step_code_fkey"
            columns: ["step_code"]
            isOneToOne: false
            referencedRelation: "onboarding_steps"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_onboarding_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_verifications: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          status: string | null
          token: string | null
          user_id: string | null
          verification_type: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          token?: string | null
          user_id?: string | null
          verification_type?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          token?: string | null
          user_id?: string | null
          verification_type?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      website_embeds: {
        Row: {
          chatbot_id: string | null
          created_at: string | null
          domain: string | null
          embed_key: string
          id: string
        }
        Insert: {
          chatbot_id?: string | null
          created_at?: string | null
          domain?: string | null
          embed_key: string
          id?: string
        }
        Update: {
          chatbot_id?: string | null
          created_at?: string | null
          domain?: string | null
          embed_key?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_embeds_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_accounts: {
        Row: {
          access_token: string
          chatbot_id: string | null
          created_at: string | null
          id: string
          phone_number: string
          phone_number_id: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          waba_id: string | null
        }
        Insert: {
          access_token: string
          chatbot_id?: string | null
          created_at?: string | null
          id?: string
          phone_number: string
          phone_number_id: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          waba_id?: string | null
        }
        Update: {
          access_token?: string
          chatbot_id?: string | null
          created_at?: string | null
          id?: string
          phone_number?: string
          phone_number_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          waba_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_accounts_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_jobs: {
        Row: {
          chatbot_id: string | null
          created_at: string | null
          from_number: string
          id: string
          payload: Json | null
          status: string | null
          whatsapp_account_id: string | null
        }
        Insert: {
          chatbot_id?: string | null
          created_at?: string | null
          from_number: string
          id?: string
          payload?: Json | null
          status?: string | null
          whatsapp_account_id?: string | null
        }
        Update: {
          chatbot_id?: string | null
          created_at?: string | null
          from_number?: string
          id?: string
          payload?: Json | null
          status?: string | null
          whatsapp_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_jobs_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_jobs_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_daily_analytics: {
        Args: { acc_ids: string[]; days_count: number }
        Returns: {
          count: number
          date: string
        }[]
      }
      match_embeddings:
        | {
            Args: {
              p_chatbot_id: string
              p_limit?: number
              p_query_vec: string
            }
            Returns: {
              content: string
              id: string
              score: number
            }[]
          }
        | {
            Args: {
              match_count: number
              match_threshold: number
              p_chatbot_id: string
              query_embedding: string
            }
            Returns: {
              content: string
              id: string
              similarity: number
            }[]
          }
      match_embeddings_meta: {
        Args: { p_chatbot_id: string; p_limit?: number; p_query_vec: string }
        Returns: {
          content: string
          distance: number
          id: string
          similarity: number
        }[]
      }
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
