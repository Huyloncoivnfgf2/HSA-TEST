# Task 3.3 — Quản lý câu hỏi, dữ liệu chung và cụm câu hỏi

**Giai đoạn:** 3 — Quản lý đề thi | **Liên quan:** Task 3.1, Task 3.2

## Nguyên tắc đã chốt

Với thư viện đề PDF, **PDF là nguồn sự thật của câu hỏi**. Hệ thống không tách câu hỏi thành từng bản ghi riêng cho đề PDF, vì việc tách tự động trước đây gây lỗi và làm sai lệch bố cục, công thức, hình vẽ và cụm đọc hiểu.

- “Câu hỏi” trong một đề PDF được xác định bằng **khoảng số câu** của phần: số câu bắt đầu + số lượng câu.
- “Dữ liệu chung” và “cụm câu hỏi” (đoạn văn, bảng số liệu, hình dùng chung) nằm nguyên trong PDF và được giữ đúng thứ tự/trang nhờ khoảng trang ở Task 3.2.
- Ngân hàng câu hỏi lẻ cũ là tính năng di sản, không phải nguồn dữ liệu cho đề PDF và không được dùng để suy ra cấu trúc của đề PDF.

## Đã làm

- Bổ sung hàm dùng chung để sinh danh sách số câu theo số bắt đầu, dùng thống nhất cho phiếu đáp án, nhập đáp án chuẩn và chấm điểm.
- Đề gộp có thể bắt đầu từ câu lớn hơn 1 (ví dụ phần Khoa học bắt đầu ở câu 101) mà không bị ép về 1–50.

## Giới hạn rõ ràng

- Hệ thống chưa có bản đồ “câu nào nằm ở trang nào” do người nhập khai báo; trang gắn với câu trong lịch sử hiện vẫn là trang người học đang xem khi thao tác. Nếu sau này cần phân tích theo cụm/trang chính xác hơn, phải thêm trường khai báo riêng, không suy đoán từ PDF.
