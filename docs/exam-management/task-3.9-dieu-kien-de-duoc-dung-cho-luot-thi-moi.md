# Task 3.9 — Xác định điều kiện để đề được sử dụng cho lượt thi mới

**Giai đoạn:** 3 — Quản lý đề thi | **Liên quan:** Task 3.1, Task 3.4, Task 3.6, Task 3.7

## Điều kiện bắt buộc

Một đề chỉ mở lượt Kiểm tra/Ôn tập mới khi đồng thời:

- Có file PDF đọc được.
- Số câu hợp lệ và khoảng trang (nếu là đề gộp) không bị sai thứ tự.
- Số câu bắt đầu hợp lệ.
- Đáp án chuẩn đã đủ cho toàn bộ khoảng câu của phần.
- Trạng thái là **Đã duyệt**.

Thiếu lời giải không chặn lượt thi; nó chỉ là cảnh báo vì người học vẫn làm bài/chấm được, chỉ không xem được lời giải sau khi nộp.

## Đã làm

- Hộp chọn chế độ làm bài hiển thị rõ danh sách lý do chưa đủ điều kiện và vô hiệu hóa nút bắt đầu đối với lượt học thật.
- Owner vẫn bật được **Kiểm thử nội dung** để kiểm tra đề chưa duyệt/chưa đủ đáp án.
- Learner không thấy đề chưa duyệt, nên không chạm được vào cổng này từ thư viện.

## Còn nợ nghiệm thu cuối Giai đoạn 3

- Đề thiếu đáp án: nút làm bài thật bị chặn và hiện đúng lý do.
- Đề đủ đáp án nhưng chưa duyệt: Learner không thấy; Owner kiểm thử được.
- Đề đã duyệt và đủ đáp án: Learner mở và nộp được bình thường.
