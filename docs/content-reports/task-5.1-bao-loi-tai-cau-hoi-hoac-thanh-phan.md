# Task 5.1 — Báo lỗi tại câu hỏi hoặc thành phần nội dung cụ thể

**Giai đoạn:** 5 — Báo lỗi nội dung | **Liên quan:** Giai đoạn 4 (làm bài), Task 0.6

## Đã làm

Trong màn hình làm bài PDF, mỗi câu đang chọn có nút **Báo lỗi** ngay ở phiếu đáp án. Người học không cần rời bài hay nhớ lại sau; báo lỗi mở đúng tại câu đang xem và ghi kèm trang PDF hiện tại.

Trước đây hệ thống chỉ có form báo lỗi của ngân hàng câu hỏi cũ, không nối với đề PDF và Owner không nhận được. Luồng mới dùng riêng cho đề PDF.

**Điều kiện chạy:** Cần chạy lại `supabase/schema.sql` trong Supabase SQL Editor để tạo bảng `content_reports`. Nếu chưa chạy, nút báo lỗi sẽ báo rõ là tính năng chưa được bật thay vì mất báo lỗi trong im lặng.
