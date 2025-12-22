--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_channels; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.ai_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    base_url text NOT NULL,
    api_key text,
    model text,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ai_channels OWNER TO supabase_admin;

--
-- Name: card_history; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.card_history (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    card_id uuid,
    version_number integer NOT NULL,
    file_path text NOT NULL,
    file_name text,
    file_hash text,
    thumbnail_path text,
    data jsonb,
    changelog text,
    created_by text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.card_history OWNER TO supabase_admin;

--
-- Name: card_reviews; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.card_reviews (
    card_id uuid NOT NULL,
    rating_plot smallint,
    rating_logic smallint,
    rating_worldview smallint,
    rating_formatting smallint,
    rating_playability smallint,
    rating_human smallint,
    rating_first_message smallint,
    mood text,
    best_model text,
    best_preset text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT card_reviews_rating_first_message_check CHECK (((rating_first_message >= 0) AND (rating_first_message <= 5))),
    CONSTRAINT card_reviews_rating_formatting_check CHECK (((rating_formatting >= 0) AND (rating_formatting <= 5))),
    CONSTRAINT card_reviews_rating_human_check CHECK (((rating_human >= 0) AND (rating_human <= 5))),
    CONSTRAINT card_reviews_rating_logic_check CHECK (((rating_logic >= 0) AND (rating_logic <= 5))),
    CONSTRAINT card_reviews_rating_playability_check CHECK (((rating_playability >= 0) AND (rating_playability <= 5))),
    CONSTRAINT card_reviews_rating_plot_check CHECK (((rating_plot >= 0) AND (rating_plot <= 5))),
    CONSTRAINT card_reviews_rating_worldview_check CHECK (((rating_worldview >= 0) AND (rating_worldview <= 5)))
);


ALTER TABLE public.card_reviews OWNER TO supabase_admin;

--
-- Name: TABLE card_reviews; Type: COMMENT; Schema: public; Owner: supabase_admin
--

COMMENT ON TABLE public.card_reviews IS 'Stores personal reviews for character cards (1:1 relationship)';


--
-- Name: card_tags; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.card_tags (
    card_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    is_manual boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.card_tags OWNER TO supabase_admin;

--
-- Name: card_versions; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.card_versions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    main_card_id uuid,
    version_card_id uuid,
    version_name text,
    version_notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.card_versions OWNER TO supabase_admin;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.categories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    color text,
    icon text,
    parent_id uuid,
    sort_order integer DEFAULT 0,
    card_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO supabase_admin;

--
-- Name: character_cards; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.character_cards (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    file_hash text,
    file_name text,
    file_size integer,
    file_type text,
    storage_path text,
    thumbnail_path text,
    name text NOT NULL,
    description text,
    personality text,
    scenario text,
    first_message text,
    creator_notes text,
    ai_summary text,
    ai_tags text[],
    category_id uuid,
    user_rating integer,
    rating_dimensions jsonb,
    user_notes text,
    is_favorite boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    play_count integer DEFAULT 0,
    last_played_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    data jsonb DEFAULT '{}'::jsonb,
    regex_scripts jsonb DEFAULT '[]'::jsonb,
    is_nsfw boolean DEFAULT false,
    current_version integer DEFAULT 1
);


ALTER TABLE public.character_cards OWNER TO supabase_admin;

--
-- Name: COLUMN character_cards.data; Type: COMMENT; Schema: public; Owner: supabase_admin
--

COMMENT ON COLUMN public.character_cards.data IS 'Stores the full V3 character data object including character_book and extensions';


--
-- Name: COLUMN character_cards.regex_scripts; Type: COMMENT; Schema: public; Owner: supabase_admin
--

COMMENT ON COLUMN public.character_cards.regex_scripts IS 'Stores user-defined regex scripts for chat display optimization';


--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_id uuid,
    file_name text NOT NULL,
    s3_key text NOT NULL,
    file_size bigint,
    message_count integer,
    created_at timestamp with time zone DEFAULT now(),
    last_read_page integer DEFAULT 1
);


ALTER TABLE public.chat_sessions OWNER TO supabase_admin;

--
-- Name: TABLE chat_sessions; Type: COMMENT; Schema: public; Owner: supabase_admin
--

COMMENT ON TABLE public.chat_sessions IS 'Tracks uploaded chat history files for character cards';


--
-- Name: collection_cards; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.collection_cards (
    collection_id uuid NOT NULL,
    card_id uuid NOT NULL,
    sort_order integer DEFAULT 0,
    added_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.collection_cards OWNER TO supabase_admin;

--
-- Name: collections; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.collections (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    cover_card_id uuid,
    is_smart boolean DEFAULT false,
    smart_filter jsonb,
    card_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.collections OWNER TO supabase_admin;

--
-- Name: play_sessions; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.play_sessions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    card_id uuid,
    played_at timestamp with time zone DEFAULT now(),
    duration_minutes integer,
    model_used text,
    api_provider text,
    rating integer,
    mood text,
    notes text,
    screenshots text[],
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.play_sessions OWNER TO supabase_admin;

--
-- Name: regex_rules; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.regex_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_id uuid,
    name text NOT NULL,
    regex text NOT NULL,
    replacement text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.regex_rules OWNER TO supabase_admin;

--
-- Name: TABLE regex_rules; Type: COMMENT; Schema: public; Owner: supabase_admin
--

COMMENT ON TABLE public.regex_rules IS 'Stores regex rules for chat history sanitization. card_id NULL implies global rule.';


--
-- Name: settings; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.settings OWNER TO supabase_admin;

--
-- Name: shared_links; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.shared_links (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    token text NOT NULL,
    chat_session_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);


ALTER TABLE public.shared_links OWNER TO supabase_admin;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.tags (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    color text,
    is_ai_generated boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tags OWNER TO supabase_admin;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.user_settings (
    id text DEFAULT 'default'::text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


ALTER TABLE public.user_settings OWNER TO supabase_admin;

--
-- Name: ai_channels ai_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.ai_channels
    ADD CONSTRAINT ai_channels_pkey PRIMARY KEY (id);


--
-- Name: card_history card_history_card_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.card_history
    ADD CONSTRAINT card_history_card_id_version_number_key UNIQUE (card_id, version_number);


--
-- Name: card_history card_history_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.card_history
    ADD CONSTRAINT card_history_pkey PRIMARY KEY (id);


--
-- Name: card_reviews card_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.card_reviews
    ADD CONSTRAINT card_reviews_pkey PRIMARY KEY (card_id);


--
-- Name: card_tags card_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.card_tags
    ADD CONSTRAINT card_tags_pkey PRIMARY KEY (card_id, tag_id);


--
-- Name: card_versions card_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.card_versions
    ADD CONSTRAINT card_versions_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: character_cards character_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.character_cards
    ADD CONSTRAINT character_cards_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: collection_cards collection_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.collection_cards
    ADD CONSTRAINT collection_cards_pkey PRIMARY KEY (collection_id, card_id);


--
-- Name: collections collections_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_pkey PRIMARY KEY (id);


--
-- Name: play_sessions play_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.play_sessions
    ADD CONSTRAINT play_sessions_pkey PRIMARY KEY (id);


--
-- Name: regex_rules regex_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.regex_rules
    ADD CONSTRAINT regex_rules_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: shared_links shared_links_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.shared_links
    ADD CONSTRAINT shared_links_pkey PRIMARY KEY (id);


--
-- Name: shared_links shared_links_token_key; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.shared_links
    ADD CONSTRAINT shared_links_token_key UNIQUE (token);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: idx_card_tags_card_id; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX idx_card_tags_card_id ON public.card_tags USING btree (card_id);


--
-- Name: idx_card_tags_tag_id; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX idx_card_tags_tag_id ON public.card_tags USING btree (tag_id);


--
-- Name: idx_character_cards_category_id; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX idx_character_cards_category_id ON public.character_cards USING btree (category_id);


--
-- Name: idx_character_cards_created_at; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX idx_character_cards_created_at ON public.character_cards USING btree (created_at DESC);


--
-- Name: idx_character_cards_data; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX idx_character_cards_data ON public.character_cards USING gin (data);


--
-- Name: idx_character_cards_is_favorite; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX idx_character_cards_is_favorite ON public.character_cards USING btree (is_favorite);


--
-- Name: idx_character_cards_is_nsfw; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX idx_character_cards_is_nsfw ON public.character_cards USING btree (is_nsfw);


--
-- Name: idx_character_cards_name; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX idx_character_cards_name ON public.character_cards USING btree (name);


--
-- Name: idx_character_cards_user_rating; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX idx_character_cards_user_rating ON public.character_cards USING btree (user_rating DESC);


--
-- Name: idx_chat_sessions_card_id; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX idx_chat_sessions_card_id ON public.chat_sessions USING btree (card_id);


--
-- Name: idx_chat_sessions_created_at; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX idx_chat_sessions_created_at ON public.chat_sessions USING btree (created_at DESC);


--
-- Name: idx_shared_links_token; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX idx_shared_links_token ON public.shared_links USING btree (token);


--
-- Name: card_history card_history_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.card_history
    ADD CONSTRAINT card_history_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.character_cards(id) ON DELETE CASCADE;


--
-- Name: card_reviews card_reviews_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.card_reviews
    ADD CONSTRAINT card_reviews_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.character_cards(id) ON DELETE CASCADE;


--
-- Name: card_tags card_tags_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.card_tags
    ADD CONSTRAINT card_tags_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.character_cards(id) ON DELETE CASCADE;


--
-- Name: card_tags card_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.card_tags
    ADD CONSTRAINT card_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: card_versions card_versions_main_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.card_versions
    ADD CONSTRAINT card_versions_main_card_id_fkey FOREIGN KEY (main_card_id) REFERENCES public.character_cards(id) ON DELETE CASCADE;


--
-- Name: card_versions card_versions_version_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.card_versions
    ADD CONSTRAINT card_versions_version_card_id_fkey FOREIGN KEY (version_card_id) REFERENCES public.character_cards(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: character_cards character_cards_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.character_cards
    ADD CONSTRAINT character_cards_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: chat_sessions chat_sessions_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.character_cards(id) ON DELETE CASCADE;


--
-- Name: collection_cards collection_cards_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.collection_cards
    ADD CONSTRAINT collection_cards_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.character_cards(id) ON DELETE CASCADE;


--
-- Name: collection_cards collection_cards_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.collection_cards
    ADD CONSTRAINT collection_cards_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE;


--
-- Name: collections collections_cover_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_cover_card_id_fkey FOREIGN KEY (cover_card_id) REFERENCES public.character_cards(id);


--
-- Name: play_sessions play_sessions_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.play_sessions
    ADD CONSTRAINT play_sessions_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.character_cards(id) ON DELETE CASCADE;


--
-- Name: regex_rules regex_rules_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.regex_rules
    ADD CONSTRAINT regex_rules_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.character_cards(id) ON DELETE CASCADE;


--
-- Name: shared_links shared_links_chat_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.shared_links
    ADD CONSTRAINT shared_links_chat_session_id_fkey FOREIGN KEY (chat_session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: card_history Enable all access for service role; Type: POLICY; Schema: public; Owner: supabase_admin
--

CREATE POLICY "Enable all access for service role" ON public.card_history TO service_role USING (true) WITH CHECK (true);


--
-- Name: character_cards Enable all access for service role; Type: POLICY; Schema: public; Owner: supabase_admin
--

CREATE POLICY "Enable all access for service role" ON public.character_cards TO service_role USING (true) WITH CHECK (true);


--
-- Name: card_history Enable read access for all users; Type: POLICY; Schema: public; Owner: supabase_admin
--

CREATE POLICY "Enable read access for all users" ON public.card_history FOR SELECT USING (true);


--
-- Name: character_cards Enable read access for all users; Type: POLICY; Schema: public; Owner: supabase_admin
--

CREATE POLICY "Enable read access for all users" ON public.character_cards FOR SELECT USING (true);


--
-- Name: card_history; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.card_history ENABLE ROW LEVEL SECURITY;

--
-- Name: character_cards; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.character_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: TABLE ai_channels; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.ai_channels TO postgres;
GRANT ALL ON TABLE public.ai_channels TO anon;
GRANT ALL ON TABLE public.ai_channels TO authenticated;
GRANT ALL ON TABLE public.ai_channels TO service_role;


--
-- Name: TABLE card_history; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.card_history TO postgres;
GRANT ALL ON TABLE public.card_history TO anon;
GRANT ALL ON TABLE public.card_history TO authenticated;
GRANT ALL ON TABLE public.card_history TO service_role;


--
-- Name: TABLE card_reviews; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.card_reviews TO postgres;
GRANT ALL ON TABLE public.card_reviews TO anon;
GRANT ALL ON TABLE public.card_reviews TO authenticated;
GRANT ALL ON TABLE public.card_reviews TO service_role;


--
-- Name: TABLE card_tags; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.card_tags TO postgres;
GRANT ALL ON TABLE public.card_tags TO anon;
GRANT ALL ON TABLE public.card_tags TO authenticated;
GRANT ALL ON TABLE public.card_tags TO service_role;


--
-- Name: TABLE card_versions; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.card_versions TO postgres;
GRANT ALL ON TABLE public.card_versions TO anon;
GRANT ALL ON TABLE public.card_versions TO authenticated;
GRANT ALL ON TABLE public.card_versions TO service_role;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.categories TO postgres;
GRANT ALL ON TABLE public.categories TO anon;
GRANT ALL ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;


--
-- Name: TABLE character_cards; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.character_cards TO postgres;
GRANT ALL ON TABLE public.character_cards TO anon;
GRANT ALL ON TABLE public.character_cards TO authenticated;
GRANT ALL ON TABLE public.character_cards TO service_role;


--
-- Name: TABLE chat_sessions; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.chat_sessions TO postgres;
GRANT ALL ON TABLE public.chat_sessions TO anon;
GRANT ALL ON TABLE public.chat_sessions TO authenticated;
GRANT ALL ON TABLE public.chat_sessions TO service_role;


--
-- Name: TABLE collection_cards; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.collection_cards TO postgres;
GRANT ALL ON TABLE public.collection_cards TO anon;
GRANT ALL ON TABLE public.collection_cards TO authenticated;
GRANT ALL ON TABLE public.collection_cards TO service_role;


--
-- Name: TABLE collections; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.collections TO postgres;
GRANT ALL ON TABLE public.collections TO anon;
GRANT ALL ON TABLE public.collections TO authenticated;
GRANT ALL ON TABLE public.collections TO service_role;


--
-- Name: TABLE play_sessions; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.play_sessions TO postgres;
GRANT ALL ON TABLE public.play_sessions TO anon;
GRANT ALL ON TABLE public.play_sessions TO authenticated;
GRANT ALL ON TABLE public.play_sessions TO service_role;


--
-- Name: TABLE regex_rules; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.regex_rules TO postgres;
GRANT ALL ON TABLE public.regex_rules TO anon;
GRANT ALL ON TABLE public.regex_rules TO authenticated;
GRANT ALL ON TABLE public.regex_rules TO service_role;


--
-- Name: TABLE settings; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.settings TO postgres;
GRANT ALL ON TABLE public.settings TO anon;
GRANT ALL ON TABLE public.settings TO authenticated;
GRANT ALL ON TABLE public.settings TO service_role;


--
-- Name: TABLE shared_links; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.shared_links TO postgres;
GRANT ALL ON TABLE public.shared_links TO anon;
GRANT ALL ON TABLE public.shared_links TO authenticated;
GRANT ALL ON TABLE public.shared_links TO service_role;


--
-- Name: TABLE tags; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.tags TO postgres;
GRANT ALL ON TABLE public.tags TO anon;
GRANT ALL ON TABLE public.tags TO authenticated;
GRANT ALL ON TABLE public.tags TO service_role;


--
-- Name: TABLE user_settings; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.user_settings TO postgres;
GRANT ALL ON TABLE public.user_settings TO anon;
GRANT ALL ON TABLE public.user_settings TO authenticated;
GRANT ALL ON TABLE public.user_settings TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO service_role;


--
-- PostgreSQL database dump complete
--

