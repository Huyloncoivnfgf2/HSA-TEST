# Task 8.6 — Quản lý mục tiêu điểm số

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 8 — Dashboard và tiến độ học tập  
**Liên quan:** Task 8.1 (thẻ điểm hiện mục tiêu), Task 8.7 (cảnh báo không đạt mục tiêu)

## 1. Hiện trạng đã kiểm tra

- Đã có màn hình Thiết lập mục tiêu: ngày thi + đếm ngược, mục tiêu 3 phần, tổng mục tiêu tự cộng, mục tiêu số câu/ngày, điểm tối đa mỗi phần; mục tiêu được lưu bền và dùng ở thẻ điểm, Hồ sơ và phân tích.
- Ba điểm yếu: form chỉ khởi tạo từ mục tiêu tại lần mở đầu tiên nên có thể hiện số cũ sau khi mục tiêu đã đổi; khi lưu, một số ô (mục tiêu ngày, điểm tối đa) chưa được kẹp trong khoảng hợp lệ; và không có cách quay về bộ mục tiêu mặc định.

## 2. Đã làm

- Mỗi lần mở màn hình, form nạp lại đúng mục tiêu đang lưu.
- Khi lưu, mọi giá trị được kẹp về khoảng an toàn (điểm từng phần 0–điểm tối đa; điểm tối đa 10–100; mục tiêu ngày 1–200 câu); tổng mục tiêu luôn bằng tổng 3 phần, không thể lưu một số tổng mâu thuẫn.
- Thêm nút **Khôi phục mặc định** đưa cả bộ mục tiêu về giá trị mặc định của hệ thống (chưa lưu cho tới khi bấm Lưu).
- Nếu ngày thi đã qua, màn hình cảnh báo rõ để cập nhật, vì đếm ngược và cảnh báo ở Task 8.7 phụ thuộc ngày này.

## 3. Kiểm tra

- `bun run build`: đạt. `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`.

## 4. Nghiệm thu trên web

- [ ] Đổi mục tiêu một phần, lưu, mở lại: thấy đúng số vừa lưu và tổng tự cộng khớp.
- [ ] Bấm Khôi phục mặc định rồi Đóng (không lưu): mục tiêu đang dùng không đổi.

**Kết luận Task 8.6:** Mục tiêu điểm số quản lý được an toàn, nhất quán và luôn là căn cứ mới nhất cho Dashboard.
