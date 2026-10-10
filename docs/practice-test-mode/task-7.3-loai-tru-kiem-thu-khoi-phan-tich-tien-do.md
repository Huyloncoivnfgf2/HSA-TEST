# Task 7.3 — Loại trừ lượt kiểm thử khỏi phân tích tiến độ học tập

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 7 — Chế độ luyện tập và kiểm thử nội dung  
**Liên quan:** Task 7.2 (lưu chế độ cho từng lượt), Task 0.7 (điểm số và tiến độ), Task 7.4 (Owner xem lượt kiểm thử)

## 1. Rà soát các đường số liệu

Đã kiểm tra mọi nơi một lượt PDF có thể đi vào số liệu học tập:

- **Điểm cao nhất của đề:** các chỗ tính lại điểm cao nhất đều bỏ qua lượt kiểm thử.
- **Lịch sử, phân tích, chuỗi ngày học:** chỉ được ghi khi nộp lượt thật (cả khi nộp tay và khi tự nộp vì hết giờ sau khi đã thoát ra).
- **Sổ lỗi và ôn tập FSRS:** được ghi qua cùng đường lịch sử nên cũng bỏ qua lượt kiểm thử; phúc khảo "Tôi đúng" và đổi nhãn chương trên một lượt kiểm thử cũng không ghi lại lịch sử.
- **Màn hình "Xem lại":** trước Task 7.3 luôn mở lượt gần nhất bất kể chế độ, nên một lượt kiểm thử mới làm có thể chen vào chỗ của lượt thật gần nhất.

## 2. Đã làm

- Thống nhất mọi chốt chặn phân tích dùng chung một hàm nhận biết lượt kiểm thử (đọc được cả lượt cũ chỉ có cờ, lẫn lượt mới có `attemptKind`), thay cho việc mỗi nơi tự đọc cờ riêng lẻ.
- "Xem lại" từ thư viện nay mặc định mở **lượt luyện tập thật gần nhất**; lượt kiểm thử được Owner mở riêng theo Task 7.4.
- Ở phía máy chủ, từ Task 7.2 bài nộp đã có dấu kiểm thử và chỉ Owner mới được ghi dấu này, nên các thống kê/rút đề sau này dựa vào bài nộp cloud cũng loại trừ được lượt kiểm thử.

## 3. Kiểm tra

- `bun run build`: đạt. `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`.

## 4. Nghiệm thu trên web

- [ ] Owner làm một lượt Kiểm thử nội dung rồi kiểm tra: điểm cao nhất, lịch sử, Sổ lỗi, chuỗi ngày học không thay đổi vì lượt này.
- [ ] Sau đó làm một lượt Luyện tập thật và xác nhận các số liệu trên thay đổi như bình thường.
- [ ] Bấm "Xem lại" mở đúng lượt thật gần nhất, không mở lượt kiểm thử vừa làm.

**Kết luận Task 7.3:** Lượt kiểm thử không còn đường nào đi vào phân tích tiến độ, kể cả đường "Xem lại" và dữ liệu bài nộp phía máy chủ.
