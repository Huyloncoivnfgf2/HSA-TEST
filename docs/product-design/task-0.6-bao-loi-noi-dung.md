# Task 0.6 — Thiết kế chức năng báo lỗi nội dung

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 0 — Thiết kế sản phẩm
**Liên quan:** Task 0.2, 0.4, 0.5 | Thành phần hiện có: ReportQuestionModal

## 1. Mục đích
Đề PDF lấy từ nhiều nguồn nên khó tránh lỗi (sai đáp án, in mờ, thiếu trang, sai số câu). Cần một cách để người học báo lỗi ngay tại chỗ, Owner xử lý gọn, và cả nhóm được lợi.

## 2. Ai báo, báo cái gì
- **Ai báo được:** Owner và Learner đã đăng nhập (người chưa duyệt không thấy tính năng này).
- **Báo tại đâu:** Ngay trong màn hình làm bài/xem kết quả, tại câu/đề đang xem; không phải đi tìm form riêng.
- **Thông tin một báo lỗi gồm:**
  - Đề nào, phần nào, số câu (hệ thống tự điền, người báo không phải gõ lại).
  - Loại lỗi (chọn 1): Đáp án có vẻ sai / Đề in mờ hoặc thiếu / Sai số câu, lệch trang / Lời giải sai hoặc khó hiểu / Khác.
  - Mô tả ngắn của người báo (gõ tự do, có thể để trống nếu đã chọn loại lỗi rõ).
  - Thời gian báo và người báo (tự ghi).

## 3. Quy trình xử lý (chốt)
1. **Người học bấm "Báo lỗi"** → chọn loại lỗi → gửi. Hiện thông báo đã nhận.
2. **Owner thấy danh sách báo lỗi chưa xử lý** (chỉ Owner thấy mục quản lý này).
3. Owner kiểm tra lại đề gốc:
   - Lỗi thật về đáp án → sửa đáp án theo Task 0.5 (ghi nhật ký `doi_dap_an`) và đánh dấu báo lỗi "Đã sửa".
   - Lỗi file (mờ/thiếu trang) → thay file PDF, đánh dấu "Đã sửa".
   - Không phải lỗi → đánh dấu "Đã xem, đề đúng".
4. Người đã báo lỗi thấy được trạng thái xử lý của báo lỗi mình gửi (Đã nhận / Đã sửa / Đã xem).

**Nguyên tắc:** Báo lỗi không làm lộ đáp án đúng cho người chưa nộp bài; phần mô tả của người báo chỉ Owner và chính người báo thấy.

## 4. Chống báo lỗi bừa
- Mỗi người chỉ gửi 1 báo lỗi cho cùng 1 câu trong cùng 1 đề (muốn bổ sung thì sửa báo lỗi cũ).
- Báo lỗi không hiện công khai cho cả nhóm, tránh tranh cãi trong lúc học.

## 5. Hiện trạng trong code (đã kiểm tra)
- Đã có cửa sổ báo lỗi (ReportQuestionModal) trong giao diện.
- Cần kiểm tra ở giai đoạn code: báo lỗi đã được lưu bền (đồng bộ) chưa, Owner có màn hình danh sách xử lý theo mục 3 chưa; nếu chưa có thì bổ sung ở mức tối thiểu đúng thiết kế này.

## 6. Tiêu chí nghiệm thu Task 0.6
- [x] Chốt ai được báo lỗi, báo tại đâu, gồm những thông tin gì.
- [x] Quy trình 3 bước: báo → Owner xử lý → người báo thấy trạng thái.
- [x] Nguyên tắc không lộ đáp án và chống báo trùng.

**Kết luận:** Thiết kế báo lỗi hoàn thành. Sang Task 0.7.
