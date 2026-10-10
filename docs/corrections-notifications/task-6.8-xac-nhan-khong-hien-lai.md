# Task 6.8 — Khi người dùng nhấn OK, đánh dấu đã xác nhận và không hiển thị lại

**Giai đoạn:** 6 — Sửa lỗi và thông báo | **Liên quan:** Task 6.7

## Đã làm

- Mỗi thông báo trên trang chủ có nút **OK** riêng.
- Khi nhấn OK, web gọi hàm xác nhận trên Supabase; hàm chỉ cập nhật thông báo thuộc về đúng tài khoản đang đăng nhập.
- Sau khi xác nhận thành công, thông báo biến khỏi trang chủ và không hiện lại ở lần tải sau vì danh sách chỉ lấy thông báo chưa xác nhận.
- Nếu mất mạng khi xác nhận, thông báo vẫn ở lại và web báo chưa xác nhận được.
- Nhấn OK không xóa báo lỗi hoặc phản hồi trong Hồ sơ người học; nó chỉ tắt nhắc ở trang chủ.
