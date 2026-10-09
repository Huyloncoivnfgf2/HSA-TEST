# Task 0.7 — Thiết kế hệ thống điểm số và tiến độ học tập

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 0 — Thiết kế sản phẩm
**Liên quan:** Task 0.3, 0.4 | Thành phần hiện có: HomeScoreCards, ExamHistoryModal, SubjectAnalyticsView, FSRSReviewSession, MistakeNotebookModal, GoalSettingsModal, fsrsService, analyticsService

## 1. Mục đích
Chốt cách tính điểm và cách người học nhìn thấy tiến bộ của mình, để "học tới đâu biết tới đó" mà không bị rối số liệu.

## 2. Cách tính điểm (chốt, khớp Task 0.1)
- Mỗi phần thi: **50 câu, mỗi câu đúng 1 điểm**, tối đa 50 điểm/phần.
- Trắc nghiệm: đúng đáp án = 1, còn lại (sai/bỏ trống) = 0.
- Câu điền số: so đáp án đã chuẩn hóa (ví dụ `12,5` = `12.5` khi so sánh nội bộ).
- Điểm của một lần làm = số câu đúng của lần nộp đó. Không trừ điểm câu sai.
- Mặc định xem điểm **theo từng phần**. Tổng điểm 3 phần chỉ tính khi hệ thống có khái niệm "một đợt thi thử" gom 3 lần nộp; hiện tại chưa có cơ chế gom đợt này, nên chưa hiển thị tổng 3 phần (ghi nhận là việc tương lai, không tính là đã có).

## 3. Người học nhìn thấy gì

### 3.1. Ngay sau khi nộp
- Điểm phần vừa làm (ví dụ 32/50), lưới câu xanh/đỏ, thời gian đã dùng.
- Bấm vào từng câu để xem lại trang đề và đáp án đúng (và lời giải nếu có).

### 3.2. Ở màn hình chính
- Thẻ điểm từng phần (điểm gần nhất / điểm tốt nhất) để nhìn nhanh tiến bộ.
- Số đề đã làm, số câu đang chờ ôn hôm nay.

### 3.3. Lịch sử và phân tích
- Lịch sử: danh sách lần đã nộp (đề, phần, điểm, ngày giờ), xem lại được từng lần.
- Phân tích điểm yếu: tỉ lệ đúng theo phần thi; với phần Khoa học, tách theo môn (Lí/Hóa/Sinh/Sử/Địa) để biết yếu môn nào.
- Sổ lỗi: gom các câu sai gần nhất, bấm vào là quay lại đúng trang đề của câu đó.

### 3.4. Tiến độ ôn tập (FSRS)
- Câu sai/đã học được xếp lịch ôn lại (mục tiêu nhớ ~90%): ôn đúng hạn thì giãn cách dài ra, quên thì rút ngắn lại.
- Tiến độ hiển thị đơn giản: hôm nay cần ôn bao nhiêu, đã ôn bao nhiêu. Không hiện thông số kỹ thuật khó hiểu.

### 3.5. Mục tiêu cá nhân
- Người học tự đặt mục tiêu (ví dụ điểm mục tiêu từng phần, số đề/tuần) trong phần cài đặt mục tiêu; màn hình chính nhắc nhẹ tiến độ so với mục tiêu. Không xếp hạng giữa các bạn trong nhóm.

## 4. Nguyên tắc dữ liệu
- Số liệu chỉ tính từ **bài đã nộp**; bài làm dở (chưa nộp) không tính điểm, không vào phân tích.
- Mỗi người chỉ thấy số liệu của chính mình (Task 0.2).
- Dữ liệu đồng bộ theo tài khoản; đổi thiết bị vẫn thấy lịch sử cũ.
- Khi Owner sửa đáp án (Task 0.5), điểm cũ không tự đổi; phân tích ghi theo lần nộp mới nhất khi người học làm lại.

## 5. Hiện trạng trong code (đã kiểm tra)
Đã có đủ các mảnh: thẻ điểm màn hình chính, lịch sử bài nộp, phân tích theo môn, Sổ lỗi, ôn FSRS và cài đặt mục tiêu. Việc còn lại ở giai đoạn sau là kiểm tra số liệu khớp đúng quy tắc ở mục 2–3 trên dữ liệu thật.

## 6. Tiêu chí nghiệm thu Task 0.7
- [x] Quy tắc tính điểm từng phần, câu điền số, làm tròn/so sánh.
- [x] Chốt 5 chỗ người học xem tiến bộ (sau nộp, màn chính, lịch sử, phân tích, ôn FSRS).
- [x] Nguyên tắc: chỉ tính bài đã nộp, mỗi người thấy của mình, không xếp hạng nhóm.

**Kết luận:** Hệ thống điểm & tiến độ hoàn thành. Sang Task 0.8 (task cuối của Giai đoạn 0).

---
**Ghi chú rà soát (2026-10-09) — 2 điểm logic cần chốt khi code:**
1. **Phân tích yếu theo môn trong phần Khoa học:** đề nằm trong PDF, hệ thống chỉ có đáp án theo số câu, nên muốn biết câu nào thuộc Lí/Hóa/Sinh/Sử/Địa thì phải có bảng phân bổ môn theo khoảng câu khi tạo đề Khoa học (ví dụ câu nào là môn nào). Chưa có bảng phân bổ này thì chỉ phân tích được theo phần, chưa theo môn — không coi là đã xong.
2. **Điểm lịch sử phải bất biến:** giống ghi chú ở Task 0.5, phân tích/lịch sử cần dựa trên kết quả đã lưu lúc nộp; nếu tính lại bằng đáp án hiện tại thì Owner sửa đáp án sẽ làm số liệu cũ nhảy theo. Thống nhất: lưu kết quả chấm tại thời điểm nộp rồi mới phân tích trên kết quả đó.
