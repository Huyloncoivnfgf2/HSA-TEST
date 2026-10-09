# Task 1.3 — Thiết lập môi trường Supabase

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 1 — Thiết lập môi trường phát triển  
**Liên quan:** Giai đoạn 0 (Task 0.2, 0.4, 0.5), Task 1.1 (điều kiện chạy), Task 1.2 (lớp khôi phục K5)  
**Bằng chứng đã kiểm tra trực tiếp ngày 2026-10-09:** `supabase/schema.sql`, `src/services/supabaseClient.ts`, `cloudExamService.ts`, `allowedUsersService.ts`, `AuthGate.tsx`, `userDataSync.ts`.

---

## 1. Mục đích

Supabase là nơi giữ những thứ Git không giữ: tài khoản đăng nhập, danh sách được duyệt, thư viện đề, đáp án, file PDF và bài nộp. Task này chốt Supabase gồm những gì, ai được đụng vào phần nào, thay đổi cấu trúc phải đi đường nào, và hỏng dữ liệu thì khôi phục ra sao — trước khi làm bất kỳ thay đổi dữ liệu nào ở các giai đoạn sau.

## 2. Bức tranh tổng thể (đã kiểm tra)

Dự án dùng **1 project Supabase duy nhất** (theo lời bạn: project "HSA", khu vực Singapore — thông tin khu vực do bạn cung cấp, repo không ghi lại, nên nếu cần kiểm chứng phải vào trang quản trị Supabase).

Supabase trong dự án này làm 4 việc:

| Việc | Phần Supabase | Bằng chứng |
|---|---|---|
| Đăng nhập Google | Auth (Google provider), quay về đúng địa chỉ web (`redirectTo: window.location.origin`) | `AuthGate.tsx` |
| Dữ liệu chính | Database PostgreSQL, file gốc là `supabase/schema.sql` | Thư mục `supabase/` |
| File đề/lời giải | Storage bucket `exam-files`, **kín (không công khai)**, giới hạn 30 MB/file trong schema | `schema.sql`, `cloudExamService.ts` |
| Đồng bộ dữ liệu học tập | Bảng `user_data` (dạng khóa–giá trị theo từng người) | `userDataSync.ts` |

## 3. Cấu trúc dữ liệu hiện tại (chốt theo `schema.sql`)

| Bảng | Giữ gì | Ai đọc/ghi được (tóm tắt RLS) |
|---|---|---|
| `admins` | Email của Owner | Chỉ Owner đọc; thêm email bằng tay qua SQL/bảng quản trị |
| `allowed_users` | Email bạn học được duyệt | Owner đọc/thêm/xóa |
| `exams` | Thư viện đề: tên, phần thi, số câu, đường file PDF, đường file lời giải, ngày tạo/sửa | Người được duyệt đọc (không gồm cột lời giải khi đọc thường); chỉ Owner thêm/sửa/xóa |
| `exam_keys` | Đáp án đúng của từng đề (dạng JSON theo số câu) | Chỉ Owner ghi; **không cấp quyền đọc trực tiếp cho người học** |
| `exam_submissions` | Bài nộp: người nộp, đề, đáp án đã điền, giờ nộp | Mỗi người chỉ đọc bài của mình |
| `user_data` | Dữ liệu đồng bộ cá nhân (ôn tập, lần làm, cài đặt...) | Mỗi người chỉ đọc/ghi dữ liệu của mình |

Các hàm máy chủ giữ vai trò "người gác cổng":
- `is_admin()`, `is_allowed()`: xác định Owner / người được duyệt theo email trong JWT.
- `submit_exam()`: chỉ khi đã ghi nhận bài nộp mới trả đáp án đúng + đường file lời giải.
- `save_exam_key()`: chỉ Owner mới lưu được đáp án.
- `can_read_exam_file()`: file lời giải chỉ mở sau khi đã nộp bài tương ứng (Owner ngoại lệ).

**Điểm đã kiểm tra và đúng ý đồ an toàn:** phía web (`supabaseClient.ts`) chỉ dùng khóa công khai phía người dùng (anon key) kèm RLS; không thấy dùng khóa toàn quyền (service_role) trong file kết nối này. Bảo vệ khóa chi tiết thuộc Task 1.4.

## 4. Cách web nối vào Supabase (điều kiện chạy)

1. Web đọc 2 biến `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (xem Task 1.1/1.4). Thiếu là web báo "Thiếu ... trong cấu hình môi trường" và dừng ở màn hình đó (hành vi đã có trong `AuthGate.tsx`).
2. Sau đăng nhập Google, web lần lượt hỏi máy chủ: được duyệt không (`is_allowed`) → có phải Owner không (`is_admin`) → mới nạp dữ liệu cá nhân và đồng bộ.
3. Đề PDF được tải qua **đường dẫn ký tạm thời (hết hạn sau 1 giờ)** rồi lưu đệm tại máy (IndexedDB), nên mở lại nhanh và học offline được một phần; đáp án phía máy khách chỉ hiện khi đã có lần nộp (đúng thiết kế 0.2/0.4).
4. Dữ liệu cá nhân đồng bộ kiểu "máy giữ trước, gửi lên sau" (chờ ~2 giây gộp gửi, có trạng thái đang đồng bộ/ngoại tuyến). Điều này giải thích vì sao mất mạng giữa buổi học không mất bài — và cũng là lý do khi kiểm tra dữ liệu phải đợi đồng bộ xong mới kết luận.

## 5. Quy trình thay đổi Supabase an toàn (chốt cho mọi task sau)

Bất kỳ thay đổi cấu trúc nào (thêm cột, thêm bảng, đổi hàm) đều đi đúng 5 bước, không nhảy bước:

1. **Sửa trong file `supabase/schema.sql` trong repo trước** (đây là bản gốc để khôi phục). Không sửa thẳng trên trang Supabase rồi quên ghi lại vào file — sửa thế là lần sau không ai dựng lại được.
2. Tạo điểm an toàn Git theo Task 1.2 (nhánh `backup/<ngày>-truoc-<task>`) vì đổi dữ liệu thường đi kèm đổi code.
3. Chạy nội dung thay đổi trong **SQL Editor** của Supabase (cách bạn vẫn làm: đẩy file lên GitHub → mở bản raw → dán vào SQL Editor → Run).
4. Mở web kiểm tra ngay 4 việc: Owner vào được và thấy quản lý; Learner vào học được; tài khoản chưa duyệt vẫn bị chặn; nộp 1 bài thử được đáp án sau khi nộp.
5. Đẩy code liên quan lên GitHub và ghi commit rõ đã đổi cấu trúc gì.

**Cấm kỵ:** chạy lại toàn bộ `schema.sql` một cách máy móc khi chưa đọc kỹ. File hiện tại viết theo kiểu "tạo nếu chưa có / thay thế hàm", chạy lại phần lớn an toàn, nhưng các dòng cấp quyền và tạo bucket ở cuối phải được đọc lại từng lần — nguyên tắc: đọc trước, chạy sau, chạy xong kiểm tra theo bước 4.

## 6. Việc còn dở thuộc môi trường Supabase (xác minh chắc chắn hôm nay)

Đây là phần "chậm mà chắc": hai việc dở dang từ trước, hôm nay đã kiểm chứng tận code thay vì "chưa chắc":

1. **Lỗi "Invalid key" khi đẩy đề lên cloud: nguyên nhân còn nguyên trong code.** File `cloudExamService.ts` đang đặt đường file dạng `{mã đề}/{tên file gốc}` — tên gốc có dấu tiếng Việt/khoảng trắng sẽ bị Storage từ chối. Cách sửa đã chốt ở Task 0.4 (tên ASCII dạng `{exam_id}/exam.pdf`, tên đẹp lưu ở cột title, thêm cột `original_filename`) **chưa được làm**. Đây là việc code của giai đoạn sau, 1.3 chỉ xác minh và ghi lại, không sửa vội tại đây.
2. **Đề 1 file chứa 3 phần chưa có cột dữ liệu.** Schema hiện chưa có `page_start`, `page_end`, `file_id`, `start_question` (đã đối chiếu trực tiếp). Khi làm tính năng này phải đi đúng quy trình 5 bước ở mục 5, cập nhật `schema.sql` trước khi mở web.

## 7. Khôi phục dữ liệu Supabase (hoàn thiện lớp K5 của Task 1.2)

| Mất gì | Cứu bằng gì | Mức độ |
|---|---|---|
| Cấu trúc bảng/hàm bị sửa sai | Chạy lại `supabase/schema.sql` từ repo (bản gốc) sau khi đã sửa file cho đúng | Cứu được cấu trúc; không cứu dữ liệu đã bị xóa |
| Danh sách Owner/được duyệt bị xóa | Thêm lại email vào `admins` / `allowed_users` (Owner phải luôn giữ 1 email admin dự phòng) | Nhanh nếu nhớ danh sách; nên giữ danh sách email ở nơi riêng ngoài Supabase |
| Đề/đáp án bị sửa nhầm | Sửa lại theo file PDF gốc và đáp án gốc bạn giữ ở máy; lịch sử Git chỉ cứu được nếu thay đổi từng đi qua repo | Phụ thuộc bản gốc ở máy của bạn — giữ nguyên tắc không xóa file gốc |
| File PDF trên Storage bị xóa | Tải lên lại từ file gốc ở máy; đường file phải giữ đúng `{exam_id}/...` cũ | Mất file gốc ở máy = mất đề, nên backup máy của bạn là lớp cuối |
| Bài nộp/tiến độ của người học | **Không có bản sao tự động trong gói miễn phí theo giờ.** Giảm rủi ro bằng: dữ liệu cá nhân còn bản tại máy của chính người học (đồng bộ hai chiều khi đăng nhập lại cùng thiết bị) | Đây là điểm yếu có thật của gói free — ghi nhận, không hứa quá |

**Thói quen chốt:** sau mỗi đợt thêm nhiều đề/đáp án, xuất (export) các bảng `exams`, `exam_keys`, `allowed_users` ra file và lưu cùng thư mục backup của bạn, ghi kèm ngày và mã commit. Việc này rẻ và là lớp cứu dữ liệu duy nhất nằm trong tay bạn ngoài Supabase.

## 8. Giới hạn gói miễn phí phải nhớ khi thiết kế (theo thông tin bạn cung cấp)

Dung lượng file ~1 GB, cơ sở dữ liệu 500 MB, băng thông 5 GB/tháng, project có thể tạm dừng sau 1 tuần không dùng. Hệ quả tư duy: PDF là thứ nặng nhất — giới hạn 30 MB/file hiện tại là hợp lý; không đưa video/file nặng lên Storage; khi project bị tạm dừng, cần vào trang Supabase mở lại trước khi trách web.

## 9. Tiêu chí nghiệm thu Task 1.3

- [x] Kê khai đủ 4 việc của Supabase kèm bằng chứng file/hàm cụ thể.
- [x] Bảng dữ liệu + quyền đọc/ghi khớp Task 0.2, đối chiếu trực tiếp schema.
- [x] Quy trình 5 bước khi thay đổi cấu trúc, cấm sửa thẳng không ghi vào `schema.sql`.
- [x] Xác minh chắc chắn 2 việc dở (lỗi đặt tên file, thiếu cột đề nhiều phần) thay vì "chưa chắc".
- [x] Bảng khôi phục dữ liệu theo từng loại mất mát, nói rõ điểm yếu gói miễn phí.
- [ ] (Kiểm tra thực tế ở các task sau) Đăng nhập thử 3 loại tài khoản và nộp 1 bài thử sau mỗi lần đổi schema.

**Kết luận Task 1.3:** Môi trường Supabase đã được chốt dựa trên bằng chứng trong repo. Việc sửa lỗi "Invalid key" và thêm cột đề nhiều phần là việc code của giai đoạn sau, đi theo quy trình mục 5. Chưa sang Task 1.4 cho đến khi phần này được đẩy lên repo và kiểm tra lại.
