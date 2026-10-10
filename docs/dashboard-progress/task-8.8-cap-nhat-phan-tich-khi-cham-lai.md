# Task 8.8 — Cập nhật lại phân tích khi kết quả được chấm điểm lại

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 8 — Dashboard và tiến độ học tập  
**Liên quan:** Task 6.4 (Owner quyết định chấm lại), Task 8.1 (lịch sử điểm theo thời gian)

## 1. Hiện trạng đã kiểm tra

- Từ Giai đoạn 6, khi Owner quyết định chấm lại, các lượt bị ảnh hưởng được dựng lại kết quả và Sổ lỗi tương ứng, rồi Dashboard được báo làm mới. Chuỗi này đã nối đúng.
- Một lỗi thứ tự thật: kết quả được thay thế luôn được đặt lên đầu danh sách lịch sử bất kể ngày nộp. Nếu lượt bị chấm lại là lượt cũ, Dashboard có thể lấy điểm của lượt cũ đó làm "điểm gần nhất", sai với Task 8.1. Ngoài ra, lịch sử không hề ghi dấu bài nào đã từng được chấm lại.

## 2. Đã làm

- Khi thay thế một kết quả sau chấm lại, toàn bộ lịch sử được sắp lại theo ngày nộp thật (mới nhất trước) trước khi lưu; các đường phân tích vốn đã sắp theo ngày (Task 8.1) nay có thêm chốt chặn này ở ngay nơi ghi dữ liệu.
- Bản ghi của lượt được chấm lại mang theo dấu **đã chấm lại** và **điểm gốc trước khi chấm lại** (lấy từ điểm gốc mà Giai đoạn 6 đã giữ trên lượt làm bài).
- Cửa sổ Lịch sử kiểm tra hiện nhãn "Đã chấm lại · điểm gốc X" cho các bài như vậy, để người học hiểu vì sao điểm của một bài cũ thay đổi.
- Sau mỗi lần chấm lại (tự áp dụng khi mở bài, phúc khảo "Tôi đúng", lưu đáp án đã sửa), Dashboard, Hồ sơ và Sổ lỗi đều được làm mới từ cùng một dữ liệu lịch sử đã sửa — đã rà soát cả ba đường này đều có gọi làm mới.

## 3. Kiểm tra

- `bun run build`: đạt. `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`.

## 4. Nghiệm thu trên web

- [ ] Sửa một đáp án và chọn chấm lại một lượt cũ: điểm của lượt đó đổi trong Lịch sử và có nhãn "Đã chấm lại", nhưng "Điểm gần nhất" trên thẻ điểm vẫn là bài mới nhất thật sự.
- [ ] Điểm cao nhất/trung bình trên Dashboard cập nhật theo kết quả đã chấm lại.

**Kết luận Task 8.8:** Chấm lại cập nhật toàn bộ phân tích một cách nhất quán và minh bạch, không làm xáo trộn thứ tự thời gian của lịch sử.
