# Task 6.9 — Không gửi thông báo riêng tư này cho những người học khác

**Giai đoạn:** 6 — Sửa lỗi và thông báo | **Liên quan:** Task 6.6–6.8

## Cách khóa riêng tư

- Bảng `user_notifications` có người nhận cụ thể (`recipient_id`).
- RLS chỉ cho tài khoản đã duyệt đọc thông báo mà `recipient_id` bằng chính tài khoản đó; Owner là người tạo thông báo.
- Người học không có quyền sửa/xóa trực tiếp bảng thông báo. Thao tác OK đi qua hàm riêng và hàm chỉ sửa thông báo của chính người gọi.
- Quyết định sửa lỗi/chấm lại được hiển thị cho tài khoản đã duyệt dưới dạng thông tin phiên bản và số liệu gộp, nhưng không chứa đáp án đúng và không phải thông báo riêng gửi hàng loạt.
- Hàm lấy đáp án sau khi nộp chỉ trả đáp án cho Owner hoặc cho người đã có bài nộp của chính mình cho đề đó.

## Kiểm tra bắt buộc bằng hai tài khoản Learner

1. Learner A báo lỗi và nhận phản hồi.
2. Learner A thấy thông báo trên trang chủ.
3. Learner B đăng nhập và không thấy thông báo của A, kể cả trong Hồ sơ.
4. Learner B không lấy được đáp án của đề mà B chưa nộp.
