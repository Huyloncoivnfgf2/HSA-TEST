# Task 7.2 — Lưu chế độ làm bài cho từng lượt

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 7 — Chế độ luyện tập và kiểm thử nội dung  
**Liên quan:** Task 7.1 (chọn chế độ), Task 2.4 (giới hạn cũ: bài nộp cloud chưa có dấu kiểm thử), Task 7.3 (loại trừ khỏi phân tích)

## 1. Hiện trạng đã kiểm tra

- Ở phía máy, phiên làm bài và lượt đã nộp đã giữ cờ kiểm thử từ Task 2.4/4.1, nhưng bài nộp trên Supabase chưa có cột nào ghi chế độ, nên phía máy chủ không phân biệt được lượt thật và lượt kiểm thử. Đây là giới hạn đã ghi rõ từ Task 2.4.

## 2. Đã làm

- Mỗi phiên và mỗi lượt đã nộp lưu thêm `attemptKind` dạng chữ (`real` = Luyện tập thật, `content-test` = Kiểm thử nội dung), suy ra được từ cờ cũ nên lượt tạo trước Giai đoạn 7 vẫn đọc đúng là luyện tập thật.
- Bảng `exam_submissions` có thêm cột `is_content_test` (mặc định `false`, không xóa dữ liệu cũ).
- Hàm nộp bài phía máy chủ nhận thêm dấu kiểm thử và ghi vào bài nộp. Điểm chốt an toàn: chỉ Owner mới được ghi dấu kiểm thử ở phía máy chủ; tài khoản người học gửi gì lên cũng luôn bị ghi là lượt thật, nên không thể dùng chế độ kiểm thử để lách phân tích tiến độ.
- Phía web, nếu Supabase chưa chạy bản schema mới, lượt nộp tự lùi về cách gọi cũ để việc làm bài không bị gián đoạn; dấu kiểm thử phía máy chủ chỉ có hiệu lực sau khi chạy lại schema.

## 3. Kiểm tra

- `bun run build`: đạt. `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`.
- Chưa kiểm tra được SQL thật từ phía trợ lý; cần người dùng chạy lại `supabase/schema.sql` một lần cho Giai đoạn 7 (cùng cách đã làm ở Giai đoạn 6).

## 4. Nghiệm thu trên web

- [ ] Sau khi chạy schema: Owner làm một lượt Kiểm thử nội dung và một lượt Luyện tập thật; trợ lý/Owner đối chiếu trong Supabase thấy `is_content_test` lần lượt là `true`/`false`.
- [ ] Trước khi chạy schema, việc nộp bài vẫn diễn ra bình thường (đường lùi).

**Kết luận Task 7.2:** Chế độ của từng lượt được lưu cả ở máy và trên cloud; giới hạn của Task 2.4 về dấu kiểm thử phía máy chủ đã được xử lý.
