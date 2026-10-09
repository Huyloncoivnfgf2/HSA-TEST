# Task 0.8 — Xác định tiêu chí nghiệm thu (Acceptance Criteria)

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 0 — Thiết kế sản phẩm
**Liên quan:** Toàn bộ Task 0.1–0.7 | Đây là task cuối của Giai đoạn 0

## 1. Mục đích
Chốt "làm tới đâu thì được coi là xong và dùng được" cho từng phần của sản phẩm, để khi kiểm tra (test) chỉ cần đi theo danh sách này, không tranh cãi cảm tính.

## 2. Cách dùng
- Mỗi tiêu chí viết dạng **kiểm tra được**: làm hành động X → phải thấy kết quả Y.
- Một mục chỉ đánh dấu đạt khi đã thử thật trên web (điện thoại và máy tính khi liên quan).
- Không đạt ở đâu thì sửa đúng chỗ đó, kiểm tra lại đúng mục đó và các mục liên quan.

## 3. Tiêu chí theo nhóm

### A. Truy cập và phân quyền (từ 0.1, 0.2)
- [ ] Owner đăng nhập thấy: thư viện đề, nút thêm đề, mục quản lý người dùng.
- [ ] Learner được duyệt đăng nhập làm bài được, **không** thấy nút thêm đề/quản lý người dùng.
- [ ] Tài khoản Google chưa được duyệt: bị chặn, không xem được tên đề/PDF/đáp án.
- [ ] Chưa đăng nhập: không xem được nội dung đề.

### B. Thư viện đề và thêm đề (từ 0.4)
- [ ] Thêm 1 đề PDF 1 phần thành công; tên hiển thị giữ tiếng Việt, file trên cloud tên ASCII không lỗi "Invalid key".
- [ ] Thêm 1 file PDF chứa 3 phần: nhập trang bắt đầu/kết thúc từng phần, mở mỗi phần chỉ thấy đúng trang của phần đó.
- [ ] Đề chưa nhập đáp án: không xuất hiện khi rút đề Kiểm tra.

### C. Làm bài (từ 0.3)
- [ ] Vào 1 phần: thấy đúng PDF, đồng hồ chạy (75'/60'/60' theo phần), phiếu đáp án đủ số câu.
- [ ] Vẽ/nháp được trên đề; nháp câu này không lẫn sang câu khác.
- [ ] Thoát ra rồi vào lại: bài dở được giữ, chọn tiếp tục được.
- [ ] Hết giờ: bài tự nộp với đáp án đã điền.

### D. Nộp bài, đáp án và lời giải (từ 0.2, 0.4)
- [ ] Trước khi nộp: không xem được đáp án đúng từ giao diện, **và** thử gọi dữ liệu trực tiếp cũng bị máy chủ từ chối (bảng đáp án không cho Learner đọc, file lời giải chưa nộp thì không mở được).
- [ ] Nộp xong: hiện điểm đúng với đáp án gốc (thử 1 đề đã biết trước đáp án), lưới câu xanh/đỏ khớp.
- [ ] Sau khi nộp mới mở được file lời giải của đề đó; chưa nộp thì mở không được.
- [ ] Câu điền số dạng `12,5` chấm đúng như `12.5`.

### E. Rút đề ngẫu nhiên (từ 0.3)
- [ ] Chỉ rút đề cùng phần và đã có đáp án; rút xong tải lại trang vẫn là đề đó.
- [ ] "Xem xác suất": tổng ~100%; đề làm hôm qua ~0,5%.
- [ ] Mô phỏng 100.000 lần cho kết quả gần kỳ vọng (ví dụ 0,5% / 17,8% / 81,7% với bộ 3 đề mẫu).

### F. Ôn tập và tiến độ (từ 0.7)
- [ ] Câu sai sau khi nộp xuất hiện trong Sổ lỗi, bấm vào quay lại đúng trang đề.
- [ ] Sau khi ôn FSRS, lịch ôn của câu đó thay đổi (giãn ra nếu nhớ, ngắn lại nếu quên).
- [ ] Lịch sử hiện đúng các lần đã nộp; phân tích theo phần/môn khớp với lịch sử.
- [ ] Đổi thiết bị/đăng nhập lại vẫn thấy lịch sử và tiến độ cũ.

### G. Báo lỗi và chỉnh sửa (từ 0.5, 0.6)
- [ ] Learner báo lỗi tại 1 câu, Owner thấy báo lỗi đó trong danh sách chưa xử lý.
- [ ] Owner sửa đáp án: bài đã nộp trước giữ nguyên điểm; lần nộp sau chấm theo đáp án mới.
- [ ] Người báo thấy trạng thái báo lỗi của mình (Đã nhận/Đã sửa/Đã xem).

### H. Vận hành chung
- [ ] Làm trọn 1 phần 50 câu trên điện thoại không lỗi hiển thị (PDF, phiếu đáp án, nút bấm).
- [ ] Mất mạng giữa chừng rồi có mạng lại: bài không mất, dữ liệu đồng bộ.
- [ ] Web tải lại sau khi Render ngủ vẫn vào học tiếp được (chấp nhận chờ khởi động).

## 4. Định nghĩa "xong" cho cả Giai đoạn 0
Giai đoạn 0 hoàn thành khi:
1. Bộ tài liệu 0.1–0.8 đã chốt và nằm trong repo (docs/product-design/).
2. Mọi mâu thuẫn giữa các task đã được sửa về cùng một hướng.
3. Danh sách kiểm tra ở mục 3 được dùng làm căn cứ test cho các giai đoạn code tiếp theo (mục nào chưa thử được thì ghi rõ lý do, không đánh dấu đạt bừa).

## 5. Tiêu chí nghiệm thu riêng cho Task 0.8
- [x] Tiêu chí dạng hành động → kết quả, phủ đủ 8 nhóm A–H.
- [x] Gắn từng nhóm với task nguồn (0.1–0.7).
- [x] Chốt định nghĩa hoàn thành của cả Giai đoạn 0.

**Kết luận: Giai đoạn 0 — Thiết kế sản phẩm hoàn thành (0.1–0.8).** Các giai đoạn sau bám theo bộ tiêu chí này khi làm và khi test.

---
**Ghi chú rà soát (2026-10-09):** Danh sách A–H giữ nguyên trạng thái **chưa tích** — đây là tiêu chí để test ở giai đoạn code, không phải kết quả đã đạt. Khi test cần ghi dung sai cho mục E (ví dụ ±1 điểm % với bộ đề mẫu cố định gồm: 1 đề làm hôm qua, 1 đề làm 10 ngày trước, 1 đề chưa làm) thay vì đòi khớp tuyệt đối. Các mục đang phụ thuộc việc chưa làm (sửa lỗi "Invalid key", đề nhiều phần, rút đề, bảng báo lỗi) chỉ được tích khi đã thử thật trên web.
