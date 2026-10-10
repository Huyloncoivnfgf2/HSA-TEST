# Task 9.6 — Kiểm thử hồi quy (Regression Testing)

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 9 — Kiểm thử và mở rộng  
**Liên quan:** mọi giai đoạn trước; đây là chốt chặn để các lần sửa sau không phá vỡ logic đã đúng

## 1. Đã thiết lập

- Repo có bộ kiểm thử tự động đầu tiên trong thư mục `tests/`, chạy bằng lệnh **`bun run test`** (không cần cài thêm thư viện — dùng sẵn cơ chế test của Bun).
- Kết quả hiện tại: **26 kiểm tra đạt, 0 lỗi**, trên 4 nhóm:
  - `tests/pdfExam.test.ts` (12): chuẩn hóa/chấm điểm, đề gộp theo khoảng câu, đọc đáp án báo trùng/thiếu, chế độ Luyện tập thật/Kiểm thử, ảnh chụp đáp án khi chấm lại, cổng sẵn sàng của đề.
  - `tests/analytics.test.ts` (5): thứ tự lịch sử theo ngày nộp, tỉ lệ đúng tính thật (lỗi 0% của Task 8.3), độ tin cậy, chuyên đề yếu không lấy nhóm "Tổng hợp", thời gian từng câu không bị bịa, chấm lại không xáo thứ tự (Task 8.8).
  - `tests/securityGuards.test.ts` (5): không nhúng `service_role`, đáp án không đọc trực tiếp, nộp bài qua hàm máy chủ, dấu kiểm thử chỉ Owner, thông báo chỉ người nhận.
  - `tests/examSystems.test.ts` (4): registry hệ kỳ thi HSA/TSA/THPT (Task 9.7).
- Các file test được loại khỏi kiểm tra kiểu của mã ứng dụng để `bun run lint` vẫn chỉ phản ánh code web như trước.

## 2. Quy trình hồi quy từ nay

1. Trước khi sửa code: chạy `bun run test` để biết nền đang xanh.
2. Sau khi sửa: chạy lại `bun run test` + `bun run lint` + `bun run build`. Test đỏ ở kiểm tra nào thì dừng và xem lại đúng chỗ đó, không coi là "xong".
3. Mỗi khi sửa một lỗi đã từng xảy ra, thêm một kiểm tra mới mô tả đúng lỗi đó trước khi coi lỗi đã được sửa hẳn.
4. Kiểm thử bằng tài khoản thật trên web (checklist Task 9.1–9.5) vẫn là vòng cuối sau khi Render cập nhật; bộ test tự động không thay thế vòng này.

## 3. Kết luận

Từ nay dự án có một chốt chặn hồi quy chạy lại được bất cứ lúc nào; các lỗi đã từng sửa ở Giai đoạn 6–8 đều có kiểm tra giữ lại, sửa sau phá vỡ sẽ báo đỏ ngay.
