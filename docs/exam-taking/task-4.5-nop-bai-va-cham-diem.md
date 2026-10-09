# Task 4.5 — Nộp bài và chấm điểm

**Giai đoạn:** 4 — Làm bài thi và trả kết quả | **Liên quan:** Task 2.3, Task 3.4, Task 4.8

## Luồng nộp bài

1. Người học bấm Nộp bài và xác nhận, hoặc hệ thống tự nộp khi hết giờ.
2. Client gửi đáp án lên `submit_exam()`. Server kiểm tra tài khoản, ghi bài nộp trước, rồi mới trả đáp án chuẩn và đường lời giải.
3. Client chấm tại máy bằng đáp án vừa nhận, tạo lượt làm bài, cập nhật điểm cao nhất (trừ lượt kiểm thử) và ghi lịch sử/Sổ lỗi/FSRS (trừ lượt kiểm thử).

## Điểm đã siết trong task này

- Việc chấm ở mọi đường nộp (nộp tay, tự nộp hết giờ trong bài, tự nộp khi đã thoát) nay đều tôn trọng số câu bắt đầu của đề, tránh chấm lệch khoảng câu ở đề gộp.
- Nút nộp có khóa chống nộp trùng trong lúc đang gửi; nếu mất mạng, giao diện báo rõ và giữ bài trên màn hình để thử lại.

## Giới hạn đã biết

- Bài nộp cloud hiện lưu đáp án người học và phiên bản đề (Task 4.8); ảnh chụp kết quả chấm chi tiết sống trong lịch sử tại máy/user_data. Nếu Owner sửa đáp án về sau, việc chấm lại có chủ đích vẫn thực hiện theo cơ chế sửa đáp án hiện tại.
