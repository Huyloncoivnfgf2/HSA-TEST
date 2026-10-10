# Task 6.3 — Đánh giá các lượt làm bài bị ảnh hưởng

**Giai đoạn:** 6 — Sửa lỗi và thông báo | **Liên quan:** Task 6.1, Task 6.4

## Đã làm

- Khi Owner lưu một đáp án đã sửa, web gọi hàm đánh giá ảnh hưởng trước khi ghi đáp án mới.
- Hàm này chỉ Owner gọi được và chỉ trả số liệu gộp, không trả câu trả lời của từng người học:
  - tổng số bài đã nộp trên cloud cho đề;
  - số người học có bài nộp;
  - số bài có thể đổi kết quả ở các câu đã sửa;
  - thời gian bài nộp sớm nhất và mới nhất.
- Kết quả được lưu vào bản sửa lỗi và hiển thị trong mục **Sửa lỗi và quyết định chấm lại** ở hàng đợi Báo lỗi của Owner.
- Cách so sánh đáp án dùng cùng quy tắc với web: không phân biệt hoa/thường, khoảng trắng, dấu phẩy thập phân và giá trị số tương đương.

## Giới hạn

- Số liệu cloud không gồm lượt kiểm thử nội dung chỉ nằm trên máy Owner và các lượt local chưa từng nộp lên cloud.
- Đáp án viết khác được chấp nhận (`acceptedAnswers`) hiện lưu tại máy, không nằm trên máy chủ, nên ước tính cloud dựa trên đáp án chuẩn chính.
- Đây là số liệu ước tính tại thời điểm sửa; quyết định có chấm lại hay không vẫn thuộc Owner ở Task 6.4.
