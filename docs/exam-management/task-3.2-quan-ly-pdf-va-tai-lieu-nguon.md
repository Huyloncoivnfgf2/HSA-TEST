# Task 3.2 — Quản lý PDF và tài liệu nguồn

**Giai đoạn:** 3 — Quản lý đề thi | **Liên quan:** Task 3.1 (mẫu cấu trúc đề), lỗi Invalid key, Task 2.3 (RLS kho file)

## Đã chốt và đã làm

- Mỗi đề vẫn dùng **một file PDF gốc**. Tên file gốc được giữ làm thông tin hiển thị/phụ (`original_filename`), nhưng khóa lưu trên Supabase Storage vẫn là khóa ASCII cố định theo mã đề để tránh lỗi Invalid key.
- Thêm metadata cho đề gộp nhiều phần: trang bắt đầu, trang kết thúc trong PDF và định danh file chung. Khi một PDF chứa nhiều phần, Owner tạo một bản ghi cho từng phần, dùng cùng một file gốc nhưng đặt khoảng trang riêng.
- Form thêm đề và form sửa đề của Owner đã có ô trang bắt đầu/trang kết thúc. Trình xem PDF chỉ hiển thị khoảng trang của phần đang làm, không còn mở toàn bộ file gộp.
- Xóa đề trên cloud đổi thành **lưu trữ mềm**: đề bị ẩn, file và bài nộp không bị xóa dây chuyền.

**Điều kiện chạy:** Sau khi Render cập nhật code, cần chạy lại `supabase/schema.sql` trong Supabase SQL Editor một lần để thêm các cột quản lý đề và bảng lịch sử. Code web đã có đường lùi: nếu Supabase chưa chạy schema mới, web vẫn dùng các cột cũ thay vì sập thư viện.

## Chưa coi là xong hẳn

- Cần nghiệm thu bằng một PDF gộp thật: tạo 2–3 bản ghi từ cùng một file, đặt khoảng trang khác nhau và mở từng phần để chắc chắn chỉ thấy đúng trang của phần đó.
- Nếu Owner muốn một nút riêng “tạo nhiều phần từ một PDF” trong một lần bấm, đó là cải tiến giao diện sau này; hiện tại mẫu dữ liệu và trình xem đã sẵn sàng cho cách làm từng phần.
