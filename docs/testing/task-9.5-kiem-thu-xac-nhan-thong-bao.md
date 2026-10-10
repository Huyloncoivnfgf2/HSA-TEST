# Task 9.5 — Kiểm thử việc xác nhận thông báo và không hiển thị lại

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 9 — Kiểm thử và mở rộng  
**Liên quan:** Task 6.8 (thông báo riêng), Task 9.3 (riêng tư)

## 1. Đã rà soát bằng code và kiểm thử tự động (đạt)

- Trang chủ chỉ tải các thông báo **chưa xác nhận** của đúng người đang đăng nhập (lọc theo người nhận + trạng thái chưa xác nhận, tối đa 5 thông báo mới nhất).
- Hành động xác nhận gọi một hàm phía máy chủ chỉ cho phép xác nhận thông báo của chính mình, và ghi thời điểm xác nhận; từ đó bộ lọc ở trên không còn trả thông báo đó nữa, kể cả sau khi tải lại trang hay đăng nhập lại.
- Kiểm thử tự động khóa điều kiện "chỉ người nhận mới đọc được" trong schema.

## 2. Checklist trên web (chưa thực hiện, cần Owner + 2 Learner)

- [ ] Learner A gửi một báo lỗi; Owner phản hồi → A thấy thông báo trên trang chủ.
- [ ] Learner B đăng nhập cùng lúc: **không** thấy thông báo của A.
- [ ] A bấm **OK**: thông báo biến mất; tải lại trang (Ctrl+F5) vẫn không hiện lại.
- [ ] A đăng xuất rồi đăng nhập lại: thông báo đã xác nhận vẫn không hiện lại.
- [ ] Gửi thêm một phản hồi mới: chỉ thông báo mới xuất hiện.

## 3. Kết luận tạm thời

Cơ chế xác nhận và không hiển thị lại đã nhất quán giữa code phía web và phía máy chủ; việc còn lại là kiểm chứng bằng hai tài khoản Learner thật trên web.
