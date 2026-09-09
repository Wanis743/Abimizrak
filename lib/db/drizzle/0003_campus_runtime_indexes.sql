-- Runtime indexes for the campus communication/project paths.

CREATE INDEX IF NOT EXISTS campus_channels_space_id_idx
  ON public.campus_channels(space_id);

CREATE INDEX IF NOT EXISTS campus_messages_channel_created_at_idx
  ON public.campus_messages(channel_id, created_at);

CREATE INDEX IF NOT EXISTS campus_project_members_project_id_idx
  ON public.campus_project_members(project_id);

CREATE INDEX IF NOT EXISTS campus_project_members_user_id_idx
  ON public.campus_project_members(user_id);

CREATE INDEX IF NOT EXISTS campus_project_milestones_project_id_idx
  ON public.campus_project_milestones(project_id, created_at);

CREATE INDEX IF NOT EXISTS academic_terms_academic_year_id_idx ON academic_terms (academic_year_id);
CREATE INDEX IF NOT EXISTS academic_years_school_id_idx ON academic_years (school_id);
CREATE INDEX IF NOT EXISTS school_classes_academic_year_id_idx ON school_classes (academic_year_id);
CREATE INDEX IF NOT EXISTS school_classes_stream_id_idx ON school_classes (stream_id);
CREATE INDEX IF NOT EXISTS student_profiles_class_id_idx ON student_profiles (class_id);
CREATE INDEX IF NOT EXISTS timetable_entries_teacher_id_idx ON timetable_entries (teacher_id);
CREATE INDEX IF NOT EXISTS timetable_entries_class_id_idx ON timetable_entries (class_id);
CREATE INDEX IF NOT EXISTS attendance_records_student_date_idx ON attendance_records (student_id, date);
CREATE INDEX IF NOT EXISTS attendance_records_class_date_idx ON attendance_records (class_id, date);
CREATE INDEX IF NOT EXISTS assignments_teacher_id_idx ON assignments (teacher_id);
CREATE INDEX IF NOT EXISTS assignments_class_id_idx ON assignments (class_id);
CREATE INDEX IF NOT EXISTS assignments_due_date_idx ON assignments (due_date);
CREATE INDEX IF NOT EXISTS submissions_student_id_idx ON submissions (student_id);
CREATE INDEX IF NOT EXISTS grades_student_term_idx ON grades (student_id, term_id);
CREATE INDEX IF NOT EXISTS grades_class_subject_idx ON grades (class_id, subject_id);
