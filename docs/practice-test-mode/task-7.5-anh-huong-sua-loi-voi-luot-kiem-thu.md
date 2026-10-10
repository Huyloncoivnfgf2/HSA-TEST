# Task 7.5 — Xử lý ảnh hưởng của việc sửa lỗi đối với các lượt kiểm thử

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 7 — Chế độ luyện tập và kiểm thử nội dung  
**Liên quan:** Task 6.3/6.4 (đánh giá ảnh hưởng và quyết định chấm lại), Task 7.2/7.4 (dấu kiểm thử và đánh giá của Owner)

## 1. Vấn đề

Từ Giai đoạn 6, khi Owner sửa đáp án và chọn chấm lại, các lượt đã nộp được tính lại điểm bằng đáp án đã sửa. Nếu áp dụng nguyên xi cho lượt kiểm thử nội dung, kết quả mà Owner đã thấy khi kiểm tra đề sẽ bị viết lại về sau, làm mất bằng chứng "lúc kiểm thử đề cho ra kết quả gì", đồng thời dễ gây nhầm là lượt kiểm thử cũng thuộc diện bị ảnh hưởng học tập.

## 2. Quy tắc đã chốt và đã làm

- **Lượt kiểm thử không bao giờ bị chấm lại khi sửa lỗi**, kể cả khi Owner chọn "Chấm lại lượt đã nộp". Lượt kiểm thử giữ nguyên ảnh chụp đáp án, điểm và đánh giá tại thời điểm kiểm thử.
- Quy tắc này áp dụng ở cả hai đường chấm lại: khi Owner lưu đáp án đã sửa trong màn hình làm bài, và khi mở lại bài và hệ thống áp dụng các bản sửa đã quyết định chấm lại.
- Lời xác nhận trước khi lưu nói rõ: chấm lại chỉ áp cho lượt học thật; lượt kiểm thử giữ nguyên kết quả lúc kiểm thử.
- Ở phía máy chủ, số liệu **ảnh hưởng ước tính** khi sửa đáp án chỉ đếm lượt học thật (tổng bài, số người học, số bài có thể đổi kết quả). Số lượt kiểm thử của đề được báo riêng trong chi tiết ảnh hưởng, và hàng đợi sửa lỗi của Owner hiện rõ "các lượt đó giữ nguyên kết quả lúc kiểm thử, không bị chấm lại".
- Muốn kiểm tra lại nội dung sau khi sửa, Owner làm một **lượt kiểm thử mới** theo Task 7.1/7.4 thay vì viết lại lượt cũ.

## 3. Kiểm tra

- `bun run build`: đạt. `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`.
- Số liệu ảnh hưởng mới cần bản schema Giai đoạn 7 đã chạy trên Supabase (cột dấu kiểm thử ở Task 7.2); trước đó hàm ước tính cũ vẫn chạy và không có số lượt kiểm thử riêng.

## 4. Nghiệm thu trên web

- [ ] Owner làm một lượt kiểm thử, ghi lại điểm; sau đó sửa một đáp án và chọn chấm lại: điểm/đáp án của lượt kiểm thử không đổi, điểm của lượt học thật (nếu có) được tính lại và giữ điểm gốc để đối chiếu.
- [ ] Trong hàng đợi sửa lỗi, bản sửa cho thấy số lượt kiểm thử được đếm riêng và ghi rõ không bị chấm lại.

**Kết luận Task 7.5:** Sửa lỗi chỉ tác động lên lượt học thật và các lượt mới; lượt kiểm thử là bằng chứng kiểm tra tại thời điểm đó và được giữ nguyên.
