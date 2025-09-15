-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.class_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid,
  day_of_week integer NOT NULL,
  start_time time without time zone NOT NULL,
  duration integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT class_schedules_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  fee numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  grades ARRAY NOT NULL DEFAULT '{}'::integer[] CHECK (grades <@ ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]),
  subject_ids ARRAY NOT NULL DEFAULT '{}'::uuid[],
  class_type character varying NOT NULL DEFAULT 'Group'::character varying CHECK (class_type::text = ANY (ARRAY['Individual'::character varying, 'Group'::character varying, 'Extra'::character varying, 'Paper'::character varying, 'Revision'::character varying, 'Theory'::character varying]::text[])),
  CONSTRAINT classes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  class_id uuid,
  month integer NOT NULL,
  year integer NOT NULL,
  amount numeric NOT NULL,
  status character varying DEFAULT 'pending'::character varying,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT payments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.student_classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  class_id uuid,
  enrolled_at timestamp with time zone DEFAULT now(),
  custom_fee numeric,
  CONSTRAINT student_classes_pkey PRIMARY KEY (id),
  CONSTRAINT student_classes_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT student_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  phone character varying,
  parent_name character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  grades ARRAY NOT NULL DEFAULT '{}'::integer[],
  CONSTRAINT students_pkey PRIMARY KEY (id)
);
CREATE TABLE public.subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);