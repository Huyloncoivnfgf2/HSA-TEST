# Task 9.4 — Kiểm thử phiên bản đề và chấm điểm lại

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 9 — Kiểm thử và mở rộng  
**Liên quan:** Task 6.1–6.4 (phiên bản, chấm lại), Task 7.5 (không chấm lại lượt kiểm thử), Task 8.8 (phân tích sau chấm lại)

## 1. Đã kiểm thử tự động (đạt)

- Điểm của một lượt cũ luôn tính theo **ảnh chụp đáp án của chính lượt đó**: sau khi Owner đổi đáp án của đề, lượt cũ vẫn giữ điểm theo ảnh chụp cho tới khi có quyết định chấm lại chính thức.
- Thay thế kết quả của lượt cũ sau chấm lại **không** biến lượt cũ thành "bài gần nhất"; thứ tự lịch sử vẫn theo ngày nộp thật, nên Dashboard không lấy nhầm điểm.
- Sửa đáp án mà giữ nguyên nội dung thì không tăng phiên bản (logic đã có từ Task 6.1, được khóa bằng kiểm tra ở tầng đọc đáp án).

## 2. Checklist trên web (chưa thực hiện, cần Owner + 1 Learner)

- [ ] Learner nộp một bài; Owner sửa 1 đáp án và chọn **Chỉ áp dụng lượt mới**: điểm lượt cũ của Learner không đổi, đề tăng 1 phiên bản.
- [ ] Làm lại tình huống trên và chọn **Chấm lại lượt đã nộp**: điểm của Learner cập nhật theo đáp án mới; Lịch sử hiện nhãn "Đã chấm lại · điểm gốc X".
- [ ] Owner có một lượt **Kiểm thử nội dung** đã nộp: sau khi sửa đáp án và chấm lại, điểm và ghi chú đánh giá của lượt kiểm thử không thay đổi (Task 7.5).
- [ ] Điểm cao nhất và trung bình trên Dashboard cập nhật theo kết quả đã chấm lại, nhưng "Điểm gần nhất" vẫn là bài mới nhất theo ngày nộp.

## 3. Kết luận tạm thời

Quy tắc phiên bản và chấm lại đã được khóa bằng kiểm thử tự động ở các điểm dễ sai nhất (ảnh chụp đáp án, thứ tự lịch sử); vòng kiểm thử hai tài khoản trên web vẫn còn chờ thực hiện.
