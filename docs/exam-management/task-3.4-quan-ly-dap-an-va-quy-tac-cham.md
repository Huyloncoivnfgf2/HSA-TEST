# Task 3.4 — Quản lý đáp án và quy tắc chấm điểm

**Giai đoạn:** 3 — Quản lý đề thi | **Liên quan:** Task 0.4, Task 2.3, Task 3.3

## Quy tắc đang áp dụng

- Đáp án chuẩn lưu tách khỏi đề trong `exam_keys`, Learner không đọc trực tiếp được; chỉ nhận đáp án sau khi nộp qua `submit_exam()`.
- Nhập đáp án dạng chuỗi (`1.A 2.C 3.12,5`) hoặc nhập từng câu. Hệ thống chuẩn hóa chữ hoa, dấu phẩy thập phân và khoảng trắng; số được so bằng giá trị số nên `12,5` và `12.5` là một.
- Câu có đáp án biến thể được chấp nhận vẫn tính đúng theo danh sách biến thể đã lưu; Owner chấm lại/ghi đè đúng vẫn được tôn trọng.
- Câu chưa có đáp án chuẩn thì chưa tính vào điểm tối đa có thể chấm và được báo trong kiểm tra sẵn sàng.

## Đã sửa cho đề gộp

- Việc phân tích đáp án, đếm câu có đáp án và chấm điểm nay tôn trọng **số câu bắt đầu** của phần. Đề bắt đầu từ câu 101 sẽ chấm đúng khoảng 101–150 thay vì tìm đáp án 1–50.
- Khi Owner sửa đáp án sau khi nộp, việc chấm lại dùng cùng khoảng câu này và vẫn bỏ qua lượt kiểm thử nội dung khi ghi lại lịch sử.

## Còn nợ nghiệm thu

- Dùng một đề bắt đầu khác câu 1, nhập đáp án, nộp thử và kiểm tra điểm/lưới đúng sai trước khi coi quy tắc này là đã kiểm chứng trên web thật.
