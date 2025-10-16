import {
  users,
  notes,
  citations,
  submissions,
  pdfNotes,
  type User,
  type UpsertUser,
  type Note,
  type InsertNote,
  type Citation,
  type InsertCitation,
  type Submission,
  type InsertSubmission,
  type PdfNote,
  type InsertPdfNote,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Notes operations
  getNotesByUserId(userId: string): Promise<Note[]>;
  getNoteById(id: string): Promise<Note | undefined>;
  getNoteByShareToken(token: string): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, note: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: string): Promise<void>;
  
  // Citations operations
  getCitationsByNoteId(noteId: string): Promise<Citation[]>;
  createCitation(citation: InsertCitation): Promise<Citation>;
  
  // Submissions operations
  getSubmissionsByFacultyId(facultyId: string): Promise<(Submission & { student: User })[]>;
  getSubmissionsByStudentId(studentId: string): Promise<(Submission & { faculty: User | null })[]>;
  getSubmissionById(id: string): Promise<(Submission & { student: User; faculty: User | null }) | undefined>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateSubmission(id: string, submission: Partial<InsertSubmission>): Promise<Submission>;
  
  // PDF Notes operations
  getPdfNotesByUserId(userId: string): Promise<PdfNote[]>;
  getPdfNoteById(id: string): Promise<PdfNote | undefined>;
  getPdfNoteByShareToken(token: string): Promise<PdfNote | undefined>;
  createPdfNote(pdfNote: InsertPdfNote): Promise<PdfNote>;
  updatePdfNote(id: string, pdfNote: Partial<InsertPdfNote>): Promise<PdfNote>;
  deletePdfNote(id: string): Promise<void>;
  incrementDownloadCount(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Notes operations
  async getNotesByUserId(userId: string): Promise<Note[]> {
    return await db.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.updatedAt));
  }

  async getNoteById(id: string): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note;
  }

  async getNoteByShareToken(token: string): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(
      and(eq(notes.shareToken, token), eq(notes.isPublic, true))
    );
    return note;
  }

  async createNote(noteData: InsertNote): Promise<Note> {
    const [note] = await db.insert(notes).values(noteData).returning();
    return note;
  }

  async updateNote(id: string, noteData: Partial<InsertNote>): Promise<Note> {
    const [note] = await db
      .update(notes)
      .set({ ...noteData, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();
    return note;
  }

  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  // Citations operations
  async getCitationsByNoteId(noteId: string): Promise<Citation[]> {
    return await db.select().from(citations).where(eq(citations.noteId, noteId));
  }

  async createCitation(citationData: InsertCitation): Promise<Citation> {
    const [citation] = await db.insert(citations).values(citationData).returning();
    return citation;
  }

  // Submissions operations
  async getSubmissionsByFacultyId(facultyId: string): Promise<(Submission & { student: User })[]> {
    const results = await db
      .select()
      .from(submissions)
      .leftJoin(users, eq(submissions.studentId, users.id))
      .where(eq(submissions.facultyId, facultyId))
      .orderBy(desc(submissions.submittedAt));

    return results.map(r => ({ ...r.submissions, student: r.users! }));
  }

  async getSubmissionsByStudentId(studentId: string): Promise<(Submission & { faculty: User | null })[]> {
    const results = await db
      .select()
      .from(submissions)
      .leftJoin(users, eq(submissions.facultyId, users.id))
      .where(eq(submissions.studentId, studentId))
      .orderBy(desc(submissions.submittedAt));

    return results.map(r => ({ ...r.submissions, faculty: r.users || null }));
  }

  async getSubmissionById(id: string): Promise<(Submission & { student: User; faculty: User | null }) | undefined> {
    const results = await db
      .select()
      .from(submissions)
      .leftJoin(users, eq(submissions.studentId, users.id))
      .where(eq(submissions.id, id));

    if (results.length === 0 || !results[0].users) return undefined;
    
    // Get faculty user if exists
    const facultyUser = results[0].submissions.facultyId 
      ? (await this.getUser(results[0].submissions.facultyId)) ?? null
      : null;

    return { ...results[0].submissions, student: results[0].users, faculty: facultyUser };
  }

  async createSubmission(submissionData: InsertSubmission): Promise<Submission> {
    const [submission] = await db.insert(submissions).values(submissionData).returning();
    return submission;
  }

  async updateSubmission(id: string, submissionData: Partial<InsertSubmission>): Promise<Submission> {
    const [submission] = await db
      .update(submissions)
      .set(submissionData)
      .where(eq(submissions.id, id))
      .returning();
    return submission;
  }

  // PDF Notes operations
  async getPdfNotesByUserId(userId: string): Promise<PdfNote[]> {
    return await db.select().from(pdfNotes).where(eq(pdfNotes.userId, userId)).orderBy(desc(pdfNotes.updatedAt));
  }

  async getPdfNoteById(id: string): Promise<PdfNote | undefined> {
    const [pdfNote] = await db.select().from(pdfNotes).where(eq(pdfNotes.id, id));
    return pdfNote;
  }

  async getPdfNoteByShareToken(token: string): Promise<PdfNote | undefined> {
    const [pdfNote] = await db.select().from(pdfNotes).where(
      and(eq(pdfNotes.shareToken, token), eq(pdfNotes.isPublic, true))
    );
    return pdfNote;
  }

  async createPdfNote(pdfNoteData: InsertPdfNote): Promise<PdfNote> {
    const [pdfNote] = await db.insert(pdfNotes).values(pdfNoteData).returning();
    return pdfNote;
  }

  async updatePdfNote(id: string, pdfNoteData: Partial<InsertPdfNote>): Promise<PdfNote> {
    const [pdfNote] = await db
      .update(pdfNotes)
      .set({ ...pdfNoteData, updatedAt: new Date() })
      .where(eq(pdfNotes.id, id))
      .returning();
    return pdfNote;
  }

  async deletePdfNote(id: string): Promise<void> {
    await db.delete(pdfNotes).where(eq(pdfNotes.id, id));
  }

  async incrementDownloadCount(id: string): Promise<void> {
    await db.execute(sql`
      UPDATE pdf_notes 
      SET download_count = download_count + 1 
      WHERE id = ${id}
    `);
  }
}

export const storage = new DatabaseStorage();
