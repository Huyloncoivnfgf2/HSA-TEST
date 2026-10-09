# Task 0.2 — Xác định vai trò Owner và Learner

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 0 — Thiết kế sản phẩm
**Liên quan:** Task 0.1 (mục tiêu & người dùng), supabase/schema.sql, AuthGate, AllowedUsersModal

## 1. Mục đích
Chốt rõ ai được làm gì trên web, để phân quyền phía máy chủ (Supabase) và giao diện khớp nhau, không lộ đề/đáp án cho người ngoài.

## 2. Các vai trò chốt

| Vai trò | Là ai | Cách nhận diện (đã có trong hệ thống) |
|---|---|---|
| **Owner (Admin)** | Chính bạn, chủ web | Email nằm trong bảng `admins`; hàm `is_admin()` = true |
| **Learner** | Bạn học được bạn duyệt | Email nằm trong bảng `allowed_users` (hoặc là admin); hàm `is_allowed()` = true |
| **Người chưa duyệt** | Có tài khoản Google nhưng email chưa được thêm | `is_allowed()` = false → bị chặn ở cổng đăng nhập |

Không tạo thêm vai trò khác ở giai đoạn này (không có giáo viên/phụ huynh/khách).

## 3. Bảng quyền chi tiết

| Việc | Owner | Learner | Chưa duyệt |
|---|:-:|:-:|:-:|
| Đăng nhập vào web | ✅ | ✅ | ❌ Bị chặn, hiện thông báo chưa được duyệt |
| Xem thư viện đề (tên đề, phần thi) | ✅ | ✅ | ❌ |
| Mở PDF đề để làm bài | ✅ | ✅ | ❌ |
| Thêm / sửa / xóa đề, tải PDF lên cloud | ✅ | ❌ Không thấy nút | ❌ |
| Nhập / sửa đáp án đúng (exam key) | ✅ | ❌ | ❌ |
| Xem/sửa danh sách người được duyệt | ✅ | ❌ | ❌ |
| Làm bài, nộp bài | ✅ | ✅ | ❌ |
| Xem đáp án đúng & file lời giải | Sau khi đã nộp bài đó | Sau khi đã nộp bài đó | ❌ |
| Xem điểm, lịch sử, Sổ lỗi, phân tích của **chính mình** | ✅ | ✅ | ❌ |
| Xem dữ liệu học tập của người khác | Không (mỗi người chỉ thấy của mình) | ❌ | ❌ |
| Báo lỗi nội dung đề | ✅ | ✅ | ❌ |

**Nguyên tắc cứng:**
1. Đáp án đúng (`exam_keys`) chỉ Owner ghi được; Learner chỉ nhận được **sau khi nộp** qua hàm `submit_exam()`.
2. File lời giải chỉ mở được khi đã nộp bài tương ứng (hàm `can_read_exam_file()`), Owner ngoại lệ.
3. Kiểm tra quyền phải làm **phía máy chủ** (RLS + hàm), ẩn nút trên giao diện chỉ là phụ.

## 4. Hiện trạng trong code (đã kiểm tra)
- Đã có: bảng `admins`, `allowed_users`; hàm `is_admin()`, `is_allowed()`; chính sách RLS theo đúng bảng quyền trên; màn hình quản lý người dùng (AllowedUsersModal), cổng đăng nhập (AuthGate).
- Owner thêm/bớt Learner bằng email trong màn hình "Người dùng".

## 5. Việc cần làm để khớp 100% thiết kế (ghi nhận, làm ở giai đoạn code)
- Kiểm tra đủ 3 trường hợp: Owner thấy nút Thêm đề; Learner vào được nhưng không thấy nút thêm đề/quản lý người dùng; email chưa duyệt bị chặn hẳn.
- Khi bị chặn, thông báo phải nói rõ: tài khoản chưa được duyệt, liên hệ Owner (không lộ thông tin đề).

## 6. Tiêu chí nghiệm thu Task 0.2
- [x] Chốt 3 vai trò và cách nhận diện bằng email.
- [x] Bảng quyền từng việc cho từng vai trò.
- [x] Nguyên tắc bảo vệ đáp án phía máy chủ.
- [ ] (Kiểm tra thực tế ở giai đoạn test) Đăng nhập thử đủ 3 loại tài khoản.

**Kết luận:** Thiết kế vai trò hoàn thành, khớp với phân quyền Supabase hiện có. Sang Task 0.3.
