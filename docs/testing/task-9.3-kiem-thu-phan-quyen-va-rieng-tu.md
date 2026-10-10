# Task 9.3 — Kiểm thử phân quyền và quyền riêng tư

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 9 — Kiểm thử và mở rộng  
**Liên quan:** Task 2.3 (RLS), Task 6.8 (thông báo riêng), Task 7.2 (máy chủ tự quyết dấu kiểm thử)

## 1. Đã kiểm thử tự động (đạt)

Bộ kiểm tra `tests/securityGuards.test.ts` khóa các chốt chặn sau ở mức code/schema, để lần sửa sau phá vỡ sẽ báo đỏ ngay:

- Web chỉ nhúng anon key công khai, tuyệt đối không có `service_role`.
- Bảng đáp án `exam_keys` không được cấp quyền đọc trực tiếp cho người dùng thường.
- Nộp bài chỉ đi qua hàm máy chủ `submit_exam(...)`; chỉ tài khoản Owner mới ghi được dấu kiểm thử, Learner luôn bị máy chủ ghi là lượt thật.
- Thông báo riêng có điều kiện "chỉ người nhận mới đọc được".
- Đáp án hiện tại chỉ được trả qua hàm kiểm tra "chính người này đã nộp bài này".

## 2. Checklist trên web bằng tài khoản thật (chưa thực hiện)

- [ ] Email chưa được duyệt: bị chặn ở màn hình chờ duyệt, không thấy thư viện đề.
- [ ] Learner: không thấy nút Quản trị/Người dùng/Báo lỗi của Owner; vẫn học và làm bài bình thường.
- [ ] Learner A và Learner B: mỗi người chỉ thấy thông báo của mình; B không thấy thông báo phản hồi báo lỗi của A.
- [ ] Thu hồi quyền một Learner (xóa khỏi danh sách duyệt) → tải lại trang → tài khoản đó bị chặn lại.
- [ ] Trước khi nộp bài, Learner không mở được lời giải; sau khi nộp thì mở được.

## 3. Kết luận tạm thời

Chốt chặn phía máy chủ và schema đã có kiểm thử tự động đạt; kiểm thử xâm nhập bằng tài khoản thật vẫn cần thực hiện trên web theo checklist trên.
