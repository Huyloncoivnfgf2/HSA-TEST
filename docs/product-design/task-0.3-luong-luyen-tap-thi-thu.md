# Task 0.3 — Thiết kế luồng luyện tập và thi thử

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 0 — Thiết kế sản phẩm
**Liên quan:** Task 0.1, 0.2 | Thành phần hiện có: PdfExamLibrary, PdfExamPlayer, ExamMode, StudyMode, FSRSReviewSession, MistakeNotebookModal

## 1. Mục đích
Chốt từng bước người học đi từ lúc mở web đến khi nộp bài và ôn lại, để giao diện không rối, đúng tính chất "luyện" khác "thi".

## 2. Hai chế độ chính (chốt)

| | **Luyện tập** | **Thi thử / Kiểm tra** |
|---|---|---|
| Mục đích | Học và hiểu, không áp lực | Đo điểm như thi thật |
| Chọn đề | Tự chọn đề/phần trong thư viện | Hệ thống rút ngẫu nhiên 1 đề cùng phần (quy tắc 0,5% — xem mục 4) |
| Bấm giờ | Có đồng hồ, không khóa cứng | Bấm giờ chặt: Định lượng 75', Định tính 60', Khoa học 60'; hết giờ tự nộp |
| Xem lời giải khi đang làm | Không, chỉ sau khi nộp | Không, chỉ sau khi nộp |
| Kết quả dùng để | Tính điểm, vào lịch sử, Sổ lỗi + lịch ôn FSRS | Tính điểm, vào lịch sử, Sổ lỗi + lịch ôn FSRS |

## 3. Luồng từng bước (bản đồ chung)

**Bước 1 — Vào và đăng nhập:** Mở web → đăng nhập Google → hệ thống kiểm tra quyền (Task 0.2). Chưa duyệt thì dừng tại thông báo.

**Bước 2 — Chọn hướng học ở màn hình chính:**
- Vào thư viện đề theo phần (Định lượng / Định tính / Khoa học), hoặc
- Bấm luyện tập/thi thử để hệ thống rút đề, hoặc
- Vào ôn tập (FSRS) / Sổ lỗi để học lại phần đã sai.

**Bước 3 — Trước khi làm:** Thấy rõ: tên đề, phần thi, số câu (50), thời gian. Với đề PDF nhiều phần: chỉ hiện đúng trang của phần đã chọn.

**Bước 4 — Làm bài:**
- Bên trái: PDF đề (phóng to/thu nhỏ được), bên phải (hoặc bên dưới trên điện thoại): phiếu điền đáp án theo số câu.
- Thanh công cụ vẽ: bút, highlight, gạch chân, tẩy, thước, 6 màu; bảng nháp riêng từng câu.
- Đánh dấu được câu chưa chắc để xem lại; đồng hồ luôn thấy được.
- Bài đang làm được lưu tạm (local-first) để lỡ thoát ra không mất trắng.

**Bước 5 — Nộp bài:** Bấm Nộp → xác nhận (cảnh báo số câu chưa làm) → hệ thống chấm phía máy chủ → từ lúc này mới hiện đáp án đúng.

**Bước 6 — Xem kết quả:** Điểm phần đó, lưới câu xanh/đỏ, bấm từng câu để xem lại đề + đáp án đúng/lời giải (nếu có file lời giải).

**Bước 7 — Sau buổi học:** Câu sai tự vào Sổ lỗi; lịch ôn FSRS xếp lịch gặp lại; lịch sử và phân tích cập nhật điểm yếu theo phần/môn.

## 4. Quy tắc rút đề ngẫu nhiên khi Kiểm tra (chốt từ ý tưởng 0,5%)
- Chỉ rút trong các đề **cùng phần**, **đã có đáp án**, không đảo thứ tự câu.
- Trọng số theo lần "đã làm" gần nhất (đã làm = đã nộp hoặc đã xem lời giải/ôn tập):
  - Làm < 7 ngày (nhóm "rất gần"): mỗi đề được **cố định đúng 0,5%** (RECENT_PROB=0.005, RECENT_DAYS=7). Đúng 7 ngày thì sang nhóm dưới.
  - Làm từ 7 đến dưới 21 ngày: trọng số tăng tuyến tính theo số ngày: `(số ngày - 7) / (21 - 7)`. Đúng 21 ngày thì trọng số = 1.
  - Chưa làm hoặc ≥ 21 ngày: trọng số 1.
  - **Cách tính xác suất cuối cùng:** cộng dồn 0,5% cho mỗi đề "rất gần" trước; phần % còn lại chia cho các đề còn lại theo trọng số ở trên. Trường hợp đặc biệt: nếu số đề "rất gần" nhiều đến mức tổng 0,5% vượt 100% thì chia đều 100% cho nhóm đó (không rút đề ngoài nhóm).
- Rút xong phải **lưu ngay** đề đã rút, tải lại trang không rút lại đề khác.
- Có mục "Xem xác suất" hiện % từng đề và mô phỏng 100.000 lần để kiểm chứng (kỳ vọng ví dụ: đề hôm qua ~0,5%, đề 10 ngày ~17,8%, đề chưa làm ~81,7%).

## 5. Trường hợp đặc biệt phải xử lý
- Hết giờ khi đang làm → tự nộp với đáp án đã điền.
- Mất mạng giữa chừng → giữ bài tại máy, đồng bộ lại khi có mạng.
- Đề chưa có đáp án → không đưa vào rút ngẫu nhiên, báo Owner biết.
- Thoát giữa chừng rồi vào lại → hỏi tiếp tục bài đang dở hay bỏ.

## 6. Hiện trạng trong code (đã kiểm tra)
Đã có các màn hình tương ứng: thư viện PDF, trình làm bài PDF, chế độ thi, chế độ học, ôn FSRS, Sổ lỗi. Còn làm dở: đề PDF chứa cả 3 phần (cắt theo trang) và hàm rút đề pickExam theo quy tắc mục 4.

## 7. Tiêu chí nghiệm thu Task 0.3
- [x] Phân biệt rõ Luyện tập vs Thi thử.
- [x] Sơ đồ 7 bước từ đăng nhập đến sau buổi học.
- [x] Chốt quy tắc rút đề 0,5% / 7 ngày / 21 ngày và cách kiểm chứng.
- [x] Liệt kê trường hợp đặc biệt (hết giờ, mất mạng, thoát giữa chừng).

**Kết luận:** Luồng hoàn thành. Sang Task 0.4.

---
**Ghi chú rà soát (2026-10-09):** Đã sửa 3 chỗ cho logic chặt hơn: (1) dẫn chiếu quy tắc rút đề về đúng mục 4; (2) thống nhất cả Luyện tập và Thi thử đều ghi điểm/lịch sử/Sổ lỗi sau khi nộp (khác nhau ở cách chọn đề và khóa giờ), tránh mâu thuẫn với Task 0.7; (3) viết rõ công thức chia xác suất 0,5% và mốc đúng 7/21 ngày. Khớp với các màn hình đã có (PdfExamLibrary, PdfExamPlayer, FSRSReviewSession, MistakeNotebookModal).
