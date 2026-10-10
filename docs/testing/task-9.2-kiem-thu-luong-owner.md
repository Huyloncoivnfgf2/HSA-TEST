# Task 9.2 — Kiểm thử các luồng của Owner

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 9 — Kiểm thử và mở rộng  
**Liên quan:** Giai đoạn 3 (quản lý đề), 5 (hàng đợi báo lỗi), 6 (sửa lỗi), 7 (kiểm thử nội dung)

## 1. Đã kiểm thử tự động (đạt)

- Cổng dùng đề cho lượt mới: đề **nháp** chưa đủ điều kiện, đề đã duyệt nhưng thiếu đáp án chuẩn chưa sẵn sàng, đề đã duyệt đủ đáp án thì sẵn sàng.
- Đọc chuỗi đáp án: báo đúng các câu trùng, câu ngoài khoảng của đề gộp và câu còn thiếu trước khi lưu.
- Chế độ Kiểm thử nội dung được nhận biết đúng từ cả lượt cũ (chỉ có cờ) và lượt mới (có `attemptKind`), làm căn cứ cho việc không tính vào tiến độ.

## 2. Checklist kiểm thử trên web bằng tài khoản Owner thật (chưa thực hiện)

- [ ] Thêm một đề PDF mới (tên file có tiếng Việt): đẩy lên cloud không còn lỗi "Invalid key".
- [ ] Nhập đáp án, sửa một đáp án: phiên bản đề tăng đúng 1, lưu lại đáp án như cũ thì không tăng.
- [ ] Chuyển trạng thái Nháp → Đã duyệt: Learner bắt đầu thấy đề; chuyển về Nháp/Lưu trữ thì Learner không thấy nữa.
- [ ] Bắt đầu đề ở chế độ **Kiểm thử nội dung**, nộp, đánh giá "Nội dung đạt/Cần sửa": điểm cao nhất, lịch sử và Sổ lỗi không đổi (chi tiết Task 7.3/7.4).
- [ ] Mở hàng đợi **Báo lỗi**: thấy báo của Learner, đổi trạng thái và viết phản hồi được.
- [ ] Mở màn hình **Người dùng**: thêm/xóa email được duyệt có hiệu lực sau khi tải lại trang.
- [ ] Sửa một đáp án và thử cả hai lựa chọn "Chỉ áp dụng lượt mới" và "Chấm lại lượt đã nộp" (chi tiết Task 9.4).

## 3. Kết luận tạm thời

Logic gác cổng đề và nhận biết chế độ đã có kiểm thử tự động đạt. Các thao tác Owner trên web thật vẫn cần đi qua checklist trên; đây cũng là vòng nghiệm thu cuối của các Giai đoạn 3, 5, 6, 7.
