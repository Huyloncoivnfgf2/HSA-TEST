# Task 8.2 — Phân tích theo chủ đề nếu có dữ liệu phân loại

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 8 — Dashboard và tiến độ học tập  
**Liên quan:** Task 8.1 (lịch sử điểm), Task 0.7 (điểm số và tiến độ)

## 1. Hiện trạng đã kiểm tra

- Màn hình phân tích theo phần đã có bảng chuyên đề, danh sách chuyên đề yếu và bộ lọc phân môn cho Khoa học, tính từ nhãn chuyên đề/chương trong từng câu đã ghi nhận.
- Hai lỗ hổng trung thực dữ liệu: (1) nhóm mặc định "Tổng hợp" (câu chưa gắn nhãn) có thể lọt vào danh sách "chuyên đề yếu" như thể là một chuyên đề thật; (2) giao diện không cho biết bao nhiêu câu thật sự có nhãn, nên dễ kết luận mạnh từ dữ liệu gần như không có nhãn. Bài PDF phần Khoa học hiện cũng chưa mang nhãn phân môn theo câu (việc phân bổ môn theo khoảng câu đã ghi là còn thiếu từ Giai đoạn 0).

## 2. Đã làm

- "Tổng hợp" không còn được coi là chuyên đề yếu; danh sách cần khắc phục chỉ gồm chuyên đề có nhãn thật, đủ tối thiểu 5 câu và tỉ lệ đúng dưới 75%.
- Màn hình phân tích hiện **độ phủ phân loại**: số câu có nhãn / tổng số câu đã ghi nhận và số chuyên đề có nhãn. Khi độ phủ chưa đủ, giao diện nói rõ phân tích chuyên đề chỉ để tham khảo và hướng dẫn gắn nhãn khi xem lại bài.
- Phần Khoa học: khi dữ liệu chưa có nhãn phân môn, giao diện ghi rõ bộ lọc phân môn chưa áp dụng được thay vì để người dùng tưởng không có dữ liệu.

## 3. Kiểm tra

- `bun run build`: đạt. `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`.

## 4. Nghiệm thu trên web

- [ ] Mở phân tích một phần đã có bài: thấy dòng độ phủ phân loại đúng với tình trạng nhãn của mình.
- [ ] Danh sách "Chuyên đề cần khắc phục" không còn hiện mục "Tổng hợp".

**Kết luận Task 8.2:** Phân tích theo chủ đề chỉ kết luận khi có dữ liệu phân loại thật, và mức độ phủ được hiển thị minh bạch.
