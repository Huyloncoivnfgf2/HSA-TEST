# Task 4.3 — Lưu câu trả lời theo từng câu

**Giai đoạn:** 4 — Làm bài thi và trả kết quả

## Cơ chế đã có và giữ nguyên

- Mỗi thay đổi đáp án, chế độ trả lời, cờ câu hỏi, nhãn chương hoặc trang gắn với câu đều cập nhật vào phiên làm bài.
- Phiên được ghi ngay vào bộ nhớ trình duyệt tại máy, sau đó ghi bền vào IndexedDB sau khoảng 200 ms. Thoát ra giữa chừng hoặc tải lại trang sẽ khôi phục đúng phiên chưa nộp.
- Đáp án được lưu theo **số câu thật** của đề, nên đề bắt đầu từ câu 101 không bị lưu lệch về 1.

## Ranh giới trung thực

- Lưu tại máy là lớp chính cho phiên đang làm; bài chỉ lên cloud khi nộp. Nếu người học đổi thiết bị giữa chừng, phiên chưa nộp không đi theo — đây là giới hạn đã biết của mô hình local-first, không phải lỗi mất đáp án trên cùng thiết bị.
- Khi bộ nhớ trình duyệt đầy hoặc bị chặn, giao diện báo lỗi lưu thay vì im lặng mất bài.
