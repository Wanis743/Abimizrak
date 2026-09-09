import { pgTable, text, integer, doublePrecision, boolean, timestamp, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';

export const schoolsTable = pgTable('schools', {
  id: text('id').primaryKey(),
  nameAr: text('name_ar').notNull(),
  nameFr: text('name_fr').notNull(),
  nameEn: text('name_en'),
  code: text('code').notNull(),
});

export const academicYearsTable = pgTable('academic_years', {
  id: text('id').primaryKey(), schoolId: text('school_id').notNull(), labelAr: text('label_ar').notNull(), labelFr: text('label_fr').notNull(),
  startDate: timestamp('start_date').notNull(), endDate: timestamp('end_date').notNull(), status: text('status').notNull().default('planning'),
}, (t) => ({ schoolIdx: index('academic_years_school_id_idx').on(t.schoolId) }));

export const academicTermsTable = pgTable('academic_terms', {
  id: text('id').primaryKey(), academicYearId: text('academic_year_id').notNull(), labelAr: text('label_ar').notNull(), labelFr: text('label_fr').notNull(), order: integer('order').notNull(),
  startDate: timestamp('start_date').notNull(), endDate: timestamp('end_date').notNull(), status: text('status').notNull().default('upcoming'),
}, (t) => ({ yearIdx: index('academic_terms_academic_year_id_idx').on(t.academicYearId) }));

export const academicStreamsTable = pgTable('academic_streams', {
  id: text('id').primaryKey(), code: text('code').notNull(), labelAr: text('label_ar').notNull(), labelFr: text('label_fr').notNull(), applicableLevels: text('applicable_levels').array(),
});

export const departmentsTable = pgTable('departments', {
  id: text('id').primaryKey(), schoolId: text('school_id').notNull(), labelAr: text('label_ar').notNull(), labelFr: text('label_fr').notNull(),
}, (t) => ({ schoolIdx: index('departments_school_id_idx').on(t.schoolId) }));

export const subjectsTable = pgTable('subjects', {
  id: text('id').primaryKey(), schoolId: text('school_id'), code: text('code').notNull(), labelAr: text('label_ar').notNull(), labelFr: text('label_fr').notNull(), departmentId: text('department_id'), icon: text('icon'), color: text('color'),
}, (t) => ({ schoolIdx: index('subjects_school_id_idx').on(t.schoolId), departmentIdx: index('subjects_department_id_idx').on(t.departmentId) }));

export const schoolClassesTable = pgTable('school_classes', {
  id: text('id').primaryKey(), schoolId: text('school_id').notNull(), academicYearId: text('academic_year_id').notNull(), levelCode: text('level_code').notNull(), streamId: text('stream_id'), section: text('section').notNull(), label: text('label').notNull(), fullLabelAr: text('full_label_ar'), fullLabelFr: text('full_label_fr'), capacity: integer('capacity').notNull().default(40), spaceId: text('space_id'),
}, (t) => ({ yearIdx: index('school_classes_academic_year_id_idx').on(t.academicYearId), streamIdx: index('school_classes_stream_id_idx').on(t.streamId) }));

export const studentProfilesTable = pgTable('student_profiles', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), classId: text('class_id'), interests: text('interests').array().default([]), skills: text('skills').array().default([]), bioAr: text('bio_ar'), bioFr: text('bio_fr'),
}, (t) => ({ userIdx: uniqueIndex('student_profiles_user_id_unique').on(t.userId), classIdx: index('student_profiles_class_id_idx').on(t.classId) }));

export const teacherProfilesTable = pgTable('teacher_profiles', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), departmentId: text('department_id'), subjects: text('subjects').array().default([]), qualifications: text('qualifications').array().default([]),
}, (t) => ({ userIdx: uniqueIndex('teacher_profiles_user_id_unique').on(t.userId), departmentIdx: index('teacher_profiles_department_id_idx').on(t.departmentId) }));

export const timetableEntriesTable = pgTable('timetable_entries', {
  id: text('id').primaryKey(), classId: text('class_id').notNull(), subjectId: text('subject_id').notNull(), teacherId: text('teacher_id').notNull(), roomId: text('room_id'), dayOfWeek: integer('day_of_week').notNull(), startTime: text('start_time').notNull(), endTime: text('end_time').notNull(), recurrence: text('recurrence').notNull().default('weekly'),
}, (t) => ({ classIdx: index('timetable_entries_class_id_idx').on(t.classId), teacherIdx: index('timetable_entries_teacher_id_idx').on(t.teacherId), dayIdx: index('timetable_entries_day_of_week_idx').on(t.dayOfWeek) }));

export const attendanceRecordsTable = pgTable('attendance_records', {
  id: text('id').primaryKey(), classId: text('class_id').notNull(), subjectId: text('subject_id').notNull(), studentId: text('student_id').notNull(), date: timestamp('date').notNull(), period: integer('period').notNull(), status: text('status').notNull(), note: text('note'), markedBy: text('marked_by'), markedAt: timestamp('marked_at').notNull(),
}, (t) => ({ studentDateIdx: index('attendance_records_student_date_idx').on(t.studentId, t.date), classDateIdx: index('attendance_records_class_date_idx').on(t.classId, t.date), uniqueEntry: uniqueIndex('attendance_records_unique_entry').on(t.classId, t.studentId, t.date, t.period) }));

export const assignmentsTable = pgTable('assignments', {
  id: text('id').primaryKey(), classId: text('class_id').notNull(), subjectId: text('subject_id').notNull(), teacherId: text('teacher_id').notNull(), titleAr: text('title_ar'), titleFr: text('title_fr'), descriptionAr: text('description_ar'), descriptionFr: text('description_fr'), type: text('type').notNull(), dueDate: timestamp('due_date').notNull(), maxScore: doublePrecision('max_score').notNull().default(20), allowLate: boolean('allow_late').notNull().default(false), status: text('status').notNull().default('draft'), publishedAt: timestamp('published_at'), createdAt: timestamp('created_at').notNull(),
}, (t) => ({ classIdx: index('assignments_class_id_idx').on(t.classId), teacherIdx: index('assignments_teacher_id_idx').on(t.teacherId), dueIdx: index('assignments_due_date_idx').on(t.dueDate) }));

export const submissionsTable = pgTable('submissions', {
  id: text('id').primaryKey(), assignmentId: text('assignment_id').notNull(), studentId: text('student_id').notNull(), files: jsonb('files').notNull().default([]), bodyText: text('text'), isLate: boolean('is_late').notNull().default(false), gradeValue: doublePrecision('grade_value'), feedback: text('feedback'), status: text('status').notNull().default('submitted'), submittedAt: timestamp('submitted_at').notNull(),
}, (t) => ({ assignmentIdx: index('submissions_assignment_id_idx').on(t.assignmentId), studentIdx: index('submissions_student_id_idx').on(t.studentId), uniqueSubmission: uniqueIndex('submissions_assignment_student_unique').on(t.assignmentId, t.studentId) }));

export const gradesTable = pgTable('grades', {
  id: text('id').primaryKey(), studentId: text('student_id').notNull(), classId: text('class_id').notNull(), subjectId: text('subject_id').notNull(), termId: text('term_id').notNull(), value: doublePrecision('value').notNull(), maxValue: doublePrecision('max_value').notNull().default(20), coefficient: doublePrecision('coefficient').notNull().default(1), type: text('type').notNull(), comment: text('comment'), gradedBy: text('graded_by').notNull(), gradedAt: timestamp('graded_at').notNull(),
}, (t) => ({ studentTermIdx: index('grades_student_term_idx').on(t.studentId, t.termId), classSubjectIdx: index('grades_class_subject_idx').on(t.classId, t.subjectId), uniqueGrade: uniqueIndex('grades_student_subject_term_type_unique').on(t.studentId, t.subjectId, t.termId, t.type) }));

export const roomsTable = pgTable('rooms', {
  id: text('id').primaryKey(), schoolId: text('school_id').notNull(), code: text('code').notNull(), labelAr: text('label_ar'), labelFr: text('label_fr'), type: text('type').notNull(), building: text('building'), floor: integer('floor').default(0), capacity: integer('capacity').notNull().default(30), equipment: text('equipment').array().default([]), status: text('status').notNull().default('available'),
});
