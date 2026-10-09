# Task 2.4 — Tách biệt lượt học thật và lượt kiểm thử nội dung

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 2 — Tài khoản, phân quyền và dữ liệu  
**Liên quan:** Task 0.3 (luồng luyện tập/thi thử), Task 0.7 (điểm số và tiến độ), Task 2.2 (quyền Owner/Learner)  
**Bằng chứng đã kiểm tra trực tiếp ngày 2026-10-09:** `src/types/pdfExam.ts`, `src/components/PdfExamLibrary.tsx`, `src/App.tsx`, `src/components/PdfExamPlayer.tsx`.

---

## 1. Vấn đề cần tách

Owner thường phải tự làm thử một đề vừa thêm để kiểm tra đề, đáp án và lời giải. Trước Task 2.4, lượt làm thử đó đi qua cùng một đường như lượt học thật: được lưu vào lịch sử, điểm cao nhất, Sổ lỗi/FSRS và bài nộp cloud. Hệ quả là số liệu học tập của Owner bị nhiễm bởi các lượt kiểm tra nội dung.

## 2. Cơ chế đã bổ sung

- Trong hộp chọn chế độ làm bài của thư viện PDF, **chỉ Owner** thấy thêm tùy chọn **“Kiểm thử nội dung”**.
- Khi Owner bật tùy chọn này rồi bắt đầu Kiểm tra hoặc Ôn tập, phiên làm bài được gắn cờ kiểm thử nội dung.
- Khi nộp lượt kiểm thử:
  - vẫn chấm điểm và hiện đáp án/lời giải để Owner kiểm tra nội dung;
  - **không** cộng vào điểm cao nhất của đề;
  - **không** ghi vào lịch sử thi, phân tích, Sổ lỗi hay hàng đợi FSRS;
  - các lần chấm lại/đổi nhãn chương sau đó cũng bỏ qua lượt kiểm thử khi ghi lại lịch sử.
- Lượt học thật (không bật tùy chọn) giữ nguyên hành vi cũ.

## 3. Giới hạn còn lại đã ghi rõ

Lượt kiểm thử vẫn có thể được gửi qua hàm nộp bài cloud để lấy đáp án và lời giải đúng chuẩn máy chủ, nhất là khi Owner kiểm tra trên thiết bị chưa có đáp án lưu tại máy. Vì bảng bài nộp cloud hiện chưa có cột “kiểm thử nội dung”, máy chủ chưa phân biệt được loại lượt này. Điều này có nghĩa:

- số liệu học tập trong web đã được tách ở phía hiển thị/thống kê của người dùng;
- khi làm tính năng rút đề ngẫu nhiên sau này, **không được chỉ dựa vào bài nộp cloud để kết luận “đã học thật”** nếu chưa bổ sung dấu kiểm thử ở phía máy chủ hoặc loại trừ các lượt kiểm thử đã gắn cờ tại máy.

Đây là giới hạn có chủ đích để Task 2.4 không ép bạn phải chạy thay đổi cấu trúc Supabase ngay. Khi sang phần dữ liệu/rút đề, cần bổ sung dấu kiểm thử phía máy chủ trước khi dùng bài nộp làm căn cứ “đã làm”.

## 4. Tiêu chí nghiệm thu Task 2.4

- [x] Owner có tùy chọn kiểm thử nội dung; Learner không thấy tùy chọn này.
- [x] Lượt kiểm thử không vào điểm cao nhất, lịch sử, Sổ lỗi/FSRS theo code đã sửa.
- [x] Lượt học thật giữ nguyên hành vi cũ.
- [x] Ghi rõ giới hạn phía máy chủ để không dùng sai khi làm rút đề sau này.
- [ ] (Kiểm trên web sau khi Render cập nhật) Owner bật “Kiểm thử nội dung”, nộp thử một đề, sau đó kiểm tra: điểm cao nhất/lịch sử/Sổ lỗi không tăng vì lượt này.
- [ ] (Kiểm thêm) Owner làm một lượt không bật kiểm thử và xác nhận lượt đó vẫn vào lịch sử như bình thường.

**Kết luận Task 2.4:** Đã tách lượt kiểm thử nội dung khỏi số liệu học thật ở phía web. Phần gắn dấu kiểm thử phía máy chủ được ghi rõ là điều kiện bắt buộc trước khi dùng dữ liệu bài nộp cho rút đề ngẫu nhiên.
