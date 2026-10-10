# Task 7.4 — Cho phép Owner xem và đánh giá các lượt kiểm thử

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 7 — Chế độ luyện tập và kiểm thử nội dung  
**Liên quan:** Task 7.3 (loại trừ khỏi phân tích), Task 7.5 (sửa lỗi và lượt kiểm thử)

## 1. Hiện trạng đã kiểm tra

- Trước Task 7.4, lượt kiểm thử của Owner chỉ phân biệt được qua cờ lưu trong lượt; thư viện không cho biết một đề đã có bao nhiêu lượt kiểm thử, đã đánh giá hay chưa, và "Xem lại" (từ Task 7.3) luôn mở lượt thật gần nhất nên không có đường mở lại đúng lượt kiểm thử.

## 2. Đã làm

- Trên thẻ đề trong thư viện, Owner thấy thêm dòng "Kiểm thử nội dung: N lượt · đã đánh giá X/N" khi đề đã có lượt kiểm thử.
- Nút **Lượt kiểm thử gần nhất** (chỉ Owner) mở thẳng lượt kiểm thử mới nhất của đề đó để xem lại đáp án, lời giải và điểm của riêng lượt đó.
- Khi đang xem một lượt kiểm thử đã nộp, Owner có khối **Đánh giá lượt kiểm thử nội dung**: ghi chú tùy chọn và chọn **Nội dung đạt** hoặc **Cần sửa nội dung**. Đánh giá được lưu ngay trên lượt kiểm thử đó (kèm thời gian), thư viện cập nhật tỉ lệ đã đánh giá tương ứng.
- Đánh giá không đi vào lịch sử, điểm cao nhất, Sổ lỗi hay FSRS, đúng với tính chất của lượt kiểm thử ở Task 7.3.
- Learner không thấy các thông tin/nút này; Owner cũng không xem được lượt kiểm thử của người khác vì mỗi tài khoản chỉ giữ dữ liệu lượt làm trên thiết bị/tài khoản của chính mình.

## 3. Kiểm tra

- `bun run build`: đạt. `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`.

## 4. Nghiệm thu trên web

- [ ] Owner làm một lượt Kiểm thử nội dung, quay lại thư viện: thấy số lượt kiểm thử tăng và tỉ lệ đã đánh giá là 0/1.
- [ ] Bấm "Lượt kiểm thử gần nhất": mở đúng lượt kiểm thử, không phải lượt thật.
- [ ] Chọn "Nội dung đạt" kèm ghi chú, quay lại thư viện: tỉ lệ đã đánh giá thành 1/1.
- [ ] Kiểm tra các số liệu học thật không đổi vì việc đánh giá này.

**Kết luận Task 7.4:** Owner có đường riêng để xem lại và kết luận từng lượt kiểm thử, tách hẳn khỏi luồng học thật.
