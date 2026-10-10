# Task 8.3 — Phân tích thời gian làm bài và độ chính xác

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 8 — Dashboard và tiến độ học tập  
**Liên quan:** Task 8.1 (lịch sử điểm), Task 8.2 (độ phủ phân loại)

## 1. Hiện trạng đã kiểm tra, có 2 lỗi thật

- **Tỉ lệ đúng luôn bằng 0:** phần tổng hợp phân tích khởi tạo tỉ lệ đúng của từng phần là 0 rồi không bao giờ tính lại, nên thẻ trang chủ và Hồ sơ người học luôn hiện 0% dù đã làm nhiều bài.
- **Thời gian từng câu bị bịa:** thống kê chuyên đề cộng mặc định 60 giây cho mọi câu không có dữ liệu giờ. Bài PDF không ghi giờ từng câu, nên cột "thời gian trung bình" trước đây là số giả.

## 2. Đã làm

- Tỉ lệ đúng của từng phần được tính thật từ toàn bộ câu đã ghi nhận (chỉ gồm lượt học thật, đúng ranh giới của Task 7.3); Hồ sơ người học dùng chung số này nên cũng hết lỗi 0%.
- Thời gian theo chuyên đề chỉ tính từ câu thật sự có dữ liệu giờ; không có thì hiện "— / chưa có dữ liệu giờ từng câu" thay cho số giả.
- Mỗi phần có thêm thống kê thời gian: số bài, tổng thời gian, thời gian trung bình mỗi bài và giây/câu (ước tính từ tổng thời gian bài). Thi toàn bộ 3 phần được chia thời gian theo tỉ lệ số câu của từng phần, không nhân ba lần. Thẻ điểm trang chủ hiện "Thời gian TB mỗi bài".

## 3. Kiểm tra

- `bun run build`: đạt. `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`.

## 4. Nghiệm thu trên web

- [ ] Hồ sơ người học và thẻ điểm không còn hiện tỉ lệ đúng 0% khi đã có bài ghi nhận.
- [ ] Mở phân tích một phần: cột thời gian của chuyên đề từ bài PDF hiện "—" thay vì 60s/câu giả.

**Kết luận Task 8.3:** Độ chính xác và thời gian trên Dashboard đều là số thật từ dữ liệu đã ghi nhận; chỗ nào chưa có dữ liệu thì nói rõ là chưa có.
