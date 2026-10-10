# Task 8.7 — Cảnh báo nguy cơ không đạt mục tiêu và đề xuất kế hoạch cải thiện

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 8 — Dashboard và tiến độ học tập  
**Liên quan:** Task 8.4 (độ tin cậy), Task 8.5 (hoạt động tiếp theo), Task 8.6 (quản lý mục tiêu)

## 1. Hiện trạng đã kiểm tra

- Thẻ điểm đã hiện điểm gần nhất cạnh mục tiêu và màn hình phân tích từng phần có ước tính khoảng cách mục tiêu, nhưng trang chủ không có cảnh báo tổng hợp nào cho biết phần nào đang có nguy cơ không đạt mục tiêu, thiếu bao nhiêu điểm và còn bao nhiêu ngày.

## 2. Đã làm

- Mỗi phần có một **đánh giá nguy cơ** so mục tiêu với điểm tham chiếu gần nhất (trung bình 5 bài gần nhất, chưa có thì lấy bài mới nhất):
  - Đã đạt: không hiện cảnh báo.
  - Thiếu ≤3 điểm: nguy cơ thấp; thiếu ≤8 điểm: trung bình; thiếu nhiều hơn: cao.
  - Nếu còn ≤14 ngày tới ngày thi mà đang ở mức trung bình thì nâng lên cao.
  - Chưa có bài nào: ghi rõ "Chưa có điểm để đánh giá" thay vì im lặng.
- Trang chủ có mục **"Cảnh báo mục tiêu & kế hoạch cải thiện"** cho các phần chưa đạt: hiện mục tiêu, điểm hiện tại, số điểm còn thiếu, số ngày còn lại và một kế hoạch cải thiện cụ thể — ưu tiên chuyên đề yếu nhất có đủ dữ liệu (theo Task 8.2), giữ nhịp số câu/ngày theo mục tiêu (Task 8.6) và làm thêm bài Kiểm tra để đo lại.
- Nếu ngày thi đã qua, kế hoạch nhắc cập nhật ngày thi trong Thiết lập mục tiêu.

## 3. Kiểm tra

- `bun run build`: đạt. `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`.

## 4. Nghiệm thu trên web

- [ ] Đặt mục tiêu cao hơn điểm hiện tại ở một phần: trang chủ hiện thẻ cảnh báo của phần đó với số điểm còn thiếu.
- [ ] Đặt mục tiêu bằng hoặc thấp hơn điểm hiện tại: thẻ cảnh báo của phần đó biến mất.

**Kết luận Task 8.7:** Nguy cơ không đạt mục tiêu được cảnh báo sớm trên Dashboard, kèm kế hoạch cải thiện bám vào dữ liệu thật của từng phần.
