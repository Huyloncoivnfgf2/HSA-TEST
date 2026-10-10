# Task 8.1 — Hiển thị lịch sử điểm số và xu hướng kết quả

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 8 — Dashboard và tiến độ học tập  
**Liên quan:** Task 0.7 (điểm số và tiến độ), Task 7.3 (chỉ lượt thật vào phân tích), Task 8.8 (cập nhật khi chấm lại)

## 1. Hiện trạng đã kiểm tra

- Trang chủ đã có 3 thẻ điểm (gần nhất, trung bình 5 bài, xu hướng, đường xu hướng nhỏ), và Lịch sử kiểm tra liệt kê các bài đã ghi nhận.
- Hai điểm chưa chắc: xu hướng chỉ so bài mới nhất với bài ngay trước nên một bài lệch là đổi hướng; và thứ tự lịch sử có thể bị xáo trộn khi một kết quả cũ được chấm lại (xử lý gốc ở Task 8.8), khiến "điểm gần nhất" có nguy cơ lấy nhầm bài cũ.

## 2. Đã làm

- Lịch sử điểm theo từng phần giờ được sắp theo ngày nộp thật trước khi tính điểm gần nhất, trung bình 5 bài và xu hướng.
- Xu hướng khi có từ 4 bài trở lên so trung bình 3 bài mới nhất với nhóm bài trước đó; ít bài hơn thì vẫn so bài mới nhất với bài trước như cũ.
- Mỗi thẻ điểm hiện thêm 3 lần gần nhất kèm ngày và điểm, để người học đối chiếu đường xu hướng với số thật.
- Cửa sổ Lịch sử kiểm tra tự sắp mới nhất lên đầu, kể cả khi dữ liệu cũ bị xáo thứ tự do chấm lại.

## 3. Kiểm tra

- `bun run build`: đạt. `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`.

## 4. Nghiệm thu trên web

- [ ] Làm/nộp thêm bài ở một phần: thẻ điểm của phần đó hiện đúng điểm và ngày của lần mới nhất.
- [ ] Mở Lịch sử kiểm tra: bài mới nhất nằm trên cùng.

**Kết luận Task 8.1:** Lịch sử điểm và xu hướng lấy từ lượt học thật, sắp đúng theo thời gian và ít bị nhiễu bởi một bài đơn lẻ.
