# Task 6.2 — Lưu nội dung trước và sau khi chỉnh sửa

**Giai đoạn:** 6 — Sửa lỗi và thông báo | **Liên quan:** Task 6.1

## Đã làm

- Khi sửa đáp án, dòng lịch sử trong `exam_revisions` lưu:
  - phiên bản trước và sau;
  - toàn bộ đáp án trước (`previousAnswers`);
  - toàn bộ đáp án sau (`correctedAnswers`);
  - danh sách câu thật sự thay đổi.
- Khi sửa thông tin đề, lịch sử lưu object `before` và `after` gồm tên đề, số câu, trạng thái, khoảng trang và số câu bắt đầu.
- `exam_revisions` chỉ Owner đọc/ghi theo RLS, vì đáp án trước/sau không được lộ cho Learner.
- Khi đẩy lại một đề đã có trên cloud, hệ thống cố gắng sao lưu PDF/lời giải cũ vào đường dẫn `revisions/v<phiên bản cũ>/` trước khi ghi file mới. Nếu sao lưu thất bại, việc đẩy đề không bị chặn và Owner vẫn còn bản sao file gốc trên máy.
- Mỗi lượt làm mới lưu ảnh chụp chấm điểm riêng: bộ đáp án, đáp án được chấp nhận, số câu và số câu bắt đầu tại lúc nộp. Khi chấm lại, điểm gốc được giữ trong `originalScore`.

## Giới hạn trung thực

- Các lượt làm tạo trước Giai đoạn 6 chưa có ảnh chụp đáp án riêng; hệ thống vẫn dùng cơ chế cũ cho các lượt đó và không tự dựng lại lịch sử trước Giai đoạn 6.
- Sao lưu file cũ chỉ có từ lần đẩy lại sau khi Giai đoạn 6 hoạt động; file đã bị ghi đè trước đây không khôi phục ngược được từ web.
