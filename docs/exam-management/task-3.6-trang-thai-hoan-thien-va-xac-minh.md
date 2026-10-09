# Task 3.6 — Thiết lập trạng thái hoàn thiện và xác minh dữ liệu

**Giai đoạn:** 3 — Quản lý đề thi | **Liên quan:** Task 3.1, Task 3.4, Task 3.9

## Trạng thái đề đã chốt

Mỗi đề có một trạng thái rõ ràng thay vì chỉ “đã tải lên là xong”:

- `draft` — Bản nháp: mới tạo hoặc đang nhập liệu.
- `verified` — Đã xác minh: Owner đã kiểm tra nội dung/đáp án nhưng chưa mở cho lượt thi mới.
- `approved` — Đã duyệt: đủ điều kiện mở cho người học theo Task 3.7/3.9.
- `archived` — Đã lưu trữ: ẩn khỏi thư viện, không xóa dữ liệu học.

Các đề có trước Giai đoạn 3 được tự coi là `approved` đúng một lần khi nâng cấp schema, để thư viện đang dùng không biến mất.

## Xác minh dữ liệu

Thư viện hiển thị số đáp án đã có trên tổng số câu và trạng thái đề. Hàm kiểm tra sẵn sàng dùng chung sẽ kiểm tra: có file PDF, số câu hợp lệ, khoảng trang hợp lệ, số câu bắt đầu hợp lệ, đáp án đủ và trạng thái đã duyệt. Thiếu lời giải chỉ cảnh báo.

**Điều kiện chạy:** Sau khi Render cập nhật code, cần chạy lại `supabase/schema.sql` trong Supabase SQL Editor một lần để thêm các cột quản lý đề và bảng lịch sử. Code web đã có đường lùi: nếu Supabase chưa chạy schema mới, web vẫn dùng các cột cũ thay vì sập thư viện.
