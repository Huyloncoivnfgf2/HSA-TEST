# Task 2.1 — Xây dựng tài khoản và vai trò

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 2 — Tài khoản, phân quyền và dữ liệu  
**Liên quan:** Task 0.2 (vai trò Owner và Learner), Task 1.3 (môi trường Supabase), Task 1.4 (biến môi trường)  
**Bằng chứng đã kiểm tra trực tiếp trong repo ngày 2026-10-09:** `src/components/AuthGate.tsx`, `src/services/allowedUsersService.ts`, `src/components/AllowedUsersModal.tsx`, `src/App.tsx` (chỗ truyền `isAdmin` và mở màn hình Người dùng), `supabase/schema.sql` (bảng `admins`, `allowed_users`, hàm `is_admin()`, `is_allowed()`).  
**Kết quả rà soát:** Phần cốt lõi của Task 2.1 **đã có sẵn và đang đúng hướng**. Task này không sửa code chạy; các điểm còn thiếu nằm ở nghiệm thu thực tế và các task sau của Giai đoạn 2, được ghi rõ ở mục 6–7.

---

## 1. Mục đích

Chốt rõ: tài khoản của web là gì, có mấy vai trò, ai quyết định vai trò của một người, và điều gì xảy ra với người chưa được duyệt. Đây là nền cho 2.2 (quyền Owner/Learner), 2.3 (phân quyền phía server/RLS) và 2.5 (hồ sơ, lịch sử hoạt động).

## 2. Mô hình tài khoản hiện tại (đã kiểm tra)

1. **Không tự tạo tài khoản trong web.** Người dùng đăng nhập bằng Google qua Supabase. Supabase là nơi giữ tài khoản đăng nhập thật (mã người dùng + email). Web không lưu mật khẩu, không có form đăng ký riêng.
2. **Vai trò không nằm trong tài khoản Google**, mà do hai danh sách email trong cơ sở dữ liệu quyết định:
   - Có email trong bảng `admins` → **Owner**.
   - Có email trong bảng `allowed_users` (và không phải Owner) → **Learner**.
   - Không có trong cả hai bảng → **chưa được duyệt**, không vào được nội dung.
   Cách làm này đơn giản, dễ hiểu với nhóm nhỏ: muốn cấp quyền cho ai thì thêm email của người đó; muốn thu hồi thì xóa email.
3. **Kiểm tra vai trò diễn ra mỗi lần đăng nhập.** Sau khi có phiên đăng nhập, web gọi hai hàm phía máy chủ `is_allowed()` và `is_admin()` (chạy trong `AuthGate`), dựa trên email trong phiên đăng nhập. Không tin dữ liệu phía trình duyệt tự khai.
4. **Không đạt thì chặn ngay ở cổng:**
   - Chưa đăng nhập → màn hình đăng nhập Google.
   - Đã đăng nhập nhưng chưa được duyệt → màn hình "Tài khoản chưa được cấp quyền", hiện email của chính người đó, có nút đăng xuất.
   - Lỗi kiểm tra quyền (mất mạng, máy chủ lỗi) → màn hình báo không xác minh được, **không cho vào** (chặn an toàn, không mở tạm).
5. **Dữ liệu tại máy gắn theo tài khoản.** Sau khi đạt, web gắn dữ liệu trong máy (đề đã lưu, bài làm) với mã tài khoản của người đang đăng nhập, nên hai người dùng chung một máy không bị lẫn dữ liệu.

## 3. Ba vai trò — chốt định nghĩa

| Vai trò | Cách nhận diện | Mục đích |
|---|---|---|
| Owner | Email trong bảng `admins` (hàm `is_admin()` trả về đúng) | Quản lý đề, đáp án, danh sách người được duyệt; cũng học như Learner |
| Learner | Email trong bảng `allowed_users` (hàm `is_allowed()` trả về đúng), không phải Owner | Học, làm bài, xem tiến độ của chính mình |
| Chưa được duyệt | Đăng nhập được Google nhưng không có tên trong hai bảng | Không xem được nội dung; chỉ thấy màn hình chờ duyệt kèm email của mình |

Nguyên tắc giữ nguyên từ Task 0.2: Owner là vai trò **bổ sung trên nền Learner** (Owner cũng được tính là đã duyệt), không phải một loại tài khoản tách biệt hoàn toàn.

## 4. Vòng đời của một tài khoản (đúng với code hiện tại)

1. Người mới bấm đăng nhập Google → Supabase tạo/ghi nhận tài khoản đăng nhập.
2. Nếu email chưa có trong danh sách: người đó dừng ở màn hình chưa được duyệt, thấy email của mình để gửi cho Owner.
3. Owner thêm email vào danh sách được duyệt (màn hình "Người dùng", hoặc thêm Owner bằng cách đưa email vào bảng `admins` theo Task 1.3).
4. Người đó đăng nhập lại (hoặc tải lại trang): web kiểm tra lại, đạt thì gắn dữ liệu theo tài khoản và cho vào.
5. Owner xóa email khỏi danh sách: lần kiểm tra quyền tiếp theo, người đó quay về trạng thái chưa được duyệt. **Lưu ý trung thực:** nếu người đó đang mở sẵn web, việc thu hồi có thể chỉ có hiệu lực khi họ tải lại/đăng nhập lại — điểm này kiểm chứng ở nghiệm thu mục 7, không giả định.

## 5. Những gì Task 2.1 quyết định KHÔNG làm (và vì sao)

- **Không tạo bảng "hồ sơ người dùng" riêng trong Task 2.1.** Tên, email, ảnh lấy từ tài khoản Google khi cần hiển thị; hồ sơ học tập và lịch sử thuộc Task 2.5, không làm trùng.
- **Không có nút "xin duyệt" tự động trong web.** Nhóm kín, Owner duyệt bằng cách thêm email là đủ; thêm luồng xin duyệt sẽ thừa và tăng bề mặt lỗi.
- **Không cho tự đổi vai trò trong web.** Owner chỉ thêm được Learner qua màn hình Người dùng; việc thêm/bớt Owner làm ở mức cơ sở dữ liệu có chủ đích, tránh tự khóa quyền của chính mình.
- **Không lưu thêm thông tin cá nhân ngoài email** (đúng tinh thần nhóm kín, dữ liệu tối thiểu).

## 6. Việc còn thiếu — phân đúng task, không làm gộp

| Điểm còn thiếu | Thuộc task | Ghi chú |
|---|---|---|
| Kiểm chứng 3 loại tài khoản trên web thật (Owner / Learner / chưa duyệt) | Nghiệm thu 2.1 (mục 7) + logic nhóm A của Task 0.8 | Cần tài khoản thật của bạn, trợ lý không tự kết luận thay |
| Quyền chi tiết Owner được bấm gì, Learner bị ẩn gì trên giao diện | Task 2.2 | Màn hình Người dùng và nút thêm đề hiện đã được bọc theo `isAdmin` trong `App.tsx`; sẽ rà soát đầy đủ ở 2.2 |
| Kiểm tra phân quyền phía máy chủ (RLS, đáp án chỉ trả sau khi nộp) có chặn đúng khi gọi thẳng dữ liệu | Task 2.3 | Schema hiện đã có RLS và các hàm gác cổng; 2.3 sẽ đối chiếu từng bảng |
| Tách lượt làm bài thật và lượt kiểm thử nội dung của Owner | Task 2.4 | Chưa có cơ chế tách; không suy diễn trong task này |
| Hồ sơ người học + lịch sử hoạt động hiển thị đầy đủ | Task 2.5 | Dữ liệu gốc đã có một phần qua bài nộp và đồng bộ |

## 7. Tiêu chí nghiệm thu Task 2.1

- [x] Chốt mô hình tài khoản: đăng nhập Google qua Supabase, không tự đăng ký, không lưu mật khẩu.
- [x] Chốt 3 vai trò và cách nhận diện bằng hai danh sách email phía máy chủ.
- [x] Kiểm tra trong code: chặn đúng người chưa đăng nhập, người chưa được duyệt, và trường hợp lỗi kiểm tra (chặn an toàn).
- [x] Ghi rõ vòng đời tài khoản từ lần đăng nhập đầu đến khi bị thu hồi, kèm giới hạn "thu hồi có hiệu lực ở lần kiểm tra sau".
- [ ] (Bạn kiểm trên web thật, 3 tài khoản) Owner vào được và thấy quản lý; Learner được duyệt vào học bình thường; email chưa duyệt dừng ở màn hình chờ. Đạt cả 3 mới coi Task 2.1 nghiệm thu xong.
- [ ] (Bạn kiểm thêm 1 lượt) Xóa 1 email thử nghiệm khỏi danh sách, tải lại trang bằng tài khoản đó, xác nhận bị chặn lại.

**Kết luận Task 2.1:** Mô hình tài khoản và vai trò đã có sẵn, đúng thiết kế, không cần sửa code. Chỉ còn nghiệm thu bằng tài khoản thật trên web. Không chuyển sang Task 2.2 trong cùng lượt này.
