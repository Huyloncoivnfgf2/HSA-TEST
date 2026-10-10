# Task 9.1 — Kiểm thử các luồng của Learner

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 9 — Kiểm thử và mở rộng  
**Liên quan:** Giai đoạn 2 (phân quyền), 4 (làm bài), 5 (báo lỗi), 6 (thông báo), 7 (chỉ lượt thật vào phân tích), 8 (Dashboard)

## 1. Đã kiểm thử tự động (đạt)

Chạy bằng `bun run test` trong repo, các kiểm tra liên quan trực tiếp luồng Learner đều đạt:

- Chấm điểm: đáp án trắc nghiệm/điền được chuẩn hóa (chữ hoa, dấu phẩy thập phân, số tương đương) và chấm đúng khoảng câu của đề gộp bắt đầu từ câu 101.
- Lượt cũ không gắn cờ được hiểu là Luyện tập thật; chỉ lượt học thật mới vào lịch sử/phân tích (chốt chặn của Giai đoạn 7).
- Tổng hợp Dashboard: điểm gần nhất theo đúng ngày nộp, tỉ lệ đúng tính từ dữ liệu thật, phần chưa có bài báo "chưa có dữ liệu" thay vì số 0 giả.

## 2. Checklist kiểm thử trên web bằng tài khoản Learner thật (chưa thực hiện — cần tài khoản thật)

- [ ] Đăng nhập bằng email đã duyệt: vào được web; thư viện chỉ hiện đề **Đã duyệt**.
- [ ] Mở một đề → Làm bài: chỉ có **Luyện tập thật**, lựa chọn Kiểm thử nội dung bị khóa.
- [ ] Làm bài, thoát ra giữa chừng, vào lại: đáp án đã nhập vẫn còn (tự lưu).
- [ ] Nộp bài: thấy điểm, số đúng/sai, lời giải mở được **sau khi nộp** (trước khi nộp không mở được).
- [ ] Kiểm tra trang chủ/Hồ sơ: lịch sử, điểm và Sổ lỗi có thêm đúng lượt vừa làm.
- [ ] Báo lỗi một câu trong bài: gửi được; mở Hồ sơ thấy báo của mình.
- [ ] Khi Owner đã phản hồi báo lỗi: trang chủ hiện thông báo riêng, bấm OK thì không hiện lại (chi tiết ở Task 9.5).

## 3. Kết luận tạm thời

Phần logic cốt lõi của luồng Learner đã có kiểm thử tự động đạt. Các bước trên web vẫn cần thực hiện bằng tài khoản Learner thật sau khi Render cập nhật; kết quả đạt/không đạt ghi lại tại checklist này.
