import { supabase } from './supabaseClient';

export type RegradeDecision = 'pending' | 'not_requested' | 'requested';
export type ExamCorrectionChangeType = 'answer_key' | 'metadata' | 'question_range';

export interface ExamCorrectionImpact {
  fromVersion: number;
  toVersion: number;
  changedQuestions: number[];
  totalSubmissions: number;
  affectedLearners: number;
  potentiallyChangedSubmissions: number;
  earliestSubmissionAt: string | null;
  latestSubmissionAt: string | null;
}

export interface ExamCorrection {
  id: string;
  examId: string;
  examTitle: string;
  fromVersion: number;
  toVersion: number;
  changeType: ExamCorrectionChangeType;
  changedQuestions: number[];
  regradeDecision: RegradeDecision;
  affectedSubmissionCount: number | null;
  affectedLearnerCount: number | null;
  potentiallyChangedCount: number | null;
  impactDetails: Record<string, unknown>;
  createdAt: number;
  decisionAt: number | null;
}

type CorrectionRow = {
  id: string;
  exam_id: string;
  exam_title: string;
  from_version: number;
  to_version: number;
  change_type: ExamCorrectionChangeType;
  changed_questions: number[] | null;
  regrade_decision: RegradeDecision;
  affected_submission_count: number | null;
  affected_learner_count: number | null;
  potentially_changed_count: number | null;
  impact_details: Record<string, unknown> | null;
  created_at: string;
  decision_at: string | null;
};

function mapCorrection(row: CorrectionRow): ExamCorrection {
  return {
    id: row.id,
    examId: row.exam_id,
    examTitle: row.exam_title,
    fromVersion: row.from_version,
    toVersion: row.to_version,
    changeType: row.change_type,
    changedQuestions: row.changed_questions ?? [],
    regradeDecision: row.regrade_decision,
    affectedSubmissionCount: row.affected_submission_count,
    affectedLearnerCount: row.affected_learner_count,
    potentiallyChangedCount: row.potentially_changed_count,
    impactDetails: row.impact_details ?? {},
    createdAt: Date.parse(row.created_at),
    decisionAt: row.decision_at ? Date.parse(row.decision_at) : null,
  };
}

function friendlyCorrectionError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/exam_corrections|assess_exam_correction_impact|get_submitted_exam_answer_key|schema cache|relation .* does not exist|function .* does not exist/i.test(message)) {
    return new Error('Tính năng sửa lỗi/chấm lại chưa được bật trên Supabase. Cần chạy lại schema.sql rồi thử lại.');
  }
  return error instanceof Error ? error : new Error('Không thể xử lý bản sửa lỗi.');
}

export async function assessExamCorrectionImpact(
  examId: string,
  proposedAnswers: Record<number, string>
): Promise<ExamCorrectionImpact | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('assess_exam_correction_impact', {
      p_exam_id: examId,
      p_proposed_answers: proposedAnswers,
    });
    if (error) throw error;
    const impact = data as {
      fromVersion: number;
      toVersion: number;
      changedQuestions: number[];
      totalSubmissions: number;
      affectedLearners: number;
      potentiallyChangedSubmissions: number;
      earliestSubmissionAt: string | null;
      latestSubmissionAt: string | null;
    };
    return {
      ...impact,
      changedQuestions: impact.changedQuestions ?? [],
    };
  } catch (error) {
    // Việc lưu đáp án không nên hỏng chỉ vì chưa chạy schema Giai đoạn 6.
    // Khi đó Owner chưa có số liệu ảnh hưởng và quyết định chấm lại để sau.
    console.warn('Could not assess exam correction impact:', error);
    return null;
  }
}

export async function createExamCorrection(input: {
  examId: string;
  examTitle: string;
  fromVersion: number;
  toVersion: number;
  changeType: ExamCorrectionChangeType;
  changedQuestions: number[];
  regradeDecision: RegradeDecision;
  impact?: ExamCorrectionImpact | null;
}): Promise<void> {
  if (!supabase) return;
  try {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('exam_corrections').insert({
      exam_id: input.examId,
      exam_title: input.examTitle,
      from_version: input.fromVersion,
      to_version: input.toVersion,
      change_type: input.changeType,
      changed_questions: input.changedQuestions,
      regrade_decision: input.regradeDecision,
      affected_submission_count: input.impact?.totalSubmissions ?? null,
      affected_learner_count: input.impact?.affectedLearners ?? null,
      potentially_changed_count: input.impact?.potentiallyChangedSubmissions ?? null,
      impact_details: input.impact ? { ...input.impact } : {},
      created_by: userData.user?.id ?? null,
      decision_by: input.regradeDecision === 'pending' ? null : userData.user?.id ?? null,
      decision_at: input.regradeDecision === 'pending' ? null : new Date().toISOString(),
    });
    if (error) throw error;
  } catch (error) {
    console.warn('Could not create exam correction record:', error);
  }
}

export async function listExamCorrections(examId?: string): Promise<ExamCorrection[]> {
  if (!supabase) return [];
  let query = supabase
    .from('exam_corrections')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (examId) query = query.eq('exam_id', examId);
  const { data, error } = await query;
  if (error) throw friendlyCorrectionError(error);
  return ((data ?? []) as CorrectionRow[]).map(mapCorrection);
}

export async function updateExamCorrectionDecision(
  correction: ExamCorrection,
  decision: Exclude<RegradeDecision, 'pending'>
): Promise<void> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('exam_corrections').update({
    regrade_decision: decision,
    decision_by: userData.user?.id ?? null,
    decision_at: new Date().toISOString(),
  }).eq('id', correction.id);
  if (error) throw friendlyCorrectionError(error);
}

export async function getSubmittedExamAnswerKey(
  examId: string
): Promise<Record<number, string> | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_submitted_exam_answer_key', {
    p_exam_id: examId,
  });
  if (error) throw friendlyCorrectionError(error);
  if (!data || typeof data !== 'object') return null;
  return data as Record<number, string>;
}

export function regradeDecisionLabel(decision: RegradeDecision): string {
  if (decision === 'requested') return 'Sẽ chấm lại lượt đã nộp';
  if (decision === 'not_requested') return 'Chỉ áp dụng lượt mới';
  return 'Chưa quyết định';
}
