# Task 3.8 — Quản lý phiên bản và lịch sử chỉnh sửa

**Giai đoạn:** 3 — Quản lý đề thi | **Liên quan:** Task 0.5, Task 3.6, Task 3.7

## Đã làm

- Mỗi đề có số phiên bản. Sửa metadata hoặc sửa đáp án chuẩn sẽ tăng phiên bản trên cloud.
- Thêm bảng `exam_revisions` để ghi lại các mốc quan trọng: tải đề lên, sửa metadata/trạng thái, sửa đáp án và lưu trữ đề. Chỉ Owner đọc/ghi được lịch sử này theo RLS.
- Thư viện hiển thị phiên bản ngắn gọn dạng `v...` để Owner biết đề đã qua sửa đổi.
- Xóa đề trên cloud đổi thành lưu trữ mềm để không xóa dây chuyền bài nộp và lịch sử học.

## Giới hạn trung thực

- Hiện chưa có màn hình riêng trong web để xem toàn bộ dòng lịch sử; Owner xem qua Supabase khi cần. Đây là chủ đích để không phình giao diện khi nhóm dùng còn nhỏ.
- Lịch sử ghi từ thời điểm Giai đoạn 3 được triển khai; các sửa đổi trước đó chỉ còn trong lịch sử Git, không tự dựng lại.
- Nếu sau này sửa đáp án làm thay đổi kết quả người học, vẫn cần cơ chế lưu kết quả chấm tại lúc nộp đã nêu từ Giai đoạn 0; phiên bản đề không thay thế việc đó.
