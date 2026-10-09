# Task 3.5 — Quản lý lời giải

**Giai đoạn:** 3 — Quản lý đề thi | **Liên quan:** Task 2.3, Task 3.2

## Hiện trạng đã kiểm tra

- Lời giải là tài liệu riêng (PDF hoặc ảnh), tải lên cùng lúc thêm đề hoặc giữ ở máy; trên cloud nó lưu cùng thư mục của đề bằng khóa ASCII cố định.
- Learner không mở được lời giải trước khi nộp: phía Supabase, file lời giải chỉ đọc được nếu tài khoản là Owner hoặc đã có bài nộp của chính người đó cho đề tương ứng.
- Sau khi nộp, người học mở lời giải từ kết quả bài làm; Owner xem được để kiểm tra nội dung.

## Nguyên tắc giữ nguyên

- Không trộn lời giải vào file đề và không hiển thị đường lời giải trong dữ liệu đề mà Learner tải trước khi nộp.
- Đổi tên/sửa metadata đề không được làm mất liên kết tới file lời giải; điểm này đã được giữ từ lần sửa lỗi Invalid key và tiếp tục áp dụng trong Giai đoạn 3.
- Thiếu lời giải chỉ là cảnh báo, không chặn làm bài; chặn hay không thuộc điều kiện ở Task 3.9 và hiện tại lời giải không phải điều kiện bắt buộc.

## Còn nợ nghiệm thu

- Bằng tài khoản Learner: chắc chắn không mở được lời giải trước khi nộp, mở được sau khi nộp; bằng Owner: mở được bất cứ lúc nào.
