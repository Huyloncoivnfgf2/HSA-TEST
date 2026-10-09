# Task 3.7 — Xây dựng quy trình duyệt đề

**Giai đoạn:** 3 — Quản lý đề thi | **Liên quan:** Task 2.2, Task 2.3, Task 3.6

## Quy trình chuẩn

1. Owner thêm PDF và nhập metadata (Task 3.2).
2. Owner nhập đáp án chuẩn và kiểm tra số đáp án đã đủ (Task 3.4).
3. Owner mở đề ở chế độ **Kiểm thử nội dung** để làm thử mà không nhiễm lịch sử học thật (Task 2.4).
4. Owner sửa thông tin đề và chuyển trạng thái: Bản nháp → Đã xác minh → Đã duyệt.
5. Chỉ đề **Đã duyệt** mới hiện cho Learner và mới mở được lượt thi mới (Task 3.9).

## Đã làm

- Owner đổi trạng thái ngay trong form sửa đề.
- Learner chỉ thấy đề đã duyệt trong thư viện; phía Supabase, sau khi chạy schema mới, Learner cũng chỉ đọc được đề đã duyệt, Owner đọc được mọi trạng thái trừ đề đã lưu trữ bị ẩn ở thư viện.
- Lượt kiểm thử nội dung của Owner không bị quy trình duyệt chặn, để Owner còn kiểm tra đề trước khi duyệt.

## Còn nợ nghiệm thu

- Tạo một đề nháp, chắc chắn Learner không thấy; chuyển sang Đã duyệt, tải lại và chắc chắn Learner thấy/làm được.
