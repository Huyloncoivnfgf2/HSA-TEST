# Task 4.4 — Quản lý đồng hồ và trạng thái làm bài

**Giai đoạn:** 4 — Làm bài thi và trả kết quả | **Liên quan:** Task 4.1, Task 4.5

## Quy tắc thời gian

- Chế độ Kiểm tra lấy thời lượng theo phần từ cấu hình HSA: Định lượng 75 phút, Định tính 60 phút, Khoa học 60 phút. Mốc kết thúc được lưu trong phiên ngay khi bắt đầu, nên tải lại trang không làm đồng hồ chạy lại từ đầu.
- Chế độ Ôn tập và Xem lại không có mốc kết thúc.
- Đồng hồ hiển thị thời gian còn lại và chuyển cảnh báo khi còn dưới một phút.

## Hết giờ và trạng thái

- Đang ở trong bài: hệ thống tự nộp khi hết giờ.
- Đã thoát ra ngoài khi phiên hết giờ: lớp kiểm tra nền của App tự nộp phiên đã quá hạn thay vì để bài treo vô thời hạn.
- Sau khi nộp, phiên chuyển sang trạng thái đã nộp, phiếu đáp án khóa sửa (trừ các thao tác xem lại/ghi nhãn/appeal theo quy định) và nút nộp biến mất.

## Còn nợ nghiệm thu

- Bắt đầu một bài Kiểm tra ngắn bằng cách kiểm tra thực tế trên web sau deploy: để hết giờ và chắc chắn bài tự nộp một lần, không nộp trùng.
