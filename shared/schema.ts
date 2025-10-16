import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - Stores AWS Cognito user data
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  cognitoSub: varchar("cognito_sub").unique().notNull(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  notes: many(notes),
  pdfNotes: many(pdfNotes),
  submissionsAsStudent: many(submissions, { relationName: "studentSubmissions" }),
  submissionsAsFaculty: many(submissions, { relationName: "facultySubmissions" }),
}));

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Notes table
export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull().default(""),
  noteType: varchar("note_type", { enum: ["research", "code", "general"] }).notNull().default("general"),
  language: varchar("language"), // for code notes (e.g., "javascript", "python")
  isPublic: boolean("is_public").notNull().default(false),
  shareToken: varchar("share_token").unique(), // UUID for sharing
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notesRelations = relations(notes, ({ one, many }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
  citations: many(citations),
}));

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

// Citations table
export const citations = pgTable("citations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  noteId: varchar("note_id").notNull().references(() => notes.id, { onDelete: 'cascade' }),
  inputText: text("input_text").notNull(), // Original input (DOI, URL, or description)
  formattedCitation: text("formatted_citation").notNull(), // Generated citation
  citationStyle: varchar("citation_style", { enum: ["APA", "MLA", "IEEE"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const citationsRelations = relations(citations, ({ one }) => ({
  note: one(notes, {
    fields: [citations.noteId],
    references: [notes.id],
  }),
}));

export const insertCitationSchema = createInsertSchema(citations).omit({
  id: true,
  createdAt: true,
});

export type InsertCitation = z.infer<typeof insertCitationSchema>;
export type Citation = typeof citations.$inferSelect;

// Submissions table (for faculty to review student work)
export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  facultyId: varchar("faculty_id").references(() => users.id, { onDelete: 'set null' }),
  assignmentName: varchar("assignment_name", { length: 500 }).notNull(),
  content: text("content").notNull(),
  fileUrls: text("file_urls").array().notNull().default(sql`ARRAY[]::text[]`),
  aiDetectionScore: integer("ai_detection_score"), // 0-100
  citationVerified: boolean("citation_verified").default(false),
  grade: varchar("grade", { length: 10 }),
  feedback: text("feedback"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const submissionsRelations = relations(submissions, ({ one }) => ({
  student: one(users, {
    fields: [submissions.studentId],
    references: [users.id],
    relationName: "studentSubmissions",
  }),
  faculty: one(users, {
    fields: [submissions.facultyId],
    references: [users.id],
    relationName: "facultySubmissions",
  }),
}));

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;

// PDF Notes table - Stores uploaded PDF files metadata
export const pdfNotes = pgTable("pdf_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  s3Key: varchar("s3_key", { length: 1000 }).notNull(),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull().default("application/pdf"),
  isPublic: boolean("is_public").notNull().default(false),
  shareToken: varchar("share_token").unique(),
  downloadCount: integer("download_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pdfNotesRelations = relations(pdfNotes, ({ one }) => ({
  user: one(users, {
    fields: [pdfNotes.userId],
    references: [users.id],
  }),
}));

export const insertPdfNoteSchema = createInsertSchema(pdfNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  downloadCount: true,
});

export type InsertPdfNote = z.infer<typeof insertPdfNoteSchema>;
export type PdfNote = typeof pdfNotes.$inferSelect;
