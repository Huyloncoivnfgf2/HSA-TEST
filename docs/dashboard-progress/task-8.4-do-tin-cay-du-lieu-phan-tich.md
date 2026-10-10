# Task 8.4 — Đánh giá độ tin cậy của dữ liệu phân tích

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 8 — Dashboard và tiến độ học tập  
**Liên quan:** Task 8.1–8.3 (điểm, chuyên đề, thời gian/độ chính xác)

## 1. Hiện trạng đã kiểm tra

- Dashboard hiện điểm gần nhất, trung bình 5 bài, xu hướng, tỉ lệ đúng và phân tích chuyên đề nhưng không hề nói các con số đó dựa trên bao nhiêu dữ liệu. Một bài duy nhất cũng được trình bày chắc chắn như năm mươi bài, dễ làm người học (và Owner khi xem hộ) tin quá mức vào kết luận.

## 2. Đã làm

- Mỗi phần (Định lượng/Định tính/Khoa học) có một **đánh giá độ tin cậy** tính từ dữ liệu học thật đã ghi nhận:
  - Chưa có bài: "Chưa có dữ liệu".
  - Dưới 2 bài hoặc dưới 30 câu: "Thấp".
  - Dưới 5 bài hoặc dưới 150 câu: "Trung bình".
  - Từ 5 bài và 150 câu trở lên: "Cao".
- Đánh giá kèm lý do cụ thể: số bài/số câu làm căn cứ, cảnh báo khi các bài dồn trong dưới 7 ngày (xu hướng chưa ổn định), và độ phủ nhãn chuyên đề thấp (nối tiếp Task 8.2).
- Thẻ điểm trang chủ hiện mức tin cậy kèm số bài/số câu; màn hình phân tích chi tiết hiện banner giải thích khi độ tin cậy chưa cao. Mức "Cao" không hiện banner để tránh nhiễu.

## 3. Kiểm tra

- `bun run build`: đạt. `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`.

## 4. Nghiệm thu trên web

- [ ] Phần mới làm 1 bài hiện độ tin cậy "Thấp"; phần chưa làm bài nào hiện "Chưa có dữ liệu".
- [ ] Mở phân tích chi tiết của phần ít dữ liệu thấy banner giải thích lý do.

**Kết luận Task 8.4:** Mọi con số trên Dashboard từ nay đi kèm mức độ đáng tin và căn cứ của nó.
