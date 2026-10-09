# Task 2.3 — Thiết lập phân quyền phía server và Supabase RLS

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 2 — Tài khoản, phân quyền và dữ liệu  
**Liên quan:** Task 2.1 (tài khoản/vai trò), Task 2.2 (quyền trên giao diện), Task 1.3 (schema Supabase), Task 1.4 (secrets)  
**Bằng chứng đã kiểm tra trực tiếp ngày 2026-10-09:** `supabase/schema.sql`, `server.ts`, `src/services/geminiClient.ts`, `src/services/cloudExamService.ts`, `src/services/allowedUsersService.ts`, `src/services/userDataSync.ts` và các chính sách đã ghi trong schema.

---

## 1. Mục đích

Task 2.2 mới đóng cửa ở giao diện. Task này kiểm tra lớp thật phía sau: nếu ai đó bỏ qua giao diện và gọi thẳng dữ liệu/máy chủ, hệ thống có vẫn chặn đúng Owner/Learner/chưa duyệt hay không.

## 2. Kết luận rà soát RLS Supabase

Schema hiện tại đã bật RLS cho các bảng chính và dùng nguyên tắc **mặc định chặn, mở theo vai trò**:

| Dữ liệu | Learner được duyệt | Owner | Người chưa duyệt/chưa đăng nhập |
|---|---|---|---|
| `admins` | Không xem | Xem danh sách Owner | Không |
| `allowed_users` | Không xem/tự thêm mình | Xem, thêm, xóa email được duyệt | Không |
| `exams` (thông tin đề) | Xem thông tin đề cơ bản, không gồm đường file lời giải trong quyền chọn cột | Thêm/sửa/xóa đề | Không |
| `exam_keys` (đáp án) | Không đọc trực tiếp | Không đọc/ghi trực tiếp bằng bảng; lưu qua hàm `save_exam_key()` kiểm tra Owner | Không |
| `exam_submissions` (bài nộp) | Chỉ xem bài của chính mình; nộp qua `submit_exam()` | Nộp/xem bài của chính mình; không xem bài của Learner khác theo RLS hiện tại | Không |
| `user_data` (dữ liệu cá nhân đồng bộ) | Chỉ dữ liệu của chính mình | Chỉ dữ liệu của chính mình | Không |
| File trong bucket `exam-files` | Đọc file đề; file lời giải chỉ đọc sau khi đã nộp bài theo `can_read_exam_file()` | Tải lên/sửa/xóa file | Không |

Điểm quan trọng đã đúng: đáp án không nằm ở quyền đọc trực tiếp của Learner. Khi nộp bài, hàm `submit_exam()` ghi bài nộp trước rồi mới trả đáp án và đường lời giải, đúng nguyên tắc “không hiện đáp án trước khi nộp”.

## 3. Điểm thiếu phía server đã sửa

Ba đường AI trong `server.ts` trước đây **không kiểm tra đăng nhập/vai trò**:

- `/api/gemini/parse-questions`
- `/api/gemini/parse-answer-key`
- `/api/gemini/exam-feedback`

Các đường này dùng khóa Gemini phía máy chủ. Nếu để mở, người ngoài có thể gọi thẳng để tiêu tốn khóa/API dù không thấy nút trên giao diện. Task 2.2 đã ẩn nút với Learner, nhưng server vẫn là cửa hậu.

Đã sửa theo hướng tối thiểu:

1. `server.ts` kiểm tra token đăng nhập Supabase gửi kèm.
2. Hai đường tách đề/đáp án bằng AI chỉ cho **Owner** (`is_admin()`), vì đây là quản trị nội dung.
3. Đường nhận xét bài thi cho tài khoản **đã được duyệt** (`is_allowed()`), vì Learner cần nhận xét sau khi làm bài.
4. `src/services/geminiClient.ts` tự gắn token đăng nhập hiện tại vào các lần gọi AI, để Owner/Learner hợp lệ vẫn dùng như cũ.

Không đổi schema Supabase trong task này; RLS hiện tại không cần sửa để giải quyết điểm thiếu trên.

## 4. Điều kiện để bản sửa chạy đúng trên Render

Máy chủ dùng lại hai biến đã có của web (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) để xác minh phiên đăng nhập. Theo Task 1.4, hai biến này cần có trên Render. Nếu thiếu, các đường AI sẽ báo cần đăng nhập/không xác minh được thay vì chạy mở. Đây là hành vi chặn an toàn.

## 5. Những điểm chưa coi là xong nếu chưa kiểm thật

- Chưa có kiểm thử tự động cho RLS; việc kết luận cuối cùng vẫn cần thử bằng tài khoản thật: Learner không thêm được email, không sửa được đề/đáp án; người chưa duyệt không đọc được đề.
- Việc gọi thẳng API AI bằng công cụ ngoài trình duyệt không hướng dẫn trong tài liệu này; tiêu chí là Owner gọi được qua giao diện, Learner không gọi được đường quản trị nội dung, người chưa đăng nhập bị từ chối.
- Các cột còn thiếu cho đề nhiều phần và lưu kết quả chấm tại thời điểm nộp là việc schema ở giai đoạn sau, không gộp vào Task 2.3.

## 6. Tiêu chí nghiệm thu Task 2.3

- [x] Đối chiếu từng bảng và bucket với quyền Owner/Learner/chưa duyệt.
- [x] Xác nhận đáp án không đọc trực tiếp được; chỉ trả sau khi nộp qua `submit_exam()`.
- [x] Sửa ba đường AI phía server để yêu cầu đúng vai trò.
- [x] Client tự gửi token đăng nhập khi gọi AI để không phá luồng hợp lệ.
- [ ] (Kiểm trên web sau khi Render cập nhật) Owner dùng được Nhập AI như trước.
- [ ] (Kiểm trên web sau khi Render cập nhật) Learner vẫn nhận được nhận xét sau bài làm (nếu tính năng nhận xét đang bật), nhưng không thấy/không dùng được công cụ nhập nội dung.
- [ ] (Bạn kiểm bằng tài khoản chưa duyệt) Vẫn bị chặn ở cổng, không vào được dữ liệu đề.

**Kết luận Task 2.3:** RLS Supabase hiện tại đạt yêu cầu cốt lõi; điểm thiếu thật nằm ở server AI chưa gắn vai trò và đã được sửa. Chưa nghiệm thu cuối cho đến khi kiểm tra trên web sau khi Render cập nhật.
