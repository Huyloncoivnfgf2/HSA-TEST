# Task 6.6 — Gửi phản hồi riêng cho người báo lỗi

**Giai đoạn:** 6 — Sửa lỗi và thông báo | **Liên quan:** Task 5.7

## Đã làm

- Khi Owner lưu xử lý báo lỗi và trạng thái hoặc phản hồi thật sự thay đổi, hệ thống tạo một thông báo riêng gửi đúng `reporter_id` của báo lỗi đó.
- Nội dung gồm tên đề, câu đã báo, trạng thái mới và phản hồi của Owner nếu có.
- Nếu Owner tự báo lỗi cho chính mình, web không tạo thông báo tự gửi cho chính Owner.
- Nếu lưu xử lý thành công nhưng chưa gửi được thông báo riêng, hàng đợi báo rõ điều đó thay vì im lặng hoặc báo toàn bộ thao tác thất bại.
- Hồ sơ người học vẫn giữ danh sách báo lỗi và phản hồi như Giai đoạn 5; thông báo riêng là đường đưa phản hồi ra trang chủ, không thay thế hồ sơ.

Không gửi email và không gửi thông báo đẩy ngoài web trong task này.
