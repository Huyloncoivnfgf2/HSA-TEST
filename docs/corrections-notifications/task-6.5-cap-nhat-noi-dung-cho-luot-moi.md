# Task 6.5 — Cập nhật nội dung cho các lượt làm bài mới

**Giai đoạn:** 6 — Sửa lỗi và thông báo | **Liên quan:** Task 6.1, Task 6.4

## Cách hoạt động sau khi sửa

1. Owner lưu đáp án đã sửa trên cloud.
2. Phiên bản đề tăng một bậc và lượt làm bắt đầu sau đó mang phiên bản mới.
3. Khi người học nộp, máy chủ chấm bằng bộ đáp án hiện tại tại thời điểm nộp và lưu phiên bản đó vào bài nộp.
4. Learner không đọc trực tiếp đáp án trước khi nộp. Sau khi chính họ đã nộp, web chỉ lấy bộ đáp án hiện tại qua hàm kiểm tra đã có bài nộp; việc xem lại bài không còn gọi lại thao tác nộp và không tạo bài nộp trùng.
5. Nếu Owner chọn không chấm lại, các lượt cũ vẫn hiển thị theo ảnh chụp đáp án lúc nộp, không bị đổi sang đáp án mới chỉ vì Owner đã sửa đề.

## Kiểm tra cần làm trên web

- Sửa một đáp án, bắt đầu một lượt mới và bảo đảm phiên bản hiển thị tăng.
- Nộp lượt mới và bảo đảm chấm theo đáp án đã sửa.
- Mở lại một lượt cũ khi chưa chọn chấm lại và bảo đảm điểm cũ không đổi.
