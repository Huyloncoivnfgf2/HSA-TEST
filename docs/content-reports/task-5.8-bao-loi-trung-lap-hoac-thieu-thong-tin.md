# Task 5.8 — Xử lý báo lỗi trùng lặp hoặc thiếu thông tin

**Giai đoạn:** 5 — Báo lỗi nội dung | **Liên quan:** Task 5.3, Task 5.6

## Chống trùng

- Cùng một người không thể mở hai báo lỗi đang mở cho cùng một đề, cùng một câu và cùng một loại lỗi. Nếu cố gửi lại, giao diện báo rõ là đã có báo lỗi đang được xử lý.
- Owner vẫn có thể đánh dấu một báo là **Trùng báo lỗi khác** và liên kết tới báo gốc cùng đề/cùng câu trong hàng đợi.

## Thiếu thông tin

- Mô tả dưới 10 ký tự không gửi được.
- Nếu mô tả dài nhưng vẫn chưa đủ để kiểm tra, Owner chuyển sang **Cần thêm thông tin** và viết phản hồi cụ thể. Báo vẫn ở trạng thái đang mở nên người báo bổ sung bằng ngữ cảnh mới thay vì tạo nhiều báo rời rạc; khi có cơ chế sửa báo lỗi, nên ưu tiên bổ sung vào chính báo này.
