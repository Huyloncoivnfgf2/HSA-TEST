import { describe, expect, test } from 'bun:test';
import { EXAM_SYSTEMS, getExamSystem } from '../src/types/examSystems';

describe('registry hệ kỳ thi (Task 9.7)', () => {
  test('HSA giữ đúng cấu trúc hiện tại: 3 phần, mỗi phần 50 câu', () => {
    const hsa = EXAM_SYSTEMS.hsa;
    expect(hsa.sections.map((s) => s.id)).toEqual(['dinh_luong', 'dinh_tinh', 'khoa_hoc']);
    expect(hsa.sections.every((s) => s.questionCount === 50)).toBe(true);
  });

  test('TSA có 3 phần tư duy, tổng 100 câu theo mẫu registry', () => {
    const total = EXAM_SYSTEMS.tsa.sections.reduce((sum, s) => sum + (s.questionCount ?? 0), 0);
    expect(EXAM_SYSTEMS.tsa.sections.length).toBe(3);
    expect(total).toBe(100);
  });

  test('THPT tách theo môn và không gán cứng số câu khi chưa đối chiếu năm thi', () => {
    const thpt = EXAM_SYSTEMS.thpt;
    expect(thpt.sections.length).toBeGreaterThanOrEqual(8);
    expect(thpt.sections.every((s) => s.questionCount === null)).toBe(true);
  });

  test('hệ không xác định thì quay về HSA để không phá luồng hiện tại', () => {
    expect(getExamSystem(undefined).id).toBe('hsa');
    expect(getExamSystem(null).id).toBe('hsa');
  });
});
