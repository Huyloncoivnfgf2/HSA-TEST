# Task 0.4 — Thiết kế mô hình đề thi, câu hỏi, đáp án và lời giải

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 0 — Thiết kế sản phẩm
**Liên quan:** Task 0.1, 0.3 | Dữ liệu hiện có: bảng `exams`, `exam_keys`, `exam_submissions` (supabase/schema.sql)

## 1. Mục đích
Chốt một đề thi được lưu như thế nào (file, phần thi, đáp án, lời giải), để việc thêm đề, chấm bài và rút đề ngẫu nhiên không bị lệch nhau.

## 2. Nguyên tắc gốc
1. **PDF là nội dung đề.** Hệ thống không tách câu hỏi thành từng câu trong cơ sở dữ liệu; câu hỏi nằm trong file PDF nguyên bản.
2. Thứ "có cấu trúc" chỉ gồm: thông tin đề, **bảng đáp án đúng theo số câu**, và file lời giải (nếu có).
3. Đáp án đúng là dữ liệu nhạy cảm: lưu riêng, chỉ Owner ghi, Learner chỉ nhận sau khi nộp.

## 3. Mô hình một "đề" (Exam)

| Thuộc tính | Ý nghĩa | Ví dụ / quy tắc |
|---|---|---|
| Mã đề (id) | Định danh duy nhất, hệ thống tự tạo | Dùng để đặt tên file trên cloud dạng ASCII |
| Tên hiển thị (title) | Tên đẹp cho người học thấy | "Đề Toán số 3 — Nguồn XYZ" (giữ tiếng Việt ở đây) |
| Phần thi (section) | Thuộc 1 trong 3 phần | `dinh_luong` / `dinh_tinh` / `khoa_hoc` |
| Số câu | Mặc định 50/phần | Dùng để chấm và hiện phiếu đáp án |
| File đề (pdf_path) | Đường dẫn file PDF trên cloud | Tên file trên cloud phải là ASCII, dạng `{exam_id}/exam.pdf` (bài học lỗi "Invalid key": tên file gốc có dấu/khoảng trắng sẽ lỗi) |
| Tên file gốc | Tên file lúc Owner tải lên | Lưu riêng để Owner nhận ra, không dùng làm đường dẫn |
| File lời giải | PDF lời giải (nếu có) | Chỉ mở được sau khi nộp bài đó |
| Ngày tạo / sửa | Phục vụ sắp xếp và lịch sử (Task 0.5) | Tự ghi khi thêm/sửa |

### Đề PDF chứa cả 3 phần (trường hợp đặc biệt, đã chốt hướng)
- Chỉ tải **1 file PDF duy nhất**, không cắt file.
- Khi thêm đề, Owner nhập tay cho mỗi phần: trang bắt đầu – trang kết thúc; hệ thống hiện số trang + ảnh thu nhỏ các trang để Owner chọn đúng.
- Mỗi phần là **một bản ghi đề riêng**, cùng trỏ về 1 file, kèm: trang bắt đầu/kết thúc của phần và "số câu bắt đầu" (ví dụ phần Văn bắt đầu từ câu 51 trong đáp án gốc).
- Cần bổ sung vào bảng `exams`: `page_start`, `page_end`, `file_id`, `original_filename` và `start_question` (số câu bắt đầu của phần, mặc định 1) — cập nhật schema.sql trước khi mở web dùng tính năng này. Thống nhất `file_id` chính là định danh file trên cloud (cùng giá trị dùng cho `pdf_path`), không tạo hai đường dẫn khác nhau cho cùng một file.

## 4. Mô hình đáp án và chấm bài

- Đáp án một đề = danh sách theo số câu: `{"1":"A","2":"C","3":"12,5",...}` lưu ở bảng riêng `exam_keys`.
- Owner nhập đáp án bằng chuỗi nhanh dạng `1.A 2.C 3.12,5`; hệ thống phải chuẩn hóa (chấp nhận dấu phẩy thập phân kiểu Việt Nam) trước khi lưu.
- Câu trắc nghiệm: 1 đáp án đúng. Câu điền số: so sánh theo giá trị đã chuẩn hóa.
- Khi nộp, máy chủ (`submit_exam()`) **ghi nhận bài nộp trước**, rồi mới trả đáp án đúng + đường dẫn lời giải; điểm hiển thị tính từ đáp án vừa trả đó. Điểm mấu chốt bảo mật là: không có bài nộp thì không lấy được đáp án (đúng với schema hiện tại, đã kiểm tra).
- Đề **chưa có đáp án** thì: vẫn xem được ở chế độ luyện (nếu Owner cho phép), nhưng **không** được đưa vào rút đề Kiểm tra.

## 5. Mô hình bài nộp và lời giải
- Mỗi lần nộp lưu: người nộp, mã đề, đáp án người học đã điền, thời gian nộp. Không ghi đè lần nộp cũ.
- Lời giải (nếu có) là file PDF riêng gắn với đề; quyền mở theo Task 0.2 (sau khi nộp; Owner luôn mở được).
- Sổ lỗi và lịch ôn FSRS lấy dữ kiện từ bài nộp: câu nào sai, thuộc đề/phần nào.

## 6. Hiện trạng trong code (đã kiểm tra)
- Đã có: `exams` (còn thiếu `page_start`, `page_end`, `file_id`, `original_filename`, `start_question`), `exam_keys`, `exam_submissions`, hàm nộp bài bảo vệ đáp án. Đã kiểm tra trực tiếp schema hiện tại để khẳng định các cột trên chưa tồn tại.
- Đang kẹt: đẩy file lên cloud lỗi "Invalid key" do tên file tiếng Việt → sửa theo quy tắc tên ASCII ở mục 3.

## 7. Tiêu chí nghiệm thu Task 0.4
- [x] Chốt PDF là nguồn nội dung, không tách câu vào database.
- [x] Bảng thuộc tính của 1 đề, gồm quy tắc đặt tên file ASCII.
- [x] Cách xử lý đề 1 file chứa 3 phần (trang bắt đầu/kết thúc, số câu bắt đầu).
- [x] Mô hình đáp án, quy tắc chấm và điều kiện mở lời giải.

**Kết luận:** Mô hình dữ liệu hoàn thành. Sang Task 0.5.

---
**Ghi chú rà soát (2026-10-09):** Đã đối chiếu schema thật: `exams` chưa có các cột của đề nhiều phần như liệt kê ở trên (không nói quá là đã có). Bổ sung `start_question` còn thiếu trong thiết kế cũ và thống nhất `file_id` = định danh file dùng cho `pdf_path`. Sửa cách diễn đạt chấm bài cho đúng hàm `submit_exam()` hiện tại.
