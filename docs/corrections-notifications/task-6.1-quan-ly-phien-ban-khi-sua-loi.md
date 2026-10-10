# Task 6.1 — Xác định cách quản lý phiên bản khi sửa lỗi

**Giai đoạn:** 6 — Sửa lỗi và thông báo | **Liên quan:** Task 0.5, Task 3.8, Task 4.8, Giai đoạn 5

## Quy tắc đã chốt và đã áp vào code

1. Mỗi đề bắt đầu ở `v1`. Khi Owner sửa nội dung đã phát hành và nội dung thật sự thay đổi, phiên bản tăng đúng 1 bậc.
2. Sửa đáp án chuẩn có thay đổi ít nhất một câu mới được coi là một bản sửa lỗi. Lưu lại cùng một đáp án như cũ không tăng phiên bản và không tạo bản sửa lỗi.
3. Sửa khoảng trang, số câu bắt đầu hoặc số câu được ghi thành bản sửa `metadata`/`question_range` để Owner quyết định riêng.
4. Chỉ đổi trạng thái xử lý báo lỗi hoặc viết phản hồi cho người báo **không** làm tăng phiên bản đề. Chỉ khi Owner thật sự sửa đáp án/nội dung đề mới có phiên bản mới.
5. Mỗi lượt nộp lưu phiên bản tại thời điểm nộp. Máy chủ trả lại `exam_version` khi nộp, nên lượt làm bắt đầu trước lúc sửa nhưng nộp sau sẽ được ghi theo phiên bản thật sự dùng để chấm tại lúc nộp.
6. Mặc định các lượt đã nộp giữ nguyên điểm. Phiên bản mới trước hết áp dụng cho lượt mới; việc chấm lại phải có quyết định riêng ở Task 6.4.

## Kiểm tra chéo

- Phiên bản đề đã có từ Giai đoạn 3 và `exam_submissions.exam_version` đã có từ Giai đoạn 4.
- Giai đoạn 6 bổ sung: lưu cùng đáp án không tăng phiên bản; nộp bài nhận phiên bản từ máy chủ thay vì chỉ tin phiên bản lúc bắt đầu bài.

**Việc còn cần làm trên web:** chạy lại `supabase/schema.sql` sau khi code Giai đoạn 6 được đẩy, rồi sửa thử một đáp án và kiểm tra thư viện hiển thị phiên bản tăng đúng 1 bậc.
