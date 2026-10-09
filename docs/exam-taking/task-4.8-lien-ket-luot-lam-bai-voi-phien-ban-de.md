# Task 4.8 — Liên kết mỗi lượt làm bài với đúng phiên bản đề

**Giai đoạn:** 4 — Làm bài thi và trả kết quả | **Liên quan:** Task 3.8

## Đã làm

- Phiên làm bài ghi lại phiên bản đề ngay từ lúc bắt đầu. Lượt làm bài tạo ra khi nộp mang cùng phiên bản đó, kể cả đường tự nộp hết giờ và xem lại.
- Phía Supabase, bài nộp cloud nay lưu thêm `exam_version` lấy từ chính bản ghi đề tại thời điểm nộp.
- Màn hình tổng kết hiển thị phiên bản đề của lượt làm để Owner/Learner đối chiếu khi nội dung đề đã sửa về sau.

## Điều kiện chạy

Cần chạy lại `supabase/schema.sql` trong Supabase SQL Editor để thêm cột `exam_version` vào bài nộp. Các lượt cũ tạo trước thay đổi này không có phiên bản gắn kèm và không tự suy đoán ngược.

## Ý nghĩa

Khi Owner sửa đề/đáp án và phiên bản tăng lên, các lượt làm trước vẫn chỉ về đúng phiên bản tại thời điểm bắt đầu, tránh việc hiểu một bài cũ theo nội dung mới.
